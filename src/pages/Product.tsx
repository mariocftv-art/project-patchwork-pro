import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Heart, ShoppingCart, Minus, Plus, Check } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '@/hooks/useCart';
import { useWishlist } from '@/hooks/useWishlist';
import { Button } from '@/components/ui/button';
import ShareButton from '@/components/ShareButton';
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
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-foreground mb-4">Produto não encontrado</h2>
        <Link to="/" className="text-primary hover:underline">
          Voltar para a loja
        </Link>
      </div>
    );
  }

  const inWishlist = isInWishlist(product.id);
  const discount = product.original_price
    ? Math.round((1 - product.price / product.original_price) * 100)
    : 0;

  const handleAddToCart = () => {
    addToCart.mutate(
      { product_id: product.id, quantity },
      {
        onSuccess: () => {
          toast({
            title: 'Produto adicionado!',
            description: `${quantity}x ${product.title} adicionado ao carrinho.`,
          });
        },
      }
    );
  };

  const handleToggleWishlist = () => {
    toggleWishlist.mutate(product.id, {
      onSuccess: (result) => {
        toast({
          title: result.action === 'added' ? 'Adicionado aos favoritos!' : 'Removido dos favoritos',
          description: product.title,
        });
      },
    });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para a loja
      </Link>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Product Image */}
        <div className="relative">
          <div className="aspect-square rounded-2xl overflow-hidden bg-muted">
            <img
              src={product.image_url}
              alt={product.title}
              className="w-full h-full object-cover"
            />
          </div>
          {discount > 0 && (
            <span className="discount-badge absolute top-4 left-4 text-lg px-3 py-1">
              -{discount}%
            </span>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <span className="security-badge mb-3">{product.category}</span>
            <h1 className="font-display text-3xl font-bold text-foreground mt-2">
              {product.title}
            </h1>
          </div>

          <p className="text-muted-foreground text-lg">{product.description}</p>

          <div className="flex items-baseline gap-3">
            {product.original_price && (
              <span className="text-xl text-muted-foreground line-through">
                R$ {product.original_price.toFixed(2)}
              </span>
            )}
            <span className="text-4xl font-bold text-primary">
              R$ {product.price.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            {product.stock > 0 ? (
              <>
                <Check className="w-4 h-4 text-success" />
                <span className="text-success font-medium">
                  Em estoque ({product.stock} unidades)
                </span>
              </>
            ) : (
              <span className="text-destructive font-medium">Produto esgotado</span>
            )}
          </div>

          {/* Quantity Selector */}
          <div className="flex items-center gap-4">
            <span className="text-foreground font-medium">Quantidade:</span>
            <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-2 hover:bg-background rounded transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-12 text-center font-semibold">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                className="p-2 hover:bg-background rounded transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className="flex-1 btn-security h-14 text-lg"
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Adicionar ao Carrinho
            </Button>
            <Button
              onClick={handleToggleWishlist}
              variant="outline"
              size="icon"
              className={`h-14 w-14 ${
                inWishlist ? 'bg-destructive text-destructive-foreground border-destructive' : ''
              }`}
            >
              <Heart className={`w-5 h-5 ${inWishlist ? 'fill-current' : ''}`} />
            </Button>
            <ShareButton title={product.title} />
          </div>

          {/* Additional Info */}
          <div className="border-t border-border pt-6 space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-2xl">🚚</span>
              <div>
                <p className="font-medium text-foreground">Frete Grátis</p>
                <p className="text-muted-foreground">Para compras acima de R$ 299</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-2xl">🔒</span>
              <div>
                <p className="font-medium text-foreground">Compra Segura</p>
                <p className="text-muted-foreground">Seus dados protegidos</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-2xl">📦</span>
              <div>
                <p className="font-medium text-foreground">Devolução Fácil</p>
                <p className="text-muted-foreground">7 dias para troca ou devolução</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
