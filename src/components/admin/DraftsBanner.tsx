import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { listDrafts, deleteDraft, getActiveDraft, type QuoteDraft } from '@/lib/quoteDrafts';

const when = (iso: string) => {
  const d = new Date(iso); const t = new Date();
  const y = new Date(); y.setDate(t.getDate() - 1);
  const hm = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === t.toDateString()) return `hoje às ${hm}`;
  if (d.toDateString() === y.toDateString()) return `ontem às ${hm}`;
  return `${d.toLocaleDateString('pt-BR')} às ${hm}`;
};

/** Faixa "Você tem N rascunhos em andamento" + reabre sozinho o rascunho que estava aberto. */
export default function DraftsBanner({ docType, onContinue, editorOpen }: { docType: 'orcamento' | 'contrato'; onContinue: (d: QuoteDraft) => void; editorOpen: boolean }) {
  const { data: drafts = [], refetch } = useQuery({ queryKey: ['quote-drafts', docType], queryFn: () => listDrafts(docType) });
  useEffect(() => { if (!editorOpen) refetch(); }, [editorOpen, refetch]);
  const reopened = useRef(false);
  useEffect(() => {
    if (reopened.current || editorOpen) return;
    const active = getActiveDraft();
    const d = active && drafts.find((x) => x.id === active);
    if (d) { reopened.current = true; onContinue(d); }
  }, [drafts, editorOpen, onContinue]);

  if (!drafts.length) return null;
  return (
    <div className="rounded-lg border-2 border-primary bg-primary/10 p-3 space-y-2">
      <p className="font-bold">✏️ Você tem {drafts.length} rascunho{drafts.length > 1 ? 's' : ''} em andamento</p>
      {drafts.map((d) => (
        <div key={d.id} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="flex-1 min-w-[12rem]">
            • {d.data?.number ? `${d.data.number} — ` : ''}{d.customerName || 'Sem cliente ainda'} — iniciado {when(d.createdAt)}
          </span>
          <Button size="sm" onClick={() => onContinue(d)}>Continuar</Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={async () => {
            if (!window.confirm('Descartar este rascunho? O que foi preenchido nele será perdido.')) return;
            await deleteDraft(d.id); refetch();
          }}>Descartar</Button>
        </div>
      ))}
    </div>
  );
}
