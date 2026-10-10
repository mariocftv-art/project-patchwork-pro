/** Fotos otimizadas terminam em -400/-800/-1600.webp: devolve o srcset para o navegador escolher o tamanho certo. */
const RE = /-(400|800|1600)\.webp(\?.*)?$/;

export function imgSrcSet(url?: string | null): string | undefined {
  if (!url || !RE.test(url)) return undefined;
  return [400, 800, 1600].map((w) => `${url.replace(RE, `-${w}.webp`)} ${w}w`).join(', ');
}

/** Versão de um tamanho específico (ou a própria URL se não for otimizada). */
export function imgAt(url: string | null | undefined, w: 400 | 800 | 1600): string | undefined {
  if (!url) return undefined;
  return RE.test(url) ? url.replace(RE, `-${w}.webp`) : url;
}
