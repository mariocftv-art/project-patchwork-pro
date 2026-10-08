import { ReactNode, useState, useEffect } from 'react';
import { useBrand, brandLogo, waLink, waNumber, getBrand, loadBrand } from '@/lib/brand';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, Menu, Search, MapPin, ChevronDown, User, X, Instagram, LogOut, Shield } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useWishlist } from '@/hooks/useWishlist';
import { useAuth } from '@/hooks/useAuth';
import NotificationsPopover from './NotificationsPopover';
import ThemeToggle from './ThemeToggle';
import StaffAgendaShortcut from './StaffAgendaShortcut';
import SearchBox from './SearchBox';
import WhatsAppMenu from './WhatsAppMenu';
import { applyMode } from '@/lib/theme';
import { useQuery } from '@tanstack/react-query';
import { categoriesApi, productsApi } from '@/lib/supabaseApi';
import { CategoryIcon, categoryPath } from '@/lib/categoryIcons';
import InstallAppBanner, { InstallAppButton, useInstallPrompt } from './InstallAppBanner';

import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PAYMENT_METHODS, usePaymentSettings } from '@/lib/paymentSettings';

interface LayoutProps {
  children: ReactNode;
}

interface SiteContent {
  categories: string[];
  contact: {
    phone: string;
    email: string;
    whatsapp: string;
    address: string;
  };
  about: {
    title: string;
    description: string;
  };
  footer: {
    copyright: string;
  };
}

