import { compressImage } from '@/lib/imageUpload';
import { supabase } from '@/integrations/supabase/client';
import { getCompanyProfile } from '@/lib/companyProfile';
import { buildPremiumPDF, DocSignature } from '@/lib/premiumPDF';
import { recordToDoc, QuoteRecord } from '@/components/admin/QuoteEditor';

export type Party = 'contratante' | 'contratada';

export interface SignatureRow {
  id: string;
  quote_id: string;
  version: number;
  party: Party;
  signer_name: string;
  signer_document: string | null;
  signature_image: string;
  doc_hash: string;
  signed_at: string;
  created_by_email: string | null;
  signed_pdf_path: string | null;
  signer_ip?: string | null;
  method?: string | null;
  saved_signature_name?: string | null;
  includes_brand?: boolean | null;
}

export const CONSENT_TEXT =
  'Declaro que li integralmente este contrato e, de forma livre e expressa, confirmo minha assinatura eletrônica nesta versão do documento.';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = (name: string) => supabase.from(name as any) as any;

async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Versão vigente do contrato (cria a versão 1 para contratos antigos). */
export async function currentVersion(q: QuoteRecord): Promise<{ version: number; snapshot: unknown }> {
  const { data } = await t('quote_versions').select('version,snapshot').eq('quote_id', q.id).order('version', { ascending: false }).limit(1).maybeSingle();
  // Mudanças só de status não alteram o conteúdo: usa a última versão de conteúdo
  const { data: content } = await t('quote_versions')
    .select('version,snapshot')
    .eq('quote_id', q.id)
    .neq('change_type', 'status')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (content) return content;
  if (data) return data;
  const { data: auth } = await supabase.auth.getUser();
  const snapshot = { ...q };
  const ins = await t('quote_versions').insert({
    quote_id: q.id, version: 1, change_type: 'criacao', status: q.status, snapshot, total: q.total, pdf_url: q.pdf_url,
    created_by: auth.user?.id ?? null, created_by_email: auth.user?.email ?? null,
  });
  if (ins.error) throw ins.error;
  return { version: 1, snapshot };
}

export async function listSignatures(): Promise<SignatureRow[]> {
  const { data, error } = await t('contract_signatures').select('*').order('signed_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export function toDocSignatures(rows: SignatureRow[]) {
  const pick = (p: Party): DocSignature | undefined => {
    const r = rows.find((s) => s.party === p);
    return r ? { image: r.signature_image, name: r.signer_name, signedAt: r.signed_at, ratio: imgRatio(r.signature_image), document: r.signer_document, ip: r.signer_ip ?? null, code: r.doc_hash || null, includesBrand: !!r.includes_brand } : undefined;
  };
  return { contratante: pick('contratante'), contratada: pick('contratada') };
}

const ratios = new Map<string, number>();
function imgRatio(src: string) {
  return ratios.get(src) || 3;
}
export async function preloadRatios(rows: SignatureRow[]) {
  await Promise.all(
    rows.map(
      (r) =>
        new Promise<void>((res) => {
          if (ratios.has(r.signature_image)) return res();
          const i = new Image();
          i.onload = () => { ratios.set(r.signature_image, i.width / Math.max(1, i.height)); res(); };
          i.onerror = () => res();
          i.src = r.signature_image;
        }),
    ),
  );
}

export async function buildSignedPdf(q: QuoteRecord, sigs: SignatureRow[]) {
  await preloadRatios(sigs);
  const profile = await getCompanyProfile(true);
  const doc = await buildPremiumPDF({ ...recordToDoc(q), showSignatures: true, signatures: toDocSignatures(sigs) }, profile);
  return doc;
}

/** Registra a assinatura, gera o PDF assinado e o guarda em área privada. */
export interface SignMeta { method: 'salva' | 'desenhada'; savedName?: string | null; includesBrand?: boolean }

export async function signContract(q: QuoteRecord, party: Party, signer: { name: string; document?: string }, image: string, existing: SignatureRow[], meta: SignMeta = { method: 'desenhada' }) {
  // A empresa só usa assinatura salva no próprio campo; o cliente sempre desenha
  if (party === 'contratante' && meta.method !== 'desenhada') throw new Error('not-allowed');
  const { version, snapshot } = await currentVersion(q);
  const docHash = await sha256(JSON.stringify(snapshot));
  const { data: auth } = await supabase.auth.getUser();
  const signedAt = new Date().toISOString();
  const others = existing.filter((s) => s.version === version && s.party !== party);
  const draft: SignatureRow = {
    id: 'new', quote_id: q.id, version, party, signer_name: signer.name, signer_document: signer.document || null,
    signature_image: image, doc_hash: docHash, signed_at: signedAt, created_by_email: auth.user?.email ?? null, signed_pdf_path: null,
    includes_brand: party === 'contratada' && !!meta.includesBrand,
  };
  const all = [...others, draft];
  const pdf = await buildSignedPdf(q, all);
  const path = `${q.quote_number}/v${version}-${party}-${Date.now()}.pdf`;
  const up = await supabase.storage.from('signed-contracts').upload(path, pdf.output('blob'), { contentType: 'application/pdf' });
  if (up.error) throw up.error;
  const ins = await t('contract_signatures').insert({
    quote_id: q.id, version, party, signer_name: signer.name, signer_document: signer.document || null,
    signature_image: image, doc_hash: docHash, user_agent: navigator.userAgent.slice(0, 400), consent_text: CONSENT_TEXT,
    signed_at: signedAt, created_by: auth.user?.id ?? null, created_by_email: auth.user?.email ?? null, signed_pdf_path: path,
    method: meta.method, saved_signature_name: meta.savedName ?? null, includes_brand: party === 'contratada' && !!meta.includesBrand,
  });
  if (ins.error) throw ins.error;
  const both = all.some((s) => s.party === 'contratante') && all.some((s) => s.party === 'contratada');
  if (!['em_execucao', 'concluido'].includes(q.status)) {
    await t('quotes').update({ status: both ? 'assinado' : 'aguardando_assinatura', updated_at: new Date().toISOString() }).eq('id', q.id);
  }
  return { both, version };
}

export async function signedPdfBlob(path: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from('signed-contracts').download(path);
  if (error || !data) throw error || new Error('PDF não encontrado');
  return data;
}

/* ---------- Assinatura salva da empresa (área privada) ---------- */
const SIG_BUCKET = 'company-signature';
const SIG_PATH = 'assinatura.png';

export async function uploadCompanySignature(file: File) {
  if (file.type !== 'image/png') throw new Error('Envie um arquivo PNG');
  if (file.size > 10 * 1024 * 1024) throw new Error('A imagem passa de 10 MB.');
  const blob = await compressImage(file, true);
  const { error } = await supabase.storage.from(SIG_BUCKET).upload(SIG_PATH, blob, { upsert: true, contentType: 'image/png', cacheControl: '0' });
  if (error) throw error;
}

export async function getCompanySignature(): Promise<string | null> {
  const { data, error } = await supabase.storage.from(SIG_BUCKET).download(SIG_PATH);
  if (error || !data) return null;
  return await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).replace(/^data:[^;]*;/, 'data:image/png;'));
    r.onerror = rej;
    r.readAsDataURL(data);
  });
}

