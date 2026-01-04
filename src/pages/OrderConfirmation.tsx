import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, MessageCircle, Package, Home, Search, Check, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { useCustomerNotifications } from "@/hooks/useCustomerNotifications";
import { 
  requestNotificationPermission, 
  getNotificationPermission, 
  hasRequestedPermission, 
  markPermissionRequested 
} from "@/utils/pushNotifications";

interface OrderConfirmData {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: Array<{ name: string; quantity: number; price: number; imageUrl?: string }>;
  total: number;
}

// Key for storing confirmed WhatsApp clicks
const WHATSAPP_CONFIRMED_KEY = 'whatsapp-confirmed-orders';

export default function OrderConfirmation() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const navigate = useNavigate();
  const [orderData, setOrderData] = useState<OrderConfirmData | null>(null);
  const [whatsappConfirmed, setWhatsappConfirmed] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
  const { trackOrder } = useCustomerNotifications();

  // Request notification permission automatically when page loads
  useEffect(() => {
    const currentPermission = getNotificationPermission();
    if (currentPermission === 'unsupported') {
      setNotificationStatus('unsupported');
    } else {
      setNotificationStatus(currentPermission as 'prompt' | 'granted' | 'denied');
      
      // Auto-request permission if not yet asked
      if (currentPermission === 'default' && !hasRequestedPermission()) {
        markPermissionRequested();
        requestNotificationPermission().then((granted) => {
          setNotificationStatus(granted ? 'granted' : 'denied');
        });
      }
    }
  }, []);

  // Check if already confirmed
  useEffect(() => {
    if (orderNumber) {
      const confirmedOrders = JSON.parse(localStorage.getItem(WHATSAPP_CONFIRMED_KEY) || '[]');
      setWhatsappConfirmed(confirmedOrders.includes(orderNumber));
    }
  }, [orderNumber]);

  useEffect(() => {
    if (orderNumber) {
      // Register order for notifications automatically
      trackOrder(orderNumber);
      
      // Get minimal order data from sessionStorage (non-sensitive only)
      const stored = sessionStorage.getItem(`order_confirm_${orderNumber}`);
      if (stored) {
        try {
          setOrderData(JSON.parse(stored));
          // Clean up after reading
          sessionStorage.removeItem(`order_confirm_${orderNumber}`);
        } catch {
          // If parsing fails, still show confirmation with order number
          setOrderData({
            orderNumber,
            customerName: 'Cliente',
            customerPhone: '',
            customerAddress: '',
            items: [],
            total: 0
          });
        }
      } else {
        // No data found, show basic confirmation
        setOrderData({
          orderNumber,
          customerName: 'Cliente',
          customerPhone: '',
          customerAddress: '',
          items: [],
          total: 0
        });
      }
    } else {
      navigate("/");
    }
  }, [orderNumber, navigate, trackOrder]);

  if (!orderNumber) {
    return null;
  }

  const whatsappNumber = "5511962579428";
  const whatsappMessage = orderData ? encodeURIComponent(
    `🛒 *PEDIDO REALIZADO*\n\n` +
    `📦 *Número do Pedido:* ${orderNumber}\n\n` +
    `👤 *Cliente:* ${orderData.customerName}\n` +
    (orderData.customerPhone ? `📱 *Telefone:* ${orderData.customerPhone}\n` : '') +
    (orderData.customerAddress ? `📍 *Endereço:* ${orderData.customerAddress}\n` : '') +
    `\n` +
    (orderData.items.length > 0 ? 
      `*Itens do Pedido:*\n${orderData.items.map(item => `• ${item.quantity}x ${item.name}`).join("\n")}\n\n` +
      `💰 *Total:* R$ ${orderData.total.toFixed(2)}\n\n` 
      : '') +
    `📞 *WhatsApp MR Segurança:* (11) 96257-9428\n\n` +
    `_Aguardando confirmação do pedido._`
  ) : '';

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  const handleWhatsAppClick = () => {
    // Mark as confirmed in localStorage
    const confirmedOrders = JSON.parse(localStorage.getItem(WHATSAPP_CONFIRMED_KEY) || '[]');
    if (!confirmedOrders.includes(orderNumber)) {
      confirmedOrders.push(orderNumber);
      localStorage.setItem(WHATSAPP_CONFIRMED_KEY, JSON.stringify(confirmedOrders));
    }
    setWhatsappConfirmed(true);
    
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg p-8 shadow-sm text-center">
          <div className="mb-6">
            <CheckCircle className="h-20 w-20 text-ml-green mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-ml-green mb-2">
              Pedido Realizado com Sucesso!
            </h1>
            <p className="text-muted-foreground">
              Obrigado por comprar conosco{orderData?.customerName && orderData.customerName !== 'Cliente' ? `, ${orderData.customerName.split(" ")[0]}` : ''}!
            </p>
          </div>

          <div className="bg-ml-gray-100 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Package className="h-5 w-5 text-ml-blue" />
              <span className="text-sm text-muted-foreground">Número do Pedido</span>
            </div>
            <p className="text-2xl font-bold text-ml-blue">{orderNumber}</p>
          </div>

          {orderData && orderData.items.length > 0 && (
            <div className="text-left bg-ml-gray-100 rounded-lg p-6 mb-6">
              <h3 className="font-semibold mb-3">Resumo do Pedido</h3>
              <div className="space-y-3 text-sm">
                {orderData.items.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    {item.imageUrl && (
                      <img 
                        src={item.imageUrl} 
                        alt={item.name}
                        className="w-12 h-12 object-contain rounded border border-gray-200"
                      />
                    )}
                    <div className="flex-1 flex justify-between items-center">
                      <span>{item.quantity}x {item.name}</span>
                      <span className="font-medium">R$ {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-ml-blue">R$ {orderData.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Notification status indicator */}
          {notificationStatus === 'granted' && (
            <div className="text-left bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-green-700">
                <Bell className="h-5 w-5" />
                <span className="text-sm font-medium">🔔 Notificações ativadas!</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                Você receberá uma notificação no celular quando o status do seu pedido mudar.
              </p>
            </div>
          )}

          {notificationStatus === 'denied' && (
            <div className="text-left bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-orange-700">
                <Bell className="h-5 w-5" />
                <span className="text-sm font-medium">Notificações bloqueadas</span>
              </div>
              <p className="text-sm text-orange-600 mt-1">
                Ative as notificações nas configurações do navegador para receber atualizações do pedido.
              </p>
            </div>
          )}

          <div className="text-left bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <h3 className="font-semibold mb-2 text-yellow-800">⚠️ Importante - Pagamento via WhatsApp</h3>
            <p className="text-sm text-yellow-700">
              Para confirmar seu pedido e <strong>finalizar o pagamento</strong>, clique no botão abaixo e envie a mensagem pelo WhatsApp. 
              Assim que recebermos, entraremos em contato para combinar a forma de pagamento e finalizar sua compra.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleWhatsAppClick}
              className={`w-full h-14 text-lg transition-all ${
                whatsappConfirmed 
                  ? 'bg-gray-400 hover:bg-gray-500 text-white cursor-default' 
                  : 'bg-[#25D366] hover:bg-[#128C7E] text-white'
              }`}
            >
              {whatsappConfirmed ? (
                <>
                  <Check className="mr-2 h-6 w-6" />
                  Mensagem Enviada
                </>
              ) : (
                <>
                  <MessageCircle className="mr-2 h-6 w-6" />
                  Confirmar pelo WhatsApp
                </>
              )}
            </Button>

            {whatsappConfirmed && (
              <p className="text-sm text-green-600 text-center">
                ✓ Você já enviou a confirmação. Aguarde nosso contato!
              </p>
            )}

            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="w-full"
            >
              <Home className="mr-2 h-4 w-4" />
              Voltar para a Loja
            </Button>

            <Button
              asChild
              variant="ghost"
              className="w-full"
            >
              <Link to={`/rastrear-pedido?pedido=${orderNumber}`}>
                <Search className="mr-2 h-4 w-4" />
                Acompanhar Pedido
              </Link>
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-muted-foreground">
              Seus dados estão seguros e protegidos. Não armazenamos informações sensíveis no navegador.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
