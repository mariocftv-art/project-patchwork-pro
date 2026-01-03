import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Heart, Menu, Shield, Settings } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useWishlist } from '@/hooks/useWishlist';
import NotificationsPopover from './NotificationsPopover';
import SalesChat from './SalesChat';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface LayoutProps {
  children: ReactNode;
}

const navLinks = [
  { name: 'Início', path: '/' },
  { name: 'Câmeras', path: '/?categoria=câmeras' },
  { name: 'DVR', path: '/?categoria=dvr' },
  { name: 'Cercas', path: '/?categoria=cercas' },
  { name: 'Automação', path: '/?categoria=automação' },
  { name: 'Proteção', path: '/?categoria=proteção' },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { totalItems: cartCount } = useCart();
  const { totalItems: wishlistCount } = useWishlist();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <span className="font-display font-bold text-lg text-foreground">
                  MR Segurança
                </span>
                <span className="block text-xs text-muted-foreground -mt-1">
                  Máxima Proteção
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`nav-link text-sm ${
                    location.pathname === link.path ? 'text-primary' : ''
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <NotificationsPopover />

              <Link
                to="/wishlist"
                className="relative p-2 text-foreground/70 hover:text-primary transition-colors"
              >
                <Heart className="w-5 h-5" />
                {wishlistCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs"
                  >
                    {wishlistCount}
                  </Badge>
                )}
              </Link>

              <Link
                to="/carrinho"
                className="relative p-2 text-foreground/70 hover:text-primary transition-colors"
              >
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <Badge
                    className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs bg-primary"
                  >
                    {cartCount}
                  </Badge>
                )}
              </Link>

              <Link
                to="/admin"
                className="p-2 text-foreground/70 hover:text-primary transition-colors"
              >
                <Settings className="w-5 h-5" />
              </Link>

              {/* Mobile Menu */}
              <Sheet>
                <SheetTrigger asChild>
                  <button className="lg:hidden p-2 text-foreground/70 hover:text-primary transition-colors">
                    <Menu className="w-5 h-5" />
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 bg-card">
                  <nav className="flex flex-col gap-4 mt-8">
                    {navLinks.map((link) => (
                      <Link
                        key={link.path}
                        to={link.path}
                        className={`text-lg font-medium py-2 border-b border-border ${
                          location.pathname === link.path
                            ? 'text-primary'
                            : 'text-foreground'
                        }`}
                      >
                        {link.name}
                      </Link>
                    ))}
                    <Link
                      to="/admin"
                      className="text-lg font-medium py-2 border-b border-border text-foreground"
                    >
                      Administração
                    </Link>
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-security-dark text-white mt-16">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="font-display font-bold text-lg">MR Segurança</span>
              </div>
              <p className="text-white/70 text-sm">
                Sua segurança é nossa prioridade. Equipamentos de alta qualidade para proteger o que importa.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Categorias</h4>
              <ul className="space-y-2 text-sm text-white/70">
                <li><Link to="/?categoria=câmeras" className="hover:text-white">Câmeras</Link></li>
                <li><Link to="/?categoria=dvr" className="hover:text-white">DVR</Link></li>
                <li><Link to="/?categoria=cercas" className="hover:text-white">Cercas</Link></li>
                <li><Link to="/?categoria=automação" className="hover:text-white">Automação</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Atendimento</h4>
              <ul className="space-y-2 text-sm text-white/70">
                <li>📞 (11) 99999-9999</li>
                <li>📧 contato@mrseguranca.com</li>
                <li>🕐 Seg-Sex: 8h às 18h</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Pagamento</h4>
              <ul className="space-y-2 text-sm text-white/70">
                <li>💳 Cartão de Crédito</li>
                <li>📱 PIX</li>
                <li>📄 Boleto Bancário</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/10 mt-8 pt-8 text-center text-sm text-white/50">
            © 2024 MR Segurança Máxima. Todos os direitos reservados.
          </div>
        </div>
      </footer>

      {/* Sales Chat */}
      <SalesChat />
    </div>
  );
}
