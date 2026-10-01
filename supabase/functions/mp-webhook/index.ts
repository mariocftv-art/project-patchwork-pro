import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const ok = () => new Response('ok', { headers: corsHeaders });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return ok();
  try {
    const u = new URL(req.url);
    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* aviso via querystring */ }
    const type = (body.type as string) || u.searchParams.get('type') || u.searchParams.get('topic');
    const id = ((body.data as { id?: string })?.id) || u.searchParams.get('data.id') || u.searchParams.get('id');
    if (type !== 'payment' || !id || !/^[0-9]{1,30}$/.test(String(id))) return ok();

    const url = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: sec } = await admin.from('payment_secrets').select('access_token').eq('id', 1).maybeSingle();
    if (!sec?.access_token) return ok();

    // Nunca confia no corpo do aviso: consulta o pagamento direto no Mercado Pago
    const r = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, { headers: { Authorization: `Bearer ${sec.access_token}` } });
    if (!r.ok) return ok();
    const p = await r.json();
    const orderNumber = String(p.external_reference || '');
    if (!/^MR[0-9]{8,}$/.test(orderNumber)) return ok();

    const map: Record<string, string> = { approved: 'pago', cancelled: 'cancelado', rejected: 'cancelado', refunded: 'cancelado', charged_back: 'cancelado' };
    const payStatus = map[p.status] || 'aguardando';
    const methodMap: Record<string, string> = { bank_transfer: 'pix', ticket: 'boleto', credit_card: 'credit', debit_card: 'debit' };

    const { data: order } = await admin.from('orders').select('id, payment_status, status').eq('order_number', orderNumber).maybeSingle();
    if (!order || order.payment_status === payStatus) return ok();

    const update: Record<string, unknown> = { payment_status: payStatus, mp_payment_id: String(p.id), payment_method: methodMap[p.payment_type_id] || p.payment_type_id };
    if (payStatus === 'pago' && ['pending', 'payment_pending', 'confirmed'].includes(order.status)) update.status = 'paid';
    if (payStatus === 'cancelado') update.status = 'cancelled';
    await admin.from('orders').update(update).eq('id', order.id);

    await admin.from('admin_logs').insert({
      user_id: '00000000-0000-0000-0000-000000000000', user_email: 'mercadopago',
      action: `payment_${payStatus}`, entity_type: 'order', entity_id: orderNumber,
      details: { amount: p.transaction_amount, method: p.payment_type_id },
    });

    if (update.status) {
      fetch(`${url}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
        body: JSON.stringify({ orderNumber, status: update.status }),
      }).catch(() => {});
    }
    return ok();
  } catch (e) {
    console.error(e);
    return ok();
  }
});
