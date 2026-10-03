import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Download, CheckCircle2, Plus, Minus, Maximize2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getCompanyProfile } from '@/lib/companyProfile';
import { buildPremiumPDF } from '@/lib/premiumPDF';
import { renderPdfPages, extractPdfLines } from '@/components/admin/PdfPagesPreview';
import SignaturePad from '@/components/admin/SignaturePad';
import { recordToDoc, QuoteRecord } from '@/components/admin/QuoteEditor';
import { toDocSignatures, preloadRatios, SignatureRow } from '@/lib/contractSignatures';
import { getBrand } from '@/lib/brand';
import { maskCPF, maskCNPJ, isValidCPF } from '@/lib/masks';

/** Junta linhas quebradas do PDF em parágrafos que se ajustam à tela. */
function toParagraphs(lines: string[]): { text: string; head: boolean }[] {
  const out: { text: string; head: boolean }[] = [];
  const isHead = (l: string) => /^(CL[ÁA]USULA|CONTRATO|ADITIVO|CONTRATANTE|CONTRATADA|PAR[ÁA]GRAFO)/i.test(l) || (l.length < 70 && l === l.toUpperCase() && /[A-ZÀ-Ú]/.test(l));
  for (const l of lines) {
    const prev = out[out.length - 1];
    const head = isHead(l);
    if (prev && !prev.head && !head && !/[.:;!?]$/.test(prev.text) && /^[a-zà-ú0-9(,]/.test(l)) prev.text += ' ' + l;
    else out.push({ text: l, head });
  }
  return out;
}

type View = {
  state: 'ok' | 'signed' | 'expired' | 'revoked' | 'invalid';
  kind?: 'sign' | 'download';
  quote_number?: string;
  record?: QuoteRecord;
  signatures?: (Pick<SignatureRow, 'party' | 'signer_name' | 'signature_image' | 'signed_at' | 'signer_document' | 'doc_hash'> & { signer_ip?: string | null })[];
  has_pdf?: boolean;
  client_ip?: string | null;
  doc_code?: string;
};

const call = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke('contract-link', { body });
  if (error) {
    // corpo de erro (ex.: CPF não confere)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = (error as any).context;
    try { return await ctx.json(); } catch { throw error; }
  }
  return data;
};

const asSigRows = (v: View) => (v.signatures || []).map((s) => ({ ...s, id: s.party, quote_id: '', version: 0, signer_document: s.signer_document ?? null, doc_hash: s.doc_hash || '', created_by_email: null, signed_pdf_path: null })) as SignatureRow[];

async function buildPdf(v: View, extra?: SignatureRow) {
  const rows = [...asSigRows(v), ...(extra ? [extra] : [])];
  await preloadRatios(rows);
  const profile = await getCompanyProfile(true);
  return buildPremiumPDF({ ...recordToDoc(v.record as QuoteRecord), showSignatures: true, signatures: toDocSignatures(rows) }, profile);
}

