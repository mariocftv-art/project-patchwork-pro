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

  // Primeiro administrador (dono): não pode ser removido nem rebaixado por outra pessoa
  const { data: firstRow } = await admin.from("user_roles").select("user_id").eq("role", "admin").order("created_at").limit(1).maybeSingle();
  const ownerId = firstRow?.user_id as string | undefined;
  const guardOwner = () => body.user_id && body.user_id === ownerId && u.user!.id !== ownerId;

  if (body.action === "list") {
    const { data: roles } = await admin.from("user_roles").select("user_id,role").in("role", ["admin", "tecnico"]);
    const { data: techs } = await admin.from("technicians").select("*");
    const ids = [...new Set([...(roles || []).map((r) => r.user_id), ...(techs || []).map((t) => t.user_id)])];
    const { data: profs } = await admin.from("staff_profiles").select("user_id,full_name,photo_url,phone").in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const members = [];
    for (const id of ids) {
      const { data: au } = await admin.auth.admin.getUserById(id);
      const t = techs?.find((x) => x.user_id === id);
      const p = profs?.find((x) => x.user_id === id);
      const rs = (roles || []).filter((r) => r.user_id === id).map((r) => r.role);
      members.push({
        user_id: id, email: au?.user?.email || t?.email || "", name: p?.full_name || t?.name || null, photo_url: p?.photo_url || null,
        role: rs.includes("admin") ? "admin" : rs.includes("tecnico") ? "tecnico" : "inativo",
        active: rs.length > 0, last_sign_in_at: au?.user?.last_sign_in_at || null, owner: id === ownerId, me: id === u.user.id,
      });
    }
    members.sort((a, b) => Number(b.owner) - Number(a.owner));
    return json({ members });
  }

  if (body.action === "invite") {
    const email = (body.email || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "E-mail inválido." }, 400);
    let userId: string | undefined;
    const inv = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: body.redirect });
    if (inv.data?.user) userId = inv.data.user.id;
    else {
      for (let page = 1; page <= 10 && !userId; page++) {
        const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        userId = data?.users.find((x) => x.email?.toLowerCase() === email)?.id;
        if (!data || data.users.length < 200) break;
      }
      if (!userId) return json({ error: inv.error?.message || "Não foi possível convidar." }, 400);
    }
    await admin.from("user_roles").upsert({ user_id: userId, role: "tecnico" }, { onConflict: "user_id,role" });
    await admin.from("technicians").upsert({ user_id: userId, email, name: (body.name || "").trim() || null, active: true });
    await admin.from("staff_profiles").upsert({ user_id: userId, full_name: (body.name || "").trim() || null }, { onConflict: "user_id", ignoreDuplicates: true });
    return json({ ok: true, invited: !!inv.data?.user });
  }

  if (!body.user_id) return json({ error: "Ação inválida" }, 400);
  if (guardOwner()) return json({ error: "O dono do sistema não pode ser alterado por outra pessoa." }, 403);
  if (body.user_id === u.user.id && body.action !== "activate") return json({ error: "Você não pode alterar o seu próprio acesso." }, 400);

  // Desativar: tira os papéis, mas mantém cadastro e histórico dos agendamentos
  if (body.action === "deactivate" || body.action === "remove") {
    await admin.from("user_roles").delete().eq("user_id", body.user_id).in("role", ["tecnico", "admin"]);
    const { data: au } = await admin.auth.admin.getUserById(body.user_id);
    await admin.from("technicians").upsert({ user_id: body.user_id, email: au?.user?.email || "", active: false });
    return json({ ok: true });
  }
  if (body.action === "activate") {
    await admin.from("user_roles").upsert({ user_id: body.user_id, role: "tecnico" }, { onConflict: "user_id,role" });
    await admin.from("technicians").update({ active: true }).eq("user_id", body.user_id);
    return json({ ok: true });
  }
  if (body.action === "promote") {
    const { error } = await admin.from("user_roles").upsert({ user_id: body.user_id, role: "admin" }, { onConflict: "user_id,role" });
    return error ? json({ error: error.message }, 400) : json({ ok: true });
  }
  if (body.action === "demote") {
    await admin.from("user_roles").upsert({ user_id: body.user_id, role: "tecnico" }, { onConflict: "user_id,role" });
    const { error } = await admin.from("user_roles").delete().eq("user_id", body.user_id).eq("role", "admin");
    const { data: au } = await admin.auth.admin.getUserById(body.user_id);
    await admin.from("technicians").upsert({ user_id: body.user_id, email: au?.user?.email || "", active: true });
    return error ? json({ error: error.message }, 400) : json({ ok: true });
  }
  return json({ error: "Ação inválida" }, 400);
});
