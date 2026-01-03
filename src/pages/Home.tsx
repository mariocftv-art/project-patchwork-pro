import { useQuery } from '@tanstack/react-query';
import { base44, Product } from '@/api/base44Client';
import ProductCard from '@/components/ProductCard';
import { useSearchParams } from 'react-router-dom';
import { Shield, Truck, CreditCard, Headphones } from 'lucide-react';

const categories = [
  { id: 'câmeras', name: 'Câmeras', icon: '📹' },
  { id: 'dvr', name: 'DVR', icon: '💾' },
  { id: 'cercas', name: 'Cercas', icon: '🔒' },
  { id: 'automação', name: 'Automação', icon: '🏠' },
  { id: 'proteção', name: 'Proteção', icon: '🛡️' },
];

const features = [
  { icon: Shield, title: 'Garantia', desc: '1 ano em todos os produtos' },
  { icon: Truck, title: 'Frete Grátis', desc: 'Acima de R$ 299' },
  { icon: CreditCard, title: 'Parcelamento', desc: 'Em até 12x sem juros' },
  { icon: Headphones, title: 'Suporte', desc: 'Atendimento especializado' },
];

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = searchParams.get('categoria');

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
    staleTime: 1000 * 60 * 5,
  });

  const featuredProducts = products.filter((p) => p.featured);
  
  const filteredProducts = selectedCategory
    ? products.filter((p) => p.category === selectedCategory)
    : products;

  const handleCategoryClick = (categoryId: string) => {
    if (selectedCategory === categoryId) {
      searchParams.delete('categoria');
    } else {
      searchParams.set('categoria', categoryId);
    }
    setSearchParams(searchParams);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando produtos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-security-dark to-security-navy rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1558002038-1055907df827?w=1200')] opacity-10 bg-cover bg-center" />
        <div className="relative p-8 md:p-12 lg:p-16">
          <div className="max-w-2xl">
            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
              Segurança de <span className="text-primary">Máxima</span> Qualidade
            </h1>
            <p className="text-white/80 text-lg mb-6">
              Proteja sua casa, empresa e família com os melhores equipamentos de segurança do mercado.
            </p>
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => handleCategoryClick('câmeras')}
                className="btn-security"
              >
                Ver Câmeras
              </button>
              <button className="btn-security-outline text-white border-white hover:bg-white hover:text-security-dark">
                Fale Conosco
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {features.map((feature) => (
          <div key={feature.title} className="security-card p-4 text-center">
            <feature.icon className="w-8 h-8 text-primary mx-auto mb-2" />
            <h3 className="font-semibold text-foreground">{feature.title}</h3>
            <p className="text-sm text-muted-foreground">{feature.desc}</p>
          </div>
        ))}
      </section>

      {/* Categories */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Categorias
        </h2>
        <div className="flex flex-wrap gap-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={`category-chip ${
                selectedCategory === cat.id ? 'bg-primary text-primary-foreground' : ''
              }`}
            >
              <span className="mr-2">{cat.icon}</span>
              {cat.name}
            </button>
          ))}
          {selectedCategory && (
            <button
              onClick={() => {
                searchParams.delete('categoria');
                setSearchParams(searchParams);
              }}
              className="category-chip text-destructive border-destructive/20"
            >
              ✕ Limpar filtro
            </button>
          )}
        </div>
      </section>

      {/* Featured Products */}
      {!selectedCategory && featuredProducts.length > 0 && (
        <section>
          <h2 className="font-display text-2xl font-bold text-foreground mb-6">
            🔥 Destaques
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* All Products / Filtered Products */}
      <section>
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          {selectedCategory
            ? `${categories.find((c) => c.id === selectedCategory)?.icon} ${selectedCategory.toUpperCase()}`
            : 'Todos os Produtos'}
        </h2>
        
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum produto encontrado nesta categoria.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
