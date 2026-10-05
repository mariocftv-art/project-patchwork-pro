import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type Row = { id: string; kind: string; page: string | null; user_email: string | null; created_at: string };
const LABEL: Record<string, string> = { suporte: '🛠️ Suporte', orcamento: '💰 Orçamento', produto: '❓ Dúvida de produto', busca: '🔍 Busca sem resultado' };

function weekStart(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }

export default function WhatsAppContactsList() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['whatsapp-contacts'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from('whatsapp_contacts').select('id,kind,page,user_email,created_at').order('created_at', { ascending: false }).limit(500);
      return (data || []) as Row[];
    },
  });
  const weeks = new Map<string, Record<string, number>>();
  rows.forEach((r) => {
    const k = weekStart(new Date(r.created_at)).toLocaleDateString('pt-BR');
    const w = weeks.get(k) || {}; w[r.kind] = (w[r.kind] || 0) + 1; weeks.set(k, w);
  });
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">💬 Contatos pelo WhatsApp</h3>
      {isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : rows.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum contato registrado ainda.</p> : (
        <>
          <div className="overflow-x-auto"><table className="w-full text-sm border border-border">
            <thead className="bg-secondary"><tr><th className="p-2 text-left">Semana de</th>{Object.keys(LABEL).map((k) => <th key={k} className="p-2 text-left">{LABEL[k]}</th>)}</tr></thead>
            <tbody>{[...weeks.entries()].slice(0, 8).map(([k, w]) => <tr key={k} className="border-t border-border"><td className="p-2">{k}</td>{Object.keys(LABEL).map((c) => <td key={c} className="p-2 font-semibold">{w[c] || 0}</td>)}</tr>)}</tbody>
          </table></div>
          <div className="overflow-x-auto"><table className="w-full text-sm border border-border">
            <thead className="bg-secondary"><tr><th className="p-2 text-left">Quando</th><th className="p-2 text-left">Opção</th><th className="p-2 text-left">Página</th><th className="p-2 text-left">Quem</th></tr></thead>
            <tbody>{rows.slice(0, 50).map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                <td className="p-2">{LABEL[r.kind] || r.kind}</td>
                <td className="p-2 break-all">{r.page}</td>
                <td className="p-2">{r.user_email || 'Visitante'}</td>
              </tr>))}</tbody>
          </table></div>
        </>
      )}
    </div>
  );
}
