import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, MessageCircle, Package, Home, Search, Check, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCustomerNotifications } from "@/hooks/useCustomerNotifications";
import { getCompanyProfile, CompanyProfile, defaultCompanyProfile } from "@/lib/companyProfile";
import { buildAdminOrderMessage, buildCustomerOrderMessage, whatsappLink } from "@/lib/whatsappTemplates";
import { formatBRL } from "@/lib/formatCurrency";
import OrderStatusTimeline from "@/components/OrderStatusTimeline";
import { getOrderStatusInfo } from "@/lib/orderStatus";

interface OrderConfirmData {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: Array<{ name: string; quantity: number; price: number; imageUrl?: string }>;
  subtotal?: number;
  total: number;
}

const WHATSAPP_CONFIRMED_KEY = 'whatsapp-confirmed-orders';

export default function OrderConfirmation() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const navigate = useNavigate();
  const [orderData, setOrderData] = useState<OrderConfirmData | null>(null);
  const [status, setStatus] = useState<string>('pending');
  const [whatsappConfirmed, setWhatsappConfirmed] = useState(false);
  const [profile, setProfile] = useState<CompanyProfile>(defaultCompanyProfile);
  const { trackOrder } = useCustomerNotifications();

  useEffect(() => {
    getCompanyProfile().then(setProfile).catch(() => setProfile(defaultCompanyProfile));
  }, []);

  useEffect(() => {
    if (orderNumber) {
      const confirmedOrders = JSON.parse(localStorage.getItem(WHATSAPP_CONFIRMED_KEY) || '[]');
      setWhatsappConfirmed(confirmedOrders.includes(orderNumber));
    }
  }, [orderNumber]);

  useEffect(() => {
    if (!orderNumber) {
      navigate("/");
      return;
    }

    trackOrder(orderNumber);

    const stored = sessionStorage.getItem(`order_confirm_${orderNumber}`);
    if (stored) {
      try {
        setOrderData(JSON.parse(stored));
      } catch {
        setOrderData(null);
      }
    }

    // Estado real do pedido vem do banco (sem depender de notificação do navegador)
    const loadOrder = async () => {
      const { data } = await supabase
        .from('orders')
        .select('order_number, customer_name, customer_phone, items, subtotal, total, status, shipping_address')
        .eq('order_number', orderNumber)
        .maybeSingle();

      if (data) {
        setStatus(data.status || 'pending');
        const addr = data.shipping_address as Record<string, string> | null;
        setOrderData((prev) => prev ?? {
          orderNumber,
          customerName: data.customer_name || 'Cliente',
          customerPhone: data.customer_phone || '',
          customerAddress: addr
            ? `${addr.street}, ${addr.number}, ${addr.neighborhood}, ${addr.city} - ${addr.state}`
            : '',
          items: (data.items as unknown as OrderConfirmData['items']) || [],
          subtotal: Number(data.subtotal || 0),
          total: Number(data.total || 0),
        });
      }
    };

    loadOrder();

    // Atualização em tempo real + fallback por polling
    const channel = supabase
      .channel(`order-confirm-${orderNumber}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `order_number=eq.${orderNumber}` },
        (payload) => {
          const next = (payload.new as { status?: string })?.status;
          if (next) setStatus(next);
        }
      )
      .subscribe();

    const interval = setInterval(loadOrder, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [orderNumber, navigate, trackOrder]);

  const messageData = useMemo(() => ({
    orderNumber: orderNumber || '',
    customerName: orderData?.customerName || 'Cliente',
    customerPhone: orderData?.customerPhone,
    customerAddress: orderData?.customerAddress,
    items: orderData?.items || [],
    subtotal: orderData?.subtotal ?? orderData?.total ?? 0,
    total: orderData?.total ?? 0,
    status,
  }), [orderNumber, orderData, status]);

  if (!orderNumber) return null;

  const statusInfo = getOrderStatusInfo(status);

  const handleWhatsAppClick = () => {
    const confirmedOrders = JSON.parse(localStorage.getItem(WHATSAPP_CONFIRMED_KEY) || '[]');
    if (!confirmedOrders.includes(orderNumber)) {
      confirmedOrders.push(orderNumber);
      localStorage.setItem(WHATSAPP_CONFIRMED_KEY, JSON.stringify(confirmedOrders));
    }
    setWhatsappConfirmed(true);
    window.open(whatsappLink(profile.whatsapp, buildAdminOrderMessage(messageData, profile)), "_blank");
  };

  const handleSendCopyToMe = () => {
    if (!orderData?.customerPhone) return;
    window.open(
      whatsappLink(orderData.customerPhone, buildCustomerOrderMessage(messageData, profile)),
      "_blank"
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Cabeçalho de sucesso */}
        <div className="bg-white rounded-xl border border-border p-6 sm:p-8 text-center shadow-sm">
          <CheckCircle className="h-16 w-16 text-ml-green mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-1">Pedido realizado com sucesso!</h1>
          <p className="text-muted-foreground">
            Obrigado por comprar com a {profile.name}
            {orderData?.customerName && orderData.customerName !== 'Cliente'
              ? `, ${orderData.customerName.split(" ")[0]}`
              : ''}.
          </p>

          <div className="grid sm:grid-cols-3 gap-3 mt-6 text-left">
            <div className="bg-secondary/60 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Package className="h-3.5 w-3.5" /> Número do pedido
              </p>
              <p className="font-bold text-ml-blue">{orderNumber}</p>
            </div>
            <div className="bg-secondary/60 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Cliente</p>
              <p className="font-medium truncate">{orderData?.customerName || 'Cliente'}</p>
            </div>
            <div className="bg-secondary/60 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Total</p>
              <p className="font-bold">{formatBRL(orderData?.total || 0)}</p>
            </div>
          </div>
        </div>

        {/* Linha do tempo do pedido */}
        <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Andamento do pedido</h2>
            <span className={`text-xs px-2.5 py-1 rounded-full border ${statusInfo.badgeClass}`}>
              {statusInfo.emoji} {statusInfo.label}
            </span>
          </div>
          <OrderStatusTimeline status={status} />
          <p className="text-xs text-muted-foreground mt-4">
            Esta página atualiza sozinha quando a loja mudar o status — não é necessário autorizar
            notificações do navegador.
          </p>
        </div>

        {/* Resumo dos itens */}
        {orderData && orderData.items.length > 0 && (
          <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
            <h2 className="font-semibold text-foreground mb-4">Resumo da compra</h2>
            <div className="space-y-3 text-sm">
              {orderData.items.map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-12 h-12 object-contain rounded border border-border"
                    />
                  )}
                  <div className="flex-1 flex justify-between items-center gap-2">
                    <span className="truncate">{item.quantity}x {item.name}</span>
                    <span className="font-medium whitespace-nowrap">
                      {formatBRL(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
              <div className="border-t pt-3 flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-ml-blue">{formatBRL(orderData.total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Próximo passo */}
        <div className="bg-white rounded-xl border border-border p-6 shadow-sm space-y-3">
          <h2 className="font-semibold text-foreground">Próximo passo</h2>
          <p className="text-sm text-muted-foreground">
            Envie a confirmação pelo WhatsApp para combinarmos a forma de pagamento e a entrega.
          </p>

          <Button
            onClick={handleWhatsAppClick}
            className={`w-full h-12 text-base transition-all ${
              whatsappConfirmed
                ? 'bg-gray-400 hover:bg-gray-500 text-white cursor-default'
                : 'bg-[#25D366] hover:bg-[#128C7E] text-white'
            }`}
          >
            {whatsappConfirmed ? (
              <><Check className="mr-2 h-5 w-5" /> Mensagem enviada</>
            ) : (
              <><MessageCircle className="mr-2 h-5 w-5" /> Confirmar pelo WhatsApp</>
            )}
          </Button>

          {orderData?.customerPhone && (
            <Button variant="outline" className="w-full" onClick={handleSendCopyToMe}>
              <Send className="mr-2 h-4 w-4" />
              Receber resumo no meu WhatsApp
            </Button>
          )}

          <div className="grid sm:grid-cols-2 gap-3 pt-2">
            <Button asChild variant="secondary" className="w-full">
              <Link to={`/rastrear-pedido?pedido=${orderNumber}`}>
                <Search className="mr-2 h-4 w-4" />
                Acompanhar pedido
              </Link>
            </Button>
            <Button onClick={() => navigate("/")} variant="ghost" className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Voltar para a loja
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
