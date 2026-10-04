import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBrand, brandLogo } from '@/lib/brand';
import b1w from '@/assets/banners/b1-wide.jpg';
import b1t from '@/assets/banners/b1-tall.jpg';
import b2w from '@/assets/banners/b2-wide.jpg';
import b2t from '@/assets/banners/b2-tall.jpg';
import b3w from '@/assets/banners/b3-wide.jpg';
import b3t from '@/assets/banners/b3-tall.jpg';
import b4w from '@/assets/banners/b4-wide.jpg';
import b4t from '@/assets/banners/b4-tall.jpg';
import b5w from '@/assets/banners/b5-wide.jpg';
import b5t from '@/assets/banners/b5-tall.jpg';

/** Artes antigas do carrossel, guardadas (não apagar). */
export const LEGACY_BANNER_ARTS = [
  'https://jpcwzjqzfyzpcwcbekge.supabase.co/storage/v1/object/public/service-photos/realizado-16-cameras.jpg',
  'https://jpcwzjqzfyzpcwcbekge.supabase.co/storage/v1/object/public/service-photos/realizado-monitoramento-24h.jpg',
];

type Banner = { title: string; sub: string; cta: string; link: string; wide: string; tall: string };

const banners: Banner[] = [
  { title: 'SUA CASA E SEU PATRIMÔNIO MAIS SEGUROS', sub: 'Câmeras, alarmes e monitoramento 24h', cta: 'VER SOLUÇÕES', link: '/?categoria=câmeras', wide: b1w, tall: b1t },
  { title: 'KIT CFTV COMPLETO INSTALADO', sub: 'Equipamento, instalação e 1 ano de garantia', cta: 'VER KITS', link: '/?categoria=dvr', wide: b2w, tall: b2t },
  { title: 'SUAS CÂMERAS NA PALMA DA MÃO', sub: 'Acompanhe tudo ao vivo, de onde estiver', cta: 'SAIBA MAIS', link: '/servicos', wide: b3w, tall: b3t },
  { title: 'PROTEÇÃO QUE COMEÇA NO MURO', sub: 'Cerca elétrica e alarme monitorado', cta: 'VER OPÇÕES', link: '/?categoria=cercas', wide: b4w, tall: b4t },
  { title: 'JÁ TEM O EQUIPAMENTO? A GENTE INSTALA', sub: 'Serviço Técnico Especializado com garantia', cta: 'VER SERVIÇOS', link: '/servicos', wide: b5w, tall: b5t },
];

export default function PromoBanner() {
  const brand = useBrand();
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const n = banners.length;

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setCurrent((p) => (p + 1) % n), 6000);
    return () => clearInterval(t);
  }, [paused, n]);

  const goTo = (i: number) => setCurrent((i + n) % n);

  return (
    <div
      className="keep-light relative w-full mb-4 sm:mb-6 group"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => { setPaused(true); touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        const s = touchX.current;
        if (s !== null) {
          const dx = e.changedTouches[0].clientX - s;
          if (Math.abs(dx) > 40) goTo(current + (dx < 0 ? 1 : -1));
        }
        touchX.current = null;
        window.setTimeout(() => setPaused(false), 8000);
      }}
    >
      <div className="relative overflow-hidden rounded-lg bg-foreground aspect-[4/5] sm:aspect-[3/1]">
        <div className="flex h-full transition-transform duration-500 ease-out" style={{ transform: `translateX(-${current * 100}%)` }}>
          {banners.map((b, i) => (
            <Link key={b.title} to={b.link} aria-label={`${b.title} — ${b.cta}`} className="relative flex-shrink-0 w-full h-full block">
              <picture>
                <source media="(min-width: 640px)" srcSet={b.wide} />
                <img src={b.tall} alt="" loading={i === 0 ? 'eager' : 'lazy'} className="absolute inset-0 w-full h-full object-cover" />
              </picture>
              <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/30 to-transparent sm:bg-gradient-to-r sm:from-black/80 sm:via-black/40 sm:to-transparent" aria-hidden />
              <img src={brandLogo(brand)} alt={brand.name} className="absolute top-3 right-3 sm:top-4 sm:right-5 h-10 sm:h-14 w-auto object-contain drop-shadow" />
              <div className="relative h-full flex flex-col justify-start sm:justify-center px-5 pt-10 sm:pt-0 sm:px-12 md:px-16 max-w-xl">
                <span className="block h-0.5 w-12 bg-primary mb-3" aria-hidden />
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight text-primary" style={{ textShadow: '0 2px 12px rgba(0,0,0,.7)' }}>
                  {b.title}
                </h2>
                <p className="mt-2 sm:mt-3 text-sm sm:text-base md:text-lg text-white/90" style={{ textShadow: '0 1px 8px rgba(0,0,0,.8)' }}>
                  {b.sub}
                </p>
                <span className="mt-4 sm:mt-6 inline-flex w-fit items-center rounded-md bg-primary px-5 py-2.5 text-sm md:text-base font-bold text-primary-foreground shadow-lg">
                  {b.cta} →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <button onClick={() => goTo(current - 1)} aria-label="Banner anterior"
        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 border border-primary/60 text-primary hidden sm:flex items-center justify-center hover:bg-black/70">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button onClick={() => goTo(current + 1)} aria-label="Próximo banner"
        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 border border-primary/60 text-primary hidden sm:flex items-center justify-center hover:bg-black/70">
        <ChevronRight className="w-5 h-5" />
      </button>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
        {banners.map((_, i) => (
          <button key={i} onClick={() => goTo(i)} aria-label={`Ir para banner ${i + 1}`}
            className={`h-2.5 rounded-full transition-all ${i === current ? 'w-7 bg-primary' : 'w-2.5 bg-white/60 hover:bg-white'}`} />
        ))}
      </div>
    </div>
  );
}
