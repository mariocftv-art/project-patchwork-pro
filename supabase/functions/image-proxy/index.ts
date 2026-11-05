// Busca uma imagem pública de outro site e devolve com CORS liberado,
// para que o gerador de PDF consiga incorporá-la. Só aceita http(s), só imagens, até 5 MB.
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const MAX = 5 * 1024 * 1024;

function blockedHost(host: string) {
  const h = host.toLowerCase();
  return (
    h === 'localhost' ||
    h.endsWith('.local') ||
    h.endsWith('.internal') ||
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
    h.startsWith('[') ||
    h === 'metadata.google.internal'
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const target = new URL(req.url).searchParams.get('url') || '';
    let u: URL;
    try {
      u = new URL(target);
    } catch {
      return new Response('URL inválida', { status: 400, headers: cors });
    }
    if (!/^https?:$/.test(u.protocol) || blockedHost(u.hostname)) {
      return new Response('URL não permitida', { status: 400, headers: cors });
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const r = await fetch(u.toString(), { signal: ctrl.signal, redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 MR-PDF' } });
    clearTimeout(timer);
    const type = r.headers.get('content-type') || '';
    if (!r.ok || !type.startsWith('image/')) {
      return new Response('Imagem indisponível', { status: 422, headers: cors });
    }
    const buf = new Uint8Array(await r.arrayBuffer());
    if (buf.byteLength > MAX) return new Response('Imagem muito grande', { status: 413, headers: cors });
    return new Response(buf, {
      headers: { ...cors, 'Content-Type': type, 'Cache-Control': 'public, max-age=86400' },
    });
  } catch (_e) {
    return new Response('Erro ao buscar imagem', { status: 502, headers: cors });
  }
});
