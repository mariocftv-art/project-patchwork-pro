import { APP_VERSION_LABEL } from '@/components/UpdateBanner';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { productsApi, adminLogsApi, Product, isPromoActive } from '@/lib/supabaseApi';
import { ADMIN_TAB_EVENT } from '@/lib/docHandoff';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Package, Settings, Plus, FileText, CreditCard, Phone, HelpCircle, Info, Camera, FolderOpen, Wrench, ShoppingBag, ClipboardList, LogOut, BarChart3, Palette, CalendarDays, ArrowLeft, LayoutGrid, Pencil } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import ProductForm from '@/components/admin/ProductForm';
import StoreSettingsForm from '@/components/admin/StoreSettingsForm';
import { getActiveDraft, getLocalDraft } from '@/lib/quoteDrafts';
import TeamManagement from '@/components/admin/TeamManagement';
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
import WhatsAppContactsList from '@/components/admin/WhatsAppContactsList';
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

/** Sobe ao topo de verdade, inclusive depois que o conteúdo carrega (celular restaura a rolagem antiga). */
function scrollAdminTop() {
  const go = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };
  go();
  requestAnimationFrame(go);
  [80, 250, 600].forEach((ms) => setTimeout(go, ms));
}

const ADMIN_GROUPS = [
  { title: 'Vendas', items: [
    { value: 'sales', label: 'Vendas', desc: 'Veja o total de vendas', icon: BarChart3 },
    { value: 'orders', label: 'Pedidos', desc: 'Veja, imprima e marque como atendido', icon: ShoppingBag },
    { value: 'quotes', label: 'Orçamentos', desc: 'Veja, baixe, imprima e envie pelo WhatsApp', icon: ClipboardList },
    { value: 'contracts', label: 'Contratos Feitos', desc: 'Veja os contratos fechados', icon: FileText },
  ] },
  { title: 'Atendimento', items: [
    { value: 'appointments', label: 'Agendamentos', desc: 'Veja e confirme os agendamentos', icon: CalendarDays },
    { value: 'contact', label: 'Contato', desc: 'Telefone, WhatsApp e e-mail da empresa', icon: Phone },
    { value: 'help', label: 'Ajuda', desc: 'Tire dúvida sobre o painel', icon: HelpCircle },
  ] },
  { title: 'Loja', items: [
    { value: 'products', label: 'Produtos', desc: 'Cadastre, edite e organize os produtos', icon: Package },
    { value: 'categories', label: 'Categorias', desc: 'Câmeras, DVR/NVR, Cercas, Alarmes, Interfones, Porteiros, Cabos/Acessórios, Instalações', icon: FolderOpen },
    { value: 'branding', label: 'Personalização', desc: 'Logo, capa, cores e textos do site', icon: Palette },
    { value: 'services', label: 'Fotos Serviços', desc: 'Fotos dos trabalhos realizados', icon: Camera },
    { value: 'installations', label: 'Instalações', desc: 'Serviços de instalação, com preço', icon: Wrench },
  ] },
  { title: 'Site', items: [
    { value: 'about', label: 'Sobre', desc: 'Texto sobre a empresa', icon: Info },
    { value: 'content', label: 'Conteúdo', desc: 'Como funciona, galeria e localização', icon: LayoutGrid },
    { value: 'payment', label: 'Pagamento', desc: 'Pix, dinheiro, cartão de crédito e débito', icon: CreditCard },
    { value: 'settings', label: 'Configurações', desc: 'Horário, entrega, retirada e dados da empresa', icon: Settings },
  ] },
];

