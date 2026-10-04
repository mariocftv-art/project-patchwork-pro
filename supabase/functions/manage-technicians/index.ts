import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
  const { data: u } = await admin.auth.getUser(token);
  if (!u?.user) return json({ error: "Faça login novamente." }, 401);
  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
  if (!isAdmin) return json({ error: "Só o administrador pode fazer isso." }, 403);

  let body: { action?: string; email?: string; name?: string; user_id?: string; redirect?: string } = {};
  try { body = await req.json(); } catch { /* empty */ }

  if (body.action === "invite") {
    const email = (body.email || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "E-mail inválido." }, 400);
    let userId: string | undefined;
    const inv = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: body.redirect });
    if (inv.data?.user) userId = inv.data.user.id;
    else {
      // Já tem conta: procura pelo e-mail
      for (let page = 1; page <= 10 && !userId; page++) {
        const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        userId = data?.users.find((x) => x.email?.toLowerCase() === email)?.id;
        if (!data || data.users.length < 200) break;
      }
      if (!userId) return json({ error: inv.error?.message || "Não foi possível convidar." }, 400);
    }
    await admin.from("user_roles").upsert({ user_id: userId, role: "tecnico" }, { onConflict: "user_id,role" });
    await admin.from("technicians").upsert({ user_id: userId, email, name: (body.name || "").trim() || null });
    return json({ ok: true, invited: !!inv.data?.user });
  }

  if (body.action === "remove" && body.user_id) {
    await admin.from("user_roles").delete().eq("user_id", body.user_id).eq("role", "tecnico");
    await admin.from("technicians").delete().eq("user_id", body.user_id);
    return json({ ok: true });
  }
  return json({ error: "Ação inválida" }, 400);
});
