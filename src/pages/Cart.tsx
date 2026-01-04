import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { productsApi, settingsApi } from '@/lib/supabaseApi';
import { useCart } from '@/hooks/useCart';
import { Minus, Plus, ShoppingCart, Truck, Shield, FileText, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { generateQuotePDF, generateWhatsAppMessage } from '@/lib/generateQuotePDF';
import { useSiteContent } from '@/components/admin/SiteContentForm';

export default function Cart() {
  const navigate = useNavigate();
  const { cartItems, updateQuantity, removeFromCart, isLoading: cartLoading } = useCart();
  const siteContent = useSiteContent();
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.list(),
    staleTime: 1000 * 60 * 5,
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
  });

  const cartWithProducts = cartItems.map((item) => ({
    ...item,
    product: products.find((p) => p.id === item.product_id),
  })).filter((item) => item.product);

  const subtotal = cartWithProducts.reduce(
    (sum, item) => sum + (item.product?.price || 0) * item.quantity,
    0
  );

  const freeShippingMin = settings?.free_shipping_min || 199;
  const shippingFee = subtotal >= freeShippingMin ? 0 : settings?.shipping_fee || 15;
  const total = subtotal + shippingFee;

  const handleGenerateQuote = async () => {
    if (!customerPhone.trim()) {
      return;
    }
    
    const items = cartWithProducts.map(item => ({
      name: item.product?.title || 'Produto',
      quantity: item.quantity,
      price: item.product?.price || 0,
      imageUrl: item.product?.image_url || undefined,
    }));

    // Generate PDF and upload to storage
    const result = await generateQuotePDF(
      {
        items,
        subtotal,
        shipping: shippingFee,
        total,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        customerAddress: customerAddress || undefined,
        validityDays: 5,
      },
      {
        name: 'MR Segurança Máxima',
        cnpj: '45.858.215/0001-86',
        address: siteContent.contact.address || 'São Paulo - SP',
        phone: '(11) 96257-9428',
        email: siteContent.contact.email,
      }
    );

    // Send to customer's WhatsApp with PDF link
    const cleanPhone = customerPhone.replace(/\D/g, '');
    const whatsappPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    
    const itemsList = items.map(item => 
      `• ${item.name} (${item.quantity}x) - R$ ${(item.price * item.quantity).toFixed(2)}`
    ).join('\n');
    
    let message = `📄 *ORÇAMENTO MR SEGURANÇA MÁXIMA*\n` +
      `Nº: ${result.quoteNumber}\n\n` +
      `Olá${customerName ? ` ${customerName}` : ''}! Seu orçamento foi gerado com sucesso! ✅\n\n` +
      `*Itens do Orçamento:*\n${itemsList}\n\n` +
      `💰 *Subtotal:* R$ ${subtotal.toFixed(2)}\n` +
      `🚚 *Frete:* A combinar\n` +
      `✨ *Total:* R$ ${total.toFixed(2)}\n\n`;
    
    // Add PDF link if available
    if (result.pdfUrl) {
      message += `📥 *Baixar PDF do Orçamento:*\n${result.pdfUrl}\n\n`;
    }
    
    message += `📞 *Para finalizar seu pedido, entre em contato:*\n` +
      `WhatsApp: (11) 96257-9428\n\n` +
      `⏰ _Orçamento válido por 5 dias._\n\n` +
      `🔒 MR Segurança Máxima - Proteção total para você e sua família!`;
    
    // Open WhatsApp with the customer's number
    window.open(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`, '_blank');
    
    setQuoteDialogOpen(false);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
  };

  const handleWhatsAppPurchase = () => {
    const items = cartWithProducts.map(item => ({
      name: item.product?.title || 'Produto',
      quantity: item.quantity,
      price: item.product?.price || 0,
    }));

    const message = generateWhatsAppMessage(items, total, customerName);
    const whatsappNumber = siteContent.contact.whatsapp || '5511962579428';
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
  };

  if (cartLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-ml-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="bg-white rounded-lg p-8 text-center">
        <ShoppingCart className="w-16 h-16 text-ml-light-gray mx-auto mb-4" />
        <h2 className="text-xl text-foreground mb-2">
          O carrinho está vazio
        </h2>
        <p className="text-ml-gray mb-6 text-sm">
          Não sabe o que comprar? Milhares de produtos te esperam!
        </p>
        <Link to="/" className="ml-btn-primary inline-block">
          Descobrir produtos
        </Link>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Cart Items */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-lg">
          <div className="p-4 border-b border-border">
            <h1 className="text-xl font-light text-foreground">
              Carrinho ({cartWithProducts.length} {cartWithProducts.length === 1 ? 'produto' : 'produtos'})
            </h1>
          </div>

          <div className="divide-y divide-border">
            {cartWithProducts.map((item) => (
              <div key={item.id} className="p-4">
                <div className="flex gap-4">
                  <Link to={`/produto/${item.product?.id}`}>
                    <img
                      src={item.product?.image_url || '/placeholder.svg'}
                      alt={item.product?.title}
                      className="w-20 h-20 object-contain rounded border border-border"
                    />
                  </Link>
                  
                  <div className="flex-1 min-w-0">
                    <Link 
                      to={`/produto/${item.product?.id}`}
                      className="text-sm text-foreground hover:text-ml-blue line-clamp-2"
                    >
                      {item.product?.title}
                    </Link>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => removeFromCart.mutate(item.id)}
                        className="text-ml-blue text-sm hover:underline"
                      >
                        Excluir
                      </button>
                      <span className="text-ml-gray">|</span>
                      <button className="text-ml-blue text-sm hover:underline">
                        Salvar
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-light text-foreground">
                      R$ {((item.product?.price || 0) * item.quantity).toFixed(2)}
                    </p>
                    
                    <div className="flex items-center border border-border rounded mt-2">
                      <button
                        onClick={() =>
                          updateQuantity.mutate({
                            id: item.id,
                            quantity: item.quantity - 1,
                          })
                        }
                        className="px-2 py-1 text-ml-blue hover:bg-secondary"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-3 py-1 text-sm border-x border-border">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity.mutate({
                            id: item.id,
                            quantity: item.quantity + 1,
                          })
                        }
                        className="px-2 py-1 text-ml-blue hover:bg-secondary"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Free shipping message */}
                {(item.product?.price || 0) >= 79 && (
                  <div className="flex items-center gap-2 mt-3 text-sm text-ml-green">
                    <Truck className="w-4 h-4" />
                    <span>Frete grátis</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Order Summary */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg p-4 sticky top-24">
          <h2 className="text-lg font-medium text-foreground mb-4">
            Resumo da compra
          </h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-ml-gray">Produtos ({cartWithProducts.reduce((s, i) => s + i.quantity, 0)})</span>
              <span className="text-foreground">R$ {subtotal.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-ml-gray">Frete</span>
              <span className={shippingFee === 0 ? 'text-ml-green font-medium' : 'text-foreground'}>
                {shippingFee === 0 ? 'Grátis' : `R$ ${shippingFee.toFixed(2)}`}
              </span>
            </div>

            {subtotal < freeShippingMin && (
              <p className="text-xs text-ml-blue">
                Adicione R$ {(freeShippingMin - subtotal).toFixed(2)} para frete grátis!
              </p>
            )}

            <div className="border-t border-border pt-3">
              <div className="flex justify-between">
                <span className="text-foreground font-medium">Total</span>
                <span className="text-xl text-foreground">R$ {total.toFixed(2)}</span>
              </div>
              <p className="text-sm text-ml-green mt-1">
                em 8x R$ {(total / 8).toFixed(2)} sem juros
              </p>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="space-y-3 mt-4">
            <button 
              onClick={() => navigate('/checkout')}
              className="w-full ml-btn-primary"
            >
              Finalizar Compra
            </button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => setQuoteDialogOpen(true)}
              >
                <FileText className="w-4 h-4" />
                Orçamento PDF
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2 text-green-600 border-green-600 hover:bg-green-50"
                onClick={handleWhatsAppPurchase}
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </Button>
            </div>
          </div>

          <Link 
            to="/" 
            className="block text-center text-sm text-ml-blue mt-3 hover:underline"
          >
            Continuar comprando
          </Link>

          {/* Security badges */}
          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-xs text-ml-gray mb-2">
              <Shield className="w-4 h-4 text-ml-green" />
              <span>Compra 100% segura</span>
            </div>
            <div className="flex gap-2 mt-2">
              <span className="text-xs text-ml-gray">💳 8x sem juros</span>
              <span className="text-xs text-ml-gray">📱 5% no PIX</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog para gerar orçamento */}
      <Dialog open={quoteDialogOpen} onOpenChange={setQuoteDialogOpen}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>Gerar Orçamento em PDF</DialogTitle>
            <DialogDescription>
              Preencha seus dados para personalizar o orçamento (opcional)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="customerName">Nome</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Seu nome (opcional)"
              />
            </div>
            <div>
              <Label htmlFor="customerPhone">Telefone / WhatsApp *</Label>
              <Input
                id="customerPhone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                O orçamento será enviado para este número via WhatsApp
              </p>
            </div>
            <div>
              <Label htmlFor="customerAddress">Endereço</Label>
              <Input
                id="customerAddress"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Rua, número, bairro, cidade"
              />
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm font-medium mb-2">Resumo do orçamento:</p>
              <ul className="text-sm space-y-1">
                {cartWithProducts.map((item) => (
                  <li key={item.id} className="flex justify-between">
                    <span>{item.product?.title} (x{item.quantity})</span>
                    <span>R$ {((item.product?.price || 0) * item.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t mt-2 pt-2 flex justify-between font-medium">
                <span>Total:</span>
                <span>R$ {total.toFixed(2)}</span>
              </div>
            </div>
            <Button 
              onClick={handleGenerateQuote} 
              className="w-full btn-security"
              disabled={!customerPhone.trim()}
            >
              <FileText className="w-4 h-4 mr-2" />
              Gerar PDF e Enviar por WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
