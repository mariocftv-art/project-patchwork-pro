import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ScrollToTop from "./components/ScrollToTop";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import AdminGuard from "./components/AdminGuard";

const Privacy = lazy(() => import("./pages/Legal").then((m) => ({ default: m.Privacy })));
const Terms = lazy(() => import("./pages/Legal").then((m) => ({ default: m.Terms })));
const ServicesPortfolio = lazy(() => import("./pages/ServicesPortfolio"));
const Product = lazy(() => import("./pages/Product"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const ServiceDetail = lazy(() => import("./pages/ServiceDetail"));
const ContractLink = lazy(() => import("./pages/ContractLink"));
const Services = lazy(() => import("./pages/Services"));
const TrackOrder = lazy(() => import("./pages/TrackOrder"));
const Admin = lazy(() => import("./pages/Admin"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Agenda = lazy(() => import("./pages/Agenda"));
const MyProfile = lazy(() => import("./pages/MyProfile"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, gcTime: 10 * 60_000, refetchOnWindowFocus: false, retry: 1 } },
});

/** Baixa em segundo plano as páginas mais visitadas, para a troca de página ser instantânea. */
function PrefetchCommon() {
  useEffect(() => {
    const run = () => { import("./pages/Product"); import("./pages/Cart"); import("./pages/Services"); };
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(run); else setTimeout(run, 2000);
  }, []);
  return null;
}

const PageFallback = () => (
  <div className="min-h-[60dvh] flex items-center justify-center" role="status" aria-label="Carregando">
    <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
  </div>
);

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
        <ScrollToTop />
        <PrefetchCommon />
        <Layout>
          <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/produto/:id" element={<Product />} />
            <Route path="/carrinho" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/pedido-confirmado/:orderNumber" element={<OrderConfirmation />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/servicos-realizados" element={<ServicesPortfolio />} />
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
            <Route path="/perfil" element={<MyProfile />} />
            <Route path="/admin/orcamentos/novo" element={<Navigate to="/admin?tab=quotes" replace />} />
            <Route path="/admin/agendamentos" element={<Navigate to="/admin?tab=appointments" replace />} />
            <Route path="/admin" element={<AdminGuard><Admin /></AdminGuard>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
