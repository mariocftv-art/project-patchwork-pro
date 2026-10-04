import { supabase } from '@/integrations/supabase/client';

/** Rascunho de orçamento/contrato: guardado no aparelho (instantâneo) e no banco (outro aparelho). Nunca consome número. */
export type QuoteDraft = {
  id: string;
  docType: string;
  customerName: string;
  recordId: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  record: any | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  status: string;
  scroll: number;
  createdAt: string;
  updatedAt: string;
  synced?: boolean;
};

const KEY = 'mr-quote-drafts';
const ACTIVE = 'mr-quote-draft-active';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tbl = () => (supabase as any).from('quote_drafts');

function readAll(): Record<string, QuoteDraft> {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}
function writeAll(m: Record<string, QuoteDraft>) {
  try { localStorage.setItem(KEY, JSON.stringify(m)); } catch { /* cheio */ }
}

export const newDraftId = () => crypto.randomUUID();

/** Grava no aparelho na hora e tenta enviar ao banco. */
export function saveDraftLocal(d: QuoteDraft) {
  const all = readAll();
  all[d.id] = { ...d, synced: false };
  writeAll(all);
  void syncDraft(d.id);
}

let syncing = new Set<string>();
export async function syncDraft(id: string) {
  const d = readAll()[id];
  if (!d || d.synced || syncing.has(id)) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  syncing.add(id);
  try {
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) return;
    const { error } = await tbl().upsert({
      id: d.id, doc_type: d.docType, customer_name: d.customerName || null, record_id: d.recordId,
      payload: d, created_at: d.createdAt, updated_at: d.updatedAt,
    });
    if (!error) {
      const all = readAll();
      if (all[id] && all[id].updatedAt === d.updatedAt) { all[id].synced = true; writeAll(all); }
    }
  } catch { /* fica pendente, tenta de novo depois */ } finally { syncing.delete(id); }
}
export function syncAllDrafts() {
  Object.values(readAll()).filter((d) => !d.synced).forEach((d) => void syncDraft(d.id));
}
if (typeof window !== 'undefined') {
  window.addEventListener('online', syncAllDrafts);
  supabase.auth.onAuthStateChange((e) => { if (e === 'SIGNED_IN' || e === 'TOKEN_REFRESHED') setTimeout(syncAllDrafts, 500); });
  setInterval(syncAllDrafts, 30_000);
}

/** Lista juntando aparelho + banco (o mais recente vence). */
export async function listDrafts(docType?: string): Promise<QuoteDraft[]> {
  const local = readAll();
  try {
    const { data } = await tbl().select('payload,updated_at').order('updated_at', { ascending: false }).limit(50);
    for (const row of data || []) {
      const p = row.payload as QuoteDraft;
      if (!p?.id) continue;
      if (!local[p.id] || local[p.id].updatedAt < p.updatedAt) local[p.id] = { ...p, synced: true };
    }
    writeAll(local);
  } catch { /* sem internet: só os do aparelho */ }
  return Object.values(local)
    .filter((d) => !docType || d.docType === docType)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function deleteDraft(id: string) {
  const all = readAll(); delete all[id]; writeAll(all);
  if (getActiveDraft() === id) setActiveDraft(null);
  try { await tbl().delete().eq('id', id); } catch { /* ignore */ }
}

export const getLocalDraft = (id: string) => readAll()[id] || null;
export function setActiveDraft(id: string | null) {
  try { if (id) localStorage.setItem(ACTIVE, id); else localStorage.removeItem(ACTIVE); } catch { /* ignore */ }
}
export function getActiveDraft(): string | null {
  try { return localStorage.getItem(ACTIVE); } catch { return null; }
}
