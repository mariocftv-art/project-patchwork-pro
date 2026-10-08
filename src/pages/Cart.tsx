import { waLink } from '@/lib/brand';
import { useState } from 'react';
import { getBrand, waNumber } from '@/lib/brand';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '@/lib/supabaseApi';
import { catalogForCart, isServiceCartId, SERVICE_PREFIX } from '@/lib/servicesApi';
import { useCart } from '@/hooks/useCart';
import { Minus, Plus, ShoppingCart, Truck, Shield, FileText, MessageCircle, Loader2 } from 'lucide-react';
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
import { buildQuoteWhatsAppMessage, whatsappUrl } from '@/lib/quoteWhatsApp';
import { formatBRL } from '@/lib/formatCurrency';
import { useSiteContent } from '@/components/admin/SiteContentForm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { PAYMENT_METHODS, usePaymentSettings, isOnlinePaymentOn } from '@/lib/paymentSettings';

export default function Cart() {
  const navigate = useNavigate();
  const { cartItems, updateQuantity, removeFromCart, isLoading: cartLoading } = useCart();
  const { data: paySettings } = usePaymentSettings();
  const payOnline = isOnlinePaymentOn(paySettings);
  const acceptedMethods = PAYMENT_METHODS.filter((m) => (paySettings?.methods ?? ['credit_card', 'pix']).includes(m.key));
  const siteContent = useSiteContent();
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [quoteSent, setQuoteSent] = useState(false);

  const { data: products = [] } = useQuery({
    queryKey: ['cart-catalog'],
    queryFn: () => catalogForCart(),
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

  const productLines = cartWithProducts.filter((i) => !isServiceCartId(i.product_id));
  const serviceLines = cartWithProducts.filter((i) => isServiceCartId(i.product_id));
  const sumOf = (l: typeof cartWithProducts) => l.reduce((t, i) => t + (i.product?.price || 0) * i.quantity, 0);
  const linkOf = (pid: string) => (isServiceCartId(pid) ? `/servicos/${pid.slice(SERVICE_PREFIX.length)}` : `/produto/${pid}`);

  // Entrega e instalação são combinadas com o cliente
  const shippingFee = 0;
  const total = subtotal;

  const handleGenerateQuote = async () => {
    if (!customerPhone.trim() || !customerEmail.trim() || !customerName.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha nome, e-mail e telefone.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    
    try {
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
          name: getBrand().name,
          cnpj: getBrand().cnpj,
          address: siteContent.contact.address || [getBrand().city, getBrand().state].filter(Boolean).join(' - '),
          phone: getBrand().phone,
          email: siteContent.contact.email || getBrand().email,
        }
      );

      // Save quote to database
      const { error: dbError } = await supabase
        .from('quotes')
        .insert({
          quote_number: result.quoteNumber,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone || null,
          items: items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
          subtotal,
          shipping_fee: shippingFee,
          total,
          pdf_url: result.pdfUrl,
        });

      if (dbError) {
        console.error('Erro ao salvar orçamento:', dbError);
      }

      // Template exclusivo de ORÇAMENTO (mesmos dados do PDF profissional)
      const message = buildQuoteWhatsAppMessage(result.docData, result.profile, { pdfUrl: result.pdfUrl });
      window.open(whatsappUrl(customerPhone, message), '_blank', 'noopener,noreferrer');
      
      // Show success state
      setQuoteSent(true);
      
      toast({
        title: '✅ Orçamento enviado!',
        description: 'O PDF foi criado e enviado para o WhatsApp.',
      });

      // Reset after 3 seconds
      setTimeout(() => {
        setQuoteDialogOpen(false);
        setQuoteSent(false);
        setCustomerName('');
        setCustomerEmail('');
        setCustomerPhone('');
        setCustomerAddress('');
      }, 2000);
    } catch (error) {
      console.error('Erro ao gerar orçamento:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar o orçamento.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleWhatsAppPurchase = () => {
    const items = cartWithProducts.map(item => ({
      name: item.product?.title || 'Produto',
      quantity: item.quantity,
      price: item.product?.price || 0,
    }));

    const message = generateWhatsAppMessage(items, total, customerName);
    const whatsappNumber = siteContent.contact.whatsapp || waNumber();
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank', 'noopener,noreferrer');
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
      <div className="bg-card rounded-lg p-8 text-center">
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
        <div className="bg-card rounded-lg">
          <div className="p-4 border-b border-border">
            <h1 className="text-xl font-light text-foreground">
              {(() => { const n = cartWithProducts.length; const u = cartWithProducts.reduce((s, i) => s + i.quantity, 0); return `Carrinho — ${n} ${n === 1 ? 'item' : 'itens'} (${u} ${u === 1 ? 'unidade' : 'unidades'})`; })()}
            </h1>
          </div>

          {[{ key: 'p', title: 'Produtos', lines: productLines }, { key: 's', title: 'Serviços Técnicos Especializados', lines: serviceLines }]
            .filter((g) => g.lines.length > 0)
            .map((g) => (
          <div key={g.key} className="border-b border-border last:border-b-0">
            <div className="px-4 pt-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">{g.title}</h2>
              <span className="text-sm text-muted-foreground">Subtotal: R$ {sumOf(g.lines).toFixed(2)}</span>
            </div>
          <div className="divide-y divide-border">
            {g.lines.map((item) => (
              <div key={item.id} className="p-4">
                <div className="flex gap-4">
                  <Link to={linkOf(item.product_id)}>
                    <img loading="lazy" decoding="async"
                      src={item.product?.image_url || '/placeholder.svg'}
                      alt={item.product?.title}
                      className="w-20 h-20 object-contain rounded border border-border"
                    />
                  </Link>
                  
                  <div className="flex-1 min-w-0">
                    <Link 
                      to={linkOf(item.product_id)}
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

              </div>
            ))}
          </div>
          </div>
            ))}
        </div>
      </div>

      {/* Order Summary */}
      <div className="lg:col-span-1">
        <div className="bg-card rounded-lg p-4 sticky top-24">
          <h2 className="text-lg font-medium text-foreground mb-4">
            Resumo da compra
          </h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-ml-gray">Itens ({cartWithProducts.length}) / Unidades ({cartWithProducts.reduce((s, i) => s + i.quantity, 0)})</span>
              <span className="text-foreground">R$ {subtotal.toFixed(2)}</span>
            </div>
            
            <div>
              <div className="flex justify-between">
                <span className="text-foreground font-medium">Entrega e instalação:</span>
                <span className="text-foreground">a combinar</span>
              </div>
              <p className="text-xs text-ml-gray mt-1">
                Finalize o pedido e nossa equipe entra em contato em até 24h para agendar data, horário e forma de envio.
              </p>
            </div>

            <div className="border-t border-border pt-3">
              <div className="flex justify-between">
                <span className="text-foreground font-medium">Total</span>
                <span className="text-xl text-foreground">R$ {total.toFixed(2)}</span>
              </div>
              {serviceLines.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">Sua contratação inclui agendamento combinado por WhatsApp.</p>
              )}
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
              {payOnline ? 'Finalizar Compra' : 'Solicitar pedido pelo WhatsApp'}
            </button>

            <a
              href={waLink('Olá! Tenho um carrinho montado no site e gostaria de combinar entrega e instalação antes de finalizar.')}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
            >
              💬 <span><strong>Prefere combinar antes?</strong> Fale com um técnico no WhatsApp</span>
            </a>

            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              onClick={() => setQuoteDialogOpen(true)}
            >
              <FileText className="w-4 h-4" />
              Gerar Orçamento PDF
            </Button>
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
            <div className="flex flex-wrap gap-2 mt-2">
              {acceptedMethods.map((m) => (
                <span key={m.key} className="text-xs text-ml-gray">{m.emoji} {m.label}</span>
              ))}
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
              Preencha seus dados para receber o orçamento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="customerName">Nome *</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Seu nome completo"
                required
              />
            </div>
            <div>
              <Label htmlFor="customerEmail">E-mail *</Label>
              <Input
                id="customerEmail"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="seu@email.com"
                required
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
              className={`w-full btn-security transition-all duration-300 ${
                quoteSent 
                  ? 'bg-green-500 hover:bg-green-600 animate-pulse' 
                  : isGenerating 
                    ? 'animate-pulse' 
                    : ''
              }`}
              disabled={!customerPhone.trim() || !customerEmail.trim() || !customerName.trim() || isGenerating || quoteSent}
            >
              {quoteSent ? (
                <>
                  <span className="mr-2">✅</span>
                  Enviado para o WhatsApp!
                </>
              ) : isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando PDF...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Gerar PDF e Enviar por WhatsApp
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
