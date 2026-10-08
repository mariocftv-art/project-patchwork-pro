import { useEffect, useRef } from 'react';
import { Camera, X } from 'lucide-react';
import { ServiceGalleryGrid, GalleryQuoteButton, useGallerySettings } from './ServiceGallery';

/** Tela cheia "Nossos Serviços". Fecha no ✕, fora, Esc e no voltar do celular; trava a rolagem do fundo. */
export default function ServicesOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: settings } = useGallerySettings();
  const pushed = useRef(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.history.pushState({ ...(window.history.state || {}), svcOverlay: true }, '');
    pushed.current = true;
    const onPop = () => { pushed.current = false; onClose(); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[data-lightbox]')) close();
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => {
    if (pushed.current) { pushed.current = false; window.history.back(); } // popstate já fecha
    else onClose();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-foreground/70 backdrop-blur-sm flex items-stretch md:items-center justify-center md:p-6" onClick={close}>
      <div role="dialog" aria-modal="true" aria-labelledby="svc-overlay-title" onClick={(e) => e.stopPropagation()}
        className="bg-background w-full md:max-w-6xl md:rounded-xl flex flex-col max-h-full overflow-hidden shadow-2xl">
        <div className="flex items-start justify-between gap-3 px-4 md:px-6 py-4 border-b border-border">
          <div>
            <h2 id="svc-overlay-title" className="font-display text-lg md:text-2xl font-bold text-foreground flex items-center gap-2">
              <Camera className="w-6 h-6 text-primary" /> NOSSOS SERVIÇOS REALIZADOS
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{settings?.subtitle}</p>
          </div>
          <button type="button" onClick={close} aria-label="Fechar" className="p-2 rounded-full hover:bg-secondary text-foreground"><X className="w-6 h-6" /></button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 md:px-6 py-5"><ServiceGalleryGrid /></div>
        <div className="border-t border-border px-4 py-3 flex justify-center"><GalleryQuoteButton /></div>
      </div>
    </div>
  );
}
