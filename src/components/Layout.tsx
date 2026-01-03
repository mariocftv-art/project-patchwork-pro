import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, Menu, Search, MapPin, ChevronDown, User, X, Instagram } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useWishlist } from '@/hooks/useWishlist';
import NotificationsPopover from './NotificationsPopover';
import SalesChat from './SalesChat';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import logoMR from '@/assets/logo-mr-transparent.png';

interface LayoutProps {
  children: ReactNode;
}

const categories = [
  { name: 'Câmeras', path: '/?categoria=câmeras' },
  { name: 'DVR', path: '/?categoria=dvr' },
  { name: 'Cercas', path: '/?categoria=cercas' },
  { name: 'Automação', path: '/?categoria=automação' },
  { name: 'Proteção', path: '/?categoria=proteção' },
  { name: 'Ofertas', path: '/?ofertas=true' },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { totalItems: cartCount } = useCart();
  const { totalItems: wishlistCount } = useWishlist();
  const [searchQuery, setSearchQuery] = useState('');

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
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <Link to="/" className="flex-shrink-0">
              <div className="flex flex-col items-center text-center">
                <div className="flex items-center gap-2">
                  <img 
                    src={logoMR} 
                    alt="MR Segurança Máxima" 
                    className="w-12 h-12 object-contain"
                  />
                  <span className="text-sm font-bold text-ml-dark-gray">
                    Segurança Máxima
                  </span>
                </div>
                <span className="text-[10px] text-ml-gray">
                  CNPJ: 45.858.215/0001-86
                </span>
              </div>
            </Link>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex-1 max-w-xs">
              <div className="relative ml-search flex items-center">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar produtos..."
                  className="w-full px-4 py-2.5 pr-12 text-sm rounded-sm outline-none"
                />
                <button
                  type="submit"
                  className="absolute right-0 top-0 bottom-0 px-4 text-ml-gray hover:text-ml-dark-gray border-l border-border"
                >
                  <Search className="w-5 h-5" />
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

              <Link
                to="/admin"
                className="hidden sm:flex items-center gap-1 p-2 text-ml-dark-gray hover:text-ml-blue transition-colors text-sm"
              >
                <User className="w-5 h-5" />
              </Link>

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
                    <Link
                      to="/admin"
                      className="block py-3 px-2 text-foreground hover:bg-secondary rounded transition-colors"
                    >
                      Minha Conta
                    </Link>
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
                <li>📞 (11) 99999-9999</li>
                <li>📧 contato@mrseguranca.com</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-6 text-center text-xs text-ml-gray">
            © 2024 MR Segurança. Todos os direitos reservados.
          </div>
        </div>
      </footer>

      {/* Instagram Button */}
      <a
        href="https://instagram.com/rogeriocftv"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 text-white px-4 py-3 rounded-full shadow-lg hover:scale-105 transition-transform"
      >
        <Instagram className="w-5 h-5" />
        <span className="text-sm font-medium">Seguir a página</span>
      </a>

      {/* Sales Chat */}
      <SalesChat />
    </div>
  );
}
