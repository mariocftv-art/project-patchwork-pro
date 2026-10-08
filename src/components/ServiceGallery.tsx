import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { servicePhotosApi } from '@/lib/servicePhotosApi';
import { Camera, X, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useBrand, waLink } from '@/lib/brand';

export function useServicePhotos() {
  return useQuery({ queryKey: ['service-photos', 'active'], queryFn: () => servicePhotosApi.listActive(), staleTime: 60000 });
}
export function useGallerySettings() {
  return useQuery({ queryKey: ['gallery-settings'], queryFn: () => servicePhotosApi.getSettings(), staleTime: 300000 });
}

/** Grade de fotos + ampliação com setas. Usada na tela por cima e na página /servicos-realizados. */
export function ServiceGalleryGrid() {
  const brand = useBrand();
  const { data: photos = [], isLoading } = useServicePhotos();
  const [idx, setIdx] = useState<number | null>(null);
  const open = idx != null ? photos[idx] : null;

  useEffect(() => {
    if (idx == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIdx(null);
      if (e.key === 'ArrowRight') setIdx((i) => (i == null ? i : (i + 1) % photos.length));
      if (e.key === 'ArrowLeft') setIdx((i) => (i == null ? i : (i - 1 + photos.length) % photos.length));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [idx, photos.length]);

  if (isLoading) return <p className="text-center text-muted-foreground py-12">Carregando fotos…</p>;
  if (photos.length === 0) return <p className="text-center text-muted-foreground py-12">Em breve, fotos dos nossos trabalhos.</p>;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {photos.map((photo, i) => (
          <div key={photo.id} className="bg-card rounded-lg overflow-hidden border border-border shadow-sm flex flex-col">
            <button type="button" onClick={() => setIdx(i)} aria-label={`Ampliar foto: ${photo.title}`} className="aspect-[4/3] w-full overflow-hidden bg-muted group">
              <img loading="lazy" decoding="async" src={photo.image_url} alt={photo.title}
                className="block w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            </button>
            <div className="p-4 flex flex-col gap-2 flex-1">
              <h3 className="font-semibold text-foreground text-sm">{photo.title}</h3>
              {photo.description && <p className="text-muted-foreground text-xs">{photo.description}</p>}
              <a href={waLink(`Olá! Vi o serviço "${photo.title}" no site e quero algo assim. Pode me passar um orçamento?`, brand)}
                target="_blank" rel="noopener noreferrer"
                className="self-start mt-auto inline-flex items-center gap-1.5 rounded-md bg-primary px-3 min-h-10 text-xs font-semibold text-primary-foreground hover:opacity-90">
                <MessageCircle className="w-4 h-4" /> Quero algo assim
              </a>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <div data-lightbox role="dialog" aria-modal="true" aria-label={open.title}
          className="fixed inset-0 z-[110] bg-foreground/95 flex flex-col items-center justify-center p-4" onClick={() => setIdx(null)}>
          <button type="button" aria-label="Fechar foto" onClick={() => setIdx(null)}
            className="absolute top-3 right-3 p-2 rounded-full bg-background/15 text-background hover:bg-background/25"><X className="w-6 h-6" /></button>
          {photos.length > 1 && (
            <>
              <button type="button" aria-label="Foto anterior" onClick={(e) => { e.stopPropagation(); setIdx((idx! - 1 + photos.length) % photos.length); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/15 text-background hover:bg-background/25"><ChevronLeft className="w-7 h-7" /></button>
              <button type="button" aria-label="Próxima foto" onClick={(e) => { e.stopPropagation(); setIdx((idx! + 1) % photos.length); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/15 text-background hover:bg-background/25"><ChevronRight className="w-7 h-7" /></button>
            </>
          )}
          <img src={open.image_url} alt={open.title} onClick={(e) => e.stopPropagation()} className="max-w-full max-h-[72vh] object-contain rounded-lg" />
          <div className="mt-3 text-center text-background max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="font-semibold">{open.title}</p>
            {open.description && <p className="text-sm opacity-80 mt-1">{open.description}</p>}
            <p className="text-xs opacity-60 mt-1">{idx! + 1} de {photos.length}</p>
          </div>
        </div>
      )}
    </>
  );
}

export function GalleryQuoteButton() {
  const brand = useBrand();
  return (
    <a href={waLink('Olá! Vi os serviços realizados no site e gostaria de solicitar um orçamento.', brand)} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 min-h-12 font-bold text-primary-foreground hover:opacity-90">
      <MessageCircle className="w-5 h-5" /> SOLICITAR ORÇAMENTO
    </a>
  );
}

/** Página /servicos-realizados. */
export default function ServiceGallery() {
  const { data: settings } = useGallerySettings();
  return (
    <section className="py-8 md:py-12">
      <div className="text-center mb-6">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground flex items-center justify-center gap-2">
          <Camera className="w-7 h-7 text-primary" /> Nossos Serviços Realizados
        </h1>
        <p className="text-muted-foreground mt-2">{settings?.subtitle}</p>
      </div>
      <ServiceGalleryGrid />
      <div className="text-center mt-8"><GalleryQuoteButton /></div>
    </section>
  );
}
