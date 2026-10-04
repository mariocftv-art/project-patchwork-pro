import { Loader2, ShieldX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStaff } from '@/hooks/useStaff';
import { useAuth } from '@/hooks/useAuth';
import AdminLogin from '@/components/AdminLogin';
import AppointmentsManagement from '@/components/admin/AppointmentsManagement';
import { Button } from '@/components/ui/button';

/** Agendamentos para admin e técnicos. Os dados só chegam se o banco permitir (RLS). */
export default function Agenda() {
  const { user, staff, loading } = useStaff();
  const { signOut } = useAuth();
  if (loading) return <div className="min-h-[60dvh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <AdminLogin />;
  if (!staff) return (
    <div className="min-h-[60dvh] flex flex-col items-center justify-center gap-4 p-4 text-center">
      <ShieldX className="h-10 w-10 text-destructive" />
      <h1 className="text-2xl font-bold">Acesso restrito à equipe</h1>
      <div className="flex gap-2"><Button variant="outline" asChild><Link to="/">Voltar para loja</Link></Button><Button onClick={() => signOut()}>Sair</Button></div>
    </div>
  );
  return (
    <div className="container mx-auto max-w-4xl px-3 py-6 space-y-3">
      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild><Link to="/perfil">Meu perfil</Link></Button>
        {staff.role === 'admin' && <Button variant="outline" asChild><Link to="/admin">Painel completo</Link></Button>}
        <Button variant="ghost" onClick={() => signOut()}>Sair</Button>
      </div>
      <AppointmentsManagement staffRole={staff.role} />
    </div>
  );
}
