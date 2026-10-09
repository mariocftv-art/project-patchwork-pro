import { Link } from 'react-router-dom';
import { waLink } from '@/lib/brand';
import { Heart, Bell } from 'lucide-react';
import { Product } from '@/lib/supabaseApi';
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

  const handleNotify = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const msg = `Olá! Me avise quando chegar: ${product.title}${product.sku ? ` (${product.sku})` : ""}`;
    window.open(waLink(msg), "_blank", "noopener,noreferrer");
  };

  const onPromo = !!product.promo_active && !!product.original_price;
  const discount = onPromo ? Math.round((1 - product.price / product.original_price!) * 100) : 0;

  // Calculate installments (8x sem juros)
  const installmentValue = (product.price / 8).toFixed(2);
  const [reais, centavos] = product.price.toFixed(2).split('.');

  return (
    <Link to={`/produto/${product.id}`} className="block h-full">
      <div className={`ml-card p-2 sm:p-4 h-full flex flex-col overflow-hidden min-w-0 ${product.stock === 0 ? "opacity-60" : ""}`}>
        {/* Image Container */}
        <div className="relative -mx-2 -mt-2 sm:-mx-4 sm:-mt-4 mb-2 sm:mb-3">
          <div className="product-frame aspect-square w-full overflow-hidden bg-white keep-white rounded-md p-2 sm:p-3 flex items-center justify-center">
            <img 
              src={product.image_url || '/placeholder.svg'} 
              alt={product.title} 
              loading="lazy"
              decoding="async"
              onError={(e) => { const i = e.currentTarget; if (!i.src.endsWith('/placeholder.svg')) i.src = '/placeholder.svg'; }}
              className="block max-w-full max-h-full w-auto h-auto object-contain"
            />
          </div>
          
          {/* Wishlist Button */}
          <button
            onClick={handleToggleWishlist}
            className={`absolute top-1 right-1 sm:top-2 sm:right-2 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all ${
              inWishlist 
                ? 'text-ml-blue' 
                : 'text-ml-gray hover:text-ml-blue'
            }`}
          >
            <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${inWishlist ? 'fill-current' : ''}`} />
          </button>

          {/* Discount Badge */}
          {discount > 0 && (
            <span className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-destructive text-destructive-foreground text-[10px] sm:text-xs font-bold px-1 sm:px-1.5 py-0.5 rounded">
              {discount}% OFF
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          {/* Title */}
          <h3 title={product.title} className="text-xs sm:text-sm leading-4 sm:leading-5 text-foreground line-clamp-2 mb-1 sm:mb-2 h-8 sm:h-10 overflow-hidden">
            {product.title}
          </h3>

          {/* Original Price (if discounted) */}
          {onPromo && (
            <p className="text-[10px] sm:text-xs text-price-old font-medium line-through">
              R$ {product.original_price.toFixed(2)}
            </p>
          )}

          {/* Price */}
          <p className={`text-base sm:text-xl ${onPromo ? 'font-bold text-promo' : 'font-semibold text-price'}`}>
            R$ {reais}
            <span className="text-[10px] sm:text-xs align-top">{centavos}</span>
          </p>

          {/* Installments */}
          <p className="text-[10px] sm:text-xs text-ml-gray mt-0.5 sm:mt-1">
            em 8x R$ {installmentValue}
          </p>

          {product.includes_installation && (
            <p className="text-[10px] sm:text-xs text-promo font-semibold mt-1">✓ Instalação inclusa</p>
          )}

          {/* Stock Warning */}
          {product.stock > 0 && product.stock <= 5 && (
            <p className="text-[10px] sm:text-xs text-foreground font-medium mt-1 sm:mt-2">
              Últimas {product.stock} unidades!
            </p>
          )}

          {product.stock === 0 && (
            <>
              <p className="text-[10px] sm:text-xs text-destructive font-medium mt-1 sm:mt-2">Produto esgotado</p>
              <button
                type="button"
                onClick={handleNotify}
                className="mt-2 w-full inline-flex items-center justify-center gap-1 rounded bg-foreground text-background text-[10px] sm:text-xs font-semibold py-1.5 hover:bg-ml-dark-gray"
              >
                <Bell className="w-3 h-3" /> Avise-me quando chegar
              </button>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
