import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type StaffInfo = { role: 'admin' | 'tecnico'; today: number; show: boolean };

/** Papel da equipe vindo do banco (null = visitante/cliente). */
export function useStaff() {
  const { user, loading } = useAuth();
  const q = useQuery({
    queryKey: ['staff-shortcut', user?.id],
    enabled: !!user,
    refetchInterval: 120_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('staff_shortcut' as never);
      if (error) return null;
      return (data as StaffInfo | null) ?? null;
    },
  });
  return { user, staff: user ? q.data ?? null : null, loading: loading || (!!user && q.isLoading) };
}
