import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Download, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getCompanyProfile } from '@/lib/companyProfile';
import { buildPremiumPDF } from '@/lib/premiumPDF';
import { renderPdfPages } from '@/components/admin/PdfPagesPreview';
import SignaturePad from '@/components/admin/SignaturePad';
import { recordToDoc, QuoteRecord } from '@/components/admin/QuoteEditor';
import { toDocSignatures, preloadRatios, SignatureRow } from '@/lib/contractSignatures';
import { getBrand } from '@/lib/brand';

type View = {
  state: 'ok' | 'signed' | 'expired' | 'revoked' | 'invalid';
  kind?: 'sign' | 'download';
  quote_number?: string;
  record?: QuoteRecord;
  signatures?: Pick<SignatureRow, 'party' | 'signer_name' | 'signature_image' | 'signed_at'>[];
  has_pdf?: boolean;
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

const asSigRows = (v: View) => (v.signatures || []).map((s) => ({ ...s, id: s.party, quote_id: '', version: 0, signer_document: null, doc_hash: '', created_by_email: null, signed_pdf_path: null })) as SignatureRow[];

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
      setPages(await renderPdfPages(pdf.output('blob'), 1.5));
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
    if (!d || !expected.includes(d)) return setErr(`Os dados não conferem com os do contrato. Fale com a ${brand}.`);
    setPad(true);
  };

  const confirm = async (png: string) => {
    if (!view) return;
    const draft = { id: 'new', quote_id: '', version: 0, party: 'contratante', signer_name: name.trim(), signer_document: doc, signature_image: png, doc_hash: '', signed_at: new Date().toISOString(), created_by_email: null, signed_pdf_path: null } as SignatureRow;
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

      <div className="rounded-lg border border-border bg-card p-2 space-y-2">
        {pages.length === 0 ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
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
            <Input id="sg-doc" className="mt-1 min-h-11" inputMode="numeric" value={doc} onChange={(e) => setDoc(e.target.value)} />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1 h-5 w-5" checked={ok} onChange={(e) => setOk(e.target.checked)} />
            <span>Li integralmente o contrato e concordo com todas as suas cláusulas</span>
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
