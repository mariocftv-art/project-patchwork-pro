/**
 * Carrega imagens para o PDF como dataURL persistente (nunca blob temporário).
 * 1) tenta direto com CORS; 2) se o site da imagem bloquear, passa pelo proxy seguro do backend.
 * Reduz o tamanho para não pesar o PDF. Falha => null (o PDF usa o ícone neutro da categoria).
 */
const cache = new Map<string, Promise<string | null>>();

function toDataUrl(img: HTMLImageElement, maxPx?: number) {
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  if (!w || !h) throw new Error('imagem vazia');
  if (maxPx && Math.max(w, h) > maxPx) {
    const k = maxPx / Math.max(w, h);
    w = Math.round(w * k);
    h = Math.round(h * k);
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas indisponível');
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/png');
}

function loadImg(src: string, timeoutMs = 12000) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const t = setTimeout(() => reject(new Error('tempo esgotado')), timeoutMs);
    img.onload = () => {
      clearTimeout(t);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(t);
      reject(new Error('falha ao carregar'));
    };
    img.src = src;
  });
}

async function viaProxy(src: string, maxPx?: number) {
  const base = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const res = await fetch(`${base}/functions/v1/image-proxy?url=${encodeURIComponent(src)}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`proxy ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  try {
    return toDataUrl(await loadImg(url), maxPx);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function loadDocImage(src: string, maxPx?: number): Promise<string | null> {
  const key = `${src}|${maxPx || 0}`;
  if (!cache.has(key)) {
    const p = (async () => {
      if (src.startsWith('data:')) return src;
      try {
        return toDataUrl(await loadImg(src), maxPx);
      } catch {
        if (!/^https?:\/\//i.test(src)) return null;
        try {
          return await viaProxy(src, maxPx);
        } catch {
          return null;
        }
      }
    })();
    cache.set(key, p);
    p.then((v) => v === null && cache.delete(key));
  }
  return cache.get(key)!;
}
