import { useQuery } from '@tanstack/react-query';
import { productsApi, Product } from '@/lib/supabaseApi';
import ProductCard from '@/components/ProductCard';
import PromoBanner from '@/components/PromoBanner';
import ServiceGallery from '@/components/ServiceGallery';
import { useSearchParams } from 'react-router-dom';
import { Filter, X } from 'lucide-react';
import { useState } from 'react';

const categories = [
  { id: 'câmeras', name: 'Câmeras de Segurança', count: 0 },
  { id: 'dvr', name: 'DVR / NVR', count: 0 },
  { id: 'cercas', name: 'Cercas Elétricas', count: 0 },
  { id: 'automação', name: 'Automação', count: 0 },
  { id: 'proteção', name: 'Proteção', count: 0 },
  { id: 'ofertas', name: 'Ofertas', count: 0 },
  { id: 'instalações em geral', name: 'Instalações em Geral', count: 0 },
];

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
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.list(),
    staleTime: 1000 * 60 * 5,
  });

  // Count products per category
  const categoryCounts = categories.map(cat => ({
    ...cat,
    count: products.filter(p => p.category === cat.id).length
  }));

  // Filter products
  let filteredProducts = products;
  
  if (selectedCategory) {
    filteredProducts = filteredProducts.filter(p => p.category === selectedCategory);
  }
  
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredProducts = filteredProducts.filter(p => 
      p.title.toLowerCase().includes(query) || 
      (p.description?.toLowerCase() || '').includes(query) ||
      (p.category?.toLowerCase() || '').includes(query)
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

  return (
    <div>
      {/* Promo Banner - only show when no filters active */}
      {!selectedCategory && !searchQuery && <PromoBanner />}

      <div className="flex gap-6">
      {/* Mobile Filter Button */}
      <button
        onClick={() => setShowMobileFilters(true)}
        className="lg:hidden fixed bottom-20 left-4 z-40 bg-ml-blue text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2"
      >
        <Filter className="w-4 h-4" />
        Filtros
      </button>

      {/* Sidebar Filters */}
      <aside className={`
        ${showMobileFilters ? 'fixed inset-0 z-50 bg-white' : 'hidden'} 
        lg:block lg:relative lg:bg-transparent lg:z-auto
        w-full lg:w-56 flex-shrink-0
      `}>
        <div className="p-4 lg:p-0">
          {/* Mobile Header */}
          <div className="flex items-center justify-between lg:hidden mb-4 pb-4 border-b">
            <h2 className="font-semibold text-foreground">Filtros</h2>
            <button onClick={() => setShowMobileFilters(false)}>
              <X className="w-6 h-6 text-ml-gray" />
            </button>
          </div>

          {/* Breadcrumb */}
          {(selectedCategory || searchQuery) && (
            <div className="mb-4">
              <button
                onClick={clearFilters}
                className="text-sm text-ml-blue hover:underline flex items-center gap-1"
              >
                ← Voltar para todos
              </button>
            </div>
          )}

          {/* Categories */}
          <div className="mb-6">
            <h3 className="font-semibold text-foreground text-sm mb-3">Categorias</h3>
            <ul className="space-y-1">
              {categoryCounts.map((cat) => (
                <li key={cat.id}>
                  <button
                    onClick={() => handleCategoryClick(cat.id)}
                    className={`w-full text-left ml-filter-item flex justify-between items-center ${
                      selectedCategory === cat.id ? 'ml-filter-item-active' : ''
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span className="text-ml-gray text-xs">({cat.count})</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Price Range */}
          <div className="mb-6">
            <h3 className="font-semibold text-foreground text-sm mb-3">Preço</h3>
            <ul className="space-y-1">
              {priceRanges.map((range) => (
                <li key={range.id}>
                  <button
                    onClick={() => setSelectedPrice(selectedPrice === range.id ? null : range.id)}
                    className={`w-full text-left ml-filter-item ${
                      selectedPrice === range.id ? 'ml-filter-item-active' : ''
                    }`}
                  >
                    {range.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Free Shipping Filter */}
          <div className="mb-6">
            <h3 className="font-semibold text-foreground text-sm mb-3">Envio</h3>
            <label className="flex items-center gap-2 cursor-pointer ml-filter-item">
              <input type="checkbox" className="w-4 h-4 accent-ml-blue" />
              <span>Frete grátis</span>
            </label>
          </div>

          {/* Mobile Apply Button */}
          <button
            onClick={() => setShowMobileFilters(false)}
            className="lg:hidden w-full ml-btn-primary mt-4"
          >
            Aplicar filtros
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Results Header */}
        <div className="mb-4">
          {searchQuery && (
            <h1 className="text-xl font-light text-foreground mb-1">
              Resultados para "{searchQuery}"
            </h1>
          )}
          {selectedCategory && !searchQuery && (
            <h1 className="text-xl font-light text-foreground mb-1">
              {categoryCounts.find(c => c.id === selectedCategory)?.name}
            </h1>
          )}
          <p className="text-sm text-ml-gray">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'resultado' : 'resultados'}
          </p>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-border">
            <p className="text-ml-gray mb-4">Nenhum produto encontrado.</p>
            <button onClick={clearFilters} className="ml-btn-primary text-sm">
              Ver todos os produtos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
      </div>

      {/* Service Gallery - only show on main page without filters */}
      {!selectedCategory && !searchQuery && <ServiceGallery />}
    </div>
  );
}
