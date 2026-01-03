import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, MessageCircle, Package, Home } from "lucide-react";

export default function OrderConfirmation() {
  const { orderNumber } = useParams();
  const navigate = useNavigate();

  const orderData = orderNumber 
    ? JSON.parse(localStorage.getItem(`order_${orderNumber}`) || "null")
    : null;

  useEffect(() => {
    if (!orderData) {
      navigate("/");
    }
  }, [orderData, navigate]);

  if (!orderData) {
    return null;
  }

  const whatsappNumber = "5511962579428";
  const itemsList = orderData.items
    .map((item: any) => `• ${item.quantity}x ${item.name}`)
    .join("%0A");
  
  const whatsappMessage = encodeURIComponent(
    `🛒 *PEDIDO REALIZADO*\n\n` +
    `📦 *Número do Pedido:* ${orderNumber}\n\n` +
    `👤 *Cliente:* ${orderData.customer.name}\n` +
    `📧 *E-mail:* ${orderData.customer.email}\n\n` +
    `*Itens do Pedido:*\n${orderData.items.map((item: any) => `• ${item.quantity}x ${item.name}`).join("\n")}\n\n` +
    `💰 *Total:* R$ ${orderData.total.toFixed(2)}\n` +
    `💳 *Pagamento:* ${orderData.paymentMethod === "pix" ? "PIX" : orderData.paymentMethod === "credit" ? "Cartão de Crédito" : "Boleto"}\n\n` +
    `📍 *Endereço de Entrega:*\n` +
    `${orderData.address.street}, ${orderData.address.number}${orderData.address.complement ? ` - ${orderData.address.complement}` : ""}\n` +
    `${orderData.address.neighborhood} - ${orderData.address.city}/${orderData.address.state}\n` +
    `CEP: ${orderData.address.cep}\n\n` +
    `_Aguardando confirmação do pedido._`
  );

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  const handleWhatsAppClick = () => {
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
              Obrigado por comprar conosco, {orderData.customer.name.split(" ")[0]}!
            </p>
          </div>

          <div className="bg-ml-gray-100 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Package className="h-5 w-5 text-ml-blue" />
              <span className="text-sm text-muted-foreground">Número do Pedido</span>
            </div>
            <p className="text-2xl font-bold text-ml-blue">{orderNumber}</p>
          </div>

          <div className="text-left bg-ml-gray-100 rounded-lg p-6 mb-6">
            <h3 className="font-semibold mb-3">Resumo do Pedido</h3>
            <div className="space-y-2 text-sm">
              {orderData.items.map((item: any, index: number) => (
                <div key={index} className="flex justify-between">
                  <span>{item.quantity}x {item.name}</span>
                  <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-ml-blue">R$ {orderData.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="text-left bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <h3 className="font-semibold mb-2 text-yellow-800">⚠️ Importante</h3>
            <p className="text-sm text-yellow-700">
              Para confirmar seu pedido, clique no botão abaixo e envie a mensagem pelo WhatsApp. 
              Assim que recebermos, entraremos em contato para finalizar sua compra.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleWhatsAppClick}
              className="w-full h-14 text-lg bg-[#25D366] hover:bg-[#128C7E] text-white"
            >
              <MessageCircle className="mr-2 h-6 w-6" />
              Confirmar pelo WhatsApp
            </Button>

            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="w-full"
            >
              <Home className="mr-2 h-4 w-4" />
              Voltar para a Loja
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-muted-foreground">
              Um resumo do seu pedido também foi salvo. Caso tenha dúvidas, entre em contato conosco pelo WhatsApp.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
