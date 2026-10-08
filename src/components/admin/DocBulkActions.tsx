import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Trash2, FileDown, X, RotateCcw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { formatBRL } from '@/lib/formatCurrency';
import type { QuoteRecord } from './QuoteEditor';
import { SIGNED_STATUSES } from './QuoteEditor';
import { daysLeft, duplicateAsDraft, moveToTrash, restoreFromTrash } from '@/lib/docTrash';

export const isSigned = (q: QuoteRecord) => q.doc_type === 'contrato' && SIGNED_STATUSES.includes(q.status);

export function useSelection() {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  return { sel, setSel, toggle, clear: () => setSel(new Set()) };
}

export function SelectBox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return <input type="checkbox" className="h-5 w-5 mt-0.5 shrink-0 accent-primary cursor-pointer" checked={checked} onChange={onChange} aria-label={label} />;
}

export function SelectAllRow({ items, sel, setSel }: { items: QuoteRecord[]; sel: Set<string>; setSel: (s: Set<string>) => void }) {
  const all = items.length > 0 && items.every((q) => sel.has(q.id));
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
      <input type="checkbox" className="h-5 w-5 accent-primary" checked={all} onChange={() => setSel(all ? new Set() : new Set(items.map((q) => q.id)))} />
      Selecionar todos
      {sel.size > 0 && <span className="text-muted-foreground">· {sel.size} {sel.size === 1 ? 'selecionado' : 'selecionados'}</span>}
    </label>
  );
}

type Props = {
  items: QuoteRecord[];
  sel: Set<string>;
  clear: () => void;
  onDownload: (q: QuoteRecord) => Promise<void>;
  queryKeys: string[];
};

