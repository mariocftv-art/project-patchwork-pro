import { getBrand } from '@/lib/brand';

/** Endereços que só funcionam para quem tem login no editor (prévia) ou na máquina local. */
export function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h.startsWith('id-preview--') ||
    h.includes('lovableproject.com') ||
    h === 'lovable.dev' ||
    h.endsWith('.lovable.dev') ||
    h === 'localhost' ||
    h === '127.0.0.1'
  );
}

function clean(url: string): string {
  const v = (url || '').trim().replace(/\/+$/, '');
  if (!v) return '';
  try {
    const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return '';
    if (isPrivateHost(u.hostname)) return '';
    return u.origin;
  } catch {
    return '';
  }
}

/**
 * Endereço público para links enviados a clientes (assinatura, rastreio).
 * Usa o endereço publicado salvo nos Dados da empresa; nunca devolve link de prévia.
 */
export function publicOrigin(configured: string = getBrand().public_site_url, current: string = typeof window !== 'undefined' ? window.location.origin : ''): string {
  const saved = clean(configured);
  if (saved) return saved;
  const here = clean(current);
  return here || current;
}
