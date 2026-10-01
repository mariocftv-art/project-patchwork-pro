import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const Body = z.object({
  order_number: z.string().regex(/^MR[0-9]{8,}$/),
  return_url: z.string().url().max(500),
  items: z.array(z.object({ product_id: z.string().uuid(), quantity: z.number().int().min(1).max(999) })).min(1).max(100),
});

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// Mapeia nossas formas para os tipos do Mercado Pago
const MP_TYPES: Record<string, string[]> = {
  credit_card: ['credit_card'],
  pix: ['bank_transfer'],
  boleto: ['ticket'],
  debit_card: ['debit_card', 'prepaid_card'],
};
const ALL_TYPES = ['credit_card', 'debit_card', 'prepaid_card', 'ticket', 'bank_transfer', 'atm'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: 'Dados inválidos' }, 400);
    const { order_number, items, return_url } = parsed.data;

    const url = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: settings } = await admin.from('payment_settings').select('*').limit(1).single();
    if (!settings?.enabled) return json({ error: 'Pagamento online desligado' }, 400);
    const { data: sec } = await admin.from('payment_secrets').select('access_token').eq('id', 1).maybeSingle();
    if (!sec?.access_token) return json({ error: 'Pagamento não configurado' }, 400);

    const { data: order } = await admin.from('orders').select('id, customer_email, customer_name, mp_preference_id').eq('order_number', order_number).single();
    if (!order) return json({ error: 'Pedido não encontrado' }, 404);

    // Preço vem do banco, nunca do navegador
    const ids = items.map((i) => i.product_id);
    const { data: prods } = await admin.from('products').select('id, title, price').in('id', ids);
    const mpItems = items.map((i) => {
      const p = prods?.find((x) => x.id === i.product_id);
      if (!p) throw new Error('Produto inválido');
      return { id: p.id, title: p.title.slice(0, 250), quantity: i.quantity, unit_price: Number(p.price), currency_id: 'BRL' };
    });
    const total = mpItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);

    const allowed = new Set((settings.methods as string[]).flatMap((m) => MP_TYPES[m] || []));
    const excluded = ALL_TYPES.filter((t) => !allowed.has(t)).map((id) => ({ id }));

    const back = `${return_url.replace(/\/$/, '')}/pedido-confirmado/${order_number}`;
    const pref = {
      items: mpItems,
      payer: { email: order.customer_email, name: order.customer_name },
      external_reference: order_number,
      notification_url: `${url}/functions/v1/mp-webhook`,
      back_urls: { success: back, pending: back, failure: back },
      auto_return: 'approved',
      payment_methods: { excluded_payment_types: excluded, installments: 12 },
      statement_descriptor: 'LOJA',
    };
    const r = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sec.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(pref),
    });
    const data = await r.json();
    if (!r.ok) {
      console.error('MP preference error', data);
      return json({ error: 'Mercado Pago recusou a criação do pagamento' }, 502);
    }
    await admin.from('orders').update({ mp_preference_id: data.id, subtotal: total, total, payment_status: 'aguardando' }).eq('id', order.id);
    const link = settings.mode === 'live' ? data.init_point : (data.sandbox_init_point || data.init_point);
    return json({ url: link });
  } catch (e) {
    console.error(e);
    return json({ error: 'Erro interno' }, 500);
  }
});
