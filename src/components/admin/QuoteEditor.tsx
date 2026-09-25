import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2, Eye, Loader2, Download, Printer, Share2, Pencil, FileCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { getCompanyProfile } from '@/lib/companyProfile';
import { formatBRL } from '@/lib/formatCurrency';
import {
  buildPremiumPDF,
  computeTotals,
  DocCustomer,
  DocItem,
  DocType,
  DOC_TYPE_LABELS,
  lineTotal,
  nextDocNumber,
  PaymentMethod,
  PAYMENT_LABELS,
  PremiumDocData,
  uploadPDF,
  validateDoc,
  WarrantyOption,
  WARRANTY_LABELS,
} from '@/lib/premiumPDF';

export interface QuoteRecord {
  id: string;
  quote_number: string;
  doc_type: string;
  status: string;
  service_title: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  customer: DocCustomer;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[];
  discount: number;
  shipping_fee: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payment: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warranty: any;
  notes: string | null;
  validity_days: number | null;
  show_signatures: boolean;
  total: number;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

/** Converte um registro salvo para os dados do PDF (aceita orçamentos antigos do carrinho) */
export function recordToDoc(r: QuoteRecord): PremiumDocData {
  const customer: DocCustomer = {
    name: r.customer_name,
    email: r.customer_email || undefined,
    phone: r.customer_phone || undefined,
    ...(r.customer || {}),
  };
  return {
    docType: (r.doc_type as DocType) || 'orcamento',
    number: r.quote_number,
    date: new Date(r.created_at),
    validityDays: r.validity_days ?? 15,
    serviceTitle: r.service_title || '',
    customer,
    items: (r.items || []).map((i) => ({
      description: i.description ?? i.name ?? '',
      quantity: Number(i.quantity) || 0,
      unitPrice: Number(i.unitPrice ?? i.price) || 0,
      kind: i.kind === 'service' ? 'service' : 'product',
      imageUrl: i.imageUrl || undefined,
    })),
    discount: Number(r.discount) || 0,
    shipping: Number(r.shipping_fee) || 0,
    payment: r.payment || { method: '' },
    warranty: r.warranty || { option: '' },
    notes: r.notes || '',
    showSignatures: !!r.show_signatures,
  };
}

const SERVICE_SUGGESTIONS = [
  'INSTALAÇÃO E CONFIGURAÇÃO DE SISTEMA DE CFTV',
  'INSTALAÇÃO DE CÂMERAS',
  'MANUTENÇÃO CFTV',
  'TROCA DE HD',
  'INSTALAÇÃO DE DVR',
  'MANUTENÇÃO PREVENTIVA',
];
const LABOR_SUGGESTIONS = [
  'Mão de obra — Instalação por câmera',
  'Troca de câmera',
  'Manutenção',
  'Configuração',
  'Visita técnica',
  'Reparo',
  'Serviço adicional',
];

const selectCls = 'w-full h-10 rounded-md border border-input bg-background px-3 text-sm';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  record?: QuoteRecord | null;
  /** 'edit' abre o formulário; 'preview' abre direto na pré-visualização */
  mode?: 'edit' | 'preview';
  duplicate?: boolean;
  onSaved: () => void;
}

