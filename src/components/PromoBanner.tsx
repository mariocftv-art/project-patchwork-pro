import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const banners = [
  {
    id: 1,
    title: 'Câmeras de Segurança',
    subtitle: 'Até 40% OFF',
    description: 'Monitoramento 24h para sua casa',
    bgColor: 'bg-gradient-to-r from-ml-blue to-blue-600',
    link: '/?categoria=câmeras',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop'
  },
  {
    id: 2,
    title: 'Frete Grátis',
    subtitle: 'Em todos os produtos',
    description: 'Para compras acima de R$ 199',
    bgColor: 'bg-gradient-to-r from-ml-green to-green-600',
    link: '/',
    image: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=400&h=300&fit=crop'
  },
  {
    id: 3,
    title: 'Cercas Elétricas',
    subtitle: 'Instalação Inclusa',
    description: 'Proteção total para seu perímetro',
    bgColor: 'bg-gradient-to-r from-orange-500 to-red-500',
    link: '/?categoria=cercas',
    image: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=400&h=300&fit=crop'
  },
  {
    id: 4,
    title: 'DVR e NVR',
    subtitle: 'Promoção Especial',
    description: 'Grave e monitore de qualquer lugar',
    bgColor: 'bg-gradient-to-r from-purple-600 to-indigo-600',
    link: '/?categoria=dvr',
    image: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=400&h=300&fit=crop'
  }
];

export default function PromoBanner() {
  const [current, setCurrent] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [isAutoPlaying]);

  const goTo = (index: number) => {
    setCurrent(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const prev = () => goTo((current - 1 + banners.length) % banners.length);
  const next = () => goTo((current + 1) % banners.length);

  return (
    <div className="relative w-full mb-6 group">
      {/* Main Banner */}
      <div className="relative overflow-hidden rounded-lg">
        <div 
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {banners.map((banner) => (
            <Link
              key={banner.id}
              to={banner.link}
              className={`flex-shrink-0 w-full ${banner.bgColor} relative overflow-hidden`}
            >
              <div className="flex items-center justify-between px-6 md:px-12 py-8 md:py-12 min-h-[180px] md:min-h-[280px]">
                {/* Text Content */}
                <div className="text-white z-10 max-w-md">
                  <p className="text-sm md:text-base font-medium opacity-90 mb-1">
                    {banner.subtitle}
                  </p>
                  <h2 className="text-2xl md:text-4xl font-bold mb-2">
                    {banner.title}
                  </h2>
                  <p className="text-sm md:text-lg opacity-90">
                    {banner.description}
                  </p>
                  <span className="inline-block mt-4 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium hover:bg-white/30 transition-colors">
                    Ver ofertas →
                  </span>
                </div>

                {/* Image */}
                <div className="hidden md:block absolute right-8 top-1/2 -translate-y-1/2">
                  <img 
                    src={banner.image} 
                    alt={banner.title}
                    className="w-48 h-48 lg:w-56 lg:h-56 object-cover rounded-lg shadow-2xl transform rotate-3 hover:rotate-0 transition-transform"
                  />
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-1/2 w-32 h-32 bg-white/5 rounded-full translate-y-1/2" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prev}
        className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50"
        aria-label="Banner anterior"
      >
        <ChevronLeft className="w-5 h-5 text-ml-gray-dark" />
      </button>
      <button
        onClick={next}
        className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50"
        aria-label="Próximo banner"
      >
        <ChevronRight className="w-5 h-5 text-ml-gray-dark" />
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={() => goTo(index)}
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              index === current 
                ? 'bg-white w-6' 
                : 'bg-white/50 hover:bg-white/75'
            }`}
            aria-label={`Ir para banner ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
