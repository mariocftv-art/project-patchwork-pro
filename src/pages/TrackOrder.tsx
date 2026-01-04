import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Package, Truck, CheckCircle2, Clock, AlertCircle, Phone, MapPin, Bell, BellOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCustomerNotifications } from '@/hooks/useCustomerNotifications';
import { playNotificationSound } from '@/utils/notificationSound';
import { 
  registerServiceWorker, 
  subscribeToPush, 
  saveSubscriptionToServer,
  isPushSupported 
} from '@/utils/serviceWorkerPush';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  imageUrl?: string;
}

interface ShippingAddress {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  status: string;
  items: OrderItem[];
  subtotal: number;
  shipping_fee: number;
  total: number;
  payment_method: string | null;
  shipping_address: ShippingAddress | null;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<any>; step: number }> = {
  pending: { label: 'Aguardando Confirmação', color: 'text-yellow-600 bg-yellow-100', icon: Clock, step: 1 },
  confirmed: { label: 'Pedido Confirmado', color: 'text-blue-600 bg-blue-100', icon: CheckCircle2, step: 2 },
  preparing: { label: 'Em Preparação', color: 'text-purple-600 bg-purple-100', icon: Package, step: 3 },
  shipped: { label: 'Enviado', color: 'text-orange-600 bg-orange-100', icon: Truck, step: 4 },
  delivered: { label: 'Entregue', color: 'text-green-600 bg-green-100', icon: CheckCircle2, step: 5 },
  cancelled: { label: 'Cancelado', color: 'text-red-600 bg-red-100', icon: AlertCircle, step: 0 },
};