export function BulkBar({ items, sel, clear, onDownload, queryKeys }: Props) {
  const qc = useQueryClient();
  const chosen = items.filter((q) => sel.has(q.id));
  const [confirm, setConfirm] = useState(false);
  const [reason, setReason] = useState('');
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  if (!chosen.length) return null;

  const signed = chosen.filter(isSigned);
  const canDelete = signed.every((q) => (typed[q.id] || '').trim().toUpperCase() === q.quote_number.toUpperCase()) && (!signed.length || reason.trim().length >= 3);
  const refresh = () => Promise.all([...queryKeys, 'admin-trash', 'quote-drafts'].map((k) => qc.invalidateQueries({ queryKey: [k] })));

  const duplicate = async () => {
    chosen.forEach(duplicateAsDraft);
    await refresh();
    toast({ title: `${chosen.length} ${chosen.length === 1 ? 'cópia criada' : 'cópias criadas'} como rascunho`, description: 'Sem número e sem assinaturas. Abra pelo aviso de rascunhos no topo.' });
    clear();
  };
  const del = async () => {
    setBusy(true);
    const fails: string[] = [];
    for (const q of chosen) {
      try { await moveToTrash(q, reason.trim()); } catch (e) { fails.push(`${q.quote_number}: ${(e as Error).message}`); }
    }
    setBusy(false); setConfirm(false); setReason(''); setTyped({});
    await refresh();
    if (fails.length) toast({ title: 'Alguns não foram excluídos', description: fails.join('\n'), variant: 'destructive' });
    else toast({ title: 'Movido para a Lixeira', description: 'Fica lá 30 dias e pode ser restaurado.' });
    clear();
  };
  const pdfs = async () => {
    setBusy(true);
    for (const q of chosen) { try { await onDownload(q); } catch { toast({ title: `Não consegui gerar o PDF de ${q.quote_number}`, variant: 'destructive' }); } }
    setBusy(false);
  };

  return (
    <>
      <div className="h-20" aria-hidden />
      <div className="fixed bottom-0 inset-x-0 z-40 border-t-2 border-primary bg-card shadow-2xl">
        <div className="max-w-5xl mx-auto px-3 py-2 flex flex-wrap items-center gap-2">
          <span className="font-semibold text-sm mr-auto">{chosen.length} {chosen.length === 1 ? 'selecionado' : 'selecionados'}</span>
          <Button size="sm" variant="outline" onClick={duplicate}><Copy className="h-4 w-4 mr-1" />Duplicar</Button>
          <Button size="sm" variant="outline" onClick={() => setConfirm(true)}><Trash2 className="h-4 w-4 mr-1 text-destructive" />Excluir</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={pdfs}>{busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileDown className="h-4 w-4 mr-1" />}Baixar PDFs</Button>
          <Button size="sm" variant="ghost" onClick={clear}><X className="h-4 w-4 mr-1" />Limpar</Button>
        </div>
      </div>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir {chosen.length} {chosen.length === 1 ? 'documento' : 'documentos'}?</DialogTitle>
            <DialogDescription>Vai para a Lixeira por 30 dias e pode ser restaurado. O número não é reaproveitado.</DialogDescription>
          </DialogHeader>
          {signed.length > 0 && (
            <div className="space-y-3 rounded-md border-2 border-destructive p-3">
              <p className="text-sm font-semibold text-destructive">⚠️ Contrato assinado — confirme digitando o número</p>
              {signed.map((q) => (
                <div key={q.id} className="space-y-1">
                  <p className="text-sm"><strong>{q.quote_number}</strong> · {q.customer_name}</p>
                  <Input placeholder={`Digite ${q.quote_number}`} value={typed[q.id] || ''} onChange={(e) => setTyped((t) => ({ ...t, [q.id]: e.target.value }))} />
                </div>
              ))}
            </div>
          )}
          <Input placeholder={signed.length ? 'Motivo (obrigatório)' : 'Motivo (opcional)'} value={reason} onChange={(e) => setReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(false)}>Cancelar</Button>
            <Button variant="destructive" disabled={!canDelete || busy} onClick={del}>{busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Lixeira: documentos excluídos nos últimos 30 dias, com restaurar. */
export function TrashSection({ docType }: { docType: 'orcamento' | 'contrato' }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: items = [] } = useQuery({
    queryKey: ['admin-trash', docType],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      let q = supabase.from('quotes').select('*').not('deleted_at', 'is', null).gte('deleted_at', since).order('deleted_at', { ascending: false });
      q = docType === 'contrato' ? q.eq('doc_type', 'contrato') : q.neq('doc_type', 'contrato');
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as (QuoteRecord & { deleted_at: string; delete_reason: string | null })[];
    },
  });
  const restore = async (q: QuoteRecord) => {
    try {
      await restoreFromTrash(q);
      await Promise.all(['admin-trash', 'admin-quotes', 'admin-contracts'].map((k) => qc.invalidateQueries({ queryKey: [k] })));
      toast({ title: `${q.quote_number} restaurado` });
    } catch (e) { toast({ title: 'Não foi possível restaurar', description: (e as Error).message, variant: 'destructive' }); }
  };
  return (
    <div className="rounded-lg border border-border bg-card">
      <button type="button" className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>🗑️ Lixeira ({items.length})</span><span className="text-muted-foreground">{open ? 'Fechar' : 'Abrir'}</span>
      </button>
      {open && (
        <div className="border-t border-border p-3 space-y-2">
          {items.length === 0 ? <p className="text-sm text-muted-foreground">A Lixeira está vazia.</p> : items.map((q) => (
            <div key={q.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-border p-2">
              <div className="min-w-0 text-sm">
                <p className="font-semibold">{q.quote_number} · <span className="font-normal">{q.customer_name}</span></p>
                <p className="text-xs text-muted-foreground">{formatBRL(Number(q.total))} · excluído em {new Date(q.deleted_at).toLocaleString('pt-BR')} · restam {daysLeft(q.deleted_at)} dias{q.delete_reason ? ` · motivo: ${q.delete_reason}` : ''}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => restore(q)}><RotateCcw className="h-4 w-4 mr-1" />Restaurar</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
