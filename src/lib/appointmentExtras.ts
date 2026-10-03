import { supabase } from '@/integrations/supabase/client';
import { registerServiceWorker, subscribeToPush, isPushSupported } from '@/utils/serviceWorkerPush';

export type AppointmentSettings = { reminder_enabled: boolean; reminder_hour: number; on_the_way_template: string };
export const DEFAULT_ON_THE_WAY =
  'Olá, {CLIENTE}! Aqui é da 🛡️ {EMPRESA}. O técnico está saindo agora para o seu endereço ({ENDERECO}). Previsão de chegada: {CHEGADA}. Até já!';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tbl = (n: string) => (supabase as any).from(n);

export async function loadSettings(): Promise<AppointmentSettings> {
  const { data } = await tbl('appointment_settings').select('reminder_enabled,reminder_hour,on_the_way_template').eq('id', 1).maybeSingle();
  return data || { reminder_enabled: false, reminder_hour: 7, on_the_way_template: DEFAULT_ON_THE_WAY };
}
export async function saveSettings(s: AppointmentSettings) {
  const { error } = await tbl('appointment_settings').upsert({ id: 1, ...s, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export function fillOnTheWay(tpl: string, v: { cliente: string; empresa: string; endereco: string; chegada: string }) {
  return (tpl || DEFAULT_ON_THE_WAY)
    .split('{CLIENTE}').join(v.cliente).split('{EMPRESA}').join(v.empresa)
    .split('{ENDERECO}').join(v.endereco || 'seu endereço').split('{CHEGADA}').join(v.chegada);
}

/** Ativa avisos push neste aparelho para o admin logado. */
export async function enableAdminPush(): Promise<string | null> {
  if (!isPushSupported()) return 'Este navegador não aceita notificações. No iPhone, instale o site na tela inicial primeiro.';
  const { data, error } = await supabase.functions.invoke('appointment-reminders', { body: { action: 'vapid' } });
  if (error || !data?.publicKey) return 'Não foi possível preparar as notificações.';
  await registerServiceWorker();
  const sub = await subscribeToPush(data.publicKey);
  if (!sub) return 'Permissão de notificação negada. Libere nas configurações do navegador.';
  const j = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return 'Faça login novamente.';
  const { error: e2 } = await tbl('admin_push_subscriptions').upsert(
    { user_id: u.user.id, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }, { onConflict: 'endpoint' });
  return e2 ? 'Não foi possível salvar este aparelho.' : null;
}

export async function sendTestReminder() {
  const { data, error } = await supabase.functions.invoke('appointment-reminders', { body: { action: 'test' } });
  if (error) throw error;
  return data as { sent: number; total: number };
}

const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

export function downloadIcs(a: { id: string; title: string; address?: string | null; description?: string; start: Date; minutes: number }) {
  const endD = new Date(a.start.getTime() + a.minutes * 60_000);
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Agenda//PT-BR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT', `UID:${a.id}@agendamentos`, `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(a.start)}`, `DTEND:${icsDate(endD)}`, `SUMMARY:${esc(a.title)}`,
    a.address ? `LOCATION:${esc(a.address)}` : '', a.description ? `DESCRIPTION:${esc(a.description)}` : '',
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(a.title)}`, 'TRIGGER:-PT1H', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = `agendamento-${a.start.toISOString().slice(0, 10)}.ics`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
