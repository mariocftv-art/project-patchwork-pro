import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Trash2, Phone, Mail, Calendar, Plus, Pencil, Copy, Eye, Download, Send, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { formatBRL } from '@/lib/formatCurrency';
import { getCompanyProfile } from '@/lib/companyProfile';
import { buildPremiumPDF, DOC_TYPE_LABELS, DocType } from '@/lib/premiumPDF';
import QuoteEditor, { QuoteRecord, QUOTE_STATUSES, recordToDoc } from './QuoteEditor';

const selectCls = 'h-9 rounded-md border border-input bg-background px-2 text-sm';

export default function QuotesManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [editor, setEditor] = useState<{ open: boolean; record: QuoteRecord | null; mode: 'edit' | 'preview'; duplicate: boolean }>({
    open: false,
    record: null,
    mode: 'edit',
    duplicate: false,
  });

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['admin-quotes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('quotes').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as QuoteRecord[];
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-quotes'] });

  const deleteQuote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('quotes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      refresh();
      toast({ title: 'Documento excluído' });
    },
    onError: () => toast({ title: 'Erro', description: 'Não foi possível excluir.', variant: 'destructive' }),
  });

  const changeStatus = async (id: string, status: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('quotes') as any).update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) toast({ title: 'Erro ao alterar status', variant: 'destructive' });
    else refresh();
  };

  const download = async (q: QuoteRecord) => {
    const profile = await getCompanyProfile(true);
    const doc = await buildPremiumPDF(recordToDoc(q), profile);
    doc.save(`${(DOC_TYPE_LABELS[q.doc_type as DocType] || 'orcamento').toLowerCase().replace(/\s+/g, '-')}-${q.quote_number}.pdf`);
  };

  const send = async (q: QuoteRecord) => {
    const profile = await getCompanyProfile();
    const phone = ((q.customer?.whatsapp || q.customer_phone || '') as string).replace(/\D/g, '');
    const to = phone ? (phone.startsWith('55') ? phone : `55${phone}`) : '';
    const label = DOC_TYPE_LABELS[q.doc_type as DocType] || 'Orçamento';
    const msg =
      `🛡️ *${profile.name}*\n\n📄 *${label.toUpperCase()} Nº ${q.quote_number}*\n\nOlá, *${q.customer_name}*!\n` +
      `💰 *Total: ${formatBRL(Number(q.total))}*\n\n` +
      (q.pdf_url ? `📎 Veja o PDF:\n${q.pdf_url}` : '');
    window.open(`https://wa.me/${to}?text=${encodeURIComponent(msg)}`, '_blank');
    if (q.status === 'rascunho') changeStatus(q.id, 'enviado');
  };

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return quotes.filter((q) => {
      if (statusFilter && (q.status || 'rascunho') !== statusFilter) return false;
      const d = q.created_at.slice(0, 10);
      if (from && d < from) return false;
      if (to && d > to) return false;
      if (!s) return true;
      return [q.customer_name, q.quote_number, q.customer_phone, q.customer_email, q.customer?.cpf, q.customer?.cnpj]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(s));
    });
  }, [quotes, search, statusFilter, from, to]);

  const open = (record: QuoteRecord | null, mode: 'edit' | 'preview' = 'edit', duplicate = false) =>
    setEditor({ open: true, record, mode, duplicate });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Orçamentos e documentos</h2>
          <span className="text-sm text-muted-foreground">({filtered.length})</span>
        </div>
        <Button onClick={() => open(null)}><Plus className="h-4 w-4 mr-1" />Novo orçamento</Button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8 h-9" placeholder="Pesquisar cliente, número, telefone..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className={selectCls} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Todos os status</option>
          {QUOTE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <Input type="date" className="h-9 w-auto" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" className="h-9 w-auto" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">Nenhum documento encontrado.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => (
            <div key={q.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{q.quote_number}</span>
                    <span className="text-xs rounded bg-secondary px-2 py-0.5">{DOC_TYPE_LABELS[q.doc_type as DocType] || 'Orçamento'}</span>
                  </div>
                  <p className="text-sm">{q.customer_name}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                    {q.customer_phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{q.customer_phone}</span>}
                    {q.customer_email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{q.customer_email}</span>}
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(q.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">{formatBRL(Number(q.total))}</p>
                  <select className={selectCls} value={q.status || 'rascunho'} onChange={(e) => changeStatus(q.id, e.target.value)}>
                    {QUOTE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => open(q, 'preview')}><Eye className="h-4 w-4 mr-1" />Visualizar</Button>
                <Button size="sm" variant="outline" onClick={() => open(q, 'edit')}><Pencil className="h-4 w-4 mr-1" />Editar</Button>
                <Button size="sm" variant="outline" onClick={() => open(q, 'edit', true)}><Copy className="h-4 w-4 mr-1" />Duplicar</Button>
                <Button size="sm" variant="outline" onClick={() => download(q)}><Download className="h-4 w-4 mr-1" />Baixar PDF</Button>
                <Button size="sm" variant="outline" onClick={() => send(q)}><Send className="h-4 w-4 mr-1" />Enviar</Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir {q.quote_number}?</AlertDialogTitle>
                      <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteQuote.mutate(q.id)}>Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      <QuoteEditor
        open={editor.open}
        onOpenChange={(v) => setEditor((e) => ({ ...e, open: v }))}
        record={editor.record}
        mode={editor.mode}
        duplicate={editor.duplicate}
        onSaved={refresh}
      />
    </div>
  );
}
