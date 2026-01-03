import { Link } from 'react-router-dom';
import { Heart, ShoppingCart } from 'lucide-react';
import { Product } from '@/api/base44Client';
import { useCart } from '@/hooks/useCart';
import { useWishlist } from '@/hooks/useWishlist';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { toast } = useToast();
  const inWishlist = isInWishlist(product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart.mutate({ product_id: product.id }, {
      onSuccess: () => {
        toast({
          title: 'Produto adicionado!',
          description: `${product.title} foi adicionado ao carrinho.`,
        });
      },
    });
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist.mutate(product.id, {
      onSuccess: (result) => {
        toast({
          title: result.action === 'added' ? 'Adicionado aos favoritos!' : 'Removido dos favoritos',
          description: product.title,
        });
      },
    });
  };

  const discount = product.original_price 
    ? Math.round((1 - product.price / product.original_price) * 100) 
    : 0;

  return (
    <Link to={`/produto/${product.id}`} className="block">
      <div className="product-card group">
        <div className="relative overflow-hidden rounded-lg mb-3">
          <img 
            src={product.image_url} 
            alt={product.title} 
            className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
          />
          
          {discount > 0 && (
            <span className="discount-badge absolute top-2 left-2">
              -{discount}%
            </span>
          )}

          <button
            onClick={handleToggleWishlist}
            className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
              inWishlist 
                ? 'bg-destructive text-destructive-foreground' 
                : 'bg-card/80 text-foreground hover:bg-destructive hover:text-destructive-foreground'
            }`}
          >
            <Heart className={`w-4 h-4 ${inWishlist ? 'fill-current' : ''}`} />
          </button>

          {product.stock <= 5 && product.stock > 0 && (
            <span className="absolute bottom-2 left-2 bg-accent text-accent-foreground px-2 py-1 rounded text-xs font-medium">
              Últimas {product.stock} unidades!
            </span>
          )}

          {product.stock === 0 && (
            <div className="absolute inset-0 bg-foreground/50 flex items-center justify-center">
              <span className="bg-card text-foreground px-4 py-2 rounded-lg font-semibold">
                Esgotado
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <span className="security-badge">
            {product.category}
          </span>
          
          <h3 className="font-semibold text-foreground line-clamp-2 min-h-[2.5rem]">
            {product.title}
          </h3>

          <div className="flex items-center gap-2">
            {product.original_price && (
              <span className="old-price">
                R$ {product.original_price.toFixed(2)}
              </span>
            )}
            <span className="price-tag">
              R$ {product.price.toFixed(2)}
            </span>
          </div>

          <Button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className="w-full btn-security"
            size="sm"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        </div>
      </div>
    </Link>
  );
}
