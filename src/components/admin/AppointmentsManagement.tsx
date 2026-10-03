import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { whatsappUrl } from '@/lib/quoteWhatsApp';
import { getBrand } from '@/lib/brand';
import { maskPhone } from '@/lib/masks';
import QuoteEditor from '@/components/admin/QuoteEditor';
import type { DocCustomer } from '@/lib/premiumPDF';
import { loadSettings, saveSettings, fillOnTheWay, enableAdminPush, sendTestReminder, downloadIcs, DEFAULT_ON_THE_WAY, type AppointmentSettings } from '@/lib/appointmentExtras';
import { Truck, CalendarPlus, Settings2 } from 'lucide-react';
import { Plus, MessageCircle, MapPin, CalendarClock, XCircle, CheckCircle2, ChevronLeft, ChevronRight, AlertTriangle, Pencil } from 'lucide-react';

export type Appointment = {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_doc: Partial<DocCustomer>;
  address: string | null;
  reference_point: string | null;
  starts_at: string;
  duration_minutes: number;
  kind: string;
  technician: string | null;
  expected_value: number | null;
  notes: string | null;
  status: string;
  cancel_reason: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => (supabase as any).from('appointments');

export const KIND_LABELS: Record<string, string> = {
  visita: 'Visita técnica', instalacao: 'Instalação', manutencao: 'Manutenção', garantia: 'Revisão de garantia', retirada: 'Retirada',
};
export const STATUS_LABELS: Record<string, string> = {
  agendado: 'Agendado', confirmado: 'Confirmado', andamento: 'Em andamento', concluido: 'Concluído', cancelado: 'Cancelado', faltou: 'Faltou',
};
const STATUS_CLS: Record<string, string> = {
  agendado: 'bg-muted text-foreground', confirmado: 'bg-primary text-primary-foreground', andamento: 'bg-secondary text-secondary-foreground',
  concluido: 'bg-promo text-primary-foreground', cancelado: 'bg-destructive/15 text-destructive', faltou: 'bg-destructive text-destructive-foreground',
};
const ACTIVE = ['agendado', 'confirmado', 'andamento'];

export function useAppointments() {
  return useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      const { data, error } = await db().select('*').order('starts_at');
      if (error) throw error;
      return (data || []) as Appointment[];
    },
    refetchInterval: 60_000,
  });
}

const end = (a: Appointment) => new Date(a.starts_at).getTime() + a.duration_minutes * 60_000;
export type AlertLevel = 'atrasado' | '1h' | '1d' | null;
export function alertOf(a: Appointment, now = Date.now()): AlertLevel {
  if (!ACTIVE.includes(a.status)) return null;
  const t = new Date(a.starts_at).getTime();
  if (t < now && a.status === 'agendado') return 'atrasado';
  if (t >= now && t - now <= 3600_000) return '1h';
  if (t >= now && t - now <= 86400_000) return '1d';
  return null;
}
export const countAlerts = (list: Appointment[]) => list.filter((a) => alertOf(a)).length;

