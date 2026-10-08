import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatBRL } from '@/lib/formatCurrency';
import { newDraftId, saveDraftLocal } from '@/lib/quoteDrafts';
import { maskPhone } from '@/lib/masks';
import { toast } from 'sonner';

type CartLine = { product_id: string; title: string; quantity: number; price: number };
type Row = {
  id: string; kind: string; page: string | null; user_email: string | null; created_at: string;
  customer_name: string | null; customer_phone: string | null; message: string | null;
  product_id: string | null; product_title: string | null; cart: CartLine[] | null;
  searches: string[] | null; pages: string[] | null; search_term: string | null;
};
const LABEL: Record<string, string> = { suporte: '🛠️ Suporte', orcamento: '💰 Orçamento', produto: '❓ Dúvida de produto', busca: '🔍 Busca sem resultado' };
const KINDS = Object.keys(LABEL);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function weekStart(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
const digits = (p: string) => p.replace(/\D/g, '');
const waHref = (p: string) => { const d = digits(p); return `https://wa.me/${d.length <= 11 ? '55' + d : d}`; };
const pageLabel = (r: Row) => {
  if (r.product_title) return r.product_title;
  const p = r.page || '';
  if (p === '/' || p === '') return 'Início';
  try {
    const u = new URL(p, 'http://x');
    if (u.searchParams.get('busca')) return `Busca: ${u.searchParams.get('busca')}`;
    if (u.searchParams.get('categoria')) return `Categoria: ${u.searchParams.get('categoria')}`;
    return u.pathname;
  } catch { return p; }
};
const who = (r: Row) => r.customer_name || r.user_email || 'Visitante';

export default function WhatsAppContactsList() {
  const [kind, setKind] = useState('todos');
  const [days, setDays] = useState('30');
  const [asc, setAsc] = useState(false);
  const [preview, setPreview] = useState<Row | null>(null);
  const [missOpen, setMissOpen] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['whatsapp-contacts'],
    queryFn: async () => {
      const { data } = await db.from('whatsapp_contacts')
        .select('id,kind,page,user_email,created_at,customer_name,customer_phone,message,product_id,product_title,cart,searches,pages,search_term')
        .order('created_at', { ascending: false }).limit(1000);
      return (data || []) as Row[];
    },
  });

  const weeks = useMemo(() => {
    const m = new Map<string, Record<string, number>>();
    rows.forEach((r) => {
      const k = weekStart(new Date(r.created_at)).toISOString();
      const w = m.get(k) || {}; w[r.kind] = (w[r.kind] || 0) + 1; m.set(k, w);
    });
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 8);
  }, [rows]);

  const misses = useMemo(() => {
    const c = new Map<string, number>();
    rows.filter((r) => r.kind === 'busca').forEach((r) => {
      const t = (r.search_term || r.message?.match(/'([^']+)'/)?.[1] || '').trim();
      if (t) c.set(t.toLowerCase(), (c.get(t.toLowerCase()) || 0) + 1);
    });
    return [...c.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const list = useMemo(() => {
    const since = days === 'tudo' ? 0 : Date.now() - Number(days) * 86400000;
    const l = rows.filter((r) => (kind === 'todos' || r.kind === kind) && new Date(r.created_at).getTime() >= since);
    return asc ? [...l].reverse() : l;
  }, [rows, kind, days, asc]);

  const arrow = (cur: number, prev: number | undefined) => {
    if (prev === undefined || cur === prev) return null;
    return cur > prev ? <span className="text-green-600 dark:text-green-400 text-xs ml-1" title={`Semana anterior: ${prev}`}>▲{cur - prev}</span>
      : <span className="text-destructive text-xs ml-1" title={`Semana anterior: ${prev}`}>▼{prev - cur}</span>;
  };

  return (
    <div className="space-y-4 min-w-0">
      <h3 className="text-lg font-semibold">💬 Contatos pelo WhatsApp</h3>
      {isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : rows.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum contato registrado ainda.</p> : (
        <>
          <div className="overflow-x-auto max-w-full"><table className="w-full text-sm border border-border">
            <thead className="bg-secondary"><tr><th className="p-2 text-left whitespace-nowrap">Semana de</th>{KINDS.map((k) => <th key={k} className="p-2 text-left whitespace-nowrap">{LABEL[k]}</th>)}</tr></thead>
            <tbody>{weeks.map(([k, w], i) => {
              const prev = weeks[i + 1]?.[1];
              return (
                <tr key={k} className="border-t border-border">
                  <td className="p-2 whitespace-nowrap">{new Date(k).toLocaleDateString('pt-BR')}</td>
                  {KINDS.map((c) => (
                    <td key={c} className="p-2 font-semibold whitespace-nowrap">
                      {c === 'busca' && (w[c] || 0) > 0
                        ? <button type="button" className="underline text-primary" onClick={() => setMissOpen(true)}>{w[c]}</button>
                        : (w[c] || 0)}
                      {arrow(w[c] || 0, prev ? (prev[c] || 0) : undefined)}
                    </td>
                  ))}
                </tr>
              );
            })}</tbody>
          </table></div>

          <div className="flex flex-wrap gap-2 items-center">
            <select aria-label="Tipo" value={kind} onChange={(e) => setKind(e.target.value)} className="min-h-10 rounded-md border border-border bg-background px-2 text-sm">
              <option value="todos">Todos os tipos</option>
              {KINDS.map((k) => <option key={k} value={k}>{LABEL[k]}</option>)}
            </select>
            <select aria-label="Período" value={days} onChange={(e) => setDays(e.target.value)} className="min-h-10 rounded-md border border-border bg-background px-2 text-sm">
              <option value="1">Hoje</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option><option value="tudo">Tudo</option>
            </select>
            <span className="text-sm text-muted-foreground">{list.length} contato(s)</span>
          </div>

          <div className="overflow-x-auto max-w-full"><table className="w-full text-sm border border-border">
            <thead className="bg-secondary"><tr>
              <th className="p-2 text-left whitespace-nowrap"><button type="button" onClick={() => setAsc((a) => !a)} className="font-semibold">Quando {asc ? '↑' : '↓'}</button></th>
              <th className="p-2 text-left">Opção</th><th className="p-2 text-left">Cliente</th><th className="p-2 text-left">Telefone</th><th className="p-2 text-left">Página</th><th className="p-2" />
            </tr></thead>
            <tbody>{list.slice(0, 100).map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                <td className="p-2 whitespace-nowrap">{LABEL[r.kind] || r.kind}</td>
                <td className="p-2 whitespace-nowrap">{who(r)}</td>
                <td className="p-2 whitespace-nowrap">{r.customer_phone ? <a href={waHref(r.customer_phone)} target="_blank" rel="noopener noreferrer" className="underline text-primary">{r.customer_phone}</a> : '—'}</td>
                <td className="p-2 min-w-[10rem]">{pageLabel(r)}</td>
                <td className="p-2"><Button size="sm" variant="outline" onClick={() => setPreview(r)}>👁️ Prévia</Button></td>
              </tr>))}</tbody>
          </table></div>
        </>
      )}
      <ContactPreview row={preview} onClose={() => setPreview(null)} />
      <Dialog open={missOpen} onOpenChange={setMissOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>🔍 Procuraram e não acharam</DialogTitle></DialogHeader>
          {misses.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum termo registrado.</p> : (
            <ul className="text-sm divide-y divide-border">{misses.map(([t, n]) => <li key={t} className="py-2 flex justify-between gap-2"><span>"{t}"</span><span className="font-semibold">{n}×</span></li>)}</ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

type Doc = { id: string; quote_number: string; doc_type: string; total: number; status: string; created_at: string };

function ContactPreview({ row, onClose }: { row: Row | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: docs = [] } = useQuery({
    queryKey: ['wa-contact-docs', row?.id],
    enabled: !!row && !!(row.user_email || row.customer_phone),
    queryFn: async () => {
      const ors: string[] = [];
      if (row!.user_email) ors.push(`customer_email.eq.${row!.user_email}`);
      if (row!.customer_phone && digits(row!.customer_phone).length >= 10) {
        const f = maskPhone(row!.customer_phone);
        ors.push(`customer_phone.eq.${f}`, `customer_whatsapp.eq.${f}`);
      }
      const { data } = await db.from('quotes').select('id,quote_number,doc_type,total,status,created_at').is('deleted_at', null).or(ors.join(',')).order('created_at', { ascending: false }).limit(10);
      return (data || []) as Doc[];
    },
  });
  if (!row) return null;
  const cartTotal = (row.cart || []).reduce((s, c) => s + c.price * c.quantity, 0);
  const createDraft = () => {
    const now = new Date().toISOString();
    saveDraftLocal({
      id: newDraftId(), docType: 'orcamento', customerName: row.customer_name || row.user_email || 'Contato do WhatsApp',
      recordId: null, record: null, status: 'rascunho', scroll: 0, createdAt: now, updatedAt: now,
      data: {
        docType: 'orcamento', number: '', date: new Date(), validityDays: 15, serviceTitle: '',
        customer: { name: row.customer_name || '', phone: row.customer_phone || undefined, email: row.user_email || undefined },
        items: (row.cart || []).map((c) => ({ description: c.title, quantity: c.quantity, unitPrice: c.price, kind: 'product' })),
        showItemPrices: true, discount: 0, shipping: 0, payment: { method: '' }, warranty: { option: '' },
        notes: '', contractText: '', showSignatures: false,
      },
    });
    qc.invalidateQueries({ queryKey: ['quote-drafts'] });
    toast.success('Rascunho de orçamento criado', { description: 'Está no aviso de rascunhos em Orçamentos.' });
  };
  const when = new Date(row.created_at);
  const Sec = ({ t, children }: { t: string; children: React.ReactNode }) => (
    <section className="border-t border-border pt-3"><h4 className="font-semibold mb-1">{t}</h4>{children}</section>
  );
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto max-w-lg">
        <DialogHeader><DialogTitle>👁️ Contato de {when.toLocaleDateString('pt-BR')} às {when.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="font-bold">{(LABEL[row.kind] || row.kind).toUpperCase()}</p>
          <Sec t="👤 Quem">
            <p>{[row.customer_name || (row.user_email ? null : 'Visitante'), row.customer_phone, row.user_email].filter(Boolean).join(' · ')}</p>
            {row.user_email && <p className="text-muted-foreground text-xs">Cliente com conta no site</p>}
          </Sec>
          {row.message && <Sec t="💬 Mensagem enviada"><pre className="whitespace-pre-wrap font-sans bg-secondary rounded-md p-2 text-xs">{row.message}</pre></Sec>}
          {!!row.cart?.length && (
            <Sec t="🛒 O que estava no carrinho naquele momento">
              <ul>{row.cart.map((c) => <li key={c.product_id}>{c.quantity} × {c.title} — {formatBRL(c.price * c.quantity)}</li>)}</ul>
              <p className="font-bold mt-1">Total: {formatBRL(cartTotal)}</p>
            </Sec>
          )}
          {row.product_title && <Sec t="📦 Produto que estava vendo"><p>{row.product_title}</p></Sec>}
          {!!row.searches?.length && <Sec t="🔍 O que buscou nesta visita"><p>{row.searches.map((s) => `"${s}"`).join(' · ')}</p></Sec>}
          {!!row.pages?.length && <Sec t="📄 Páginas visitadas"><p>{row.pages.join(' → ')}</p></Sec>}
          {docs.length > 0 && (
            <Sec t="📑 Documentos deste cliente">
              <ul>{docs.map((d) => <li key={d.id}>{d.quote_number} — {d.doc_type === 'contrato' ? 'Contrato' : d.doc_type === 'os' ? 'OS' : 'Orçamento'} — {formatBRL(Number(d.total) || 0)} — {d.status}</li>)}</ul>
            </Sec>
          )}
          <div className="border-t border-border pt-3 flex flex-wrap gap-2">
            {row.customer_phone && <Button asChild><a href={waHref(row.customer_phone)} target="_blank" rel="noopener noreferrer">💬 Abrir WhatsApp</a></Button>}
            <Button variant="outline" onClick={createDraft}>📋 Criar orçamento com estes itens</Button>
          </div>
          <p className="text-xs text-muted-foreground italic">Mostra o que aconteceu no site. A conversa no WhatsApp não é registrada aqui.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
