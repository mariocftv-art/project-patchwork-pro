import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useStaff } from '@/hooks/useStaff';
import AdminLogin from '@/components/AdminLogin';
import ImageUploadField from '@/components/admin/ImageUploadField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { loadMyProfile, saveMyProfile, type StaffProfile } from '@/lib/staffProfile';
import { loadSettings, DEFAULT_ON_THE_WAY, enableAdminPush, sendTestReminder } from '@/lib/appointmentExtras';
import { useDarkMode } from '@/lib/theme';

const selectCls = 'flex h-11 w-full rounded-md border border-input bg-background px-3 text-base';

/** "Meu perfil" — cada admin/técnico edita os próprios dados e preferências. */
export default function MyProfile() {
  const { user, staff, loading } = useStaff();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dark, setDark] = useDarkMode();
  const [p, setP] = useState<StaffProfile | null>(null);
  const [companyTpl, setCompanyTpl] = useState(DEFAULT_ON_THE_WAY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !staff) return;
    loadMyProfile(user.id).then(setP);
    loadSettings().then((s) => setCompanyTpl(s.on_the_way_template || DEFAULT_ON_THE_WAY));
  }, [user, staff]);

  if (loading) return <div className="min-h-[60dvh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <AdminLogin />;
  if (!staff) return <div className="p-8 text-center"><h1 className="text-2xl font-bold">Acesso restrito à equipe</h1><Button asChild className="mt-4"><Link to="/">Voltar para loja</Link></Button></div>;
  if (!p) return <div className="min-h-[60dvh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const save = async () => {
    setSaving(true);
    try {
      await saveMyProfile({ ...p, theme: dark ? 'dark' : 'light' });
      qc.invalidateQueries({ queryKey: ['staff-shortcut'] });
      toast({ title: 'Perfil salvo' });
    } catch (e) { toast({ title: 'Erro ao salvar', description: (e as Error).message, variant: 'destructive' }); }
    setSaving(false);
  };

  return (
    <div className="container mx-auto max-w-xl px-3 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Meu perfil</h1>
        <Button variant="outline" asChild><Link to="/agenda">Agendamentos</Link></Button>
      </div>

      <section className="space-y-3 rounded-lg border-2 border-border bg-card p-3">
        <h2 className="text-lg font-bold">👤 Dados pessoais</h2>
        <Label>Nome completo</Label>
        <Input className="h-11" value={p.full_name || ''} onChange={(e) => setP({ ...p, full_name: e.target.value })} />
        <ImageUploadField label="Foto" value={p.photo_url} folder={`avatars/${user.id}`} onChange={(url) => setP({ ...p, photo_url: url || null })} />
        <Label>Telefone / WhatsApp</Label>
        <Input className="h-11" inputMode="tel" value={p.phone || ''} onChange={(e) => setP({ ...p, phone: e.target.value })} placeholder="(00) 00000-0000" />
        <Label>E-mail</Label>
        <Input className="h-11" value={user.email || ''} disabled />
        <Label>Função</Label>
        <Input className="h-11" value={staff.role === 'admin' ? 'Administrador' : 'Técnico'} disabled />
      </section>

      <section className="space-y-3 rounded-lg border-2 border-border bg-card p-3">
        <h2 className="text-lg font-bold">💬 Minhas mensagens</h2>
        <div className="flex items-center justify-between gap-2"><Label>Modelo "Estou a caminho"</Label>
          <Button variant="ghost" size="sm" onClick={() => setP({ ...p, on_the_way_template: null })}>Usar o modelo da empresa</Button></div>
        <Textarea rows={5} value={p.on_the_way_template ?? companyTpl} onChange={(e) => setP({ ...p, on_the_way_template: e.target.value })} />
        <p className="text-xs text-muted-foreground">{p.on_the_way_template == null ? 'Usando o modelo da empresa. ' : ''}Etiquetas: {'{CLIENTE}'}, {'{EMPRESA}'}, {'{ENDERECO}'}, {'{CHEGADA}'}, {'{HORARIO}'}. A mensagem abre no WhatsApp deste aparelho — o cliente fala direto com você.</p>
      </section>

      <section className="space-y-3 rounded-lg border-2 border-border bg-card p-3">
        <h2 className="text-lg font-bold">🔔 Meus avisos</h2>
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="rem">Aviso de manhã com os meus agendamentos</Label>
          <Switch id="rem" checked={p.reminder_enabled} onCheckedChange={async (on) => {
            setP({ ...p, reminder_enabled: on });
            if (on) { const err = await enableAdminPush(); if (err) toast({ title: 'Aviso não ativado neste aparelho', description: err, variant: 'destructive' }); }
          }} />
        </div>
        <Label>Horário do aviso</Label>
        <select className={selectCls} value={p.reminder_hour} disabled={!p.reminder_enabled} onChange={(e) => setP({ ...p, reminder_hour: Number(e.target.value) })}>
          {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
        </select>
        <Button variant="outline" className="h-11 w-full" onClick={async () => {
          const err = await enableAdminPush();
          if (err) return toast({ title: 'Aviso não ativado', description: err, variant: 'destructive' });
          try { const r = await sendTestReminder(); toast({ title: r.sent ? 'Aviso de teste enviado' : 'Nenhum aparelho recebeu', description: `${r.sent} de ${r.total} aparelho(s) seu(s).` }); }
          catch { toast({ title: 'Falha ao enviar teste', variant: 'destructive' }); }
        }}>Testar aviso no meu aparelho</Button>
        <p className="text-xs text-muted-foreground">Você recebe só os agendamentos {staff.role === 'admin' ? 'da empresa' : 'marcados para você'}.</p>
      </section>

      <section className="space-y-3 rounded-lg border-2 border-border bg-card p-3">
        <h2 className="text-lg font-bold">⚙️ Preferências</h2>
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="dk">Modo escuro</Label>
          <Switch id="dk" checked={dark} onCheckedChange={(d) => setDark(d)} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="sc">📅 Mostrar atalho de Agendamentos no cabeçalho</Label>
          <Switch id="sc" checked={p.show_header_shortcut} onCheckedChange={(v) => setP({ ...p, show_header_shortcut: v })} />
        </div>
        <p className="text-xs text-muted-foreground">Fica guardado na sua conta — vale em qualquer aparelho que você entrar.</p>
      </section>

      <Button className="w-full h-12 font-bold" disabled={saving} onClick={save}>{saving ? 'Salvando…' : 'Salvar meu perfil'}</Button>
    </div>
  );
}
