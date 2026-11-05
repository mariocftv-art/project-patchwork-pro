/** Endereço publicado usado em links enviados a clientes (nunca a prévia do editor). */
const PUBLISHED_FALLBACK = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined) || 'https://mrsegmaxima2026.lovable.app';

/** Hosts que exigem login no editor ou só existem na máquina do dono. */
const PRIVATE_HOST = /(^|\.)id-preview--|lovableproject\.com$|(^|\.)lovable\.dev$|^localhost$|^127\.|^preview--/i;

export function publicOrigin(): string {
  if (typeof window === 'undefined') return PUBLISHED_FALLBACK;
  const h = window.location.hostname;
  return PRIVATE_HOST.test(h) ? PUBLISHED_FALLBACK.replace(/\/$/, '') : window.location.origin;
}