export default function TrackOrder() {
  const [searchParams] = useSearchParams();
  const initialOrderNumber = searchParams.get('pedido') || '';
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [searchedOrder, setSearchedOrder] = useState(initialOrderNumber);
  const [statusChanged, setStatusChanged] = useState(false);
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);
  const [isEnablingPush, setIsEnablingPush] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { trackOrder } = useCustomerNotifications();

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['track-order', searchedOrder],
    queryFn: async () => {
      if (!searchedOrder) return null;
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', searchedOrder.toUpperCase())
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;
      
      return {
        ...data,
        items: data.items as unknown as OrderItem[],
        shipping_address: data.shipping_address as unknown as ShippingAddress | null,
      } as Order;
    },
    enabled: !!searchedOrder,
  });

  // Register order for tracking when found
  useEffect(() => {
    if (order?.order_number) {
      trackOrder(order.order_number);
    }
  }, [order?.order_number, trackOrder]);

  // Register Service Worker on page load
  useEffect(() => {
    if (isPushSupported()) {
      registerServiceWorker();
      if ('Notification' in window) {
        setPushEnabled(Notification.permission === 'granted');
      }
    } else {
      setPushEnabled(false);
    }
  }, []);

  // Enable push notifications for this order
  const enablePushNotifications = async () => {
    if (!order?.order_number) return;
    
    setIsEnablingPush(true);
    try {
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
      
      if (!vapidPublicKey) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setPushEnabled(true);
          toast({
            title: '🔔 Notificações ativadas!',
            description: 'Você receberá alertas quando o status do pedido mudar.',
          });
        } else {
          toast({
            title: 'Notificações bloqueadas',
            description: 'Ative nas configurações do navegador.',
            variant: 'destructive',
          });
        }
        return;
      }

      const subscription = await subscribeToPush(vapidPublicKey);
      
      if (subscription) {
        const saved = await saveSubscriptionToServer(
          subscription, 
          order.order_number, 
          supabase as any
        );
        
        if (saved) {
          setPushEnabled(true);
          toast({
            title: '🔔 Notificações push ativadas!',
            description: 'Você receberá alertas mesmo com o site fechado.',
          });
        }
      } else {
        toast({
          title: 'Não foi possível ativar',
          description: 'Permita notificações nas configurações do navegador.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error enabling push:', error);
      toast({
        title: 'Erro ao ativar notificações',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsEnablingPush(false);
    }
  };

  // Real-time subscription for order updates
  useEffect(() => {
    if (!searchedOrder) return;

    const channel = supabase
      .channel('order-status-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `order_number=eq.${searchedOrder.toUpperCase()}`
        },
        (payload) => {
          console.log('Order updated in real-time:', payload);
          queryClient.invalidateQueries({ queryKey: ['track-order', searchedOrder] });
          
          const newStatus = (payload.new as any).status;
          const statusInfo = statusConfig[newStatus];
          if (statusInfo) {
            setStatusChanged(true);
            playNotificationSound();
            
            toast({
              title: "📦 Status atualizado!",
              description: `Seu pedido agora está: ${statusInfo.label}`,
            });
            
            setTimeout(() => setStatusChanged(false), 3000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [searchedOrder, queryClient, toast]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchedOrder(orderNumber.trim());
  };

  const getStatusInfo = (status: string) => {
    return statusConfig[status] || statusConfig.pending;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPaymentMethod = (method: string | null) => {
    const methods: Record<string, string> = {
      pix: 'PIX',
      credit: 'Cartão de Crédito',
      boleto: 'Boleto Bancário',
    };
    return methods[method || ''] || method || 'Não informado';
  };

  const steps = [
    { key: 'pending', label: 'Aguardando' },
    { key: 'confirmed', label: 'Confirmado' },
    { key: 'preparing', label: 'Preparando' },
    { key: 'shipped', label: 'Enviado' },
    { key: 'delivered', label: 'Entregue' },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          Acompanhe seu Pedido
        </h1>
        <p className="text-muted-foreground">
          Digite o número do seu pedido para ver o status
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-2 max-w-md mx-auto">
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="Ex: MRE-XXXXXX"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
              className="pl-10"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
          <Button type="submit" className="bg-primary hover:bg-primary/90">
            Buscar
          </Button>
        </div>
      </form>

      {/* Loading State */}
      {isLoading && searchedOrder && (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Buscando pedido...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive">Erro ao buscar pedido. Tente novamente.</p>
        </div>
      )}

      {/* Not Found State */}
      {!isLoading && searchedOrder && !order && !error && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Pedido não encontrado</h2>
          <p className="text-muted-foreground">
            Verifique o número do pedido e tente novamente.
          </p>
        </div>
      )}

      {/* Order Found */}
      {order && (
        <div className="space-y-6">
          {/* Real-time indicator */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Atualizações em tempo real ativas
          </div>

          {/* Push Notification Button */}
          {isPushSupported() && order && (
            <div className="flex justify-center">
              {pushEnabled ? (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-full text-sm">
                  <Bell className="w-4 h-4" />
                  Notificações push ativas
                </div>
              ) : (
                <Button
                  onClick={enablePushNotifications}
                  disabled={isEnablingPush}
                  variant="outline"
                  className="gap-2"
                >
                  {isEnablingPush ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Ativando...
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4" />
                      Ativar notificações push
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Order Header */}
          <div className={`bg-white rounded-lg shadow-sm p-6 transition-all duration-500 ${statusChanged ? 'ring-2 ring-primary ring-offset-2 animate-pulse' : ''}`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Pedido #{order.order_number}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Realizado em {formatDate(order.created_at)}
                </p>
              </div>
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${getStatusInfo(order.status).color} ${statusChanged ? 'scale-110' : ''}`}>
                {(() => {
                  const StatusIcon = getStatusInfo(order.status).icon;
                  return <StatusIcon className="w-5 h-5" />;
                })()}
                <span className="font-medium">{getStatusInfo(order.status).label}</span>
              </div>
            </div>
          </div>

          {/* Progress Steps */}
          {order.status !== 'cancelled' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-semibold mb-6">Progresso do Pedido</h3>
              <div className="relative">
                <div className="flex justify-between">
                  {steps.map((step, index) => {
                    const currentStep = getStatusInfo(order.status).step;
                    const isCompleted = currentStep > index + 1;
                    const isCurrent = currentStep === index + 1;
                    
                    return (
                      <div key={step.key} className="flex flex-col items-center relative z-10">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isCompleted 
                            ? 'bg-green-500 text-white' 
                            : isCurrent 
                              ? 'bg-primary text-white' 
                              : 'bg-gray-200 text-gray-500'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <span className="text-sm font-medium">{index + 1}</span>
                          )}
                        </div>
                        <span className={`text-xs mt-2 text-center ${
                          isCompleted || isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'
                        }`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {/* Progress Line */}
                <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 -z-0" style={{ width: 'calc(100% - 2rem)', marginLeft: '1rem' }}>
                  <div 
                    className="h-full bg-green-500 transition-all duration-500"
                    style={{ 
                      width: `${Math.max(0, ((getStatusInfo(order.status).step - 1) / (steps.length - 1)) * 100)}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Order Items */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold mb-4">Itens do Pedido</h3>
            <div className="space-y-3">
              {(order.items as OrderItem[]).map((item, index) => (
                <div key={index} className="flex items-center gap-4 p-3 bg-secondary rounded-lg">
                  {item.imageUrl && (
                    <img 
                      src={item.imageUrl} 
                      alt={item.name}
                      className="w-16 h-16 object-contain rounded border border-border"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">Quantidade: {item.quantity}</p>
                  </div>
                  <p className="font-medium">R$ {(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
            
            <div className="border-t mt-4 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>R$ {order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Frete</span>
                <span className="text-primary">A combinar</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Forma de Pagamento</span>
                <span>{formatPaymentMethod(order.payment_method)}</span>
              </div>
              <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                <span>Total</span>
                <span className="text-primary">R$ {order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          {order.shipping_address && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Endereço de Entrega
              </h3>
              <p className="text-muted-foreground">
                {order.shipping_address.street}, {order.shipping_address.number}
                {order.shipping_address.complement && ` - ${order.shipping_address.complement}`}
                <br />
                {order.shipping_address.neighborhood}, {order.shipping_address.city} - {order.shipping_address.state}
                <br />
                CEP: {order.shipping_address.cep}
              </p>
            </div>
          )}

          {/* Contact Info */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="font-semibold mb-2 text-yellow-800 flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Dúvidas sobre seu pedido?
            </h3>
            <p className="text-sm text-yellow-700 mb-4">
              Entre em contato conosco pelo WhatsApp para mais informações sobre seu pedido.
            </p>
            <Button
              asChild
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <a
                href={`https://wa.me/5511962579428?text=Olá! Gostaria de informações sobre meu pedido ${order.order_number}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Falar no WhatsApp
              </a>
            </Button>
          </div>
        </div>
      )}

      {/* Initial State */}
      {!searchedOrder && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Digite o número do seu pedido</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            O número do pedido foi enviado por WhatsApp e também está na confirmação do pedido.
            Ele começa com "MRE-" seguido de números.
          </p>
        </div>
      )}
    </div>
  );
}
