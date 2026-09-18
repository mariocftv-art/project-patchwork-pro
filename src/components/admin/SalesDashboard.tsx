import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatBRL } from '@/lib/formatCurrency';
import { getOrderStatusInfo, ORDER_STATUSES } from '@/lib/orderStatus';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ShoppingBag, Clock, CheckCircle2, TrendingUp, Receipt } from 'lucide-react';

type PeriodKey = 'today' | '7' | '30' | '90' | 'custom';

interface OrderRow {
  id: string;
  total: number;
  status: string;
  created_at: string;
  items: unknown;
}

const periods: Array<{ key: PeriodKey; label: string }> = [
  { key: 'today', label: 'Hoje' },
  { key: '7', label: '7 dias' },
  { key: '30', label: '30 dias' },
  { key: '90', label: '90 dias' },
  { key: 'custom', label: 'Personalizado' },
];

export default function SalesDashboard() {
  const [period, setPeriod] = useState<PeriodKey>('30');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-sales-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, total, status, created_at, items')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as OrderRow[];
    },
  });

  const range = useMemo(() => {
    const now = new Date();
    if (period === 'custom' && customFrom) {
      const from = new Date(`${customFrom}T00:00:00`);
      const to = customTo ? new Date(`${customTo}T23:59:59`) : now;
      return { from, to };
    }
    if (period === 'today') {
      const from = new Date(now);
      from.setHours(0, 0, 0, 0);
      return { from, to: now };
    }
    const days = Number(period === 'custom' ? 30 : period);
    const from = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    from.setHours(0, 0, 0, 0);
    return { from, to: now };
  }, [period, customFrom, customTo]);

  const filtered = useMemo(
    () =>
      orders.filter((o) => {
        const d = new Date(o.created_at);
        return d >= range.from && d <= range.to;
      }),
    [orders, range]
  );

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const metrics = useMemo(() => {
    const paidStatuses = ['paid', 'preparing', 'shipped', 'delivered', 'confirmed'];
    const revenue = filtered
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + Number(o.total || 0), 0);
    const valid = filtered.filter((o) => o.status !== 'cancelled').length;
    return {
      today: orders.filter((o) => new Date(o.created_at) >= todayStart).length,
      open: filtered.filter((o) => ['pending', 'payment_pending'].includes(o.status)).length,
      confirmed: filtered.filter((o) => paidStatuses.includes(o.status)).length,
      revenue,
      average: valid ? revenue / valid : 0,
      count: filtered.length,
    };
  }, [filtered, orders, todayStart]);

  const daily = useMemo(() => {
    const map = new Map<string, { label: string; pedidos: number; faturamento: number }>();
    const cursor = new Date(range.from);
    while (cursor <= range.to) {
      const key = cursor.toISOString().slice(0, 10);
      map.set(key, {
        label: cursor.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        pedidos: 0,
        faturamento: 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    filtered.forEach((o) => {
      const key = new Date(o.created_at).toISOString().slice(0, 10);
      const entry = map.get(key);
      if (entry) {
        entry.pedidos += 1;
        if (o.status !== 'cancelled') entry.faturamento += Number(o.total || 0);
      }
    });
    return Array.from(map.values());
  }, [filtered, range]);

  const byStatus = useMemo(
    () =>
      ORDER_STATUSES.map((s) => ({
        label: s.label,
        quantidade: filtered.filter((o) => o.status === s.value).length,
      })).filter((s) => s.quantidade > 0),
    [filtered]
  );

  const cards = [
    { label: 'Pedidos hoje', value: String(metrics.today), icon: ShoppingBag },
    { label: 'Pedidos em aberto', value: String(metrics.open), icon: Clock },
    { label: 'Pedidos confirmados', value: String(metrics.confirmed), icon: CheckCircle2 },
    { label: 'Vendas do período', value: formatBRL(metrics.revenue), icon: TrendingUp },
    { label: 'Ticket médio', value: formatBRL(metrics.average), icon: Receipt },
  ];

  return (
    <div className="space-y-6">
      {/* Filtro de período */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-2">
          {periods.map((p) => (
            <Button
              key={p.key}
              size="sm"
              variant={period === p.key ? 'default' : 'outline'}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </Button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <Label className="text-xs">De</Label>
              <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Até</Label>
              <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-9" />
            </div>
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{card.label}</span>
              <card.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xl font-bold text-foreground">{isLoading ? '—' : card.value}</p>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3">Faturamento por dia</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" fontSize={11} tickLine={false} />
                <YAxis fontSize={11} tickLine={false} width={50} />
                <Tooltip formatter={(v: number) => formatBRL(v)} />
                <Line type="monotone" dataKey="faturamento" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3">Pedidos por dia</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" fontSize={11} tickLine={false} />
                <YAxis fontSize={11} allowDecimals={false} tickLine={false} width={30} />
                <Tooltip />
                <Bar dataKey="pedidos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {byStatus.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3">Pedidos por status</h3>
          <div className="space-y-2">
            {byStatus.map((s) => {
              const info = ORDER_STATUSES.find((o) => o.label === s.label) ?? getOrderStatusInfo();
              const pct = metrics.count ? (s.quantidade / metrics.count) * 100 : 0;
              return (
                <div key={s.label} className="flex items-center gap-3">
                  <span className="w-48 text-sm text-muted-foreground truncate">
                    {info.emoji} {s.label}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{s.quantidade}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
