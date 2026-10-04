import { useParams, Link } from 'react-router-dom';
import { waLink } from '@/lib/brand';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/lib/supabaseApi';
import { Heart, Minus, Plus, Truck, Shield, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '@/hooks/useCart';
import { useWishlist } from '@/hooks/useWishlist';
import ShareButton from '@/components/ShareButton';
import ShippingCalculator from '@/components/ShippingCalculator';
import { useToast } from '@/hooks/use-toast';
import { ProductDescription, ShippingInstallBox, RelatedBlocks } from '@/components/product/ProductExtrasView';

export default function Product() {
  const { id } = useParams<{ id: string }>();
  const [quantity, setQuantity] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { toast } = useToast();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.get(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-ml-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12 bg-card rounded-lg">
        <h2 className="text-xl text-foreground mb-4">Produto não encontrado</h2>
        <Link to="/" className="ml-link">
          Voltar para a loja
        </Link>
      </div>
    );
  }

  const inWishlist = isInWishlist(product.id);
  const onPromo = !!product.promo_active && !!product.original_price;
  const discount = onPromo ? Math.round((1 - product.price / product.original_price!) * 100) : 0;
  const savings = onPromo ? product.original_price! - product.price : 0;
  const installmentValue = (product.price / 8).toFixed(2);
  const [reais, centavos] = product.price.toFixed(2).split('.');

  const handleAddToCart = () => {
    addToCart.mutate(
      { product_id: product.id, quantity },
      {
        onSuccess: () => {
          toast({
            title: 'Produto adicionado ao carrinho!',
            description: `${quantity}x ${product.title}`,
          });
        },
      }
    );
  };

  const handleBuyNow = () => {
    addToCart.mutate(
      { product_id: product.id, quantity },
      {
        onSuccess: () => {
          window.location.href = '/carrinho';
        },
      }
    );
  };

  const handleToggleWishlist = () => {
    toggleWishlist.mutate(product.id);
  };

  return (
    <div className="bg-card rounded-lg">
      {/* Breadcrumb */}
      <div className="px-4 py-3 border-b border-border">
        <Link
          to="/"
          className="text-sm text-ml-blue hover:underline"
        >
          ← Voltar aos resultados
        </Link>
      </div>

      <div className="p-4 lg:p-6">
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Image Column */}
          <div className="lg:col-span-5">
            <div className="sticky top-24">
              {(() => {
                const imgs = [product.image_url, ...(product.gallery_urls ?? [])]
                  .filter((u): u is string => !!u && u.trim() !== '')
                  .filter((u, i, a) => a.indexOf(u) === i)
                  .slice(0, 5);
                const main = imgs[activeImg] ?? imgs[0] ?? '/placeholder.svg';
                return (
                  <div className="flex gap-3">
                    {imgs.length > 1 && (
                      <div className="flex flex-col gap-2 w-16 shrink-0">
                        {imgs.map((u, i) => (
                          <button
                            key={u}
                            type="button"
                            onMouseEnter={() => setActiveImg(i)}
                            onClick={() => setActiveImg(i)}
                            aria-label={`Ver imagem ${i + 1}`}
                            className={`aspect-square rounded-md overflow-hidden bg-card border-2 transition-colors ${
                              i === activeImg ? 'border-primary' : 'border-border hover:border-muted-foreground'
                            }`}
                          >
                            <img src={u} alt="" className="w-full h-full object-contain p-1" loading="lazy" />
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="relative flex-1 aspect-square rounded-lg overflow-hidden bg-card border border-border">
                      {onPromo && (
                        <span className="absolute top-2 left-2 z-10 rounded bg-destructive text-destructive-foreground text-sm font-bold px-2 py-1">{discount}% OFF</span>
                      )}
                      <img src={main} alt={product.title} className="w-full h-full object-contain p-4" />
                    </div>
                  </div>
                );
              })()}
              {product.image_illustrative && (
                <p className="mt-2 text-center text-xs text-muted-foreground">Imagem ilustrativa</p>
              )}
              <div className="mt-4 flex justify-center gap-2">
                <ShareButton title={product.title} />
              </div>
            </div>
          </div>

          {/* Info Column */}
          <div className="lg:col-span-4">
            {/* Badge */}
            {product.featured && (
              <span className="ml-badge-blue text-xs mb-2 inline-block">
                MAIS VENDIDO
              </span>
            )}

            {/* Title */}
            <h1 className="text-xl lg:text-2xl font-light text-foreground mb-4">
              {product.title}
            </h1>

            {/* Price Section */}
            <div className="mb-4">
              {onPromo && (
                <p className="text-sm text-price-old font-medium line-through mb-1">
                  R$ {product.original_price!.toFixed(2)}
                </p>
              )}
              <p className={`text-3xl lg:text-4xl ${onPromo ? 'font-bold text-promo' : 'font-normal text-price'}`}>
                R$ {reais}
                <span className="text-lg align-top">{centavos}</span>
              </p>
              <p className="text-ml-green text-sm mt-1">
                em 8x R$ {installmentValue} sem juros
              </p>
              {onPromo && (
                <p className="text-sm text-promo font-semibold mt-1">Você economiza R$ {savings.toFixed(2)}</p>
              )}
              {product.includes_installation && (
                <div className="mt-3 rounded-lg border border-promo/40 p-3 text-sm">
                  <p className="text-promo font-semibold">✓ Instalação profissional inclusa — Grande São Paulo</p>
                  <p className="text-ml-gray">Configuração do acesso pelo celular + 1 ano de garantia</p>
                </div>
              )}
            </div>

            {/* Shipping Calculator */}
            <div className="mb-4">
              <ShippingCalculator productPrice={product.price} />
            </div>

            {/* Stock */}
            <div className="text-sm mb-4">
              {product.stock > 0 ? (
                <p className="text-ml-green">
                  Estoque disponível ({product.stock} unidades)
                </p>
              ) : (
                <p className="text-destructive font-medium">
                  Produto esgotado
                </p>
              )}
            </div>

            <ShippingInstallBox withInstall={!!product.includes_installation} />

            <ProductDescription product={product} />
          </div>

          {/* Buy Box Column */}
          <div className="lg:col-span-3">
            <div className="sticky top-24 border border-border rounded-lg p-4">
              {/* Seller Info */}
              <div className="mb-4 pb-4 border-b border-border">
                <p className="text-sm text-ml-gray">
                  Vendido por <span className="text-ml-blue">MR Segurança</span>
                </p>
              </div>

              {/* Price in Buy Box */}
              <div className="mb-4">
                <p className={`text-2xl ${onPromo ? 'font-bold text-promo' : 'font-light text-foreground'}`}>
                  R$ {product.price.toFixed(2)}
                </p>
                <p className="text-sm text-ml-green">
                  em 8x R$ {installmentValue}
                </p>
              </div>

              {/* Quantity */}
              <div className="mb-4">
                <label className="text-sm text-ml-gray block mb-2">Quantidade:</label>
                <div className="flex items-center border border-border rounded">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-2 text-ml-blue hover:bg-secondary"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 py-2 border-x border-border min-w-[60px] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="px-3 py-2 text-ml-blue hover:bg-secondary"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Buttons */}
              <div className="space-y-2">
                {product.stock === 0 ? (
                  <a
                    href={waLink(`Olá! Me avise quando chegar: ${product.title}${product.sku ? ` (${product.sku})` : ''}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full ml-btn-primary block text-center"
                  >
                    Avise-me quando chegar
                  </a>
                ) : (
                  <>
                    <button onClick={handleBuyNow} className="w-full ml-btn-primary">
                      Comprar agora
                    </button>
                    <button onClick={handleAddToCart} className="w-full ml-btn-secondary">
                      Adicionar ao carrinho
                    </button>
                  </>
                )}
              </div>

              {/* Wishlist */}
              <button
                onClick={handleToggleWishlist}
                className={`w-full mt-3 py-2 text-sm flex items-center justify-center gap-2 ${
                  inWishlist ? 'text-ml-blue' : 'text-ml-gray hover:text-ml-blue'
                }`}
              >
                <Heart className={`w-4 h-4 ${inWishlist ? 'fill-current' : ''}`} />
                {inWishlist ? 'Adicionado aos favoritos' : 'Adicionar aos favoritos'}
              </button>

              {/* Benefits */}
              <div className="mt-6 pt-4 border-t border-border space-y-3">
                <div className="flex items-center gap-2 text-sm text-ml-gray">
                  <Shield className="w-4 h-4 text-ml-green" />
                  <span>Compra garantida</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-ml-gray">
                  <Truck className="w-4 h-4 text-ml-green" />
                  <span>Envio imediato</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <RelatedBlocks product={product} />
      </div>
    </div>
  );
}
