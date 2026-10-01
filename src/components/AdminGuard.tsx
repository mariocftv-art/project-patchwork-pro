import { ReactNode, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AdminLogin from '@/components/AdminLogin';

interface AdminGuardProps {
  children: ReactNode;
}

const AdminGuard = ({ children }: AdminGuardProps) => {
  const navigate = useNavigate();
  const { user, loading, isAdmin, signOut } = useAuth();
  const [claimed, setClaimed] = useState(false);

  // Site novo (remix) sem nenhum admin: a primeira conta que entrar aqui vira admin.
  useEffect(() => {
    if (loading || !user || isAdmin || claimed) return;
    setClaimed(true);
    supabase.rpc('claim_first_admin' as never).then(({ data }) => {
      if (data === true) window.location.reload();
    });
  }, [loading, user, isAdmin, claimed]);

  // Ao entrar no painel: a tela de login já saiu da árvore; fecha teclado, libera rolagem e sobe ao topo.
  useEffect(() => {
    if (loading || !user || !isAdmin) return;
    (document.activeElement as HTMLElement | null)?.blur?.();
    document.body.style.overflow = '';
    document.body.style.pointerEvents = '';
    document.body.removeAttribute('data-scroll-locked');
    window.scrollTo(0, 0);
    requestAnimationFrame(() => window.scrollTo(0, 0));
  }, [loading, user, isAdmin]);

  if (loading) {
    return (
      <div className="min-h-[70dvh] flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Não autenticado: tela de login administrativa própria da rota /admin
  if (!user) {
    return <AdminLogin />;
  }

  // Autenticado mas sem a role admin: acesso bloqueado
  if (!isAdmin) {
    return (
      <div className="min-h-[70dvh] flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <ShieldX className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Acesso Negado</h1>
            <p className="text-muted-foreground">
              Você não possui permissão para acessar o painel administrativo.
            </p>
            <p className="text-sm text-muted-foreground">
              Logado como: <span className="font-medium">{user.email}</span>
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate('/')}>
              Voltar para loja
            </Button>
            <Button onClick={() => signOut()}>Sair</Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminGuard;
