import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Download, CheckCircle2, Plus, Minus, Maximize2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getCompanyProfile, defaultCompanyProfile, type CompanyProfile } from '@/lib/companyProfile';
import { executionTermText, partyDoc, partiesText, paymentSentence, resolveContractText, customerAddress, fmtPhoneBR, fmtCpfCnpj, type PremiumDocData } from '@/lib/docModel';
import { cleanItemName } from '@/lib/docScope';
import { HIGHLIGHT_END, HIGHLIGHT_START, VERSION_LINE } from '@/lib/contractClauses';
import { buildPremiumPDF } from '@/lib/premiumPDF';
import { renderPdfPages } from '@/components/admin/PdfPagesPreview';
import SignaturePad from '@/components/admin/SignaturePad';
import { recordToDoc, QuoteRecord } from '@/components/admin/QuoteEditor';
import { toDocSignatures, preloadRatios, SignatureRow } from '@/lib/contractSignatures';
import { getBrand } from '@/lib/brand';
import { maskCPF, maskCNPJ, isValidCPF } from '@/lib/masks';
import { AWARENESS_TEXT } from '@/lib/contractClauses';

/** Contrato para leitura no celular, montado direto dos dados (não do texto do PDF). */
function ContractReader({ d, profile, font }: { d: PremiumDocData; profile: CompanyProfile; font: number }) {
  const c = d.customer;
  const pd = partyDoc(c);
  const Row = ({ l, v }: { l: string; v?: string | null }) => (v && String(v).trim() ? <p><strong>{l}:</strong> {v}</p> : null);
  const lines = resolveContractText(d).split('\n');
  let inBox = false;
  const blocks: { box: boolean; lines: string[] }[] = [];
  lines.forEach((raw) => {
    const l = raw.trim();
    if (l === HIGHLIGHT_START) { inBox = true; blocks.push({ box: true, lines: [] }); return; }
    if (l === HIGHLIGHT_END) { inBox = false; blocks.push({ box: false, lines: [] }); return; }
    if (!blocks.length) blocks.push({ box: inBox, lines: [] });
    if (l && !VERSION_LINE.test(l)) blocks[blocks.length - 1].lines.push(l);
  });
  const isHead = (l: string) => /^CL[ÁA]USULA\s/i.test(l);
  return (
    <article className="space-y-4 break-words text-foreground" style={{ fontSize: font, lineHeight: 1.6 }}>
      <section className="rounded-md border border-border p-3 space-y-0.5">
        <h2 className="font-bold">DADOS DO CLIENTE / CONTRATANTE</h2>
        {pd.label === 'CNPJ' ? (
          <>
            <Row l="Razão social" v={c.name} />
            <Row l="CNPJ" v={pd.value} />
            <Row l="Representante" v={c.representative} />
            <Row l="Cargo" v={c.representativeRole} />
            <Row l="CPF do representante" v={c.representativeCpf ? fmtCpfCnpj(c.representativeCpf) : ""} />
          </>
        ) : (
          <>
            <Row l="Nome" v={c.name} />
            <Row l="CPF" v={pd.value} />
          </>
        )}
        <Row l="Telefone" v={fmtPhoneBR(c.phone || c.whatsapp)} />
        <Row l="E-mail" v={c.email} />
        <Row l="Endereço" v={customerAddress(c)} />
        <Row l="Instalação" v={!c.installSame && c.installAddress?.trim() ? c.installAddress : 'No mesmo endereço do cliente'} />
      </section>
      <section className="rounded-md border border-border p-3 space-y-0.5">
        <h2 className="font-bold">DADOS DA {(profile.name || '').toUpperCase()}</h2>
        <Row l="CNPJ" v={fmtCpfCnpj(profile.cnpj)} />
        <Row l="Telefone" v={fmtPhoneBR(profile.phone)} />
        <Row l="E-mail" v={profile.email} />
        <Row l="Responsável" v={profile.responsible_name} />
      </section>
      {executionTermText(d) && <p><strong>Prazo de execução:</strong> {executionTermText(d)}</p>}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left" style={{ fontSize: Math.max(13, font - 2) }}>
          <thead><tr className="border-b-2 border-border"><th className="p-1.5">Item</th><th className="p-1.5">Descrição</th><th className="p-1.5 text-center">Quant.</th></tr></thead>
          <tbody>
            {d.items.map((it, i) => (
              <tr key={i} className="border-b border-border align-top">
                <td className="p-1.5">{String(i + 1).padStart(2, '0')}</td>
                <td className="p-1.5">{cleanItemName(it.description)}{it.kind === 'service' ? ' (Serviço Técnico Especializado)' : ''}</td>
                <td className="p-1.5 text-center">{it.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>{partiesText(d, profile)}</p>
      {blocks.filter((b) => b.lines.length).map((b, i) => (
        <div key={i} className={b.box ? 'rounded-md border-2 border-destructive p-3 space-y-2 font-semibold' : 'space-y-2'}>
          {b.box && <p className="font-bold text-destructive">⚠️ CLÁUSULAS DE ATENÇÃO — LEIA COM CUIDADO</p>}
          {b.lines.map((l, j) => (isHead(l) ? <h2 key={j} className="font-bold pt-2">{l}</h2> : <p key={j}>{l}</p>))}
        </div>
      ))}
      {d.payment?.method && (
        <section className="rounded-md border border-border p-3">
          <h2 className="font-bold">CONDIÇÕES DE PAGAMENTO</h2>
          <p>{paymentSentence(d)}</p>
        </section>
      )}
    </article>
  );
}

/** Se a montagem do texto quebrar, mostra o motivo e "Tentar de novo" em vez de tela branca ou bolinha. */
class ReaderBoundary extends Component<{ onRetry: () => void; children: ReactNode }, { err: string | null }> {
  state = { err: null as string | null };
  static getDerivedStateFromError(e: unknown) { return { err: e instanceof Error ? e.message : String(e) }; }
  componentDidCatch(e: unknown) { console.error('[contrato] passo 3 (montar texto) falhou', e); }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="text-center space-y-3 py-6" role="alert">
        <p className="font-semibold">Não foi possível mostrar o texto do contrato.</p>
        <p className="text-sm text-muted-foreground">Motivo: {this.state.err}</p>
        <Button className="min-h-12" onClick={() => { this.setState({ err: null }); this.props.onRetry(); }}>Tentar de novo</Button>
      </div>
    );
  }
}

const withTimeout = <T,>(p: Promise<T>, ms: number, what: string) =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`${what} demorou mais de ${Math.round(ms / 1000)} s`)), ms))]);

