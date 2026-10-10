import { supabase } from '@/integrations/supabase/client';

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const MAX_PX = 1600;

/** Valida tipo e tamanho; devolve mensagem de erro em português ou null. */
export function validateImage(f: File): string | null {
  if (!IMAGE_TYPES.includes(f.type)) return 'Formato não aceito. Envie uma foto JPG, PNG ou WebP.';
  if (f.size > IMAGE_MAX_BYTES) return `A foto tem ${(f.size / 1024 / 1024).toFixed(1)} MB. O limite é 10 MB.`;
  return null;
}

/** Reduz para no máximo maxPx no lado maior. WebP 82% (com transparência) ou, sem WebP, PNG/JPEG. */
export async function compressImage(f: File, keepPng = f.type === 'image/png', maxPx = MAX_PX, webp = false): Promise<Blob> {
  const url = URL.createObjectURL(f);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('Não foi possível ler a foto. Tente outra imagem.'));
      i.src = url;
    });
    let w = img.naturalWidth, h = img.naturalHeight;
    const k = Math.min(1, maxPx / Math.max(w, h));
    w = Math.round(w * k); h = Math.round(h * k);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    if (!ctx) return f;
    if (!keepPng && !webp) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); }
    ctx.drawImage(img, 0, 0, w, h);
    const type = webp ? 'image/webp' : keepPng ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob | null>((res) => c.toBlob(res, type, 0.82));
    if (!blob || blob.type !== type) { if (webp) throw new Error('webp'); return blob || f; }
    return !webp && k === 1 && blob.size > f.size && f.type === type ? f : blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Comprime e envia a foto ao armazenamento do projeto com progresso real.
 * Devolve a URL pública (buckets públicos) ou o caminho (privados).
 */
export async function uploadImage(
  f: File,
  opts: { bucket?: string; folder?: string; onProgress?: (pct: number) => void } = {},
): Promise<string> {
  const err = validateImage(f);
  if (err) throw new Error(err);
  const bucket = opts.bucket || 'service-photos';
  const base0 = `${opts.folder || 'uploads'}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  // WebP em 3 tamanhos (1600/800/400); se o aparelho não gerar WebP, envia JPG/PNG único.
  let files: Array<{ path: string; blob: Blob }>;
  try {
    files = await Promise.all(([1600, 800, 400] as const).map(async (w) => ({ path: `${base0}-${w}.webp`, blob: await compressImage(f, false, w, true) })));
  } catch {
    const blob = await compressImage(f);
    files = [{ path: `${base0}.${blob.type === 'image/png' ? 'png' : 'jpg'}`, blob }];
  }
  const total = files.reduce((a, x) => a + x.blob.size, 0);
  let done = 0;

  let { data: { session } } = await supabase.auth.getSession();
  if (!session || (session.expires_at && session.expires_at * 1000 < Date.now() + 30000)) {
    session = (await supabase.auth.refreshSession()).data.session;
  }
  if (!session) throw new Error('Seu login expirou. Saia do painel e entre de novo.');

  const base = import.meta.env.VITE_SUPABASE_URL;
  for (const { path, blob } of files) await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${base}/storage/v1/object/${bucket}/${path}`);
    xhr.setRequestHeader('Authorization', `Bearer ${session!.access_token}`);
    xhr.setRequestHeader('apikey', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
    xhr.setRequestHeader('Content-Type', blob.type);
    xhr.setRequestHeader('cache-control', '31536000');
    xhr.upload.onprogress = (e) => e.lengthComputable && opts.onProgress?.(Math.round(((done + e.loaded) / total) * 100));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) { done += blob.size; return resolve(); }
      let msg = '';
      try { msg = JSON.parse(xhr.responseText).message || ''; } catch { /* ignore */ }
      if (xhr.status === 401 || /jwt|token/i.test(msg)) reject(new Error('Seu login expirou. Saia do painel e entre de novo.'));
      else if (xhr.status === 403 || /security|policy/i.test(msg)) reject(new Error('Sem permissão para enviar fotos. Entre com a conta de administrador.'));
      else if (xhr.status === 413) reject(new Error('A foto ficou grande demais para enviar.'));
      else reject(new Error(`Não foi possível enviar a foto${msg ? ` (${msg})` : ''}.`));
    };
    xhr.onerror = () => reject(new Error('Sem conexão. Verifique sua internet e tente de novo.'));
    xhr.send(blob);
  });
  return supabase.storage.from(bucket).getPublicUrl(files[0].path).data.publicUrl;
}
