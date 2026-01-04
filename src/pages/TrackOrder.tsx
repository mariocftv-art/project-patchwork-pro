import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Package, Truck, CheckCircle2, Clock, AlertCircle, Phone, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
      
      // Transform the data to match our Order type
      return {
        ...data,
        items: data.items as unknown as OrderItem[],
        shipping_address: data.shipping_address as unknown as ShippingAddress | null,
      } as Order;
    },
    enabled: !!searchedOrder,
  });

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
              placeholder="Ex: MR202401040001"
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
          {/* Order Header */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Pedido #{order.order_number}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Realizado em {formatDate(order.created_at)}
                </p>
              </div>
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${getStatusInfo(order.status).color}`}>
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
                href={`https://wa.me/5511999999999?text=Olá! Gostaria de informações sobre meu pedido ${order.order_number}`}
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
            Ele começa com "MR" seguido de números.
          </p>
        </div>
      )}
    </div>
  );
}
