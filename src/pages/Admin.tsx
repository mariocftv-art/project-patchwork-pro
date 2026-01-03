import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productsApi, adminLogsApi, Product } from '@/lib/supabaseApi';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Settings, Plus, FileText, CreditCard, Phone, HelpCircle, Info, Camera, FolderOpen } from 'lucide-react';
import ProductForm from '@/components/admin/ProductForm';
import StoreSettingsForm from '@/components/admin/StoreSettingsForm';
import SiteContentForm from '@/components/admin/SiteContentForm';
import PaymentSettingsForm from '@/components/admin/PaymentSettingsForm';
import ContactForm from '@/components/admin/ContactForm';
import HelpForm from '@/components/admin/HelpForm';
import AboutForm from '@/components/admin/AboutForm';
import ServicePhotosForm from '@/components/admin/ServicePhotosForm';
import CategoriesForm from '@/components/admin/CategoriesForm';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export default function Admin() {
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { toast } = useToast();

  const { data: products = [], refetch: refetchProducts } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.list(),
  });

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductDialogOpen(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      try {
        await productsApi.delete(id);
        await adminLogsApi.log('delete_product', 'product', id);
        refetchProducts();
        toast({
          title: 'Produto excluído',
          description: 'O produto foi excluído com sucesso.',
        });
      } catch (error) {
        toast({
          title: 'Erro ao excluir',
          description: 'Não foi possível excluir o produto. Verifique suas permissões.',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="font-display text-3xl font-bold text-foreground mb-8">
        ⚙️ Painel Administrativo
      </h1>

      <Tabs defaultValue="products" className="space-y-6">
        <TabsList className="bg-muted p-1 rounded-lg flex-wrap h-auto gap-1">
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Produtos
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            Categorias
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Pagamento
          </TabsTrigger>
          <TabsTrigger value="contact" className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Contato
          </TabsTrigger>
          <TabsTrigger value="help" className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            Ajuda
          </TabsTrigger>
          <TabsTrigger value="about" className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            Sobre
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Serviços
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Conteúdo
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
                  src={product.image_url || '/placeholder.svg'}
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


        {/* Payment Tab */}
        <TabsContent value="payment">
          <div className="max-w-xl">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Configurações de Pagamento
            </h2>
            <PaymentSettingsForm />
          </div>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Gerenciar Categorias
            </h2>
            <CategoriesForm />
          </div>
        </TabsContent>

        {/* Contact Tab */}
        <TabsContent value="contact">
          <div className="max-w-xl">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Informações de Contato
            </h2>
            <ContactForm />
          </div>
        </TabsContent>

        {/* Help Tab */}
        <TabsContent value="help">
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Central de Ajuda
            </h2>
            <HelpForm />
          </div>
        </TabsContent>

        {/* About Tab */}
        <TabsContent value="about">
          <div className="max-w-xl">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Sobre a Empresa
            </h2>
            <AboutForm />
          </div>
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services">
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Fotos de Serviços Realizados
            </h2>
            <ServicePhotosForm />
          </div>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content">
          <div className="max-w-xl">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Gerenciar Conteúdo do Site
            </h2>
            <SiteContentForm />
          </div>
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
