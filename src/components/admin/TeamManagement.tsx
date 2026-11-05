import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

type Member = { user_id: string; email: string; name: string | null; photo_url: string | null; role: 'admin' | 'tecnico' | 'inativo'; active: boolean; last_sign_in_at: string | null; owner: boolean; me: boolean };
const ROLE = { admin: 'Administrador', tecnico: 'Técnico', inativo: 'Desativado' };

/** Seção "Equipe" das Configurações: convidar, desativar, promover/rebaixar. */
export default function TeamManagement() {
  const { toast } = useToast();
  const [invite, setInvite] = useState({ email: '', name: '' });
  const [busy, setBusy] = useState(false);
  const { data: members = [], refetch, isLoading } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const { data } = await supabase.functions.invoke('manage-technicians', { body: { action: 'list' } });
      return (data?.members || []) as Member[];
    },
  });
  const act = async (action: string, m: Member, confirmMsg: string) => {
    if (!window.confirm(confirmMsg)) return;
    const { data, error } = await supabase.functions.invoke('manage-technicians', { body: { action, user_id: m.user_id } });
    if (error || data?.error) return toast({ title: 'Não foi possível', description: data?.error || 'Tente de novo.', variant: 'destructive' });
    toast({ title: 'Equipe atualizada' }); refetch();
  };

  return (
    <div className="space-y-3">
      {isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : members.map((m) => (
        <div key={m.user_id} className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card p-3">
          {m.photo_url ? <img src={m.photo_url} alt="" className="h-11 w-11 rounded-full object-cover" />
            : <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center font-bold">{(m.name || m.email)[0]?.toUpperCase()}</div>}
          <div className="flex-1 min-w-[10rem]">
            <p className="font-semibold truncate">{m.name || m.email}{m.owner && ' · dono'}{m.me && ' (você)'}</p>
            <p className="text-xs text-muted-foreground truncate">{m.email} · {ROLE[m.role]}</p>
            <p className="text-xs text-muted-foreground">Último acesso: {m.last_sign_in_at ? new Date(m.last_sign_in_at).toLocaleString('pt-BR') : 'nunca entrou'}</p>
          </div>
          {!m.me && !m.owner && (
            <div className="flex flex-wrap gap-2">
              {m.role === 'tecnico' && <Button size="sm" variant="outline" onClick={() => act('promote', m, `Tornar ${m.email} administrador?`)}>Promover a admin</Button>}
              {m.role === 'admin' && <Button size="sm" variant="outline" onClick={() => act('demote', m, `Voltar ${m.email} para técnico?`)}>Voltar a técnico</Button>}
              {m.active
                ? <Button size="sm" variant="destructive" onClick={() => act('deactivate', m, `Desativar o acesso de ${m.email}? O histórico dos agendamentos é mantido.`)}>Desativar</Button>
                : <Button size="sm" onClick={() => act('activate', m, `Reativar ${m.email} como técnico?`)}>Reativar</Button>}
            </div>
          )}
        </div>
      ))}
      <div className="space-y-2 rounded-md border border-border p-3">
        <p className="font-semibold">Convidar técnico</p>
        <Input className="h-11" placeholder="Nome do técnico" value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} />
        <Input className="h-11" type="email" placeholder="E-mail do técnico" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
        <Button className="h-11 w-full" disabled={busy || !invite.email.includes('@')} onClick={async () => {
          setBusy(true);
          const { data, error } = await supabase.functions.invoke('manage-technicians', { body: { action: 'invite', ...invite, redirect: `${window.location.origin}/perfil` } });
          setBusy(false);
          if (error || data?.error) return toast({ title: 'Não foi possível convidar', description: data?.error || 'Tente de novo.', variant: 'destructive' });
          toast({ title: data.invited ? 'Convite enviado por e-mail' : 'Acesso de técnico liberado', description: 'Ele cria a senha pelo e-mail e já entra como técnico.' });
          setInvite({ email: '', name: '' }); refetch();
        }}>{busy ? 'Enviando…' : 'Enviar convite'}</Button>
      </div>
    </div>
  );
}