function overlaps(a: Pick<Appointment, 'id' | 'starts_at' | 'duration_minutes' | 'technician'>, list: Appointment[]) {
  if (!a.technician?.trim()) return [];
  const s = new Date(a.starts_at).getTime();
  const e = s + a.duration_minutes * 60_000;
  return list.filter((b) => b.id !== a.id && ACTIVE.includes(b.status) && (b.technician || '').trim().toLowerCase() === a.technician!.trim().toLowerCase()
    && new Date(b.starts_at).getTime() < e && end(b) > s);
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const sameDay = (a: Date, b: Date) => dayKey(a) === dayKey(b);
const fmtDate = (d: Date) => d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
const fmtTime = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const toLocalInput = (iso: string) => { const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
const mapsUrl = (a: Appointment) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.address || '')}`;

type Form = { id?: string; customer_name: string; customer_phone: string; address: string; reference_point: string; starts_at: string; duration_minutes: number; kind: string; technician: string; expected_value: string; notes: string; status: string; customer_doc: Partial<DocCustomer> };
const emptyForm = (): Form => {
  const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0);
  return { customer_name: '', customer_phone: '', address: '', reference_point: '', starts_at: toLocalInput(d.toISOString()), duration_minutes: 60, kind: 'visita', technician: '', expected_value: '', notes: '', status: 'agendado', customer_doc: {} };
};
const selectCls = 'flex h-11 w-full rounded-md border border-input bg-background px-3 text-base';

export default function AppointmentsManagement() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: list = [] } = useAppointments();
  const [view, setView] = useState<'dia' | 'semana' | 'mes'>('dia');
  const [ref, setRef] = useState(new Date());
  const [form, setForm] = useState<Form | null>(null);
  const [cancel, setCancel] = useState<{ a: Appointment; reason: string } | null>(null);
  const [done, setDone] = useState<Appointment | null>(null);
  const [editor, setEditor] = useState<{ type: 'orcamento' | 'contrato'; customer: Partial<DocCustomer> } | null>(null);
  const [now, setNow] = useState(Date.now());
  const { data: settings, refetch: refetchSettings } = useQuery({ queryKey: ['appointment-settings'], queryFn: loadSettings });
  const [cfg, setCfg] = useState<AppointmentSettings | null>(null);
  const [onWay, setOnWay] = useState<{ a: Appointment; mins: number; msg: string } | null>(null);
  const buildOnWay = (a: Appointment, mins: number) => fillOnTheWay(settings?.on_the_way_template || DEFAULT_ON_THE_WAY, {
    cliente: a.customer_name.split(' ')[0], empresa: getBrand().name, endereco: a.address || '',
    chegada: fmtTime(new Date(Date.now() + mins * 60_000)),
  });
  const saveCfg = async (enableNow: boolean) => {
    if (!cfg) return;
    if (enableNow && cfg.reminder_enabled) {
      const err = await enableAdminPush();
      if (err) return toast({ title: 'Aviso não ativado', description: err, variant: 'destructive' });
    }
    try { await saveSettings(cfg); toast({ title: 'Configurações salvas' }); setCfg(null); refetchSettings(); }
    catch (e) { toast({ title: 'Erro ao salvar', description: (e as Error).message, variant: 'destructive' }); }
  };

  const { data: clients = [] } = useQuery({
    queryKey: ['appointment-clients'],
    queryFn: async () => {
      const { data } = await supabase.from('quotes').select('customer_name,customer_phone,customer').order('created_at', { ascending: false }).limit(500);
      const map = new Map<string, { name: string; phone: string; doc: Partial<DocCustomer> }>();
      for (const q of data || []) {
        const c = (q.customer || {}) as Partial<DocCustomer>;
        const name = (q.customer_name || c.name || '').trim();
        if (name && !map.has(name.toLowerCase())) map.set(name.toLowerCase(), { name, phone: c.whatsapp || c.phone || q.customer_phone || '', doc: c });
      }
      return [...map.values()];
    },
  });

  // Avisos na tela (1 dia, 1 hora, atrasado) — uma vez por agendamento e nível
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    for (const a of list) {
      const lvl = alertOf(a, now);
      if (!lvl) continue;
      const k = `apt-alert-${a.id}-${lvl}`;
      if (sessionStorage.getItem(k)) continue;
      sessionStorage.setItem(k, '1');
      const d = new Date(a.starts_at);
      toast({
        title: lvl === 'atrasado' ? '⚠️ Agendamento atrasado' : lvl === '1h' ? '⏰ Falta menos de 1 hora' : '📅 Agendamento amanhã / em menos de 1 dia',
        description: `${KIND_LABELS[a.kind]} — ${a.customer_name}, ${fmtDate(d)} às ${fmtTime(d)}`,
        variant: lvl === 'atrasado' ? 'destructive' : undefined,
      });
    }
  }, [list, now, toast]);

  const today = new Date();
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const notCancelled = list.filter((a) => a.status !== 'cancelado');
  const cards = [
    { label: 'Hoje', n: notCancelled.filter((a) => sameDay(new Date(a.starts_at), today)).length },
    { label: 'Amanhã', n: notCancelled.filter((a) => sameDay(new Date(a.starts_at), tomorrow)).length },
    { label: 'Sem confirmação', n: list.filter((a) => a.status === 'agendado' && end(a) >= now).length },
  ];

  const save = async () => {
    if (!form) return;
    if (!form.customer_name.trim()) return toast({ title: 'Informe o cliente', variant: 'destructive' });
    if (!form.starts_at) return toast({ title: 'Informe data e hora', variant: 'destructive' });
    const row = {
      customer_name: form.customer_name.trim(), customer_phone: form.customer_phone || null, address: form.address || null,
      reference_point: form.reference_point || null, starts_at: new Date(form.starts_at).toISOString(),
      duration_minutes: Math.max(15, Number(form.duration_minutes) || 60), kind: form.kind, technician: form.technician.trim() || null,
      expected_value: form.expected_value ? Number(form.expected_value.replace(',', '.')) : null, notes: form.notes || null,
      status: form.status, customer_doc: { ...form.customer_doc, name: form.customer_name.trim(), whatsapp: form.customer_phone || form.customer_doc.whatsapp },
      updated_at: new Date().toISOString(),
    };
    const clash = overlaps({ id: form.id || '', ...row }, list);
    if (clash.length && !window.confirm(`Atenção: ${row.technician} já tem ${clash.length} agendamento(s) nesse horário (${clash.map((c) => `${c.customer_name} às ${fmtTime(new Date(c.starts_at))}`).join(', ')}). Salvar mesmo assim?`)) return;
    const { error } = form.id ? await db().update(row).eq('id', form.id) : await db().insert(row);
    if (error) return toast({ title: 'Não foi possível salvar', description: error.message, variant: 'destructive' });
    toast({ title: form.id ? 'Agendamento atualizado' : 'Agendamento criado' });
    setForm(null);
    qc.invalidateQueries({ queryKey: ['appointments'] });
  };

  const setStatus = async (a: Appointment, status: string, extra: Record<string, unknown> = {}) => {
    const { error } = await db().update({ status, updated_at: new Date().toISOString(), ...extra }).eq('id', a.id);
    if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    qc.invalidateQueries({ queryKey: ['appointments'] });
  };

  const whats = (a: Appointment) => {
    const d = new Date(a.starts_at);
    const msg = `Olá, ${a.customer_name.split(' ')[0]}! Aqui é da ${getBrand().name}. Confirmando sua ${KIND_LABELS[a.kind].toLowerCase()}:\n📅 ${d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}\n⏰ ${fmtTime(d)}\n📍 ${a.address || '-'}${a.reference_point ? ` (${a.reference_point})` : ''}\nPode confirmar, por favor?`;
    window.open(whatsappUrl(a.customer_phone || '', msg), '_blank', 'noopener,noreferrer');
  };

  const edit = (a: Appointment) => setForm({
    id: a.id, customer_name: a.customer_name, customer_phone: a.customer_phone || '', address: a.address || '', reference_point: a.reference_point || '',
    starts_at: toLocalInput(a.starts_at), duration_minutes: a.duration_minutes, kind: a.kind, technician: a.technician || '',
    expected_value: a.expected_value != null ? String(a.expected_value) : '', notes: a.notes || '', status: a.status, customer_doc: a.customer_doc || {},
  });

  // Período visível
  const range = useMemo(() => {
    const s = new Date(ref); s.setHours(0, 0, 0, 0);
    if (view === 'semana') s.setDate(s.getDate() - s.getDay());
    if (view === 'mes') s.setDate(1);
    const e = new Date(s);
    if (view === 'dia') e.setDate(e.getDate() + 1);
    else if (view === 'semana') e.setDate(e.getDate() + 7);
    else e.setMonth(e.getMonth() + 1);
    return { s, e };
  }, [ref, view]);
  const move = (dir: number) => { const d = new Date(ref); if (view === 'dia') d.setDate(d.getDate() + dir); else if (view === 'semana') d.setDate(d.getDate() + 7 * dir); else d.setMonth(d.getMonth() + dir); setRef(d); };
  const inRange = list.filter((a) => { const t = new Date(a.starts_at); return t >= range.s && t < range.e; });
  const title = view === 'dia' ? ref.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
    : view === 'semana' ? `${fmtDate(range.s)} a ${fmtDate(new Date(range.e.getTime() - 1))}`
    : ref.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const Item = ({ a }: { a: Appointment }) => {
    const d = new Date(a.starts_at);
    const lvl = alertOf(a, now);
    const clash = ACTIVE.includes(a.status) ? overlaps(a, list) : [];
    return (
      <div className={`rounded-lg border p-3 space-y-2 bg-card ${lvl === 'atrasado' ? 'border-destructive border-2 bg-destructive/5' : 'border-border'}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-lg">{fmtTime(d)}</span>
          {view !== 'dia' && <span className="text-sm text-muted-foreground">{fmtDate(d)}</span>}
          <span className="text-sm">· {a.duration_minutes} min</span>
          <span className={`ml-auto text-xs font-semibold px-2 py-1 rounded ${STATUS_CLS[a.status]}`}>{STATUS_LABELS[a.status]}</span>
        </div>
        {lvl === 'atrasado' && <p className="text-sm font-bold text-destructive flex items-center gap-1"><AlertTriangle className="h-4 w-4" />Passou da hora e continua como agendado</p>}
        {lvl === '1h' && <p className="text-sm font-semibold text-destructive">⏰ Falta menos de 1 hora</p>}
        {lvl === '1d' && <p className="text-sm font-semibold">📅 Falta menos de 1 dia</p>}
        {clash.length > 0 && <p className="text-sm font-semibold text-destructive flex items-center gap-1"><AlertTriangle className="h-4 w-4" />Horário sobreposto com {clash.map((c) => c.customer_name).join(', ')} (mesmo técnico)</p>}
        <div>
          <p className="font-semibold">{KIND_LABELS[a.kind]} — {a.customer_name}</p>
          {a.customer_phone && <p className="text-sm">{a.customer_phone}</p>}
          {a.address && <p className="text-sm break-words">📍 {a.address}{a.reference_point ? ` — ${a.reference_point}` : ''}</p>}
          {a.technician && <p className="text-sm">👷 {a.technician}</p>}
          {a.expected_value != null && <p className="text-sm text-price font-semibold">{Number(a.expected_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>}
          {a.notes && <p className="text-sm text-muted-foreground break-words">{a.notes}</p>}
          {a.cancel_reason && <p className="text-sm text-destructive">Motivo: {a.cancel_reason}</p>}
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          <Button variant="outline" className="h-11" disabled={!a.customer_phone} onClick={() => whats(a)}><MessageCircle className="h-4 w-4 mr-1" />Confirmar</Button>
          <Button variant="outline" className="h-11" disabled={!a.customer_phone} onClick={() => setOnWay({ a, mins: 30, msg: buildOnWay(a, 30) })}><Truck className="h-4 w-4 mr-1" />Estou a caminho</Button>
          <Button variant="outline" className="h-11" onClick={() => downloadIcs({ id: a.id, title: `${KIND_LABELS[a.kind]} — ${a.customer_name}`, address: [a.address, a.reference_point].filter(Boolean).join(' — '), description: [a.customer_phone, a.technician && `Técnico: ${a.technician}`, a.notes].filter(Boolean).join('\n'), start: new Date(a.starts_at), minutes: a.duration_minutes })}><CalendarPlus className="h-4 w-4 mr-1" />Adicionar à agenda do celular</Button>
          <Button variant="outline" className="h-11" disabled={!a.address} onClick={() => window.open(mapsUrl(a), '_blank', 'noopener,noreferrer')}><MapPin className="h-4 w-4 mr-1" />Mapa</Button>
          {a.status === 'agendado' && <Button variant="outline" className="h-11" onClick={() => setStatus(a, 'confirmado')}><CheckCircle2 className="h-4 w-4 mr-1" />Cliente confirmou</Button>}
          <Button variant="outline" className="h-11" onClick={() => edit(a)}><CalendarClock className="h-4 w-4 mr-1" />Remarcar</Button>
          {ACTIVE.includes(a.status) && <Button variant="outline" className="h-11" onClick={() => setStatus(a, 'faltou')}>Faltou</Button>}
          {ACTIVE.includes(a.status) && <Button variant="outline" className="h-11 text-destructive" onClick={() => setCancel({ a, reason: '' })}><XCircle className="h-4 w-4 mr-1" />Cancelar</Button>}
          {ACTIVE.includes(a.status) && <Button className="h-11" onClick={async () => { await setStatus(a, 'concluido'); setDone(a); }}><CheckCircle2 className="h-4 w-4 mr-1" />Concluir</Button>}
          {!ACTIVE.includes(a.status) && <Button variant="ghost" className="h-11" onClick={() => edit(a)}><Pencil className="h-4 w-4 mr-1" />Editar</Button>}
        </div>
      </div>
    );
  };

  const monthGrid = () => {
    const first = new Date(range.s); first.setDate(1 - first.getDay());
    const days = Array.from({ length: 42 }, (_, i) => { const d = new Date(first); d.setDate(first.getDate() + i); return d; });
    return (
      <div className="grid grid-cols-7 gap-1 text-center">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((l, i) => <div key={i} className="text-xs font-semibold text-muted-foreground">{l}</div>)}
        {days.map((d) => {
          const items = notCancelled.filter((a) => sameDay(new Date(a.starts_at), d));
          const late = items.some((a) => alertOf(a, now) === 'atrasado');
          const red = items.some((a) => a.status === 'agendado');
          const green = items.some((a) => a.status !== 'agendado' && a.status !== 'faltou');
          const out = d.getMonth() !== range.s.getMonth();
          return (
            <button key={d.toISOString()} onClick={() => { setRef(d); setView('dia'); }}
              className={`min-h-14 rounded-md border p-1 text-sm flex flex-col items-center ${out ? 'opacity-40' : ''} ${sameDay(d, today) ? 'border-primary border-2' : 'border-border'} bg-card relative overflow-hidden`}
              aria-label={`${d.getDate()}: ${items.length} agendamento(s)${green ? ', confirmado' : ''}${red ? ', não confirmado' : ''}`}>
              {(green || red) && <span className="absolute inset-0 flex" aria-hidden>
                {green && <span className="flex-1 bg-promo/25" />}{red && <span className="flex-1 bg-destructive/20" />}
              </span>}
              <span className="relative font-semibold">{d.getDate()}</span>
              {items.length > 0 && <span className="relative mt-1 flex gap-1">
                {green && <span className="h-2.5 w-2.5 rounded-full bg-promo" />}{red && <span className="h-2.5 w-2.5 rounded-full bg-destructive" />}
                <span className={`text-xs font-bold ${late ? 'text-destructive' : ''}`}>{items.length}</span>
              </span>}
            </button>
          );
        })}
      </div>
    );
  };
  const legend = (
    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
      <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full border border-border bg-card" />Sem agendamento</span>
      <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-promo" />Confirmado</span>
      <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-destructive" />Não confirmado pelo cliente</span>
    </div>
  );

  return (
    <div className="space-y-4 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Agendamentos</h2>
        <div className="flex gap-2">
          <Button variant="outline" className="h-11" onClick={() => settings && setCfg({ ...settings })}><Settings2 className="h-4 w-4 mr-1" />Configurações</Button>
          <Button className="h-11" onClick={() => setForm(emptyForm())}><Plus className="h-4 w-4 mr-1" />Novo</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-card p-3 text-center">
            <p className="text-2xl font-bold">{c.n}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
        {(['dia', 'semana', 'mes'] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className={`h-10 rounded-md text-sm font-semibold ${view === v ? 'bg-background shadow' : ''}`}>
            {v === 'dia' ? 'Dia' : v === 'semana' ? 'Semana' : 'Mês'}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-11 w-11" aria-label="Anterior" onClick={() => move(-1)}><ChevronLeft className="h-5 w-5" /></Button>
        <p className="flex-1 text-center font-semibold capitalize">{title}</p>
        <Button variant="outline" size="icon" className="h-11 w-11" aria-label="Próximo" onClick={() => move(1)}><ChevronRight className="h-5 w-5" /></Button>
        <Button variant="ghost" className="h-11" onClick={() => setRef(new Date())}>Hoje</Button>
      </div>

      {view === 'mes' ? <div className="space-y-2">{monthGrid()}{legend}</div> : inRange.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Nenhum agendamento neste período.</p>
      ) : (
        <div className="space-y-3">{inRange.map((a) => <Item key={a.id} a={a} />)}</div>
      )}

      {/* Formulário */}
      <Dialog open={!!form} onOpenChange={(v) => !v && setForm(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form?.id ? 'Editar / remarcar' : 'Novo agendamento'}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3">
              <div>
                <Label>Cliente *</Label>
                <Input className="h-11 mt-1" list="apt-clients" value={form.customer_name} placeholder="Escolha ou digite o nome"
                  onChange={(e) => {
                    const v = e.target.value;
                    const c = clients.find((x) => x.name === v);
                    const addr = c ? [c.doc.street, c.doc.number, c.doc.complement, c.doc.district, c.doc.city, c.doc.state].filter(Boolean).join(', ') : '';
                    setForm({ ...form, customer_name: v, ...(c ? { customer_phone: c.phone, customer_doc: c.doc, address: form.address || addr } : {}) });
                  }} />
                <datalist id="apt-clients">{clients.map((c) => <option key={c.name} value={c.name} />)}</datalist>
              </div>
              <div><Label>Telefone / WhatsApp</Label><Input className="h-11 mt-1" inputMode="numeric" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: maskPhone(e.target.value) })} placeholder="(00) 00000-0000" /></div>
              <div><Label>Endereço</Label><Input className="h-11 mt-1" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div><Label>Ponto de referência</Label><Input className="h-11 mt-1" value={form.reference_point} onChange={(e) => setForm({ ...form, reference_point: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2 sm:col-span-1"><Label>Data e hora de início *</Label><Input type="datetime-local" className="h-11 mt-1" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></div>
                <div className="col-span-2 sm:col-span-1"><Label>Duração prevista</Label>
                  <select className={`${selectCls} mt-1`} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}>
                    {[30, 60, 90, 120, 180, 240, 360, 480].map((m) => <option key={m} value={m}>{m < 60 ? `${m} min` : `${m / 60} h`.replace('.5', ',5')}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Tipo</Label>
                  <select className={`${selectCls} mt-1`} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                    {Object.entries(KIND_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </div>
                <div><Label>Status</Label>
                  <select className={`${selectCls} mt-1`} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {Object.entries(STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Técnico responsável</Label><Input className="h-11 mt-1" list="apt-techs" value={form.technician} onChange={(e) => setForm({ ...form, technician: e.target.value })} />
                  <datalist id="apt-techs">{[...new Set(list.map((a) => a.technician).filter(Boolean))].map((t) => <option key={t!} value={t!} />)}</datalist>
                </div>
                <div><Label>Valor previsto (R$)</Label><Input className="h-11 mt-1" inputMode="decimal" value={form.expected_value} onChange={(e) => setForm({ ...form, expected_value: e.target.value.replace(/[^\d,.]/g, '') })} /></div>
              </div>
              <div><Label>Observações</Label><Textarea className="mt-1" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              {(() => { const c = form.starts_at ? overlaps({ id: form.id || '', starts_at: new Date(form.starts_at).toISOString(), duration_minutes: form.duration_minutes, technician: form.technician }, list) : []; return c.length ? <p className="text-sm font-semibold text-destructive">⚠️ {form.technician} já tem agendamento nesse horário: {c.map((x) => `${x.customer_name} às ${fmtTime(new Date(x.starts_at))}`).join(', ')}</p> : null; })()}
              <Button className="w-full h-12 font-bold" onClick={save}>Salvar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Estou a caminho */}
      <Dialog open={!!onWay} onOpenChange={(v) => !v && setOnWay(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Estou a caminho</DialogTitle></DialogHeader>
          {onWay && (
            <div className="space-y-3">
              <Label>Chego em quantos minutos?</Label>
              <select className={selectCls} value={onWay.mins} onChange={(e) => { const m = Number(e.target.value); setOnWay({ ...onWay, mins: m, msg: buildOnWay(onWay.a, m) }); }}>
                {[10, 15, 20, 30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} min (chegada ~{fmtTime(new Date(Date.now() + m * 60_000))})</option>)}
              </select>
              <Label>Mensagem (pode editar)</Label>
              <Textarea rows={6} value={onWay.msg} onChange={(e) => setOnWay({ ...onWay, msg: e.target.value })} />
              <Button className="w-full h-12" onClick={() => { window.open(whatsappUrl(onWay.a.customer_phone || '', onWay.msg), '_blank', 'noopener,noreferrer'); setOnWay(null); }}><MessageCircle className="h-4 w-4 mr-1" />Abrir WhatsApp</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Configurações */}
      <Dialog open={!!cfg} onOpenChange={(v) => !v && setCfg(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Configurações dos agendamentos</DialogTitle></DialogHeader>
          {cfg && (
            <div className="space-y-4">
              <div className="space-y-2 rounded-lg border border-border p-3">
                <label className="flex items-center gap-2 font-semibold cursor-pointer">
                  <input type="checkbox" className="h-5 w-5" checked={cfg.reminder_enabled} onChange={(e) => setCfg({ ...cfg, reminder_enabled: e.target.checked })} />
                  Aviso de manhã com os agendamentos do dia
                </label>
                <Label>Horário do aviso</Label>
                <select className={selectCls} value={cfg.reminder_hour} disabled={!cfg.reminder_enabled} onChange={(e) => setCfg({ ...cfg, reminder_hour: Number(e.target.value) })}>
                  {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
                </select>
                <p className="text-xs text-muted-foreground">Ao salvar ligado, este aparelho pede permissão para notificações. Ative em cada celular/computador onde quer receber. Para ter alarme com som, use também "Adicionar à agenda do celular" em cada agendamento.</p>
                <Button variant="outline" className="h-11 w-full" onClick={async () => {
                  const err = await enableAdminPush();
                  if (err) return toast({ title: 'Aviso não ativado', description: err, variant: 'destructive' });
                  try { const r = await sendTestReminder(); toast({ title: r.sent ? 'Aviso de teste enviado' : 'Nenhum aparelho recebeu', description: `${r.sent} de ${r.total} aparelho(s)` }); }
                  catch { toast({ title: 'Falha ao enviar teste', variant: 'destructive' }); }
                }}>Enviar aviso de teste agora</Button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><Label>Mensagem "Estou a caminho"</Label>
                  <Button variant="ghost" size="sm" onClick={() => setCfg({ ...cfg, on_the_way_template: DEFAULT_ON_THE_WAY })}>Restaurar padrão</Button></div>
                <Textarea rows={5} value={cfg.on_the_way_template} onChange={(e) => setCfg({ ...cfg, on_the_way_template: e.target.value })} />
                <p className="text-xs text-muted-foreground">Use {'{CLIENTE}'}, {'{EMPRESA}'}, {'{ENDERECO}'} e {'{CHEGADA}'} (horário previsto).</p>
              </div>
              <Button className="w-full h-12 font-bold" onClick={() => saveCfg(cfg.reminder_enabled && !settings?.reminder_enabled)}>Salvar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancelar com motivo */}
      <Dialog open={!!cancel} onOpenChange={(v) => !v && setCancel(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Cancelar agendamento</DialogTitle></DialogHeader>
          {cancel && (
            <div className="space-y-3">
              <p className="text-sm">{cancel.a.customer_name} — {fmtDate(new Date(cancel.a.starts_at))} às {fmtTime(new Date(cancel.a.starts_at))}</p>
              <Label>Motivo *</Label>
              <Textarea value={cancel.reason} onChange={(e) => setCancel({ ...cancel, reason: e.target.value })} />
              <Button variant="destructive" className="w-full h-12" disabled={cancel.reason.trim().length < 3}
                onClick={async () => { await setStatus(cancel.a, 'cancelado', { cancel_reason: cancel.reason.trim() }); setCancel(null); }}>Confirmar cancelamento</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Depois de concluir */}
      <Dialog open={!!done} onOpenChange={(v) => !v && setDone(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Agendamento concluído ✅</DialogTitle></DialogHeader>
          {done && (
            <div className="space-y-3">
              <p className="text-sm">Quer gerar um documento para {done.customer_name} com os dados já preenchidos?</p>
              {(['orcamento', 'contrato'] as const).map((t) => (
                <Button key={t} variant={t === 'orcamento' ? 'default' : 'outline'} className="w-full h-12" onClick={() => {
                  const c = { ...(done.customer_doc || {}), name: done.customer_name, whatsapp: done.customer_phone || done.customer_doc?.whatsapp, phone: done.customer_doc?.phone || done.customer_phone || undefined };
                  if (!c.street && done.address) c.note = `Endereço: ${done.address}${done.reference_point ? ` (${done.reference_point})` : ''}`;
                  setEditor({ type: t, customer: c }); setDone(null);
                }}>{t === 'orcamento' ? 'Gerar orçamento' : 'Gerar contrato'}</Button>
              ))}
              <Button variant="ghost" className="w-full h-11" onClick={() => setDone(null)}>Agora não</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {editor && (
        <QuoteEditor open onOpenChange={(v) => !v && setEditor(null)} record={null} defaultDocType={editor.type} prefillCustomer={editor.customer} onSaved={() => qc.invalidateQueries({ queryKey: ['quotes'] })} />
      )}
    </div>
  );
}
