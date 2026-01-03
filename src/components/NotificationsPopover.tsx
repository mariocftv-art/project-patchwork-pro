import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function NotificationsPopover() {
  const queryClient = useQueryClient();
  
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => base44.entities.Notification.list({ filter: { read: false } as any }),
    staleTime: 1000 * 30,
  });

  const markAsRead = useMutation({
    mutationFn: (id: string) => base44.entities.Notification.update(id, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-ml-dark-gray hover:text-ml-blue">
          <Bell className="w-5 h-5" />
          {notifications.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-ml-blue text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {notifications.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-white border shadow-lg" align="end">
        <div className="p-3 border-b border-border">
          <h3 className="font-medium text-foreground text-sm">Notificações</h3>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="p-4 text-center text-ml-gray text-sm">
              Nenhuma notificação
            </p>
          ) : (
            notifications.map((n) => (
              <Link
                key={n.id}
                to={n.link}
                onClick={() => markAsRead.mutate(n.id)}
                className="block p-3 hover:bg-secondary transition-colors border-b border-border last:border-0"
              >
                <p className="font-medium text-foreground text-sm">{n.title}</p>
                <p className="text-ml-gray text-xs mt-1">{n.message}</p>
              </Link>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