type View = {
  state: 'ok' | 'signed' | 'expired' | 'revoked' | 'invalid';
  kind?: 'sign' | 'download';
  quote_number?: string;
  record?: QuoteRecord;
  signatures?: (Pick<SignatureRow, 'party' | 'signer_name' | 'signature_image' | 'signed_at' | 'signer_document' | 'doc_hash' | 'awareness_accepted' | 'image_use_authorized'> & { signer_ip?: string | null })[];
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
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [font, setFont] = useState(17);
  const [full, setFull] = useState(false);
  const [readToEnd, setReadToEnd] = useState(false);
  const [name, setName] = useState('');
  const [doc, setDoc] = useState('');
  const [role, setRole] = useState('');
  const [ok, setOk] = useState(false);
  const [aware, setAware] = useState(false);
  const [imageUse, setImageUse] = useState<boolean | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pad, setPad] = useState(false);
  const [done, setDone] = useState(false);
  const [netFail, setNetFail] = useState<string | null>(null);
  const [pdfErr, setPdfErr] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const brand = getBrand().name;
  const isPJ = doc.replace(/\D/g, '').length > 11;

  const load = async () => {
    setNetFail(null);
    setPdfErr(null);
    const t0 = performance.now();
    const ms = () => `${Math.round(performance.now() - t0)} ms`;
    // Dados da empresa em paralelo com o contrato (não espera um pelo outro; nunca trava)
    const profP = withTimeout(getCompanyProfile(), 4000, 'Dados da empresa').catch((e) => {
      console.warn('[contrato] dados da empresa: usando padrão', e);
      return defaultCompanyProfile;
    });
    // Passo 1: buscar o contrato. Até 3 tentativas, cada uma com limite de 10 s
    let v: View | null = null;
    let reason = '';
    for (let i = 0; i < 3 && !v; i++) {
      try {
        const r = await withTimeout(call({ action: 'view', token }) as Promise<View & { error?: string }>, 10000, 'A conexão');
        if (r && typeof r === 'object' && 'state' in r) v = r;
        else throw new Error(r?.error ? `servidor respondeu "${r.error}"` : 'resposta vazia do servidor');
      } catch (e) {
        reason = e instanceof Error ? e.message : String(e);
        console.warn(`[contrato] passo 1 (buscar contrato) tentativa ${i + 1}/3 falhou:`, reason);
        if (i < 2) await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
      }
    }
    if (!v) { setNetFail(reason || 'sem resposta'); return; }
    console.info(`[contrato] passo 1 ok (${ms()}): estado=${v.state}, tem dados=${!!v.record}`);
    if (v.state === 'ok' || v.state === 'signed') {
      if (!v.record) { setNetFail('o servidor não enviou os dados do contrato'); return; }
    }
    setView(v);
    if (v.record) {
      // CPF/CNPJ já vem do cadastro do cliente
      const cu = (v.record.customer || {}) as unknown as Record<string, unknown>;
      const r = v.record as unknown as Record<string, unknown>;
      const known = String(cu.cnpj || r.customer_cnpj || cu.cpf || r.customer_cpf || '').replace(/\D/g, '');
      if (known) setDoc((x) => x || (known.length > 11 ? maskCNPJ(known) : maskCPF(known)));
      // Pessoa jurídica: quem assina é o representante, com o cargo dele
      const pj = known.length > 11;
      setName((n) => n || (pj ? String(cu.representative || '') : '') || v.record!.customer_name || '');
      if (pj) setRole((x) => x || String(cu.representativeRole || ''));
      // Texto do contrato aparece na hora; o PDF é montado depois, sem travar a tela
      // Passo 2: dados da empresa (no máximo 4 s; se falhar usa o padrão)
      setProfile(await profP);
      console.info(`[contrato] passo 2 ok (${ms()}): texto na tela`);
      // Passo 4: PDF em segundo plano, com limite de tempo. Não trava o texto nem o botão
      const vv = v;
      setTimeout(async () => {
        try {
          const pdf = await withTimeout(buildPdf(vv), 30000, 'O PDF');
          setPages(await withTimeout(renderPdfPages(pdf.output('blob'), 1.5), 20000, 'A imagem do PDF'));
          console.info(`[contrato] passo 4 ok (${ms()}): PDF pronto`);
        } catch (e) {
          console.error('[contrato] passo 4 (PDF) falhou — o texto continua na tela', e);
          setPdfErr(e instanceof Error ? e.message : String(e));
        }
      }, 50);
    }
  };
  useEffect(() => { load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Botão só libera depois de rolar até o fim do contrato
  // (passo 5: detecção de rolagem — observador + rolagem, para funcionar em qualquer navegador)
  useEffect(() => {
    const el = endRef.current;
    if (!el || (!profile && pages.length === 0)) return;
    const check = () => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight + 40) setReadToEnd(true);
    };
    let io: IntersectionObserver | null = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && setReadToEnd(true), { threshold: 0 });
      io.observe(el);
    }
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    const t = setTimeout(check, 300);
    return () => { io?.disconnect(); window.removeEventListener('scroll', check); window.removeEventListener('resize', check); clearTimeout(t); };
  }, [pages.length, profile, view, retryKey]);

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
    const draft = { id: 'new', quote_id: '', version: 0, party: 'contratante', signer_name: name.trim(), signer_document: doc, signer_role: isPJ ? role.trim() || null : null, signer_ip: view.client_ip ?? null, signature_image: png, doc_hash: view.doc_code || '', signed_at: new Date().toISOString(), created_by_email: null, signed_pdf_path: null, awareness_accepted: true, image_use_authorized: imageUse } as SignatureRow;
    let r: { error?: string; state?: string } | null = null;
    try {
    const pdf = await buildPdf(view, draft);
    const b64 = (pdf.output('datauristring') as string).split(',')[1];
    r = await call({ action: 'sign', token, name: name.trim(), document: doc, role: isPJ ? role.trim() || undefined : undefined, accepted: ok, awareness: aware, awareness_text: AWARENESS_TEXT, image_use: imageUse, image: png, pdf_base64: b64 });
    } catch (e) { console.error('[contrato] assinatura falhou', e); }
    setPad(false);
    if (r?.error === 'mismatch') return setErr(`Os dados não conferem com os do contrato. Fale com a ${brand}.`);
    if (r?.state === 'expired') return setView({ state: 'expired' });
    if (r?.state !== 'signed') return setErr('Não foi possível registrar a assinatura. Tente de novo.');
    setDone(true);
    load();
  };

  if (netFail) return (
    <div className="max-w-md mx-auto text-center py-16 space-y-4 px-4">
      <p className="text-lg font-semibold">Não foi possível abrir o contrato.</p>
      <p className="text-muted-foreground">Tentamos 3 vezes. Motivo: {netFail}. Confira a internet e toque abaixo.</p>
      <Button className="w-full min-h-12" onClick={() => load()}>Tentar de novo</Button>
    </div>
  );
  if (!view) return (
    <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground" role="status">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="text-sm">Abrindo o contrato…</span>
    </div>
  );

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
        {view.record && profile ? (
          <ReaderBoundary key={retryKey} onRetry={() => setRetryKey((k) => k + 1)}>
            <ContractReader d={recordToDoc(view.record)} profile={profile} font={font} />
          </ReaderBoundary>
        ) : pages.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground" role="status"><Loader2 className="h-6 w-6 animate-spin text-primary" />Carregando o texto…</div>
        ) : (
          pages.map((src, i) => <img key={i} src={src} alt={`Página ${i + 1} do contrato`} className="w-full h-auto border border-border" />)
        )}
        <div ref={endRef} className="h-2" />
      </div>
      {pdfErr && <p className="text-xs text-muted-foreground">A versão em PDF não abriu ({pdfErr}). O texto acima é o contrato completo e você pode assinar normalmente.</p>}

      {canSign && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div>
            <Label htmlFor="sg-name">{isPJ ? 'Nome do representante' : 'Nome completo'}</Label>
            <Input id="sg-name" className="mt-1 min-h-11" value={name} onChange={(e) => setName(e.target.value)} />
            {name.trim().length < 3 && <p className="text-sm text-muted-foreground mt-1">Escreva o nome de quem está assinando.</p>}
          </div>
          {isPJ && (
            <div>
              <Label htmlFor="sg-role">Cargo (opcional)</Label>
              <Input id="sg-role" className="mt-1 min-h-11" value={role} placeholder="Ex.: Sócio-administrador" onChange={(e) => setRole(e.target.value)} />
            </div>
          )}
          <div>
            <Label htmlFor="sg-doc">CPF ou CNPJ</Label>
            {!doc && <p className="text-sm text-destructive mt-1">O cadastro não tem CPF/CNPJ. Preencha com o documento do contrato.</p>}
            <Input id="sg-doc" className="mt-1 min-h-11" inputMode="numeric" value={doc} placeholder="000.000.000-00" onChange={(e) => { const x = e.target.value.replace(/\D/g, ''); setDoc(x.length > 11 ? maskCNPJ(x) : maskCPF(x)); }} />
          </div>
          <div className="rounded-md border-2 border-destructive p-3 space-y-2">
            <p className="text-sm font-bold">⚠️ Cláusulas de atenção</p>
            <label className="flex items-start gap-2 text-sm font-semibold">
              <input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={aware} onChange={(e) => setAware(e.target.checked)} />
              <span>Declaro que li e compreendi as cláusulas 6ª a 9ª (quadro “Cláusulas de atenção”), especialmente quanto às exclusões de garantia, às limitações do sistema, à propriedade dos equipamentos até a quitação e à minha responsabilidade pelo posicionamento das câmeras.</span>
            </label>
          </div>
          <fieldset className="space-y-1">
            <legend className="text-sm font-medium">Fotos do local para divulgação (antes e depois) — opcional</legend>
            <label className="flex items-center gap-2 text-sm min-h-11"><input type="radio" name="img-use" className="h-5 w-5" checked={imageUse === true} onChange={() => setImageUse(true)} />Autorizo</label>
            <label className="flex items-center gap-2 text-sm min-h-11"><input type="radio" name="img-use" className="h-5 w-5" checked={imageUse === false} onChange={() => setImageUse(false)} />Não autorizo</label>
          </fieldset>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1 h-5 w-5" checked={ok} onChange={(e) => setOk(e.target.checked)} />
            <span>Li e concordo com os termos deste contrato</span>
          </label>
          {err && <p className="text-sm text-destructive font-medium">{err}</p>}
          <Button className="w-full min-h-12 font-bold" disabled={!readToEnd || !ok || !aware || name.trim().length < 3 || doc.replace(/\D/g, '').length < 11} onClick={start}>
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
