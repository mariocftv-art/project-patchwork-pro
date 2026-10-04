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
  if (!pub || !priv) return json({ error: "VAPID keys missing" }, 500);

  const now = spParts();
  const start = new Date(`${now.date}T00:00:00-03:00`);
  const end = new Date(start.getTime() + 86400_000);
  const { data: apts } = await admin.from("appointments").select("customer_name,starts_at,kind,status,address,technician_id")
    .gte("starts_at", start.toISOString()).lt("starts_at", end.toISOString())
    .in("status", ["agendado", "confirmado", "acaminho", "andamento"]).order("starts_at");
  const all = apts || [];
  const fmt = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
  webpush.setVapidDetails("mailto:admin@example.com", pub, priv);

  // Envia a um usuário só os agendamentos que ele pode ver
  const sendTo = async (userId: string, isAdm: boolean) => {
    const list = isAdm ? all : all.filter((a) => a.technician_id === userId);
    const lines = list.map((a) => `${fmt(a.starts_at)} ${KIND[a.kind] || a.kind} — ${a.customer_name}${a.status === "agendado" ? " (não confirmado)" : ""}`);
    const payload = JSON.stringify({
      title: list.length ? `📅 ${list.length} agendamento(s) hoje` : "📅 Nenhum agendamento hoje",
      body: list.length ? lines.slice(0, 6).join("\n") + (lines.length > 6 ? `\n+${lines.length - 6} outros` : "") : "Sua agenda de hoje está livre.",
      tag: `agenda-${now.date}`, url: "/agenda",
    });
    const { data: subs } = await admin.from("admin_push_subscriptions").select("*").eq("user_id", userId);
    let sent = 0;
    for (const s of subs || []) {
      try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload); sent++; }
      catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await admin.from("admin_push_subscriptions").delete().eq("id", s.id);
      }
    }
    return { sent, total: subs?.length || 0 };
  };

  if (action === "test") {
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: u } = await admin.auth.getUser(token);
    if (!u?.user) return json({ error: "unauthorized" }, 401);
    const { data: isA } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    const { data: isT } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "tecnico" });
    if (!isA && !isT) return json({ error: "forbidden" }, 403);
    return json(await sendTo(u.user.id, !!isA));
  }

  // Rotina de hora em hora: cada pessoa no horário que escolheu no perfil
  const { data: roles } = await admin.from("user_roles").select("user_id,role").in("role", ["admin", "tecnico"]);
  const ids = [...new Set((roles || []).map((r) => r.user_id))];
  const { data: profs } = await admin.from("staff_profiles").select("user_id,reminder_enabled,reminder_hour,reminder_last_sent").in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  const { data: st } = await admin.from("appointment_settings").select("reminder_enabled,reminder_hour").eq("id", 1).maybeSingle();
  let sent = 0;
  for (const id of ids) {
    const isAdm = (roles || []).some((r) => r.user_id === id && r.role === "admin");
    const p = profs?.find((x) => x.user_id === id);
    const enabled = p ? p.reminder_enabled : isAdm && !!st?.reminder_enabled;
    const hour = p ? p.reminder_hour : st?.reminder_hour ?? 7;
    if (!enabled || hour !== now.hour || p?.reminder_last_sent === now.date) continue;
    await admin.from("staff_profiles").upsert({ user_id: id, reminder_last_sent: now.date, ...(p ? {} : { reminder_enabled: true, reminder_hour: hour }) });
    sent += (await sendTo(id, isAdm)).sent;
  }
  return json({ sent });
});
