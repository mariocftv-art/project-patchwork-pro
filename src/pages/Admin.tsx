import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Tag, Settings, Plus } from 'lucide-react';
import ProductForm from '@/components/admin/ProductForm';
import PromotionForm from '@/components/admin/PromotionForm';
import StoreSettingsForm from '@/components/admin/StoreSettingsForm';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function Admin() {
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [promotionDialogOpen, setPromotionDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const { data: products = [], refetch: refetchProducts } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
  });

  const { data: promotions = [], refetch: refetchPromotions } = useQuery({
    queryKey: ['promotions'],
    queryFn: () => base44.entities.Promotion.list(),
  });

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setProductDialogOpen(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      await base44.entities.Product.delete(id);
      refetchProducts();
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="font-display text-3xl font-bold text-foreground mb-8">
        ⚙️ Painel Administrativo
      </h1>

      <Tabs defaultValue="products" className="space-y-6">
        <TabsList className="bg-muted p-1 rounded-lg">
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Produtos
          </TabsTrigger>
          <TabsTrigger value="promotions" className="flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Promoções
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configurações
          </TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-foreground">
              Gerenciar Produtos ({products.length})
            </h2>
            <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="btn-security"
                  onClick={() => setEditingProduct(null)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Produto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl bg-card">
                <DialogHeader>
                  <DialogTitle>
                    {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                  </DialogTitle>
                </DialogHeader>
                <ProductForm
                  product={editingProduct}
                  onSuccess={() => {
                    setProductDialogOpen(false);
                    refetchProducts();
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="admin-card flex items-center gap-4"
              >
                <img
                  src={product.image_url}
                  alt={product.title}
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{product.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {product.category} • Estoque: {product.stock}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">
                    R$ {product.price.toFixed(2)}
                  </p>
                  {product.original_price && (
                    <p className="text-sm text-muted-foreground line-through">
                      R$ {product.original_price.toFixed(2)}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditProduct(product)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteProduct(product.id)}
                  >
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Promotions Tab */}
        <TabsContent value="promotions" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-foreground">
              Gerenciar Promoções ({promotions.length})
            </h2>
            <Dialog open={promotionDialogOpen} onOpenChange={setPromotionDialogOpen}>
              <DialogTrigger asChild>
                <Button className="btn-security">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Promoção
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl bg-card">
                <DialogHeader>
                  <DialogTitle>Nova Promoção</DialogTitle>
                </DialogHeader>
                <PromotionForm
                  products={products}
                  onSuccess={() => {
                    setPromotionDialogOpen(false);
                    refetchPromotions();
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          {promotions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhuma promoção cadastrada.
            </div>
          ) : (
            <div className="grid gap-4">
              {promotions.map((promo) => (
                <div key={promo.id} className="admin-card">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-foreground">{promo.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {promo.discount_percent}% de desconto • {promo.product_ids.length} produtos
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        promo.active
                          ? 'bg-success/20 text-success'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {promo.active ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <div className="max-w-xl">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Configurações da Loja
            </h2>
            <StoreSettingsForm />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
