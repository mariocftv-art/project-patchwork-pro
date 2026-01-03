import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useWishlist } from '@/hooks/useWishlist';
import { useCart } from '@/hooks/useCart';
import { ArrowLeft, Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
            title: 'Produto adicionado!',
            description: `${item.product!.title} foi adicionado ao carrinho.`,
          });
        },
      }
    );
  };

  if (wishlistLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (wishlistItems.length === 0) {
    return (
      <div className="text-center py-16">
        <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">
          Sua lista de desejos está vazia
        </h2>
        <p className="text-muted-foreground mb-6">
          Adicione produtos que você deseja comprar depois.
        </p>
        <Link to="/">
          <Button className="btn-security">
            Explorar Produtos
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
        ❤️ Lista de Desejos
      </h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {wishlistWithProducts.map((item) => (
          <div key={item.id} className="security-card overflow-hidden">
            <Link to={`/produto/${item.product?.id}`}>
              <img
                src={item.product?.image_url}
                alt={item.product?.title}
                className="w-full h-48 object-cover"
              />
            </Link>
            <div className="p-4">
              <span className="security-badge mb-2">{item.product?.category}</span>
              <h3 className="font-semibold text-foreground mt-2 line-clamp-2">
                {item.product?.title}
              </h3>
              <p className="text-primary font-bold text-lg mt-2">
                R$ {item.product?.price.toFixed(2)}
              </p>
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={() => handleAddToCart(item)}
                  disabled={item.product?.stock === 0}
                  className="flex-1 btn-security"
                  size="sm"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Comprar
                </Button>
                <Button
                  onClick={() => removeFromWishlist.mutate(item.id)}
                  variant="outline"
                  size="icon"
                  className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