/* ---------- Várias assinaturas salvas da empresa (bucket privado, só admin) ---------- */
export interface SavedSignature { id: string; name: string; storage_path: string; is_default: boolean; includes_brand: boolean; created_at: string }
export const MAX_SAVED_SIGNATURES = 5;

const blobToDataUrl = (b: Blob) => new Promise<string>((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result).replace(/^data:[^;]*;/, 'data:image/png;'));
  r.onerror = rej;
  r.readAsDataURL(b);
});

export async function listSavedSignatures(): Promise<SavedSignature[]> {
  const { data, error } = await t('company_signatures').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

/** Baixa a imagem da área privada (nunca por link público). */
export async function savedSignatureImage(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(SIG_BUCKET).download(path);
  if (error || !data) return null;
  return blobToDataUrl(data);
}

export async function addSavedSignature(png: Blob, name: string, includesBrand: boolean) {
  const list = await listSavedSignatures();
  if (list.length >= MAX_SAVED_SIGNATURES) throw new Error('limit');
  const path = `salvas/${crypto.randomUUID()}.png`;
  const up = await supabase.storage.from(SIG_BUCKET).upload(path, png, { contentType: 'image/png', cacheControl: '0' });
  if (up.error) throw up.error;
  const { data: auth } = await supabase.auth.getUser();
  const ins = await t('company_signatures').insert({ name: name.trim() || 'Assinatura', storage_path: path, includes_brand: includesBrand, is_default: list.length === 0, created_by: auth.user?.id ?? null });
  if (ins.error) throw ins.error;
}

export async function updateSavedSignature(id: string, patch: Partial<Pick<SavedSignature, 'name' | 'includes_brand'>>) {
  const { error } = await t('company_signatures').update(patch).eq('id', id);
  if (error) throw error;
}

export async function setDefaultSavedSignature(id: string) {
  const a = await t('company_signatures').update({ is_default: false }).neq('id', id);
  if (a.error) throw a.error;
  const b = await t('company_signatures').update({ is_default: true }).eq('id', id);
  if (b.error) throw b.error;
}

/** Remove só a assinatura salva (as já usadas em contratos continuam guardadas neles). */
export async function removeSavedSignature(s: SavedSignature) {
  const { error } = await t('company_signatures').delete().eq('id', s.id);
  if (error) throw error;
  await supabase.storage.from(SIG_BUCKET).remove([s.storage_path]);
  if (s.is_default) {
    const rest = await listSavedSignatures();
    if (rest[0]) await setDefaultSavedSignature(rest[0].id);
  }
}

/** Assina como CONTRATADA com uma assinatura salva — sempre chamado após confirmação de um admin. */
export async function signWithSaved(q: QuoteRecord, saved: SavedSignature, existing: SignatureRow[]) {
  const img = await savedSignatureImage(saved.storage_path);
  if (!img) throw new Error('no-signature');
  const profile = await getCompanyProfile(true);
  const name = (profile.responsible_name || '').trim();
  if (!name) throw new Error('no-name');
  return signContract(q, 'contratada', { name, document: profile.cnpj || undefined }, img, existing, { method: 'salva', savedName: saved.name, includesBrand: saved.includes_brand });
}

/** Aplica a assinatura salva da empresa no campo CONTRATADA. */
export async function applyCompanySignature(q: QuoteRecord, existing: SignatureRow[]) {
  const saved = await listSavedSignatures().catch(() => []);
  const def = saved.find((s) => s.is_default) || saved[0];
  if (def) return signWithSaved(q, def, existing);
  const img = await getCompanySignature();
  if (!img) throw new Error('no-signature');
  const profile = await getCompanyProfile(true);
  const name = (profile.responsible_name || '').trim();
  if (!name) throw new Error('no-name');
  return signContract(q, 'contratada', { name, document: profile.cnpj || undefined }, img, existing, { method: 'salva', savedName: 'Assinatura antiga' });
}
