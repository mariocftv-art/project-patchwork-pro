import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCart } from '@/hooks/useCart';
import { Minus, Plus, Trash2, ShoppingCart, Truck, Shield } from 'lucide-react';

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
                      src={item.product?.image_url}
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

            {settings && subtotal < settings.free_shipping_min && (
              <p className="text-xs text-ml-blue">
                Adicione R$ {(settings.free_shipping_min - subtotal).toFixed(2)} para frete grátis!
              </p>
            )}

            <div className="border-t border-border pt-3">
              <div className="flex justify-between">
                <span className="text-foreground font-medium">Total</span>
                <span className="text-xl text-foreground">R$ {total.toFixed(2)}</span>
              </div>
              <p className="text-sm text-ml-green mt-1">
                em 12x R$ {(total / 12).toFixed(2)} sem juros
              </p>
            </div>
          </div>

          <button className="w-full ml-btn-primary mt-4">
            Continuar compra
          </button>

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
              <span className="text-xs text-ml-gray">💳 12x sem juros</span>
              <span className="text-xs text-ml-gray">📱 5% no PIX</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
