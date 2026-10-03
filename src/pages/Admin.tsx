import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productsApi, adminLogsApi, Product, isPromoActive } from '@/lib/supabaseApi';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Settings, Plus, FileText, CreditCard, Phone, HelpCircle, Info, Camera, FolderOpen, Wrench, ShoppingBag, ClipboardList, LogOut, BarChart3, Palette, CalendarDays } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import ProductForm from '@/components/admin/ProductForm';
import StoreSettingsForm from '@/components/admin/StoreSettingsForm';
import SiteContentForm from '@/components/admin/SiteContentForm';
import PaymentSettingsForm from '@/components/admin/PaymentSettingsForm';
import ContactForm from '@/components/admin/ContactForm';
import HelpForm from '@/components/admin/HelpForm';
import AboutForm from '@/components/admin/AboutForm';
import ServicePhotosForm from '@/components/admin/ServicePhotosForm';
import CategoriesForm from '@/components/admin/CategoriesForm';
import InstallationServicesForm from '@/components/admin/InstallationServicesForm';
import ServiceDefaultsForm from '@/components/admin/ServiceDefaultsForm';
import OrdersManagement from '@/components/admin/OrdersManagement';
import QuotesManagement from '@/components/admin/QuotesManagement';
import ContractsManagement from '@/components/admin/ContractsManagement';
import SalesDashboard from '@/components/admin/SalesDashboard';
import CompanyProfileForm from '@/components/admin/CompanyProfileForm';
import AppointmentsManagement, { useAppointments, countAlerts } from '@/components/admin/AppointmentsManagement';
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
  const [onlyPromo, setOnlyPromo] = useState(false);
  const [onlyInstall, setOnlyInstall] = useState(false);
  const { toast } = useToast();
  const { signOut } = useAuth();
  const { data: apts = [] } = useAppointments();
  const aptAlerts = countAlerts(apts);

  const { data: products = [], refetch: refetchProducts } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      try {
        return await productsApi.listAdmin();
      } catch (error) {
        console.error('[Admin] falha ao carregar produtos com custo:', error);
        return await productsApi.list();
      }
    },
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
    <div className="admin-mobile max-w-6xl mx-auto w-full min-w-0 overflow-x-hidden">
      <div className="flex items-center justify-between gap-4 mb-8">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
          ⚙️ Painel Administrativo
        </h1>
        <Button variant="outline" size="sm" onClick={() => signOut()} className="flex items-center gap-2 min-h-11 shrink-0">
          <LogOut className="w-4 h-4" />
          Sair
        </Button>
      </div>


      <Tabs defaultValue="sales" className="space-y-6">
        <TabsList className="bg-muted p-1 rounded-lg flex-wrap h-auto gap-1">
          <TabsTrigger value="sales" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Vendas
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" />
            Pedidos
          </TabsTrigger>
          <TabsTrigger value="quotes" className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Orçamentos
          </TabsTrigger>
          <TabsTrigger value="contracts" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Contratos Feitos
          </TabsTrigger>
          <TabsTrigger value="appointments" className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Agendamentos
            {aptAlerts > 0 && <span className="ml-1 rounded-full bg-destructive text-destructive-foreground text-xs font-bold px-2" aria-label={`${aptAlerts} avisos`}>{aptAlerts}</span>}
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Personalização
          </TabsTrigger>
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
            Fotos Serviços
          </TabsTrigger>
          <TabsTrigger value="installations" className="flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            Instalações
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

        {/* Sales Tab */}
        <TabsContent value="sales" className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            📊 Painel de Vendas
          </h2>
          <SalesDashboard />
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            Gerenciar Pedidos
          </h2>
          <OrdersManagement />
        </TabsContent>

        {/* Branding / Personalização */}
        <TabsContent value="branding" className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            Personalização do Orçamento e das Mensagens
          </h2>
          <CompanyProfileForm />
        </TabsContent>

        {/* Quotes Tab */}
        <TabsContent value="quotes" className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            Gerenciar Orçamentos
          </h2>
          <QuotesManagement />
        </TabsContent>

        <TabsContent value="appointments" className="space-y-4">
          <AppointmentsManagement />
        </TabsContent>

        <TabsContent value="contracts" className="space-y-4">
          <ContractsManagement />
        </TabsContent>

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
                  key={editingProduct?.id ?? 'new'}
                  product={editingProduct}
                  onSuccess={() => {
                    setProductDialogOpen(false);
                    refetchProducts();
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={onlyPromo} onChange={(e) => setOnlyPromo(e.target.checked)} /> Ver só em promoção
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={onlyInstall} onChange={(e) => setOnlyInstall(e.target.checked)} /> Ver só com instalação
            </label>
          </div>

          <div className="grid gap-4">
            {products
              .filter((p) => (!onlyPromo || isPromoActive(p)) && (!onlyInstall || p.includes_installation))
              .map((product) => (
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
                <div className="w-28 text-xs text-center" title="Promoção">
                  {isPromoActive(product) ? (
                    <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-promo" /> Promoção
                      {product.promo_until && <span className="block text-muted-foreground">até {new Date(product.promo_until).toLocaleDateString('pt-BR')}</span>}
                    </span>
                  ) : <span className="text-muted-foreground">—</span>}
                </div>
                <div className="w-20 text-xs text-center" title="Instalação">
                  {product.includes_installation ? <span className="inline-flex items-center gap-1"><Wrench className="w-4 h-4 text-promo" /> Inclui</span> : <span className="text-muted-foreground">—</span>}
                </div>
                <div className="text-right">
                  {isPromoActive(product) ? (
                    <>
                      <p className="text-sm text-muted-foreground line-through">R$ {Number(product.price).toFixed(2)}</p>
                      <p className="font-bold text-promo">R$ {Number(product.promo_price).toFixed(2)}</p>
                    </>
                  ) : (
                    <p className="font-bold text-primary">R$ {Number(product.price).toFixed(2)}</p>
                  )}
                  {product.cost_price != null && (
                    <p className="text-xs text-muted-foreground">
                      Custo: R$ {Number(product.cost_price).toFixed(2)}
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

        {/* Installations Tab */}
        <TabsContent value="installations">
          <div className="max-w-3xl">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Gerenciar Serviços de Instalação
            </h2>
            <InstallationServicesForm />
            <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">
              Foto e valor padrão dos serviços (orçamentos e contratos)
            </h2>
            <ServiceDefaultsForm />
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
