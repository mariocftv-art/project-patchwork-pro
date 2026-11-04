import { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { addDaysISO, DEFAULT_EARLY_TEXT, executionTermText, type PremiumDocData } from '@/lib/docModel';

const LAST_KEY = 'mr-last-exec-days';
const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };

/** Prazo de conclusão só deste documento: dias, início e conclusão prevista (calculada, mas editável). */
export default function ExecutionTermFields({ data, setData }: { data: PremiumDocData; setData: (d: PremiumDocData) => void }) {
  const c = data.customer;
  const isContract = data.docType === 'contrato';
  // Contrato novo sem prazo: sugere o último usado (ou 15), o dono confirma ou muda
  useEffect(() => {
    if (!isContract || c.executionDays || c.executionTerm?.trim()) return;
    const days = Number(localStorage.getItem(LAST_KEY)) || 15;
    const start = todayISO();
    setData({ ...data, customer: { ...c, executionDays: days, startDate: start, endDate: addDaysISO(start, days), earlyDelivery: true, earlyText: DEFAULT_EARLY_TEXT, executionTerm: `${days} dias corridos` } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isContract]);

  const patch = (p: Partial<typeof c>) => {
    const n = { ...c, ...p };
    if (Number(n.executionDays) > 0) { n.executionTerm = `${n.executionDays} dias corridos`; localStorage.setItem(LAST_KEY, String(n.executionDays)); }
    setData({ ...data, customer: n });
  };
  const setDays = (v: string) => {
    const days = Math.max(0, Math.floor(Number(v.replace(/\D/g, '')) || 0));
    patch({ executionDays: days || undefined, endDate: c.startDate && days ? addDaysISO(c.startDate, days) : c.endDate, executionTerm: days ? undefined : '' });
  };
  const setStart = (v: string) => patch({ startDate: v, endDate: v && Number(c.executionDays) > 0 ? addDaysISO(v, Number(c.executionDays)) : c.endDate });

  return (
    <div className="sm:col-span-6 rounded-md border border-border p-3 space-y-3">
      <p className="font-semibold text-sm">Prazo de conclusão do serviço{isContract ? ' (obrigatório)' : ''} — vale só para este documento</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Prazo (dias corridos)</Label>
          <Input inputMode="numeric" className="h-11 text-base" value={c.executionDays ?? ''} onChange={(e) => setDays(e.target.value)} placeholder="Ex.: 15" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Data de início</Label>
          <Input type="date" className="h-11 text-base" value={c.startDate || ''} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Data prevista de conclusão</Label>
          <Input type="date" className="h-11 text-base" value={c.endDate || ''} onChange={(e) => patch({ endDate: e.target.value })} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-5 w-5" checked={!!c.earlyDelivery} onChange={(e) => patch({ earlyDelivery: e.target.checked, earlyText: c.earlyText || DEFAULT_EARLY_TEXT })} />
        Entrega antecipada
      </label>
      {c.earlyDelivery && <Textarea rows={2} value={c.earlyText ?? DEFAULT_EARLY_TEXT} onChange={(e) => patch({ earlyText: e.target.value })} />}
      {executionTermText(data) && <p className="text-xs text-muted-foreground">No contrato sai: <strong>{executionTermText(data)}</strong></p>}
    </div>
  );
}
