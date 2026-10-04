import { Link } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { useStaff } from '@/hooks/useStaff';

/** Só existe para admin/técnico; para os demais não é renderizado. */
export default function StaffAgendaShortcut() {
  const { staff } = useStaff();
  if (!staff || !staff.show) return null;
  return (
    <Link to="/agenda" aria-label={`Agendamentos (${staff.today} hoje)`} className="relative p-2 text-ml-dark-gray hover:text-ml-blue transition-colors">
      <CalendarDays className="w-5 h-5" />
      {staff.today > 0 && (
        <span className="absolute top-0 right-0 min-w-4 h-4 px-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
          {staff.today}
        </span>
      )}
    </Link>
  );
}
