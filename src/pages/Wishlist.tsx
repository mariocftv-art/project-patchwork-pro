import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useWishlist } from '@/hooks/useWishlist';
import { useCart } from '@/hooks/useCart';
import { Heart, ShoppingCart, Trash2, Truck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Wishlist() {
  const { wishlistItems, removeFromWishlist, isLoading: wishlistLoading } = useWishlist();
  const { addToCart } = useCart();
  const { toast } = useToast();

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
    staleTime: 1000 * 60 * 5,
  });

  const wishlistWithProducts = wishlistItems.map((item) => ({
    ...item,
    product: products.find((p) => p.id === item.product_id),
  })).filter((item) => item.product);

  const handleAddToCart = (item: typeof wishlistWithProducts[0]) => {
    if (!item.product) return;
    addToCart.mutate(
      { product_id: item.product.id },
      {
        onSuccess: () => {
          toast({
            title: 'Produto adicionado ao carrinho!',
            description: item.product!.title,
          });
        },
      }
    );
  };

  if (wishlistLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-ml-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (wishlistItems.length === 0) {
    return (
      <div className="bg-white rounded-lg p-8 text-center">
        <Heart className="w-16 h-16 text-ml-light-gray mx-auto mb-4" />
        <h2 className="text-xl text-foreground mb-2">
          Você ainda não tem favoritos
        </h2>
        <p className="text-ml-gray mb-6 text-sm">
          Adicione produtos clicando no coração!
        </p>
        <Link to="/" className="ml-btn-primary inline-block">
          Descobrir produtos
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white rounded-lg">
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-light text-foreground">
            Favoritos ({wishlistWithProducts.length})
          </h1>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
          {wishlistWithProducts.map((item) => {
            const hasFreeShipping = (item.product?.price || 0) >= 79;
            const installmentValue = ((item.product?.price || 0) / 8).toFixed(2);

            return (
              <div key={item.id} className="ml-card p-4">
                <Link to={`/produto/${item.product?.id}`}>
                  <div className="aspect-square rounded overflow-hidden bg-white mb-3">
                    <img
                      src={item.product?.image_url}
                      alt={item.product?.title}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </Link>

                <Link 
                  to={`/produto/${item.product?.id}`}
                  className="text-sm text-foreground hover:text-ml-blue line-clamp-2 mb-2 block min-h-[2.5rem]"
                >
                  {item.product?.title}
                </Link>

                <p className="text-xl font-light text-foreground">
                  R$ {item.product?.price.toFixed(2)}
                </p>
                
                <p className="text-sm text-ml-green">
                  em 8x R$ {installmentValue}
                </p>

                {hasFreeShipping && (
                  <p className="flex items-center gap-1 text-sm text-ml-green mt-2">
                    <Truck className="w-4 h-4" />
                    Frete grátis
                  </p>
                )}

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleAddToCart(item)}
                    disabled={item.product?.stock === 0}
                    className="flex-1 ml-btn-primary text-sm py-2 disabled:opacity-50"
                  >
                    Comprar
                  </button>
                  <button
                    onClick={() => removeFromWishlist.mutate(item.id)}
                    className="px-3 py-2 border border-border rounded hover:bg-secondary text-ml-gray"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
