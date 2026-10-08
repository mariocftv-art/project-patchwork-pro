import { useEffect } from 'react';
import { trackVisit } from '@/lib/whatsappContact';
import { useLocation, useNavigationType } from 'react-router-dom';

/** Toda navegação nova abre a página no topo (voltar mantém a posição). */
export default function ScrollToTop() {
  const { pathname, search } = useLocation();
  const type = useNavigationType();
  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    trackVisit(pathname, search);
    if (type !== 'POP') window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, search, type]);
  return null;
}
