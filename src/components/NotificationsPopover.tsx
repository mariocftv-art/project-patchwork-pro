import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Notifications are now a placeholder - to be implemented with Supabase if needed
export default function NotificationsPopover() {
  const notifications: Array<{ id: string; title: string; message: string; link: string }> = [];

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
          <p className="p-4 text-center text-ml-gray text-sm">
            Nenhuma notificação
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
