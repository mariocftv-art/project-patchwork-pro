import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, Menu, Search, MapPin, ChevronDown, User, X, Instagram, LogOut, Shield } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useWishlist } from '@/hooks/useWishlist';
import { useAuth } from '@/hooks/useAuth';
import NotificationsPopover from './NotificationsPopover';

import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import logoMR from '@/assets/logo-mr-transparent.png';

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
  categories: ['Câmeras', 'DVR', 'Cercas', 'Automação', 'Proteção', 'Ofertas'],
  contact: {
    phone: '(11) 96257-9428',
    email: 'contato@mrseguranca.com',
    whatsapp: '5511962579428',
    address: '',
  },
  about: {
    title: 'MR Segurança Máxima',
    description: '',
  },
  footer: {
    copyright: '© 2024 MR Segurança. Todos os direitos reservados.',
  },
};

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { totalItems: cartCount } = useCart();
  const { totalItems: wishlistCount } = useWishlist();
  const { user, isAdmin, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [siteContent, setSiteContent] = useState<SiteContent>(defaultContent);

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

  const categories = siteContent.categories.map(cat => ({
    name: cat,
    path: cat.toLowerCase() === 'ofertas' ? '/?ofertas=true' : `/?categoria=${cat.toLowerCase()}`,
  }));

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?busca=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="ml-header sticky top-0 z-50">
        {/* Top Header */}
        <div className="container mx-auto px-2 sm:px-4 py-2">
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Logo */}
            <Link to="/" className="flex-shrink-0">
              <div className="flex flex-col items-center text-center">
                <div className="flex items-center gap-1 sm:gap-2">
                  <img 
                    src={logoMR} 
                    alt="MR Segurança Máxima" 
                    className="w-8 h-8 sm:w-12 sm:h-12 object-contain"
                  />
                  <span className="text-xs sm:text-sm font-bold text-ml-dark-gray hidden xs:inline">
                    Segurança Máxima
                  </span>
                </div>
                <span className="text-[8px] sm:text-[10px] text-ml-gray hidden sm:block">
                  CNPJ: 45.858.215/0001-86
                </span>
              </div>
            </Link>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex-1 min-w-0 max-w-xs sm:max-w-md">
              <div className="relative ml-search flex items-center">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full px-2 sm:px-4 py-2 sm:py-2.5 pr-10 sm:pr-12 text-sm rounded-sm outline-none"
                />
                <button
                  type="submit"
                  className="absolute right-0 top-0 bottom-0 px-2 sm:px-4 text-ml-gray hover:text-ml-dark-gray border-l border-border"
                >
                  <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </form>

            {/* Right Actions */}
            <div className="flex items-center gap-1 sm:gap-3">
              <NotificationsPopover />

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
                    <Button variant="ghost" size="icon" className="hidden sm:flex text-ml-blue">
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
                    <Button variant="ghost" size="icon" className="hidden sm:flex text-ml-dark-gray hover:text-ml-blue">
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
                  className="hidden sm:flex items-center gap-1 p-2 text-ml-dark-gray hover:text-ml-blue transition-colors text-sm"
                >
                  <User className="w-5 h-5" />
                </Link>
              )}

              {/* Motivational Message */}
              <div className="hidden xl:flex max-w-md pl-4 border-l border-border ml-2">
                <p className="text-xs text-ml-gray italic leading-relaxed">
                  "No Brasil de hoje, esperar não é opção. Ou você se protege, ou fica vulnerável. Com Deus à frente e a força da tecnologia, a MR Segurança Máxima protege sua família, seu patrimônio e sua tranquilidade."
                </p>
              </div>

              {/* Mobile Menu */}
              <Sheet>
                <SheetTrigger asChild>
                  <button className="sm:hidden p-2 text-ml-dark-gray">
                    <Menu className="w-5 h-5" />
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 bg-white p-0">
                  <div className="p-4 border-b border-border">
                    <p className="font-semibold text-foreground">Menu</p>
                  </div>
                  <nav className="p-4 space-y-1">
                    {categories.map((cat) => (
                      <Link
                        key={cat.path}
                        to={cat.path}
                        className="block py-3 px-2 text-foreground hover:bg-secondary rounded transition-colors"
                      >
                        {cat.name}
                      </Link>
                    ))}
                    <hr className="my-3" />
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
        </div>

        {/* Categories Bar */}
        <div className="bg-white border-b border-border">
          <div className="container mx-auto px-4">
            <nav className="flex items-center gap-6 py-2 overflow-x-auto scrollbar-hide">
              <Link
                to="/"
                className="flex items-center gap-1 text-sm text-ml-gray hover:text-ml-blue whitespace-nowrap"
              >
                <Menu className="w-4 h-4" />
                Categorias
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.path}
                  to={cat.path}
                  className="text-sm text-ml-gray hover:text-ml-blue whitespace-nowrap transition-colors"
                >
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
      <footer className="bg-white border-t border-border mt-8">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-semibold text-foreground mb-3 text-sm">Sobre</h4>
              <ul className="space-y-2 text-sm text-ml-gray">
                <li><a href="#" className="hover:text-ml-blue">Quem somos</a></li>
                <li><a href="#" className="hover:text-ml-blue">Trabalhe conosco</a></li>
                <li><a href="#" className="hover:text-ml-blue">Termos de uso</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3 text-sm">Ajuda</h4>
              <ul className="space-y-2 text-sm text-ml-gray">
                <li><a href="#" className="hover:text-ml-blue">Central de ajuda</a></li>
                <li><a href="#" className="hover:text-ml-blue">Como comprar</a></li>
                <li><a href="#" className="hover:text-ml-blue">Garantias</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3 text-sm">Pagamento</h4>
              <ul className="space-y-2 text-sm text-ml-gray">
                <li>💳 Cartão de Crédito</li>
                <li>📱 PIX</li>
                <li>📄 Boleto</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3 text-sm">Contato</h4>
              <ul className="space-y-2 text-sm text-ml-gray">
                <li>📞 {siteContent.contact.phone}</li>
                <li>📧 {siteContent.contact.email}</li>
                {siteContent.contact.address && (
                  <li>📍 {siteContent.contact.address}</li>
                )}
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-6 text-center text-xs text-ml-gray">
            {siteContent.footer.copyright}
          </div>
        </div>
      </footer>

      {/* Instagram Button */}
      <a
        href="https://instagram.com/rogeriocftv"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-20 left-3 sm:left-6 z-50 flex items-center gap-2 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-full shadow-lg hover:scale-105 transition-transform"
      >
        <Instagram className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="text-xs sm:text-sm font-medium hidden sm:inline">Seguir a página</span>
      </a>

      {/* WhatsApp Button */}
      <a
        href="https://wa.me/5511962579428?text=Olá! Gostaria de mais informações sobre os produtos."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 left-3 sm:left-6 z-50 flex items-center gap-2 bg-green-500 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-full shadow-lg hover:bg-green-600 hover:scale-105 transition-all"
      >
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        <span className="text-xs sm:text-sm font-medium hidden sm:inline">WhatsApp</span>
      </a>

    </div>
  );
}
