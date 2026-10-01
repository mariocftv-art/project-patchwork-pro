import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('save_token'), token: z.string().trim().min(20).max(300) }),
  z.object({ action: z.literal('test') }),
]);

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const { data: u } = await admin.auth.getUser(jwt);
    if (!u?.user) return json({ error: 'Não autenticado' }, 401);
    const { data: isAdmin } = await admin.rpc('has_role', { _user_id: u.user.id, _role: 'admin' });
    if (!isAdmin) return json({ error: 'Sem permissão' }, 403);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: 'Dados inválidos' }, 400);

    const { data: settings } = await admin.from('payment_settings').select('id').limit(1).single();

    if (parsed.data.action === 'save_token') {
      const token = parsed.data.token;
      await admin.from('payment_secrets').upsert({ id: 1, access_token: token, updated_at: new Date().toISOString() });
      await admin.from('payment_settings').update({ token_last4: token.slice(-4), account_name: null }).eq('id', settings!.id);
      return json({ ok: true, last4: token.slice(-4) });
    }

    const { data: sec } = await admin.from('payment_secrets').select('access_token').eq('id', 1).maybeSingle();
    if (!sec?.access_token) return json({ ok: false, error: 'Access Token não cadastrado' });
    const r = await fetch('https://api.mercadopago.com/users/me', { headers: { Authorization: `Bearer ${sec.access_token}` } });
    if (!r.ok) return json({ ok: false, error: 'Token recusado pelo Mercado Pago' });
    const me = await r.json();
    const name = me.nickname || [me.first_name, me.last_name].filter(Boolean).join(' ') || me.email || String(me.id);
    await admin.from('payment_settings').update({ account_name: name }).eq('id', settings!.id);
    return json({ ok: true, account: name });
  } catch (e) {
    console.error(e);
    return json({ error: 'Erro interno' }, 500);
  }
});