const defaultContent: SiteContent = {
  categories: ['Câmeras', 'DVR', 'Cercas', 'Automação', 'Proteção', 'Instalações', 'Ofertas'],
  contact: {
    phone: '',
    email: '',
    whatsapp: '',
    address: '',
  },
  about: {
    title: '',
    description: '',
  },
  footer: {
    copyright: '',
  },
};

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => { applyMode(location.pathname); }, [location.pathname]);
  const { totalItems: cartCount } = useCart();
  const { data: paySettings } = usePaymentSettings();
  const { totalItems: wishlistCount } = useWishlist();
  const { user, isAdmin, signOut } = useAuth();
  const { canInstall, isIOS, install } = useInstallPrompt();
  const [searchQuery, setSearchQuery] = useState('');
  const [siteContent, setSiteContent] = useState<SiteContent>(defaultContent);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const brand = useBrand();
  const logoMR = brandLogo(brand);
  const shortName = brand.name.replace(/^[^\p{L}\d]*(MR\s+)?/u, '');
  useEffect(() => { loadBrand(); }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  useEffect(() => {
    const saved = localStorage.getItem('mr_site_content');
    if (saved) {
      setSiteContent(JSON.parse(saved));
    }
  }, []);

  // Categorias vêm do painel (aba Categorias)
  const { data: dbCats = [] } = useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.list(), staleTime: 300000 });
  const { data: allProducts = [] } = useQuery({ queryKey: ['products'], queryFn: () => productsApi.list(), staleTime: 300000 });
  const rootCats = dbCats.filter((c) => !c.parent_slug && c.is_active !== false);
  const allCategories = rootCats.map((c) => ({
    name: c.name, slug: c.slug, icon: c.icon, path: categoryPath(c.slug), menu: !!c.show_in_menu,
    count: allProducts.filter((p) => p?.category === c.slug).length,
  }));
  const categories = allCategories.filter((c) => c.menu);
  const portfolioEntry = { name: 'Serviços Realizados', slug: '_portfolio', icon: 'portfolio', path: '/servicos-realizados', menu: true, count: null as number | null };
  const menuEntries = [...allCategories.map((c) => ({ ...c, count: c.slug === 'instalacoes' ? null : c.count as number | null })), portfolioEntry];
  const isActiveCat = (c: { slug: string; path: string }) => {
    const sp = new URLSearchParams(location.search);
    if (c.path.startsWith('/?')) return location.pathname === '/' && sp.get('categoria') === c.slug;
    return location.pathname === c.path;
  };
  const [catOpen, setCatOpen] = useState(false);
  useEffect(() => { setCatOpen(false); }, [location.pathname, location.search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?busca=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Faixa de frete */}
      <div className="keep-light bg-foreground text-primary text-center text-xs sm:text-sm font-medium py-1.5 px-2">
        🚚 <strong>Entrega e instalação combinadas com você</strong> — agendamos data e horário pelo WhatsApp
      </div>

      {/* Header */}
      <header className="keep-light ml-header sticky top-0 z-50">
        {/* Top Header */}
        <div className="container mx-auto px-2 sm:px-4 py-2">
          {/* Desktop Layout */}
          <div className="hidden sm:flex items-center gap-4">
            {/* Logo */}
            <Link to="/" className="flex-shrink-0">
              <div className="flex items-center gap-3">
                <img 
                  src={logoMR} 
                  alt={brand.name} 
                  className="w-20 h-20 object-contain"
                />
                <span className="text-lg font-bold text-ml-dark-gray leading-tight">
                  {shortName}
                </span>
              </div>
            </Link>

            <SearchBox variant="desktop" />

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              <NotificationsPopover />
              <ThemeToggle />

              <Link
                to="/wishlist"
                className="relative p-2 text-ml-dark-gray hover:text-ml-blue transition-colors"
              >
                <Heart className="w-5 h-5" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-ml-blue text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              <StaffAgendaShortcut />

              <Link
                to="/carrinho"
                className="relative p-2 text-ml-dark-gray hover:text-ml-blue transition-colors"
              >
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-ml-blue text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>

              {isAdmin ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-ml-blue">
                      <Shield className="w-5 h-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3" align="end">
                    <div className="space-y-3">
                      <div className="text-xs text-muted-foreground">Logado como:</div>
                      <div className="font-medium text-sm truncate">{user?.email}</div>
                      <hr />
                      <Link to="/admin">
                        <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                          <User className="w-4 h-4" />
                          Painel Admin
                        </Button>
                      </Link>
                      <Link to="/perfil">
                        <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                          <User className="w-4 h-4" />
                          Meu perfil
                        </Button>
                      </Link>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="w-full justify-start gap-2"
                        onClick={handleSignOut}
                      >
                        <LogOut className="w-4 h-4" />
                        Sair
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : user ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-ml-dark-gray hover:text-ml-blue">
                      <User className="w-5 h-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3" align="end">
                    <div className="space-y-3">
                      <div className="text-xs text-muted-foreground">Logado como:</div>
                      <div className="font-medium text-sm truncate">{user?.email}</div>
                      <hr />
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="w-full justify-start gap-2"
                        onClick={handleSignOut}
                      >
                        <LogOut className="w-4 h-4" />
                        Sair
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <Link
                  to="/auth"
                  className="flex items-center gap-1 p-2 text-ml-dark-gray hover:text-ml-blue transition-colors text-sm"
                >
                  <User className="w-5 h-5" />
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Layout - Stacked */}
          <div className="sm:hidden">
            {/* Top row: Logo + Actions */}
            <div className="flex items-center justify-between py-1">
              <Link to="/" className="flex-shrink-0">
                <div className="flex items-center gap-1.5">
                  <img 
                    src={logoMR} 
                    alt={brand.name} 
                    className="w-9 h-9 object-contain"
                  />
                  <span className="text-xs font-bold text-ml-dark-gray leading-none">
                    {shortName}
                  </span>
                </div>
              </Link>

              <div className="flex items-center">
                <NotificationsPopover />
                <ThemeToggle />

                <Link
                  to="/wishlist"
                  className="relative p-2 text-ml-dark-gray hover:text-ml-blue transition-colors"
                >
                  <Heart className="w-5 h-5" />
                  {wishlistCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-ml-blue text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {wishlistCount}
                    </span>
                  )}
                </Link>

                <StaffAgendaShortcut />

                <Link
                  to="/carrinho"
                  className="relative p-2 text-ml-dark-gray hover:text-ml-blue transition-colors"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {cartCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-ml-blue text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </Link>

                <Sheet>
                  <SheetTrigger asChild>
                    <button className="p-2 text-ml-dark-gray">
                      <Menu className="w-5 h-5" />
                    </button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-72 bg-card p-0">
                    <div className="p-4 border-b border-border">
                      <p className="font-semibold text-foreground">Menu</p>
                    </div>
                    <nav className="p-4 space-y-1">
                      {/* Botão Instalar App */}
                      <div className="pb-3 border-b border-border mb-3">
                        <InstallAppButton className="w-full" />
                      </div>
                      
                      {isAdmin ? (
                        <>
                          <div className="px-2 py-2 text-xs text-muted-foreground">
                            Logado: {user?.email}
                          </div>
                          <Link
                            to="/admin"
                            className="block py-3 px-2 text-foreground hover:bg-secondary rounded transition-colors"
                          >
                            Painel Admin
                          </Link>
                          <button
                            onClick={handleSignOut}
                            className="w-full text-left py-3 px-2 text-destructive hover:bg-secondary rounded transition-colors"
                          >
                            Sair
                          </button>
                        </>
                      ) : user ? (
                        <>
                          <div className="px-2 py-2 text-xs text-muted-foreground">
                            Logado: {user?.email}
                          </div>
                          <button
                            onClick={handleSignOut}
                            className="w-full text-left py-3 px-2 text-destructive hover:bg-secondary rounded transition-colors"
                          >
                            Sair
                          </button>
                        </>
                      ) : (
                        <Link
                          to="/auth"
                          className="block py-3 px-2 text-foreground hover:bg-secondary rounded transition-colors"
                        >
                          Entrar
                        </Link>
                      )}
                    </nav>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            <SearchBox variant="mobile" />
          </div>
        </div>

        {/* Categories Bar — celular: menu vertical que abre; computador: barra */}
        <div className="bg-foreground border-b border-primary relative">
          <div className="md:hidden px-4 py-2">
            <button
              type="button"
              onClick={() => setCatOpen((o) => !o)}
              aria-expanded={catOpen}
              className="w-full flex items-center justify-between gap-2 rounded-md border border-background/30 px-3 min-h-11 text-sm font-semibold text-background"
            >
              <span className="flex items-center gap-2"><Menu className="w-4 h-4" />Categorias</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${catOpen ? 'rotate-180' : ''}`} />
            </button>
            {catOpen && (
              <nav aria-label="Categorias" className="mt-2 rounded-md bg-card border border-border py-1">
                {menuEntries.map((cat) => {
                  const active = isActiveCat(cat);
                  return (
                    <Link key={cat.slug} to={cat.path} onClick={() => setCatOpen(false)} aria-current={active ? 'page' : undefined}
                      className={`flex items-center gap-3 px-4 min-h-12 text-sm ${active ? 'bg-primary text-primary-foreground font-semibold' : 'text-foreground hover:bg-secondary'}`}>
                      <CategoryIcon name={cat.icon} className="w-5 h-5 shrink-0" />
                      <span className="flex-1">{cat.name}</span>
                      {cat.count != null && <span className="text-xs opacity-75">({cat.count})</span>}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>
          <div className="hidden md:flex container mx-auto px-4 items-center gap-6">
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setCatOpen((o) => !o)}
                aria-expanded={catOpen}
                aria-label="Ver todas as categorias"
                className="flex items-center gap-1 py-2 text-sm text-background hover:text-primary whitespace-nowrap"
              >
                <Menu className="w-4 h-4" />
                <span>Categorias</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {catOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setCatOpen(false)} aria-hidden />
                  <div className="absolute left-0 top-full z-50 w-72 rounded-b-md border border-border bg-card py-2 shadow-lg">
                    {menuEntries.map((cat) => (
                      <Link key={cat.slug} to={cat.path} onClick={() => setCatOpen(false)} className={`flex items-center gap-3 px-4 py-2.5 text-sm ${isActiveCat(cat) ? 'bg-primary text-primary-foreground font-semibold' : 'text-foreground hover:bg-secondary'}`}>
                        <CategoryIcon name={cat.icon} className="w-4 h-4 shrink-0" />
                        <span className="flex-1">{cat.name}</span>
                        {cat.count != null && <span className="text-xs opacity-75">{cat.count}</span>}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
            <nav className="flex flex-wrap items-center gap-x-6 py-2 min-w-0">
              {[...categories, portfolioEntry].map((cat) => (
                <Link key={cat.slug} to={cat.path}
                  className={`text-sm whitespace-nowrap transition-colors ${isActiveCat(cat) ? 'text-primary font-semibold' : 'text-background hover:text-primary'}`}>
                  {cat.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4">
        {children}
      </main>

      {/* Footer */}
      <footer className="keep-light bg-foreground text-background mt-8 border-t-4 border-primary">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-semibold mb-3 text-sm text-primary">Empresa</h4>
              <ul className="space-y-2 text-sm">
                <li className="font-semibold">{brand.name}</li>
                {brand.cnpj && <li>CNPJ: {brand.cnpj}</li>}
                <li><Link to="/servicos" className="underline-offset-2 hover:underline">Serviços</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm text-primary">Ajuda</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/rastrear-pedido" className="hover:underline">Rastrear pedido</Link></li>
                <li><Link to="/privacidade" className="hover:underline">Política de Privacidade</Link></li>
                <li><Link to="/termos" className="hover:underline">Termos de Uso</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm text-primary">Pagamento</h4>
              <ul className="space-y-2 text-sm">
                {PAYMENT_METHODS.filter((m) => (paySettings?.methods ?? ['credit_card', 'pix']).includes(m.key)).map((m) => (
                  <li key={m.key}>{m.emoji} {m.label}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm text-primary">Contato</h4>
              <ul className="space-y-2 text-sm">
                {(siteContent.contact.phone || brand.phone) && <li>📞 {siteContent.contact.phone || brand.phone}</li>}
                {(siteContent.contact.email || brand.email) && <li className="break-all">📧 {siteContent.contact.email || brand.email}</li>}
                {siteContent.contact.address && (
                  <li>📍 {siteContent.contact.address}</li>
                )}
                {brand.instagram && (
                <li>
                  <a href={`https://instagram.com/${brand.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:underline">
                    <Instagram className="w-4 h-4" /> {brand.instagram}
                  </a>
                </li>
                )}
              </ul>
            </div>
          </div>
          <div className="border-t border-background/20 mt-8 pt-6 text-center text-xs">
            {`© 2011–${new Date().getFullYear()} ${brand.name.replace(/^[^\p{L}\d]+/u, '')}. Todos os direitos reservados.`}
          </div>
        </div>
      </footer>

      <WhatsAppMenu />

      {/* Floating Install App Button - Mobile Only */}
      {canInstall && (
        <>
          <button
            onClick={() => isIOS ? setShowIOSModal(true) : install()}
            className="sm:hidden fixed bottom-20 right-3 z-50 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-full shadow-lg hover:scale-105 transition-transform animate-pulse"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="text-sm font-semibold">Instalar</span>
          </button>

          {/* iOS Instructions Modal */}
          {showIOSModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowIOSModal(false)}>
              <div className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="text-center mb-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Instalar App</h3>
                  <p className="text-sm text-muted-foreground mt-1">Siga os passos abaixo:</p>
                </div>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                    <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">1</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Toque no botão Compartilhar</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M16 5l-1.42 1.42-1.59-1.59V16h-2V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V10c0-1.1.9-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .9 2 2z"/>
                        </svg>
                        <span>(ícone na barra do Safari)</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                    <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">2</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Adicionar à Tela Inicial</p>
                      <p className="text-xs text-muted-foreground mt-1">Role para baixo e toque na opção</p>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowIOSModal(false)}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                >
                  Entendi
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Install App Banner */}
      <InstallAppBanner />
    </div>
  );
}
