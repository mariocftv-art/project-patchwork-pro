import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FileSignature, Search, Eye, Pencil, Download, Printer, Send, History, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { formatBRL } from '@/lib/formatCurrency';
import { getCompanyProfile } from '@/lib/companyProfile';
import { buildPremiumPDF, docFileName } from '@/lib/premiumPDF';
import { buildQuoteWhatsAppMessage, whatsappUrl } from '@/lib/quoteWhatsApp';
import { printPages, renderPdfPages } from '@/components/admin/PdfPagesPreview';
import QuoteEditor, { QuoteRecord, CONTRACT_STATUSES, QUOTE_STATUSES, recordToDoc } from './QuoteEditor';

const selectCls = 'h-9 rounded-md border border-input bg-background px-2 text-sm max-w-full';

interface Version {
  id: string;
  quote_id: string;
  version: number;
  change_type: string;
  status: string | null;
  total: number | null;
  pdf_url: string | null;
  created_by_email: string | null;
  created_at: string;
}

const CHANGE_LABELS: Record<string, string> = {
  criacao: 'Criação',
  edicao: 'Nova versão',
  aditivo: 'Aditivo contratual',
  duplicado: 'Duplicado',
  status: 'Mudança de status',
};

const statusLabel = (v: string) => QUOTE_STATUSES.find((s) => s.value === v)?.label || v;

function maskDoc(q: QuoteRecord) {
  const raw = String(q.customer?.cnpj || q.customer?.cpf || '');
  const d = raw.replace(/\D/g, '');
  if (!d) return '—';
  return d.length > 11 ? `${d.slice(0, 2)}.***.***/****-${d.slice(-2)}` : `***.${d.slice(3, 6)}.***-${d.slice(-2)}`;
}

function clientName(q: QuoteRecord) {
  return (q.customer?.company as string) || q.customer_name;
}

