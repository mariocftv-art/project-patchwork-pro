import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

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
        <button className="relative p-2 text-foreground/70 hover:text-primary transition-colors">
          <Bell className="w-5 h-5" />
          {notifications.length > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs"
            >
              {notifications.length}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-popover border shadow-xl" align="end">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Notificações</h3>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="p-4 text-center text-muted-foreground">
              Nenhuma notificação
            </p>
          ) : (
            notifications.map((n) => (
              <Link
                key={n.id}
                to={n.link}
                onClick={() => markAsRead.mutate(n.id)}
                className="block p-4 hover:bg-muted/50 transition-colors border-b border-border last:border-0"
              >
                <p className="font-medium text-foreground text-sm">{n.title}</p>
                <p className="text-muted-foreground text-xs mt-1">{n.message}</p>
              </Link>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
