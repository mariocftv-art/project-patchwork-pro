import { supabase } from '@/integrations/supabase/client';
import { getBrand } from '@/lib/brand';
import { whatsappUrl } from '@/lib/quoteWhatsApp';
import type { QuoteRecord } from '@/components/admin/QuoteEditor';

/** Cria link pessoal de assinatura/download do contrato. */
export async function createContractLink(q: QuoteRecord, kind: 'sign' | 'download') {
  const { data, error } = await supabase.functions.invoke('contract-link', { body: { action: 'create', kind, quote_id: q.id } });
  if (error || !data?.token) throw error || new Error('falhou');
  return { link: `${window.location.origin}/assinar/${data.token}`, expires: data.expires_at as string };
}

export const contractPhone = (q: QuoteRecord) => (q.customer?.whatsapp || q.customer_phone || '') as string;

/** Abre o WhatsApp do cliente com o link de assinatura. `win` deve ser aberta antes (no clique). */
export async function sendContractSignLink(q: QuoteRecord, win: Window | null) {
  try {
    const { link, expires } = await createContractLink(q, 'sign');
    const first = q.customer_name.split(' ')[0];
    const msg = `Olá, ${first}! Segue seu contrato ${q.quote_number} da ${getBrand().name} para leitura e assinatura.\nO link é pessoal e vale até ${new Date(expires).toLocaleDateString('pt-BR')}: ${link}`;
    const url = whatsappUrl(contractPhone(q), msg);
    if (win) win.location.href = url; else window.open(url, '_blank', 'noopener,noreferrer');
  } catch (e) {
    win?.close();
    throw e;
  }
}
