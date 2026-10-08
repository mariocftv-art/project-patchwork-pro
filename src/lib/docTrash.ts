import { supabase } from '@/integrations/supabase/client';
import { recordToDoc, type QuoteRecord } from '@/components/admin/QuoteEditor';
import { newDraftId, saveDraftLocal } from '@/lib/quoteDrafts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
export const TRASH_DAYS = 30;

async function me() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}

function explain(e: { message?: string; code?: string } | null): string {
  if (!e) return 'Erro desconhecido.';
  if (e.code === '42501' || /permission|policy/i.test(e.message || '')) return 'Sua conta não tem permissão de administrador para isso.';
  if (/fetch|network/i.test(e.message || '')) return 'Sem conexão com a internet. Tente de novo.';
  return e.message || 'Erro desconhecido.';
}

/** Manda para a Lixeira (não apaga, não libera o número) e registra quem, quando e o motivo. */
export async function moveToTrash(q: QuoteRecord, reason: string) {
  const u = await me();
  if (!u) throw new Error('Você saiu da conta. Entre de novo para excluir.');
  const { error } = await db.from('quotes').update({ deleted_at: new Date().toISOString(), deleted_by: u.id, delete_reason: reason || null }).eq('id', q.id);
  if (error) throw new Error(explain(error));
  await db.from('document_deletions').insert({
    quote_id: q.id, quote_number: q.quote_number, doc_type: q.doc_type, customer_name: q.customer_name,
    action: 'excluir', reason: reason || null, user_id: u.id, user_email: u.email,
  });
}

export async function restoreFromTrash(q: QuoteRecord) {
  const u = await me();
  if (!u) throw new Error('Você saiu da conta.');
  const { error } = await db.from('quotes').update({ deleted_at: null, deleted_by: null, delete_reason: null }).eq('id', q.id);
  if (error) throw new Error(explain(error));
  await db.from('document_deletions').insert({
    quote_id: q.id, quote_number: q.quote_number, doc_type: q.doc_type, customer_name: q.customer_name,
    action: 'restaurar', user_id: u.id, user_email: u.email,
  });
}

/** Cópia limpa como rascunho: sem número, sem assinaturas, sem histórico. */
export function duplicateAsDraft(q: QuoteRecord) {
  const d = recordToDoc(q);
  const now = new Date().toISOString();
  saveDraftLocal({
    id: newDraftId(), docType: d.docType, customerName: `Cópia de ${q.quote_number} · ${q.customer_name || ''}`.trim(),
    recordId: null, record: null,
    data: { ...d, number: '', date: new Date(), signatures: undefined },
    status: 'rascunho', scroll: 0, createdAt: now, updatedAt: now,
  });
}

export const isSignedContract = (q: QuoteRecord) => q.doc_type === 'contrato' && q.status === 'assinado';
export const daysLeft = (deletedAt: string) =>
  Math.max(0, TRASH_DAYS - Math.floor((Date.now() - new Date(deletedAt).getTime()) / 86400000));
