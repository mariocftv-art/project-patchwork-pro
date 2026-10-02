import { useQuery } from '@tanstack/react-query';
import { productsApi, Product, categoriesApi } from '@/lib/supabaseApi';
import ProductCard from '@/components/ProductCard';
import PromoBanner from '@/components/PromoBanner';
import ServiceGallery from '@/components/ServiceGallery';
import QuoteCTA from '@/components/QuoteCTA';
import { Link, useSearchParams } from 'react-router-dom';
import { useState } from 'react';

const priceRanges = [
  { id: '0-100', label: 'Até R$ 100', min: 0, max: 100 },
  { id: '100-300', label: 'R$ 100 a R$ 300', min: 100, max: 300 },
  { id: '300-500', label: 'R$ 300 a R$ 500', min: 300, max: 500 },
  { id: '500-1000', label: 'R$ 500 a R$ 1.000', min: 500, max: 1000 },
  { id: '1000+', label: 'Mais de R$ 1.000', min: 1000, max: Infinity },
];

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = searchParams.get('categoria');
  const searchQuery = searchParams.get('busca');
  const [selectedPrice, setSelectedPrice] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'relevance' | 'price-asc' | 'price-desc'>('relevance');
  const setShowMobileFilters = (_: boolean) => {};

  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.list(),
    staleTime: 1000 * 60 * 5,
  });

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
    staleTime: 1000 * 60 * 5,
  });

  const isLoading = isLoadingProducts || isLoadingCategories;

  // Count products per category (oculta categorias vazias)
  const allCategoryCounts = categories.map(cat => ({
    ...cat,
    count: products.filter(p => p.category === cat.slug).length
  }));
  const categoryCounts = allCategoryCounts.filter(c => c.count > 0);

  // Filter products (esgotados por último; serviços de instalação ficam na página Instalações)
  let filteredProducts = (products ?? []).filter((p): p is Product => !!p && typeof p.title === 'string' && p.category !== 'instalacoes').sort((a, b) => Number(a.stock === 0) - Number(b.stock === 0));
  
  if (selectedCategory) {
    filteredProducts = filteredProducts.filter(p => p.category === selectedCategory);
  }
  
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredProducts = filteredProducts.filter(p => 
      (p.title ?? '').toLowerCase().includes(query) || 
      (p.description?.toLowerCase() || '').includes(query) ||
      (p.category?.toLowerCase() || '').includes(query) ||
      (p.subcategory?.toLowerCase() || '').includes(query) ||
      (p.brand?.toLowerCase() || '').includes(query) ||
      (p.model?.toLowerCase() || '').includes(query) ||
      (p.sku?.toLowerCase() || '').includes(query)
    );
  }

  if (selectedPrice) {
    const range = priceRanges.find(r => r.id === selectedPrice);
    if (range) {
      filteredProducts = filteredProducts.filter(p => p.price >= range.min && p.price < range.max);
    }
  }

  const handleCategoryClick = (categoryId: string) => {
    if (selectedCategory === categoryId) {
      searchParams.delete('categoria');
    } else {
      searchParams.set('categoria', categoryId);
    }
    setSearchParams(searchParams);
    setShowMobileFilters(false);
  };

  const clearFilters = () => {
    searchParams.delete('categoria');
    searchParams.delete('busca');
    setSearchParams(searchParams);
    setSelectedPrice(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-ml-blue border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-ml-gray text-sm">Carregando produtos...</p>
        </div>
      </div>
    );
  }

  if (sortBy === 'price-asc') {
    filteredProducts.sort((a, b) => Number(a.stock === 0) - Number(b.stock === 0) || a.price - b.price);
  } else if (sortBy === 'price-desc') {
    filteredProducts.sort((a, b) => Number(a.stock === 0) - Number(b.stock === 0) || b.price - a.price);
  }

  const isHome = !selectedCategory && !searchQuery;

  return (
    <div className="space-y-5">
      {isHome && <PromoBanner />}
      {isHome && <QuoteCTA />}
      {isHome && <ServiceGallery />}
      {isHome && (
        <section className="rounded-xl bg-secondary text-secondary-foreground p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Já tem o equipamento? A gente instala.</h2>
            <p className="text-sm md:text-base opacity-90 mt-1">Serviço Técnico Especializado avulso, com garantia, para quem já comprou as câmeras em outro lugar.</p>
          </div>
          <Link to="/servicos" className="ml-btn-primary inline-flex items-center justify-center min-h-11 px-5 whitespace-nowrap">Ver serviços e preços →</Link>
        </section>
      )}

      <section className="w-full min-w-0">
        {(selectedCategory || searchQuery) && (
          <button onClick={clearFilters} className="mb-2 text-sm font-medium text-foreground hover:underline">
            ← Ver todos os produtos
          </button>
        )}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-semibold text-foreground truncate">
              {searchQuery
                ? `Resultados para "${searchQuery}"`
                : selectedCategory
                  ? categoryCounts.find(c => c.slug === selectedCategory)?.name ?? 'Produtos'
                  : 'Produtos'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'resultado' : 'resultados'}
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
            <span className="hidden sm:inline">Ordenar por</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-card border border-border rounded-md px-3 py-1.5 text-sm text-foreground"
            >
              <option value="relevance">Mais relevantes</option>
              <option value="price-asc">Menor preço</option>
              <option value="price-desc">Maior preço</option>
            </select>
          </label>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg">
            <p className="text-muted-foreground mb-4">Nenhum produto encontrado.</p>
            <button onClick={clearFilters} className="bg-primary text-primary-foreground font-medium px-6 py-2.5 rounded-md text-sm">
              Ver todos os produtos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {isHome && <QuoteCTA />}
    </div>
  );
}
