import { useQuery } from '@tanstack/react-query';
import { productsApi, Product, categoriesApi } from '@/lib/supabaseApi';
import ProductCard from '@/components/ProductCard';
import PromoBanner from '@/components/PromoBanner';
import ServiceGallery from '@/components/ServiceGallery';
import QuoteCTA from '@/components/QuoteCTA';
import { Link, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { smartSearch, similar } from '@/lib/smartSearch';
import { openWhatsApp } from '@/lib/whatsappContact';

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
  const selectedSub = searchParams.get('sub');
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
  // Subcategorias da categoria aberta (ex.: Cabos e Acessórios → Cabos, Conectores…)
  const subCats = selectedCategory ? categories.filter(c => c.parent_slug === selectedCategory && c.is_active !== false) : [];
  const setSub = (slug: string | null) => {
    if (slug) searchParams.set('sub', slug); else searchParams.delete('sub');
    setSearchParams(searchParams);
  };

  // Filter products (esgotados por último; serviços de instalação ficam na página Instalações)
  let filteredProducts = (products ?? []).filter((p): p is Product => !!p && typeof p.title === 'string' && p.category !== 'instalacoes').sort((a, b) => Number(a.stock === 0) - Number(b.stock === 0));
  
  if (selectedCategory) {
    filteredProducts = filteredProducts.filter(p => p.category === selectedCategory);
    if (selectedSub) filteredProducts = filteredProducts.filter(p => p.subcategory === selectedSub);
  }
  
  const searchBase = filteredProducts;
  const search = searchQuery ? smartSearch(filteredProducts, searchQuery) : null;
  if (search) filteredProducts = search.items;

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
    searchParams.delete('sub');
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

  if (searchQuery && filteredProducts.length === 0) {
    const sugg = similar(searchBase, searchQuery);
    const mainCats = categoryCounts.slice(0, 6);
    return (
      <div className="space-y-6 bg-card rounded-lg p-5 md:p-8">
        <button onClick={clearFilters} className="text-sm font-medium text-foreground hover:underline">← Ver todos os produtos</button>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Não achamos nada para "{searchQuery}"</h1>
        {sugg.length > 0 && (
          <div>
            <h2 className="font-semibold mb-2 text-foreground">Talvez você procure por:</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{sugg.map(p => <ProductCard key={p.id} product={p} />)}</div>
          </div>
        )}
        <div>
          <h2 className="font-semibold mb-2 text-foreground">Ou navegue por categoria:</h2>
          <div className="flex flex-wrap gap-2">{mainCats.map(c => (
            <Link key={c.slug} to={`/?categoria=${encodeURIComponent(c.slug)}`} className="rounded-full border border-border px-4 min-h-10 inline-flex items-center text-sm font-medium text-foreground hover:border-primary">{c.name}</Link>
          ))}</div>
        </div>
        <button type="button" onClick={() => openWhatsApp(`Olá! Procurei por '${searchQuery}' no site e não encontrei. Vocês têm?`, 'busca')} className="ml-btn-primary inline-flex items-center min-h-12 px-5">
          💬 Não achou o que precisa? Fale com a gente no WhatsApp
        </button>
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
            <p className="text-sm md:text-base opacity-90 mt-1">Serviço Técnico Especializado avulso. Equipamentos comprados conosco: <strong className="font-bold bg-primary text-primary-foreground px-1 rounded-sm">1 ANO DE GARANTIA</strong>. Equipamentos comprados em outro lugar: <strong className="font-bold bg-primary text-primary-foreground px-1 rounded-sm">3 MESES</strong> de garantia da instalação.</p>
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
        {search?.corrected && (
          <p className="text-sm text-muted-foreground mb-1">Mostrando resultados para <strong className="text-foreground">{search.corrected}</strong></p>
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

        {subCats.length > 0 && !searchQuery && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3 -mx-1 px-1" role="tablist" aria-label="Subcategorias">
            {[{ slug: null as string | null, name: 'Todos' }, ...subCats.map(c => ({ slug: c.slug as string | null, name: c.name }))].map(c => (
              <button
                key={c.slug ?? 'all'}
                type="button"
                role="tab"
                aria-selected={(selectedSub ?? null) === c.slug}
                onClick={() => setSub(c.slug)}
                className={`shrink-0 rounded-full border px-4 min-h-9 text-sm font-medium transition-colors ${(selectedSub ?? null) === c.slug ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:border-primary'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg">
            <p className="text-muted-foreground mb-4">Nenhum produto encontrado.</p>
            <button onClick={clearFilters} className="bg-primary text-primary-foreground font-medium px-6 py-2.5 rounded-md text-sm">
              Ver todos os produtos
            </button>
          </div>
        ) : subCats.length > 0 && !selectedSub && !searchQuery ? (
          <div className="space-y-6">
            {[...subCats.map(c => ({ key: c.slug, name: c.name, items: filteredProducts.filter(p => p.subcategory === c.slug) })),
              { key: '_outros', name: 'Outros', items: filteredProducts.filter(p => !subCats.some(c => c.slug === p.subcategory)) }]
              .filter(g => g.items.length > 0)
              .map(g => (
                <div key={g.key}>
                  <h2 className="text-base md:text-lg font-semibold text-foreground mb-2 border-l-4 border-primary pl-2">{g.name} <span className="text-sm font-normal text-muted-foreground">({g.items.length})</span></h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                    {g.items.map(product => <ProductCard key={product.id} product={product} />)}
                  </div>
                </div>
              ))}
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
