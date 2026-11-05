import { useState } from 'react';
import { ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import type { ContractClause } from '@/lib/contractClauses';

/** Lista de cláusulas: chavinha liga/desliga, título e texto editáveis. A numeração aparece já refeita. */
export default function ClauseListEditor({ clauses, onChange }: { clauses: ContractClause[]; onChange: (c: ContractClause[]) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const upd = (i: number, patch: Partial<ContractClause>) => onChange(clauses.map((c, k) => (k === i ? { ...c, ...patch } : c)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= clauses.length) return;
    const n = [...clauses];
    [n[i], n[j]] = [n[j], n[i]];
    onChange(n);
  };
  let num = 0;
  return (
    <div className="space-y-2">
      {clauses.map((c, i) => {
        const label = c.enabled ? `Cláusula ${++num}ª` : 'Desligada';
        const isOpen = open === c.id;
        return (
          <div key={c.id} className={`rounded-md border border-border p-2 ${c.enabled ? '' : 'opacity-60'}`}>
            <div className="flex items-center gap-2">
              <Switch checked={c.enabled} onCheckedChange={(v) => upd(i, { enabled: v })} aria-label={`Ligar ${c.title}`} />
              <button type="button" className="flex-1 text-left text-sm min-w-0" onClick={() => setOpen(isOpen ? null : c.id)}>
                <span className="text-xs text-muted-foreground mr-2">{label}</span>
                <span className="font-medium truncate">{c.title}</span>{c.highlight && <span className="ml-2 text-xs font-bold text-destructive">⚠️ destaque</span>}
              </button>
              <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(i, -1)} aria-label="Subir"><ChevronUp className="h-4 w-4" /></Button>
              <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(i, 1)} aria-label="Descer"><ChevronDown className="h-4 w-4" /></Button>
              <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => setOpen(isOpen ? null : c.id)} aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
            </div>
            {isOpen && (
              <div className="mt-2 space-y-2">
                <Input value={c.title} onChange={(e) => upd(i, { title: e.target.value })} placeholder="Título da cláusula" />
                <Textarea rows={8} value={c.body} onChange={(e) => upd(i, { body: e.target.value })} />
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={!!c.highlight} onCheckedChange={(v) => upd(i, { highlight: v })} />
                  Sai no quadro "Cláusulas de atenção" (negrito, com declaração de ciência e rubrica)
                </label>
              </div>
            )}
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">
        Ao desligar uma cláusula, as seguintes renumeram sozinhas (inclusive itens como 3.1 e referências "Cláusula 10ª").
        Marcações automáticas: {'{ESCOPO}'}, {'{VALOR_TOTAL}'}, {'{PAGAMENTO}'}, {'{GARANTIA_PERIODO}'}, {'{AUTORIZACAO_IMAGEM}'}.
      </p>
    </div>
  );
}
