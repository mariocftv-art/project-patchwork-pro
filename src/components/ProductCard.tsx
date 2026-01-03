import { Link } from 'react-router-dom';
import { Heart, Truck } from 'lucide-react';
import { Product } from '@/api/base44Client';
import { useWishlist } from '@/hooks/useWishlist';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { toggleWishlist, isInWishlist } = useWishlist();
  const inWishlist = isInWishlist(product.id);

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist.mutate(product.id);
  };

  const discount = product.original_price 
    ? Math.round((1 - product.price / product.original_price) * 100) 
    : 0;

  // Calculate installments (8x sem juros)
  const installmentValue = (product.price / 8).toFixed(2);
  const [reais, centavos] = product.price.toFixed(2).split('.');

  // Free shipping for products above R$79
  const hasFreeShipping = product.price >= 79;

  return (
    <Link to={`/produto/${product.id}`} className="block">
      <div className="ml-card p-4 h-full flex flex-col">
        {/* Image Container */}
        <div className="relative mb-3">
          <div className="aspect-square overflow-hidden rounded">
            <img 
              src={product.image_url} 
              alt={product.title} 
              className="w-full h-full object-contain bg-white"
            />
          </div>
          
          {/* Wishlist Button */}
          <button
            onClick={handleToggleWishlist}
            className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              inWishlist 
                ? 'text-ml-blue' 
                : 'text-ml-gray hover:text-ml-blue'
            }`}
          >
            <Heart className={`w-5 h-5 ${inWishlist ? 'fill-current' : ''}`} />
          </button>

          {/* Discount Badge */}
          {discount > 0 && (
            <span className="absolute top-2 left-2 bg-ml-green text-white text-xs font-semibold px-1.5 py-0.5 rounded">
              {discount}% OFF
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          {/* Title */}
          <h3 className="text-sm text-foreground line-clamp-2 mb-2 min-h-[2.5rem]">
            {product.title}
          </h3>

          {/* Original Price (if discounted) */}
          {product.original_price && (
            <p className="text-xs text-ml-gray line-through">
              R$ {product.original_price.toFixed(2)}
            </p>
          )}

          {/* Price */}
          <p className="ml-price">
            R$ {reais}
            <span className="ml-price-cents">{centavos}</span>
          </p>

          {/* Installments */}
          <p className="ml-installments mt-1">
            em 8x R$ {installmentValue}
          </p>

          {/* Free Shipping */}
          {hasFreeShipping && (
            <p className="ml-free-shipping flex items-center gap-1 mt-2">
              <Truck className="w-4 h-4" />
              Frete grátis
            </p>
          )}

          {/* Stock Warning */}
          {product.stock > 0 && product.stock <= 5 && (
            <p className="text-xs text-orange-500 mt-2">
              Últimas {product.stock} unidades!
            </p>
          )}

          {product.stock === 0 && (
            <p className="text-xs text-destructive font-medium mt-2">
              Produto esgotado
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
