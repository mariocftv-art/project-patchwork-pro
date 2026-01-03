import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCart } from '@/hooks/useCart';
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Cart() {
  const { cartItems, updateQuantity, removeFromCart, clearCart, isLoading: cartLoading } = useCart();

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
    staleTime: 1000 * 60 * 5,
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => base44.entities.StoreSettings.getSettings(),
  });

  const cartWithProducts = cartItems.map((item) => ({
    ...item,
    product: products.find((p) => p.id === item.product_id),
  })).filter((item) => item.product);

  const subtotal = cartWithProducts.reduce(
    (sum, item) => sum + (item.product?.price || 0) * item.quantity,
    0
  );

  const shippingFee = settings && subtotal >= settings.free_shipping_min ? 0 : settings?.shipping_fee || 0;
  const total = subtotal + shippingFee;

  if (cartLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="text-center py-16">
        <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">
          Seu carrinho está vazio
        </h2>
        <p className="text-muted-foreground mb-6">
          Adicione produtos ao carrinho para continuar comprando.
        </p>
        <Link to="/">
          <Button className="btn-security">
            Continuar Comprando
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Continuar comprando
      </Link>

      <h1 className="font-display text-3xl font-bold text-foreground mb-8">
        Carrinho de Compras
      </h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cartWithProducts.map((item) => (
            <div
              key={item.id}
              className="security-card p-4 flex gap-4"
            >
              <img
                src={item.product?.image_url}
                alt={item.product?.title}
                className="w-24 h-24 object-cover rounded-lg"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">
                  {item.product?.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {item.product?.category}
                </p>
                <p className="text-primary font-bold">
                  R$ {item.product?.price.toFixed(2)}
                </p>
              </div>
              <div className="flex flex-col items-end justify-between">
                <button
                  onClick={() => removeFromCart.mutate(item.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                  <button
                    onClick={() =>
                      updateQuantity.mutate({
                        id: item.id,
                        quantity: item.quantity - 1,
                      })
                    }
                    className="p-1 hover:bg-background rounded transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-semibold text-sm">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      updateQuantity.mutate({
                        id: item.id,
                        quantity: item.quantity + 1,
                      })
                    }
                    className="p-1 hover:bg-background rounded transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={() => clearCart.mutate()}
            className="text-sm text-destructive hover:underline"
          >
            Limpar carrinho
          </button>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="security-card p-6 sticky top-24">
            <h2 className="font-display text-xl font-bold text-foreground mb-4">
              Resumo do Pedido
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground font-medium">
                  R$ {subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frete</span>
                <span className={shippingFee === 0 ? 'text-success font-medium' : 'text-foreground'}>
                  {shippingFee === 0 ? 'Grátis' : `R$ ${shippingFee.toFixed(2)}`}
                </span>
              </div>
              {settings && subtotal < settings.free_shipping_min && (
                <p className="text-xs text-muted-foreground">
                  Faltam R$ {(settings.free_shipping_min - subtotal).toFixed(2)} para frete grátis!
                </p>
              )}
              <div className="border-t border-border pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-foreground">Total</span>
                  <span className="text-primary">R$ {total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <Button className="w-full btn-security mt-6">
              Finalizar Compra
            </Button>

            <div className="mt-4 space-y-2 text-xs text-muted-foreground">
              <p className="flex items-center gap-2">
                <span>💳</span> Até 12x sem juros no cartão
              </p>
              <p className="flex items-center gap-2">
                <span>📱</span> 5% de desconto no PIX
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
