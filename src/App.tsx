import { Privacy, Terms } from "./pages/Legal";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Product from "./pages/Product";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import Wishlist from "./pages/Wishlist";
import ServiceDetail from "./pages/ServiceDetail";
import ContractLink from "./pages/ContractLink";
import Services from "./pages/Services";
import TrackOrder from "./pages/TrackOrder";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import AdminGuard from "./components/AdminGuard";
import NotFound from "./pages/NotFound";
import Agenda from "./pages/Agenda";

const queryClient = new QueryClient();

// Endereços antigos de categoria levam para a categoria nova
const LEGACY_CATS: Record<string, string> = {
  cameras: "câmeras", "cameras-de-seguranca": "câmeras", "dvr-nvr": "dvr", "cercas-eletricas": "cercas",
  automacao: "automação", "interfones-e-porteiros": "interfones", "cabos-e-acessorios": "cabos",
  conectores: "cabos", fontes: "cabos", "protecao": "cabos",
};
function LegacyCategory() {
  const { slug = "" } = useParams();
  const s = decodeURIComponent(slug).toLowerCase();
  const target = LEGACY_CATS[s] ?? s;
  if (target === "instalacoes" || target === "instalações") return <Navigate to="/servicos" replace />;
  return <Navigate to={`/?categoria=${encodeURIComponent(target)}`} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/produto/:id" element={<Product />} />
            <Route path="/carrinho" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/pedido-confirmado/:orderNumber" element={<OrderConfirmation />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/servicos" element={<Services />} />
            <Route path="/servicos/:id" element={<ServiceDetail />} />
            <Route path="/contrato/:token" element={<ContractLink />} />
            <Route path="/assinar/:token" element={<ContractLink />} />
            <Route path="/rastrear-pedido" element={<TrackOrder />} />
            <Route path="/privacidade" element={<Privacy />} />
            <Route path="/termos" element={<Terms />} />
            <Route path="/categoria/:slug" element={<LegacyCategory />} />
            <Route path="/categorias/:slug" element={<LegacyCategory />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/admin" element={<AdminGuard><Admin /></AdminGuard>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