export default function Admin() {
  // Rascunho aberto quando a página foi descartada pelo celular: volta direto para ele
  const [tab, setTab] = useState(() => {
    const want = new URLSearchParams(window.location.search).get('tab');
    if (want) return want;
    const id = getActiveDraft(); const d = id ? getLocalDraft(id) : null;
    return d ? (d.docType === 'contrato' ? 'contracts' : 'quotes') : 'home';
  });
  useEffect(() => {
    const prev = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    scrollAdminTop();
    return () => { window.history.scrollRestoration = prev; };
  }, []);
  const changeTab = (v: string) => { setTab(v); scrollAdminTop(); };
  useEffect(() => {
    const go = (e: Event) => { const v = (e as CustomEvent<string>).detail; if (v) { setTab(v); scrollAdminTop(); } };
    window.addEventListener(ADMIN_TAB_EVENT, go);
    return () => window.removeEventListener(ADMIN_TAB_EVENT, go);
  }, []);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [onlyPromo, setOnlyPromo] = useState(false);
  const [onlyInstall, setOnlyInstall] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
    <div className="admin-mobile pb-28 max-w-6xl mx-auto w-full min-w-0 overflow-x-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <h1 className="min-w-0 break-words font-display text-xl sm:text-3xl font-bold text-foreground">
          ⚙️ Painel Administrativo
          <span className="block text-xs font-normal text-muted-foreground mt-1">{APP_VERSION_LABEL}</span>
        </h1>
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle variant="panel" />
          <Button variant="outline" size="sm" onClick={() => signOut()} className="flex items-center gap-2 min-h-11 shrink-0">
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </div>


      <Tabs value={tab} onValueChange={changeTab} className="space-y-6">
        {tab === 'home' ? (
          <div className="space-y-8">
            {ADMIN_GROUPS.map((g) => (
              <section key={g.title} aria-labelledby={`grp-${g.title}`}>
                <h2 id={`grp-${g.title}`} className="font-display text-lg font-bold text-foreground mb-3 border-l-4 border-primary pl-3">{g.title}</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {g.items.map((it) => (
                    <Button
                      key={it.value}
                      type="button"
                      onClick={() => changeTab(it.value)}
                      className="relative flex flex-col items-center text-center gap-2 h-auto min-w-0 whitespace-normal rounded-lg border border-border bg-card p-3 sm:p-4 min-h-[9rem] hover:border-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                    >
                      <span className="flex items-center justify-center w-12 h-12 rounded-lg bg-secondary text-primary">
                        <it.icon className="w-7 h-7" aria-hidden="true" />
                      </span>
                      <span className="w-full font-bold text-sm sm:text-base text-foreground leading-snug break-words hyphens-none">{it.label}</span>
                      <span className="w-full text-xs text-muted-foreground leading-snug break-words">{it.desc}</span>
                      {it.value === 'appointments' && aptAlerts > 0 && (
                        <span className="absolute top-2 right-2 rounded-full bg-destructive text-destructive-foreground text-xs font-bold px-2" aria-label={`${aptAlerts} avisos`}>{aptAlerts}</span>
                      )}
                    </Button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="outline" onClick={() => changeTab('home')} className="min-h-11 gap-2">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
            <span className="font-display text-xl font-bold text-foreground">{ADMIN_GROUPS.flatMap((g) => g.items).find((i) => i.value === tab)?.label}</span>
          </div>
        )}

        {/* Sales Tab */}
        <TabsContent value="sales" className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            📊 Painel de Vendas
          </h2>
          <SalesDashboard />
          <WhatsAppContactsList />
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
          <div className="flex flex-wrap justify-between items-center gap-3">
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
              <DialogContent className="product-editor-dialog flex flex-col gap-0 overflow-hidden bg-card p-0" aria-describedby={undefined}>
                <DialogHeader className="shrink-0 border-b border-border px-4 py-5 pr-12 text-left sm:px-6">
                  <DialogTitle>
                    {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                  </DialogTitle>
                </DialogHeader>
                <ProductForm
                  key={editingProduct?.id ?? 'new'}
                  product={editingProduct}
                  onCancel={() => setProductDialogOpen(false)}
                  onSuccess={() => {
                    setProductDialogOpen(false);
                    refetchProducts();
                    queryClient.invalidateQueries({ queryKey: ['products'] });
                    queryClient.invalidateQueries({ queryKey: ['product', editingProduct?.id] });
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
                className="admin-card grid min-w-0 grid-cols-[4rem_minmax(0,1fr)] items-start gap-3 !p-3 sm:grid-cols-[4rem_minmax(0,1fr)_13rem_auto]"
              >
                <img src={product.image_url || '/placeholder.svg'} alt={product.title} onError={(e) => { if (!e.currentTarget.src.endsWith('/placeholder.svg')) e.currentTarget.src = '/placeholder.svg'; }} className="w-16 h-16 object-contain rounded-md" />
                <div className="min-w-0">
                  <h3 title={product.title} className="line-clamp-3 font-semibold text-sm sm:text-base leading-snug break-words text-foreground">{product.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground break-words">{product.category} • Estoque: {product.stock}</p>
                  {product.description && <details className="mt-1 min-w-0 text-sm"><summary className="cursor-pointer font-medium text-muted-foreground">Descrição</summary><p className="mt-2 whitespace-pre-wrap break-words text-foreground">{product.description}</p></details>}
                </div>
                <div className="col-span-2 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2 sm:col-span-1 sm:grid-cols-1">
                  <div className="text-right shrink-0 sm:order-1 sm:text-left">
                    {isPromoActive(product) && <p className="text-sm text-price-old line-through">R$ {Number(product.price).toFixed(2)}</p>}
                    <p className="font-bold text-price whitespace-nowrap">{Number(isPromoActive(product) ? product.promo_price : product.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    {product.cost_price != null && <p className="text-xs text-muted-foreground">Custo: R$ {Number(product.cost_price).toFixed(2)}</p>}
                  </div>
                  <div className="col-start-1 row-start-1 min-w-0 space-y-1 text-xs sm:row-auto sm:order-2">
                    {isPromoActive(product) && <><p className="text-destructive font-semibold">Promoção</p>{product.promo_until && <p className="whitespace-nowrap text-muted-foreground">Promoção até {new Date(product.promo_until).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>}</>}
                    <p className="flex items-center gap-1 text-muted-foreground"><Wrench className="h-3 w-3 shrink-0" /> Instalação: {product.includes_installation ? 'Incluída' : '—'}</p>
                  </div>
                </div>
                <div className="col-span-2 flex gap-2 border-t border-border pt-2 sm:col-span-1 sm:flex-col sm:border-0 sm:pt-0">
                  <Button variant="outline" size="sm" className="min-h-11 gap-2 border-primary font-semibold" onClick={() => handleEditProduct(product)}><Pencil className="w-4 h-4 shrink-0" /> Editar</Button>
                  <Button variant="destructive" size="sm" className="min-h-11" onClick={() => handleDeleteProduct(product.id)}>Excluir</Button>
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
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">Equipe</h2>
            <TeamManagement />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
