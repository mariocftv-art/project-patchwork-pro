import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, Package, CheckCircle2, Truck, Clock, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { adminLogsApi } from '@/lib/supabaseApi';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { useCustomerNotifications } from '@/hooks/useCustomerNotifications';

interface OrderNotification {
  id: string;
  order_number: string;
  customer_name: string;
  status: string;
  total: number;
  created_at: string;
  items: Array<{ name: string; quantity: number; price: number }>;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<any> }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  confirmed: { label: 'Confirmado', color: 'bg-blue-100 text-blue-800', icon: CheckCircle2 },
  preparing: { label: 'Preparando', color: 'bg-purple-100 text-purple-800', icon: Package },
  shipped: { label: 'Enviado', color: 'bg-orange-100 text-orange-800', icon: Truck },
  delivered: { label: 'Entregue', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: Clock },
};

const statusOptions = [
  { value: 'pending', label: 'Pendente' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'preparing', label: 'Preparando' },
  { value: 'shipped', label: 'Enviado' },
  { value: 'delivered', label: 'Entregue' },
];

// Admin emails that can see order notifications
const ADMIN_EMAILS = ['pixmrshop@gmail.com', 'rogeriocftv.mr@gmail.com'];

export default function NotificationsPopover() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  
  // Customer notifications hook
  const { 
    notifications: customerNotifications, 
    unreadCount: customerUnreadCount,
    markAsRead,
    markAllAsRead,
  } = useCustomerNotifications();

  // Check if current user is an authorized admin
  const isAuthorizedAdmin = user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());

  // Fetch pending orders for admin notifications
  const { data: pendingOrders = [] } = useQuery({
    queryKey: ['admin-pending-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['pending', 'confirmed', 'preparing', 'shipped'])
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      
      return (data || []).map(order => ({
        ...order,
        items: order.items as unknown as Array<{ name: string; quantity: number; price: number }>,
      })) as OrderNotification[];
    },
    enabled: isAuthorizedAdmin && isAdmin,
    refetchInterval: 30000,
  });

  // Update order status mutation
  const updateStatus = useMutation({
    mutationFn: async ({ orderId, newStatus }: { orderId: string; newStatus: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);
      
      if (error) throw error;
      
      await adminLogsApi.log('update_order_status', 'order', orderId, { newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast({ title: 'Status atualizado!' });
    },
    onError: () => {
      toast({
        title: 'Erro ao atualizar',
        variant: 'destructive',
      });
    },
  });

  // Count of pending orders (only "pending" status) for admins
  const adminPendingCount = pendingOrders.filter(o => o.status === 'pending').length;
  
  // Total unread count (admin pending + customer notifications)
  const totalUnreadCount = (isAuthorizedAdmin && isAdmin) ? adminPendingCount : customerUnreadCount;

  // If admin, show admin notifications
  if (isAuthorizedAdmin && isAdmin) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative text-ml-dark-gray hover:text-ml-blue">
            <Bell className="w-5 h-5" />
            {adminPendingCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {adminPendingCount > 9 ? '9+' : adminPendingCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-0 bg-white border shadow-lg" align="end">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <h3 className="font-medium text-foreground text-sm flex items-center gap-2">
              <Package className="w-4 h-4" />
              Pedidos ({pendingOrders.length})
            </h3>
            <Link to="/admin" onClick={() => setIsOpen(false)}>
              <Button variant="ghost" size="sm" className="text-xs">
                Ver todos
              </Button>
            </Link>
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {pendingOrders.length === 0 ? (
              <p className="p-4 text-center text-ml-gray text-sm">
                Nenhum pedido pendente
              </p>
            ) : (
              <div className="divide-y divide-border">
                {pendingOrders.map((order) => (
                  <div key={order.id} className="p-3 hover:bg-secondary/50">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">#{order.order_number}</span>
                          <Badge className={`${statusConfig[order.status]?.color} text-[10px] px-1.5 py-0`}>
                            {statusConfig[order.status]?.label || order.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {order.customer_name}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                    
                    <div className="text-xs text-muted-foreground mb-2 line-clamp-1">
                      {order.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}
                    </div>
                    
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm text-primary">
                        R$ {order.total.toFixed(2)}
                      </span>
                      
                      <Select
                        value={order.status}
                        onValueChange={(value) => updateStatus.mutate({ orderId: order.id, newStatus: value })}
                      >
                        <SelectTrigger className="h-7 text-xs w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map(option => (
                            <SelectItem key={option.value} value={option.value} className="text-xs">
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {adminPendingCount > 0 && (
            <div className="p-2 border-t border-border bg-yellow-50">
              <p className="text-xs text-yellow-800 text-center">
                ⚠️ {adminPendingCount} pedido(s) aguardando confirmação
              </p>
            </div>
          )}
        </PopoverContent>
      </Popover>
    );
  }

  // Customer notifications view
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-ml-dark-gray hover:text-ml-blue">
          <Bell className="w-5 h-5" />
          {customerUnreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
              {customerUnreadCount > 9 ? '9+' : customerUnreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-white border shadow-lg" align="end">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h3 className="font-medium text-foreground text-sm flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notificações
          </h3>
          {customerUnreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={markAllAsRead}>
              Marcar como lidas
            </Button>
          )}
        </div>
        
        <div className="max-h-72 overflow-y-auto">
          {customerNotifications.length === 0 ? (
            <div className="p-6 text-center">
              <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Nenhuma notificação
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Rastreie um pedido para receber atualizações
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {customerNotifications.map((notification) => {
                const config = statusConfig[notification.status];
                const StatusIcon = config?.icon || Package;
                
                return (
                  <Link
                    key={notification.id}
                    to={`/rastrear-pedido?pedido=${notification.orderNumber}`}
                    onClick={() => {
                      markAsRead(notification.id);
                      setIsOpen(false);
                    }}
                    className={`block p-3 hover:bg-secondary/50 transition-colors ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${config?.color || 'bg-gray-100'}`}>
                        <StatusIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          Pedido #{notification.orderNumber}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Status: <span className="font-medium">{notification.statusLabel}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(notification.timestamp, { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                      {!notification.read && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        
        {customerNotifications.length > 0 && (
          <div className="p-2 border-t border-border">
            <Link 
              to="/rastrear-pedido" 
              onClick={() => setIsOpen(false)}
              className="text-xs text-primary hover:underline block text-center"
            >
              Rastrear outro pedido
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
