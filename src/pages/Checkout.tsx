import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { useQuery } from "@tanstack/react-query";
import { productsApi, ordersApi } from "@/lib/supabaseApi";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CreditCard, Barcode, QrCode, MapPin, Loader2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Checkout() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { cartItems, clearCart, isLoading: cartLoading } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  // Store order data temporarily in state for confirmation page
  const [createdOrder, setCreatedOrder] = useState<{orderNumber: string; customerName: string; items: Array<{name: string; quantity: number; price: number}>; total: number} | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    cpf: "",
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    paymentMethod: "pix",
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => productsApi.list(),
  });

  const cartProducts = cartItems.map((item) => {
    const product = products.find((p) => p.id === item.product_id);
    return { ...item, product };
  }).filter((item) => item.product);

  const subtotal = cartProducts.reduce(
    (sum, item) => sum + (item.product?.price || 0) * item.quantity,
    0
  );

  const shipping = subtotal >= 199 ? 0 : 29.90;
  const total = subtotal + shipping;

  const handleCepChange = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    setFormData(prev => ({ ...prev, cep: cleanCep }));

    if (cleanCep.length === 8) {
      setLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            street: data.logradouro || "",
            neighborhood: data.bairro || "",
            city: data.localidade || "",
            state: data.uf || "",
          }));
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const generateOrderNumber = () => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0,10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `MR${dateStr}${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar campos obrigatórios
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim() || !formData.cep.trim() || 
        !formData.street.trim() || !formData.number.trim() || !formData.neighborhood.trim() || 
        !formData.city.trim() || !formData.state.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    // Validar formato de email
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(formData.email.trim())) {
      toast({
        title: "Email inválido",
        description: "Por favor, insira um email válido.",
        variant: "destructive",
      });
      return;
    }

    // Validar se há itens no carrinho
    if (cartProducts.length === 0) {
      toast({
        title: "Carrinho vazio",
        description: "Adicione produtos ao carrinho antes de finalizar.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const orderNumber = generateOrderNumber();
      
      const orderItems = cartProducts.map(item => ({
        name: item.product?.title || 'Produto',
        quantity: item.quantity,
        price: item.product?.price || 0,
      }));

      const finalTotal = formData.paymentMethod === 'pix' ? total * 0.95 : total;

      // Store order securely in database
      await ordersApi.create({
        order_number: orderNumber,
        customer_name: formData.name.trim(),
        customer_email: formData.email.trim().toLowerCase(),
        customer_phone: formData.phone.trim(),
        customer_cpf: formData.cpf.trim() || null,
        shipping_address: {
          cep: formData.cep,
          street: formData.street,
          number: formData.number,
          complement: formData.complement,
          neighborhood: formData.neighborhood,
          city: formData.city,
          state: formData.state,
        },
        items: orderItems,
        subtotal,
        shipping_fee: shipping,
        total: finalTotal,
        payment_method: formData.paymentMethod,
        status: 'pending'
      });
      
      // Store minimal non-sensitive data in sessionStorage for confirmation page only
      const fullAddress = `${formData.street}, ${formData.number}${formData.complement ? ' - ' + formData.complement : ''}, ${formData.neighborhood}, ${formData.city} - ${formData.state}, CEP: ${formData.cep}`;
      
      sessionStorage.setItem(`order_confirm_${orderNumber}`, JSON.stringify({
        orderNumber,
        customerName: formData.name.trim(),
        customerPhone: formData.phone.trim(),
        customerAddress: fullAddress,
        items: orderItems,
        total: finalTotal,
      }));
      
      // Limpar carrinho e navegar
      clearCart.mutate();
      navigate(`/pedido-confirmado/${orderNumber}`);
    } catch (error) {
      console.error("Erro ao processar pedido:", error);
      toast({
        title: "Erro ao processar pedido",
        description: "Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cartLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-ml-blue" />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold mb-4">Seu carrinho está vazio</h2>
          <Button onClick={() => navigate("/")} className="ml-btn-primary">
            Continuar comprando
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Finalizar Compra</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulário */}
          <div className="lg:col-span-2 space-y-6">
            {/* Dados pessoais */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="bg-ml-blue text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
                Dados Pessoais
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome completo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Seu nome completo"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="seu@email.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(e) => setFormData(prev => ({ ...prev, cpf: e.target.value }))}
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="bg-ml-blue text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
                <MapPin className="h-5 w-5" />
                Endereço de Entrega
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="cep">CEP *</Label>
                  <div className="relative">
                    <Input
                      id="cep"
                      value={formData.cep}
                      onChange={(e) => handleCepChange(e.target.value)}
                      placeholder="00000-000"
                      maxLength={8}
                      required
                    />
                    {loadingCep && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                    )}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="street">Rua *</Label>
                  <Input
                    id="street"
                    value={formData.street}
                    onChange={(e) => setFormData(prev => ({ ...prev, street: e.target.value }))}
                    placeholder="Nome da rua"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="number">Número *</Label>
                  <Input
                    id="number"
                    value={formData.number}
                    onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
                    placeholder="123"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="complement">Complemento</Label>
                  <Input
                    id="complement"
                    value={formData.complement}
                    onChange={(e) => setFormData(prev => ({ ...prev, complement: e.target.value }))}
                    placeholder="Apto, bloco..."
                  />
                </div>
                <div>
                  <Label htmlFor="neighborhood">Bairro *</Label>
                  <Input
                    id="neighborhood"
                    value={formData.neighborhood}
                    onChange={(e) => setFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
                    placeholder="Seu bairro"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="city">Cidade *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Sua cidade"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="state">Estado *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                    placeholder="SP"
                    maxLength={2}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Pagamento */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="bg-ml-blue text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
                Forma de Pagamento
              </h2>
              <RadioGroup
                value={formData.paymentMethod}
                onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}
                className="space-y-3"
              >
                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:border-ml-blue cursor-pointer">
                  <RadioGroupItem value="pix" id="pix" />
                  <Label htmlFor="pix" className="flex items-center gap-3 cursor-pointer flex-1">
                    <QrCode className="h-6 w-6 text-ml-green" />
                    <div>
                      <p className="font-medium">PIX</p>
                      <p className="text-sm text-muted-foreground">Aprovação imediata</p>
                    </div>
                    <span className="ml-auto text-ml-green font-medium">5% OFF</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:border-ml-blue cursor-pointer">
                  <RadioGroupItem value="credit" id="credit" />
                  <Label htmlFor="credit" className="flex items-center gap-3 cursor-pointer flex-1">
                    <CreditCard className="h-6 w-6 text-ml-blue" />
                    <div>
                      <p className="font-medium">Cartão de Crédito</p>
                      <p className="text-sm text-muted-foreground">Em até 8x sem juros</p>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:border-ml-blue cursor-pointer">
                  <RadioGroupItem value="boleto" id="boleto" />
                  <Label htmlFor="boleto" className="flex items-center gap-3 cursor-pointer flex-1">
                    <Barcode className="h-6 w-6 text-gray-600" />
                    <div>
                      <p className="font-medium">Boleto Bancário</p>
                      <p className="text-sm text-muted-foreground">Vencimento em 3 dias úteis</p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Resumo */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg p-6 shadow-sm sticky top-4">
              <h2 className="text-lg font-semibold mb-4">Resumo do Pedido</h2>
              
              <div className="space-y-3 mb-4">
                {cartProducts.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <img
                      src={item.product?.image_url || "/placeholder.svg"}
                      alt={item.product?.title}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product?.title}</p>
                      <p className="text-sm text-muted-foreground">Qtd: {item.quantity}</p>
                      <p className="text-sm font-semibold">
                        R$ {((item.product?.price || 0) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>R$ {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Frete</span>
                  <span className={shipping === 0 ? "text-ml-green font-medium" : ""}>
                    {shipping === 0 ? "Grátis" : `R$ ${shipping.toFixed(2)}`}
                  </span>
                </div>
                {formData.paymentMethod === "pix" && (
                  <div className="flex justify-between text-sm text-ml-green">
                    <span>Desconto PIX (5%)</span>
                    <span>- R$ {(total * 0.05).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total</span>
                  <span className="text-ml-blue">
                    R$ {formData.paymentMethod === "pix" 
                      ? (total * 0.95).toFixed(2) 
                      : total.toFixed(2)}
                  </span>
                </div>
                {formData.paymentMethod === "credit" && (
                  <p className="text-sm text-muted-foreground text-center">
                    ou 8x de R$ {(total / 8).toFixed(2)} sem juros
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full mt-6 ml-btn-primary h-12 text-lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  "Finalizar Compra"
                )}
              </Button>

              <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-ml-green" />
                <span>Compra 100% segura</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