export default function ContractLink() {
  const { token = '' } = useParams();
  const [view, setView] = useState<View | null>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [textPages, setTextPages] = useState<string[][]>([]);
  const [font, setFont] = useState(17);
  const [full, setFull] = useState(false);
  const [readToEnd, setReadToEnd] = useState(false);
  const [name, setName] = useState('');
  const [doc, setDoc] = useState('');
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pad, setPad] = useState(false);
  const [done, setDone] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const brand = getBrand().name;

  const load = async () => {
    const v: View = await call({ action: 'view', token }).catch(() => ({ state: 'invalid' }));
    setView(v);
    if (v.record) {
      setName((n) => n || v.record!.customer_name || '');
      const pdf = await buildPdf(v);
      const blob = pdf.output('blob');
      setTextPages(await extractPdfLines(blob).catch(() => []));
      setPages(await renderPdfPages(blob, 1.5));
    }
  };
  useEffect(() => { load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Botão só libera depois de rolar até o fim do contrato
  useEffect(() => {
    if (!endRef.current || pages.length === 0) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && setReadToEnd(true), { threshold: 0.5 });
    io.observe(endRef.current);
    return () => io.disconnect();
  }, [pages.length]);

  const downloadSigned = async () => {
    const r = await call({ action: 'pdf', token });
    if (r?.url) window.location.href = r.url;
    else if (view) {
      const pdf = await buildPdf(view);
      pdf.save(`contrato-${view.quote_number}-assinado.pdf`);
    }
  };

  const start = () => {
    setErr(null);
    const d = doc.replace(/\D/g, '');
    const c = view?.record?.customer as unknown as Record<string, unknown> | undefined;
    const r = view?.record as unknown as Record<string, unknown> | undefined;
    const expected = [c?.cpf, c?.cnpj, r?.customer_cpf, r?.customer_cnpj].map((x) => String(x ?? '').replace(/\D/g, '')).filter(Boolean);
    if (d.length === 11 && !isValidCPF(d)) return setErr('CPF inválido. Confira os números.');
    if (!d || !expected.includes(d)) return setErr(`Os dados não conferem com os do contrato. Fale com a ${brand}.`);
    setPad(true);
  };

  const confirm = async (png: string) => {
    if (!view) return;
    const draft = { id: 'new', quote_id: '', version: 0, party: 'contratante', signer_name: name.trim(), signer_document: doc, signer_ip: view.client_ip ?? null, signature_image: png, doc_hash: view.doc_code || '', signed_at: new Date().toISOString(), created_by_email: null, signed_pdf_path: null } as SignatureRow;
    const pdf = await buildPdf(view, draft);
    const b64 = (pdf.output('datauristring') as string).split(',')[1];
    const r = await call({ action: 'sign', token, name: name.trim(), document: doc, accepted: ok, image: png, pdf_base64: b64 });
    setPad(false);
    if (r?.error === 'mismatch') return setErr(`Os dados não conferem com os do contrato. Fale com a ${brand}.`);
    if (r?.state === 'expired') return setView({ state: 'expired' });
    if (r?.state !== 'signed') return setErr('Não foi possível registrar a assinatura. Tente de novo.');
    setDone(true);
    load();
  };

  if (!view) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const msg: Record<string, string> = {
    expired: `Este link expirou. Peça um novo à ${brand}.`,
    revoked: `Este link foi cancelado. Peça um novo à ${brand}.`,
    invalid: `Link inválido. Peça um novo à ${brand}.`,
  };
  if (msg[view.state]) return <div className="max-w-md mx-auto text-center py-16 text-lg">{msg[view.state]}</div>;

  const signed = view.state === 'signed';
  const canSign = view.kind === 'sign' && !signed;

  return (
    <div className="max-w-3xl mx-auto w-full min-w-0 space-y-4">
      <h1 className="text-xl md:text-2xl font-bold">Contrato {view.quote_number}</h1>
      {(done || signed) && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          {done && <p className="font-semibold flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-promo" />✅ Contrato assinado com sucesso</p>}
          <Button className="w-full min-h-12" onClick={downloadSigned}><Download className="h-4 w-4 mr-2" />Baixar o PDF assinado</Button>
        </div>
      )}
      {canSign && <p className="text-sm text-muted-foreground">Leia o contrato inteiro até o fim. O botão de assinar libera depois disso.</p>}

      <div className="sticky top-0 z-10 flex items-center gap-2 rounded-lg border border-border bg-card p-2">
        <span className="text-sm text-muted-foreground mr-auto">Tamanho da letra</span>
        <Button variant="outline" size="icon" className="h-11 w-11" aria-label="Diminuir letra" onClick={() => setFont((f) => Math.max(13, f - 2))}><Minus className="h-5 w-5" /></Button>
        <Button variant="outline" size="icon" className="h-11 w-11" aria-label="Aumentar letra" onClick={() => setFont((f) => Math.min(28, f + 2))}><Plus className="h-5 w-5" /></Button>
        <Button variant="outline" className="h-11" disabled={pages.length === 0} onClick={() => setFull(true)}><Maximize2 className="h-4 w-4 mr-1" />PDF</Button>
      </div>
      <div className="rounded-lg border border-border bg-card p-4 md:p-6">
        {textPages.length === 0 && pages.length === 0 ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : textPages.some((p) => p.length) ? (
          <article className="space-y-3 break-words text-foreground" style={{ fontSize: font, lineHeight: 1.6 }}>
            {textPages.map((lines, i) => toParagraphs(lines).map((p, j) => (
              p.head ? <h2 key={`${i}-${j}`} className="font-bold pt-2">{p.text}</h2> : <p key={`${i}-${j}`}>{p.text}</p>
            )))}
          </article>
        ) : (
          pages.map((src, i) => <img key={i} src={src} alt={`Página ${i + 1} do contrato`} className="w-full h-auto border border-border" />)
        )}
        <div ref={endRef} className="h-2" />
      </div>

      {canSign && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div>
            <Label htmlFor="sg-name">Nome completo</Label>
            <Input id="sg-name" className="mt-1 min-h-11" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="sg-doc">CPF ou CNPJ</Label>
            <Input id="sg-doc" className="mt-1 min-h-11" inputMode="numeric" value={doc} placeholder="000.000.000-00" onChange={(e) => { const x = e.target.value.replace(/\D/g, ''); setDoc(x.length > 11 ? maskCNPJ(x) : maskCPF(x)); }} />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1 h-5 w-5" checked={ok} onChange={(e) => setOk(e.target.checked)} />
            <span>Li e concordo com os termos deste contrato</span>
          </label>
          {err && <p className="text-sm text-destructive font-medium">{err}</p>}
          <Button className="w-full min-h-12 font-bold" disabled={!readToEnd || !ok || name.trim().length < 3 || doc.replace(/\D/g, '').length < 11} onClick={start}>
            {readToEnd ? '✍️ Assinar contrato' : 'Role até o fim do contrato para assinar'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Assinatura eletrônica simples (desenho na tela), registrada com data, hora, IP, aparelho e código de integridade do documento. Não equivale a certificado digital ICP-Brasil.
          </p>
        </div>
      )}

      {full && (
        <div className="fixed inset-0 z-50 bg-background overflow-auto">
          <div className="sticky top-0 flex justify-between items-center p-2 bg-card border-b border-border">
            <span className="font-semibold">Contrato {view.quote_number}</span>
            <Button variant="outline" className="h-11" onClick={() => setFull(false)}><X className="h-4 w-4 mr-1" />Fechar</Button>
          </div>
          <div className="p-2 space-y-2">
            {pages.map((src, i) => <img key={i} src={src} alt={`Página ${i + 1} do contrato`} className="w-full max-w-4xl mx-auto h-auto border border-border" />)}
          </div>
        </div>
      )}

      {pad && (
        <SignaturePad
          title="CONTRATANTE"
          signerName={name.trim()}
          contractLabel={`Contrato ${view.quote_number}`}
          onCancel={() => setPad(false)}
          onConfirm={confirm}
        />
      )}
    </div>
  );
}
