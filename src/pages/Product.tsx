import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Heart, ShoppingCart, Minus, Plus, Truck, Shield, RotateCcw, MapPin } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '@/hooks/useCart';
import { useWishlist } from '@/hooks/useWishlist';
import ShareButton from '@/components/ShareButton';
import ShippingCalculator from '@/components/ShippingCalculator';
import { useToast } from '@/hooks/use-toast';

export default function Product() {
  const { id } = useParams<{ id: string }>();
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { toast } = useToast();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => base44.entities.Product.get(id!),
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
      <div className="text-center py-12 bg-white rounded-lg">
        <h2 className="text-xl text-foreground mb-4">Produto não encontrado</h2>
        <Link to="/" className="ml-link">
          Voltar para a loja
        </Link>
      </div>
    );
  }

  const inWishlist = isInWishlist(product.id);
  const discount = product.original_price
    ? Math.round((1 - product.price / product.original_price) * 100)
    : 0;
  const hasFreeShipping = product.price >= 79;
  const installmentValue = (product.price / 12).toFixed(2);
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
    <div className="bg-white rounded-lg">
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
              <div className="aspect-square rounded-lg overflow-hidden bg-white border border-border">
                <img
                  src={product.image_url}
                  alt={product.title}
                  className="w-full h-full object-contain p-4"
                />
              </div>
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
              {product.original_price && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-ml-gray line-through">
                    R$ {product.original_price.toFixed(2)}
                  </span>
                  <span className="text-sm text-ml-green font-semibold">
                    {discount}% OFF
                  </span>
                </div>
              )}
              <p className="text-3xl lg:text-4xl font-light text-foreground">
                R$ {reais}
                <span className="text-lg align-top">{centavos}</span>
              </p>
              <p className="text-ml-green text-sm mt-1">
                em 12x R$ {installmentValue} sem juros
              </p>
            </div>

            {/* Shipping Calculator */}
            <div className="mb-4">
              <ShippingCalculator productPrice={product.price} />
            </div>

            {/* Description */}
            <div className="mb-6">
              <h3 className="font-medium text-foreground mb-2">Descrição</h3>
              <p className="text-sm text-ml-gray leading-relaxed">
                {product.description}
              </p>
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
                <p className="text-2xl font-light text-foreground">
                  R$ {product.price.toFixed(2)}
                </p>
                <p className="text-sm text-ml-green">
                  em 12x R$ {installmentValue}
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
                <button
                  onClick={handleBuyNow}
                  disabled={product.stock === 0}
                  className="w-full ml-btn-primary disabled:opacity-50"
                >
                  Comprar agora
                </button>
                <button
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                  className="w-full ml-btn-secondary disabled:opacity-50"
                >
                  Adicionar ao carrinho
                </button>
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
                  <RotateCcw className="w-4 h-4 text-ml-green" />
                  <span>Devolução grátis em 7 dias</span>
                </div>
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
      </div>
    </div>
  );
}