export default function ContractsManagement() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState('date_desc');
  const [editor, setEditor] = useState<{ open: boolean; record: QuoteRecord | null; mode: 'edit' | 'preview' }>({ open: false, record: null, mode: 'edit' });
  const [history, setHistory] = useState<QuoteRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['admin-contracts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('quotes').select('*').eq('doc_type', 'contrato').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as QuoteRecord[];
    },
  });

  const { data: versions = [] } = useQuery({
    queryKey: ['admin-contract-versions'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('quote_versions' as any) as any)
        .select('id,quote_id,version,change_type,status,total,pdf_url,created_by_email,created_at')
        .order('version', { ascending: false });
      if (error) throw error;
      return (data || []) as Version[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-contracts'] });
    qc.invalidateQueries({ queryKey: ['admin-contract-versions'] });
    qc.invalidateQueries({ queryKey: ['admin-quotes'] });
  };

  const versionsOf = (id: string) => versions.filter((v) => v.quote_id === id);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const sd = s.replace(/\D/g, '');
    const list = contracts.filter((q) => {
      if (statusFilter && (q.status || 'rascunho') !== statusFilter) return false;
      const d = q.created_at.slice(0, 10);
      if (from && d < from) return false;
      if (to && d > to) return false;
      if (!s) return true;
      const text = [q.customer_name, q.customer?.company, q.quote_number, q.customer_phone, q.customer?.whatsapp].filter(Boolean).some((v) => String(v).toLowerCase().includes(s));
      const docs = sd.length >= 3 && [q.customer?.cpf, q.customer?.cnpj, q.customer_phone].some((v) => String(v || '').replace(/\D/g, '').includes(sd));
      return text || docs;
    });
    return [...list].sort((a, b) => {
      if (sort === 'date_asc') return a.created_at.localeCompare(b.created_at);
      if (sort === 'num_asc') return a.quote_number.localeCompare(b.quote_number);
      if (sort === 'num_desc') return b.quote_number.localeCompare(a.quote_number);
      return b.created_at.localeCompare(a.created_at);
    });
  }, [contracts, search, statusFilter, from, to, sort]);

  const count = (st: string[]) => contracts.filter((c) => st.includes(c.status || 'rascunho')).length;

  const changeStatus = async (q: QuoteRecord, status: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('quotes') as any).update({ status, updated_at: new Date().toISOString() }).eq('id', q.id);
    if (error) return toast({ title: 'Erro ao alterar status', variant: 'destructive' });
    const { data: auth } = await supabase.auth.getUser();
    const last = versionsOf(q.id)[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('quote_versions' as any) as any).insert({
      quote_id: q.id,
      version: (last?.version || 0) + 1,
      change_type: 'status',
      status,
      snapshot: { ...q, status },
      total: q.total,
      pdf_url: q.pdf_url,
      created_by: auth.user?.id ?? null,
      created_by_email: auth.user?.email ?? null,
    });
    toast({ title: 'Status atualizado', description: statusLabel(status) });
    refresh();
  };

  const fetchPdf = async (q: QuoteRecord, url?: string | null): Promise<Blob> => {
    const u = url ?? q.pdf_url;
    if (u) {
      const r = await fetch(u);
      if (r.ok) return r.blob();
    }
    const profile = await getCompanyProfile(true);
    const doc = await buildPremiumPDF(recordToDoc(q), profile);
    return doc.output('blob');
  };

  const download = async (q: QuoteRecord, url?: string | null, version?: number) => {
    setBusyId(q.id);
    try {
      const blob = await fetchPdf(q, url);
      const safe = clientName(q).normalize('NFD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 40);
      const name = docFileName('contrato', q.quote_number).replace(/\.pdf$/i, '') + (safe ? `-${safe}` : '') + (version ? `-v${version}` : '') + '.pdf';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch (e) {
      console.error(e);
      toast({ title: 'Não foi possível carregar o PDF', variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const print = async (q: QuoteRecord, url?: string | null) => {
    setBusyId(q.id);
    try {
      const pages = await renderPdfPages(await fetchPdf(q, url));
      printPages(pages);
    } catch (e) {
      console.error(e);
      toast({ title: 'Não foi possível abrir a impressão', variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const send = async (q: QuoteRecord) => {
    const profile = await getCompanyProfile();
    const msg = buildQuoteWhatsAppMessage(recordToDoc(q), profile, { pdfUrl: q.pdf_url });
    window.open(whatsappUrl((q.customer?.whatsapp || q.customer_phone || '') as string, msg), '_blank', 'noopener,noreferrer');
  };

  const cards = [
    { label: 'Total de contratos', value: contracts.length },
    { label: 'Aguardando assinatura', value: count(['aguardando_assinatura']) },
    { label: 'Em execução', value: count(['em_execucao']) },
    { label: 'Concluídos', value: count(['concluido']) },
  ];

  return (
    <div className="space-y-4 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileSignature className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Contratos feitos</h2>
          <span className="text-sm text-muted-foreground">({filtered.length})</span>
        </div>
        <Button onClick={() => setEditor({ open: true, record: null, mode: 'edit' })}><Plus className="h-4 w-4 mr-1" />Novo contrato</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8 h-9" placeholder="Cliente, empresa, número, CPF/CNPJ, telefone..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className={selectCls} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Status">
          <option value="">Todos os status</option>
          {CONTRACT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select className={selectCls} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Ordenar">
          <option value="date_desc">Mais recentes</option>
          <option value="date_asc">Mais antigos</option>
          <option value="num_desc">Número (maior)</option>
          <option value="num_asc">Número (menor)</option>
        </select>
        <Input type="date" className="h-9 w-auto" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="De" />
        <Input type="date" className="h-9 w-auto" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Até" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">Nenhum contrato encontrado.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => {
            const vs = versionsOf(q.id);
            return (
              <div key={q.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{q.quote_number}</span>
                      <span className="text-xs rounded bg-secondary px-2 py-0.5">Versão {vs[0]?.version || 1}</span>
                    </div>
                    <p className="text-sm break-words">{clientName(q)}</p>
                    <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground mt-1">
                      <span>CPF/CNPJ: {maskDoc(q)}</span>
                      <span>Criado: {new Date(q.created_at).toLocaleDateString('pt-BR')}</span>
                      <span>Alterado: {new Date(q.updated_at || q.created_at).toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-price">{formatBRL(Number(q.total))}</p>
                    <select className={selectCls} value={q.status || 'rascunho'} onChange={(e) => changeStatus(q, e.target.value)} aria-label="Status do contrato">
                      {CONTRACT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      {!CONTRACT_STATUSES.some((s) => s.value === (q.status || 'rascunho')) && <option value={q.status}>{statusLabel(q.status)}</option>}
                    </select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditor({ open: true, record: q, mode: 'preview' })}><Eye className="h-4 w-4 mr-1" />Visualizar</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditor({ open: true, record: q, mode: 'edit' })}><Pencil className="h-4 w-4 mr-1" />Editar / nova versão</Button>
                  <Button size="sm" variant="outline" disabled={busyId === q.id} onClick={() => download(q, undefined, vs[0]?.version)}><Download className="h-4 w-4 mr-1" />Baixar PDF</Button>
                  <Button size="sm" variant="outline" disabled={busyId === q.id} onClick={() => print(q)}><Printer className="h-4 w-4 mr-1" />Imprimir</Button>
                  <Button size="sm" variant="outline" onClick={() => send(q)}><Send className="h-4 w-4 mr-1" />WhatsApp</Button>
                  <Button size="sm" variant="outline" onClick={() => setHistory(q)}><History className="h-4 w-4 mr-1" />Histórico ({vs.length})</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!history} onOpenChange={(v) => !v && setHistory(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Histórico — {history?.quote_number}</DialogTitle></DialogHeader>
          {history && (versionsOf(history.id).length === 0 ? (
            <p className="text-sm text-muted-foreground">Contrato criado antes do controle de versões. A próxima alteração gera a versão 1.</p>
          ) : (
            <div className="space-y-2">
              {versionsOf(history.id).map((v) => (
                <div key={v.id} className="rounded border border-border p-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm">
                    <p className="font-semibold">Versão {v.version} — {CHANGE_LABELS[v.change_type] || v.change_type}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(v.created_at).toLocaleString('pt-BR')}{v.created_by_email ? ` · ${v.created_by_email}` : ''}{v.status ? ` · ${statusLabel(v.status)}` : ''}{v.total != null ? ` · ${formatBRL(Number(v.total))}` : ''}
                    </p>
                  </div>
                  {v.pdf_url && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => download(history, v.pdf_url, v.version)}><Download className="h-4 w-4" /></Button>
                      <Button size="sm" variant="outline" onClick={() => print(history, v.pdf_url)}><Printer className="h-4 w-4" /></Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </DialogContent>
      </Dialog>

      <QuoteEditor
        open={editor.open}
        onOpenChange={(v) => setEditor((e) => ({ ...e, open: v }))}
        record={editor.record}
        mode={editor.mode}
        onSaved={refresh}
      />
    </div>
  );
}