export default function QuoteEditor({ open, onOpenChange, record, mode = 'edit', duplicate, onSaved }: Props) {
  const [data, setData] = useState<PremiumDocData | null>(null);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [status, setStatus] = useState('rascunho');
  const [step, setStep] = useState<'edit' | 'preview'>('edit');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const { data: products = [] } = useQuery({
    queryKey: ['quote-editor-products'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('id,title,price,image_url,sku').order('title');
      return data || [];
    },
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    (async () => {
      const profile = await getCompanyProfile(true);
      if (record) {
        const d = recordToDoc(record);
        if (duplicate) {
          d.number = '';
          d.date = new Date();
        }
        setData(d);
        setRecordId(duplicate ? null : record.id);
        setStatus(duplicate ? 'rascunho' : record.status || 'rascunho');
        setPdfUrl(duplicate ? null : record.pdf_url);
      } else {
        setData({
          docType: 'orcamento',
          number: '',
          date: new Date(),
          validityDays: profile.quote_validity_days || 15,
          serviceTitle: '',
          customer: { name: '' },
          items: [{ description: '', quantity: 1, unitPrice: 0, kind: 'product' }],
          discount: 0,
          shipping: 0,
          payment: { method: '' },
          warranty: {
            option: (profile.default_warranty as WarrantyOption) || '',
            text: profile.default_warranty_text,
          },
          notes: '',
          showSignatures: false,
        });
        setRecordId(null);
        setStatus('rascunho');
        setPdfUrl(null);
      }
      setErrors([]);
      setStep('edit');
      if (record && mode === 'preview' && !duplicate) {
        const d = recordToDoc(record);
        await renderPreview(d);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, record, duplicate, mode]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const totals = useMemo(() => (data ? computeTotals(data) : null), [data]);

  if (!data || !totals) return null;

  const set = <K extends keyof PremiumDocData>(k: K, v: PremiumDocData[K]) => setData({ ...data, [k]: v });
  const setC = (k: keyof DocCustomer, v: string) => setData({ ...data, customer: { ...data.customer, [k]: v } });
  const setItem = (i: number, patch: Partial<DocItem>) =>
    setData({ ...data, items: data.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });

  async function renderPreview(d: PremiumDocData) {
    setBusy(true);
    try {
      const profile = await getCompanyProfile(true);
      const doc = await buildPremiumPDF({ ...d, number: d.number || 'MR-XXXX-XXXX' }, profile);
      const blob = doc.output('blob');
      setPreviewBlob(blob);
      setPreviewUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(blob);
      });
      setStep('preview');
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao montar a pré-visualização', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  const handlePreview = () => {
    const errs = validateDoc(data);
    setErrors(errs);
    if (errs.length) {
      toast({ title: 'Faltam informações', description: errs[0], variant: 'destructive' });
      return;
    }
    renderPreview(data);
  };

  const handleGenerate = async () => {
    const errs = validateDoc(data);
    if (errs.length) {
      setErrors(errs);
      setStep('edit');
      return;
    }
    setBusy(true);
    try {
      const number = data.number || (await nextDocNumber());
      const final = { ...data, number };
      const profile = await getCompanyProfile(true);
      const doc = await buildPremiumPDF(final, profile);
      const url = await uploadPDF(doc, number);
      const t = computeTotals(final);
      const { data: auth } = await supabase.auth.getUser();
      const payload = {
        quote_number: number,
        doc_type: final.docType,
        status,
        service_title: final.serviceTitle || null,
        customer_name: final.customer.name.trim(),
        customer_email: final.customer.email?.trim() || '',
        customer_phone: final.customer.phone?.trim() || final.customer.whatsapp?.trim() || null,
        customer_cpf: final.customer.cpf || null,
        customer_cnpj: final.customer.cnpj || null,
        customer_whatsapp: final.customer.whatsapp || null,
        customer_address: [final.customer.street, final.customer.number, final.customer.district, final.customer.city]
          .filter(Boolean)
          .join(', ') || null,
        customer: final.customer,
        items: final.items.map((i) => ({
          name: i.description,
          description: i.description,
          quantity: Number(i.quantity),
          price: Number(i.unitPrice),
          unitPrice: Number(i.unitPrice),
          total: lineTotal(i),
          kind: i.kind || 'product',
          imageUrl: i.imageUrl || null,
        })),
        subtotal: t.products + t.services,
        labor_total: t.services,
        discount: t.discount,
        shipping_fee: t.shipping,
        total: t.total,
        payment: final.payment || {},
        warranty: final.warranty || {},
        notes: final.notes || null,
        validity_days: final.validityDays || null,
        show_signatures: !!final.showSignatures,
        pdf_url: url,
        updated_at: new Date().toISOString(),
        created_by: auth.user?.id ?? null,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const q = supabase.from('quotes') as any;
      const res = recordId
        ? await q.update(payload).eq('id', recordId).select('id').maybeSingle()
        : await q.insert(payload).select('id').maybeSingle();
      if (res.error) throw res.error;
      setRecordId(res.data?.id ?? recordId);
      setData(final);
      setPdfUrl(url);
      const blob = doc.output('blob');
      setPreviewBlob(blob);
      setPreviewUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(blob);
      });
      setStep('preview');
      onSaved();
      toast({ title: 'PDF gerado e salvo', description: `${DOC_TYPE_LABELS[final.docType]} ${number}` });
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao salvar', description: 'Verifique suas permissões de administrador.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const fileName = `${DOC_TYPE_LABELS[data.docType].toLowerCase().replace(/\s+/g, '-')}-${data.number || 'previa'}.pdf`;

  const handleDownload = () => {
    if (!previewUrl) return;
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = fileName;
    a.click();
  };

  const handlePrint = () => {
    const frame = document.getElementById('quote-preview-frame') as HTMLIFrameElement | null;
    try {
      frame?.contentWindow?.focus();
      frame?.contentWindow?.print();
    } catch {
      if (previewUrl) window.open(previewUrl, '_blank');
    }
  };

  const handleShare = async () => {
    const phone = (data.customer.whatsapp || data.customer.phone || '').replace(/\D/g, '');
    if (previewBlob && navigator.canShare) {
      const file = new File([previewBlob], fileName, { type: 'application/pdf' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: fileName });
          return;
        } catch {
          /* cancelado */
        }
      }
    }
    const profile = await getCompanyProfile();
    const msg =
      `🛡️ *${profile.name}*\n\n📄 *${DOC_TYPE_LABELS[data.docType].toUpperCase()} Nº ${data.number || ''}*\n\n` +
      `Olá, *${data.customer.name}*!\n💰 *Total: ${formatBRL(totals.total)}*\n\n` +
      (pdfUrl ? `📎 Veja o PDF:\n${pdfUrl}` : '');
    const to = phone ? (phone.startsWith('55') ? phone : `55${phone}`) : '';
    window.open(`https://wa.me/${to}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'preview' ? 'Pré-visualização do documento' : recordId ? 'Editar documento' : 'Novo documento'}
            {data.number && <span className="ml-2 text-sm text-muted-foreground">{data.number}</span>}
          </DialogTitle>
        </DialogHeader>

        {step === 'preview' ? (
          <div className="space-y-3">
            {previewUrl && (
              <iframe id="quote-preview-frame" src={previewUrl} title="Pré-visualização" className="w-full h-[65vh] rounded border border-border bg-muted" />
            )}
            {!data.number && (
              <p className="text-xs text-muted-foreground">Prévia — o número definitivo é criado ao clicar em "Gerar PDF".</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setStep('edit')}><Pencil className="h-4 w-4 mr-1" />Editar orçamento</Button>
              <Button onClick={handleGenerate} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileCheck className="h-4 w-4 mr-1" />}Gerar PDF
              </Button>
              <Button variant="outline" onClick={handleDownload}><Download className="h-4 w-4 mr-1" />Baixar PDF</Button>
              <Button variant="outline" onClick={handlePrint}><Printer className="h-4 w-4 mr-1" />Imprimir</Button>
              <Button variant="outline" onClick={handleShare}><Share2 className="h-4 w-4 mr-1" />Compartilhar</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Documento */}
            <section className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label>Tipo de documento</Label>
                <select className={selectCls} value={data.docType} onChange={(e) => set('docType', e.target.value as DocType)}>
                  {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <Label>Validade (dias)</Label>
                <Input type="number" min={1} value={data.validityDays ?? ''} onChange={(e) => set('validityDays', Number(e.target.value) || undefined)} />
              </div>
              <div>
                <Label>Status</Label>
                <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value)}>
                  {QUOTE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="sm:col-span-3">
                <Label>Descrição do serviço</Label>
                <Input list="service-suggestions" value={data.serviceTitle || ''} onChange={(e) => set('serviceTitle', e.target.value)} placeholder="Ex.: INSTALAÇÃO E CONFIGURAÇÃO DE SISTEMA DE CFTV" />
                <datalist id="service-suggestions">{SERVICE_SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist>
              </div>
            </section>

            {/* Cliente */}
            <section>
              <h3 className="font-semibold mb-2">Dados do cliente</h3>
              <div className="grid gap-3 sm:grid-cols-6">
                <Field className="sm:col-span-4" label="Nome completo / Razão social *" v={data.customer.name} on={(v) => setC('name', v)} />
                <Field className="sm:col-span-2" label="Nome fantasia" v={data.customer.fantasy} on={(v) => setC('fantasy', v)} />
                <Field className="sm:col-span-3" label="CPF" v={data.customer.cpf} on={(v) => setC('cpf', v)} ph="000.000.000-00" />
                <Field className="sm:col-span-3" label="CNPJ" v={data.customer.cnpj} on={(v) => setC('cnpj', v)} ph="00.000.000/0000-00" />
                <Field className="sm:col-span-2" label="Telefone *" v={data.customer.phone} on={(v) => setC('phone', v)} />
                <Field className="sm:col-span-2" label="WhatsApp" v={data.customer.whatsapp} on={(v) => setC('whatsapp', v)} />
                <Field className="sm:col-span-2" label="E-mail" v={data.customer.email} on={(v) => setC('email', v)} />
                <Field className="sm:col-span-4" label="Endereço" v={data.customer.street} on={(v) => setC('street', v)} />
                <Field className="sm:col-span-1" label="Número" v={data.customer.number} on={(v) => setC('number', v)} />
                <Field className="sm:col-span-1" label="CEP" v={data.customer.cep} on={(v) => setC('cep', v)} />
                <Field className="sm:col-span-2" label="Complemento" v={data.customer.complement} on={(v) => setC('complement', v)} />
                <Field className="sm:col-span-2" label="Bairro" v={data.customer.district} on={(v) => setC('district', v)} />
                <Field className="sm:col-span-1" label="Cidade" v={data.customer.city} on={(v) => setC('city', v)} />
                <Field className="sm:col-span-1" label="UF" v={data.customer.state} on={(v) => setC('state', v.toUpperCase().slice(0, 2))} />
                <Field className="sm:col-span-6" label="Observação do cliente" v={data.customer.note} on={(v) => setC('note', v)} />
              </div>
            </section>

            {/* Itens */}
            <section>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h3 className="font-semibold">Itens e mão de obra</h3>
                <div className="flex flex-wrap gap-2">
                  <select
                    className={`${selectCls} w-56`}
                    value=""
                    onChange={(e) => {
                      const p = products.find((x) => x.id === e.target.value);
                      if (p) set('items', [...data.items.filter((i) => i.description.trim()), { description: p.title, quantity: 1, unitPrice: Number(p.price) || 0, kind: 'product', imageUrl: p.image_url || undefined }]);
                    }}
                  >
                    <option value="">+ Produto do catálogo</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.sku ? `${p.sku} — ` : ''}{p.title}</option>)}
                  </select>
                  <Button size="sm" variant="outline" onClick={() => set('items', [...data.items, { description: '', quantity: 1, unitPrice: 0, kind: 'product' }])}><Plus className="h-4 w-4 mr-1" />Item</Button>
                  <Button size="sm" variant="outline" onClick={() => set('items', [...data.items, { description: 'Mão de obra — Instalação', quantity: 1, unitPrice: 0, kind: 'service' }])}><Plus className="h-4 w-4 mr-1" />Mão de obra</Button>
                </div>
              </div>
              <datalist id="labor-suggestions">{LABOR_SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist>
              <div className="space-y-2">
                {data.items.map((it, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end rounded-md border border-border p-2">
                    <div className="col-span-12 sm:col-span-5">
                      <Label className="text-xs">{it.kind === 'service' ? 'Serviço' : 'Descrição'}</Label>
                      <Input list={it.kind === 'service' ? 'labor-suggestions' : undefined} value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} />
                    </div>
                    <div className="col-span-3 sm:col-span-1">
                      <Label className="text-xs">Qtd.</Label>
                      <Input type="number" min={0} step="1" value={it.quantity} onChange={(e) => setItem(i, { quantity: Number(e.target.value) })} />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <Label className="text-xs">Valor unit.</Label>
                      <Input type="number" min={0} step="0.01" value={it.unitPrice} onChange={(e) => setItem(i, { unitPrice: Number(e.target.value) })} />
                    </div>
                    <div className="col-span-5 sm:col-span-2 text-right text-sm font-semibold pb-2">{formatBRL(lineTotal(it))}</div>
                    <div className="col-span-10 sm:col-span-1">
                      <select className={`${selectCls} px-1 text-xs`} value={it.kind || 'product'} onChange={(e) => setItem(i, { kind: e.target.value as DocItem['kind'] })}>
                        <option value="product">Item</option>
                        <option value="service">Serviço</option>
                      </select>
                    </div>
                    <div className="col-span-2 sm:col-span-1 flex justify-end">
                      <Button size="icon" variant="ghost" onClick={() => set('items', data.items.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                    <div className="col-span-12">
                      <Input className="h-8 text-xs" placeholder="Link da imagem (opcional)" value={it.imageUrl || ''} onChange={(e) => setItem(i, { imageUrl: e.target.value || undefined })} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-4 mt-3">
                <div>
                  <Label>Desconto (R$)</Label>
                  <Input type="number" min={0} step="0.01" value={data.discount || 0} onChange={(e) => set('discount', Number(e.target.value))} />
                </div>
                <div>
                  <Label>Frete (R$)</Label>
                  <Input type="number" min={0} step="0.01" value={data.shipping || 0} onChange={(e) => set('shipping', Number(e.target.value))} />
                </div>
                <div className="sm:col-span-2 rounded-md bg-secondary p-3 text-sm">
                  <div className="flex justify-between"><span>Itens</span><span>{formatBRL(totals.products)}</span></div>
                  <div className="flex justify-between"><span>Mão de obra</span><span>{formatBRL(totals.services)}</span></div>
                  <div className="flex justify-between font-bold text-base mt-1"><span>Total</span><span>{formatBRL(totals.total)}</span></div>
                </div>
              </div>
            </section>

            {/* Pagamento + Garantia */}
            <section className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <h3 className="font-semibold">Condições de pagamento</h3>
                <select className={selectCls} value={data.payment?.method || ''} onChange={(e) => set('payment', { ...data.payment, method: e.target.value as PaymentMethod })}>
                  <option value="">Não mostrar</option>
                  {Object.entries(PAYMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                {data.payment?.method === 'parcelado' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Parcelas</Label>
                      <Input type="number" min={2} value={data.payment.installments || ''} onChange={(e) => set('payment', { ...data.payment!, installments: Number(e.target.value) })} />
                    </div>
                    <div>
                      <Label className="text-xs">Valor da parcela (vazio = automático)</Label>
                      <Input type="number" min={0} step="0.01" value={data.payment.installmentValue || ''} onChange={(e) => set('payment', { ...data.payment!, installmentValue: Number(e.target.value) || undefined })} />
                    </div>
                    {totals.installments > 0 && (
                      <p className="col-span-2 text-sm text-muted-foreground">
                        {totals.installments}x de {formatBRL(totals.installmentValue)} — total parcelado {formatBRL(totals.installmentTotal)}
                      </p>
                    )}
                  </div>
                )}
                {data.payment?.method === 'personalizado' && (
                  <Textarea rows={3} placeholder="Descreva a condição" value={data.payment.customText || ''} onChange={(e) => set('payment', { ...data.payment!, customText: e.target.value })} />
                )}
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Garantia</h3>
                <select className={selectCls} value={data.warranty?.option || ''} onChange={(e) => set('warranty', { ...data.warranty, option: e.target.value as WarrantyOption })}>
                  <option value="">Não mostrar</option>
                  {Object.entries(WARRANTY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                {data.warranty?.option === 'custom' && (
                  <Input placeholder="Ex.: 2 anos" value={data.warranty.customPeriod || ''} onChange={(e) => set('warranty', { ...data.warranty!, customPeriod: e.target.value })} />
                )}
                {data.warranty?.option && data.warranty.option !== 'none' && (
                  <Textarea rows={3} value={data.warranty.text || ''} onChange={(e) => set('warranty', { ...data.warranty!, text: e.target.value })} />
                )}
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="font-semibold">Observações importantes</h3>
              <Textarea rows={4} placeholder="Uma observação por linha" value={data.notes || ''} onChange={(e) => set('notes', e.target.value)} />
              <div className="flex items-center gap-2">
                <Switch checked={!!data.showSignatures} onCheckedChange={(v) => set('showSignatures', v)} />
                <span className="text-sm">Mostrar campos de assinatura</span>
              </div>
            </section>

            {errors.length > 0 && (
              <div className="rounded-md border border-destructive p-3 text-sm text-destructive space-y-1">
                {errors.map((e) => <p key={e}>• {e}</p>)}
              </div>
            )}

            <div className="flex flex-wrap gap-2 justify-end">
              <Button variant="outline" onClick={handlePreview} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Eye className="h-4 w-4 mr-1" />}Pré-visualizar
              </Button>
              <Button onClick={handleGenerate} disabled={busy}><FileCheck className="h-4 w-4 mr-1" />Gerar PDF</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export const QUOTE_STATUSES = [
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'recusado', label: 'Recusado' },
  { value: 'em_execucao', label: 'Em execução' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'cancelado', label: 'Cancelado' },
];

function Field({ label, v, on, className, ph }: { label: string; v?: string; on: (v: string) => void; className?: string; ph?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}</Label>
      <Input value={v || ''} placeholder={ph} onChange={(e) => on(e.target.value)} />
    </div>
  );
}
