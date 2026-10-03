import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const TZ = "America/Sao_Paulo";
const KIND: Record<string, string> = { visita: "Visita técnica", instalacao: "Instalação", manutencao: "Manutenção", garantia: "Revisão de garantia", retirada: "Retirada" };

function spParts(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(d).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const pub = Deno.env.get("VAPID_PUBLIC_KEY") || "";
  const priv = Deno.env.get("VAPID_PRIVATE_KEY") || "";
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let body: { action?: string } = {};
  try { body = await req.json(); } catch { /* empty */ }
  const action = body.action || "cron";

  if (action === "vapid") return json({ publicKey: pub });

  let force = false;
  if (action === "test") {
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: u } = await admin.auth.getUser(token);
    if (!u?.user) return json({ error: "unauthorized" }, 401);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "forbidden" }, 403);
    force = true;
  }

  const { data: st } = await admin.from("appointment_settings").select("*").eq("id", 1).maybeSingle();
  const now = spParts();
  if (!force) {
    if (!st?.reminder_enabled || st.reminder_hour !== now.hour || st.last_sent_date === now.date) return json({ skipped: true });
    await admin.from("appointment_settings").update({ last_sent_date: now.date }).eq("id", 1);
  }
  if (!pub || !priv) return json({ error: "VAPID keys missing" }, 500);

  // Agendamentos de hoje (fuso de São Paulo, UTC-3)
  const start = new Date(`${now.date}T00:00:00-03:00`);
  const end = new Date(start.getTime() + 86400_000);
  const { data: apts } = await admin.from("appointments").select("customer_name,starts_at,kind,status,address")
    .gte("starts_at", start.toISOString()).lt("starts_at", end.toISOString())
    .in("status", ["agendado", "confirmado", "andamento"]).order("starts_at");
  const list = apts || [];
  const fmt = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
  const lines = list.map((a) => `${fmt(a.starts_at)} ${KIND[a.kind] || a.kind} — ${a.customer_name}${a.status === "agendado" ? " (não confirmado)" : ""}`);
  const payload = JSON.stringify({
    title: list.length ? `📅 ${list.length} agendamento(s) hoje` : "📅 Nenhum agendamento hoje",
    body: list.length ? lines.slice(0, 6).join("\n") + (lines.length > 6 ? `\n+${lines.length - 6} outros` : "") : "Sua agenda de hoje está livre.",
    tag: `agenda-${now.date}`,
    url: "/admin",
  });

  webpush.setVapidDetails("mailto:admin@example.com", pub, priv);
  const { data: subs } = await admin.from("admin_push_subscriptions").select("*");
  let sent = 0;
  for (const s of subs || []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await admin.from("admin_push_subscriptions").delete().eq("id", s.id);
      console.error("push fail", code);
    }
  }
  return json({ sent, total: subs?.length || 0, appointments: list.length });
});
