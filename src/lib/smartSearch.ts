import { Product, isPromoActive } from '@/lib/supabaseApi';

const STOP = new Set(['de', 'da', 'do', 'das', 'dos', 'para', 'pra', 'com', 'e', 'a', 'o', 'as', 'os', 'em', 'no', 'na', 'um', 'uma']);

/** minúsculas, sem acento, só letras/números */
export const norm = (s: string) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/** singular aproximado: cameras→camera, cabos→cabo, fontes→fonte, eletricas→eletrica */
export const stem = (w: string) => {
  if (w.length <= 3 || /\d/.test(w)) return w;
  if (w.endsWith('oes') || w.endsWith('aes')) return w.slice(0, -3) + 'ao';
  if (w.endsWith('is') && w.length > 4) return w.slice(0, -2) + 'l';
  if (w.endsWith('res') || w.endsWith('zes')) return w.slice(0, -2);
  if (w.endsWith('s')) return w.slice(0, -1);
  return w;
};

export const tokens = (q: string) => norm(q).split(' ').filter((w) => w && !STOP.has(w)).map(stem);

function lev(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let pp: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, pp[j - 2] + 1);
      cur.push(v); best = Math.min(best, v);
    }
    if (best > max) return max + 1;
    pp = prev; prev = cur;
  }
  return prev[b.length];
}

type Fields = { title: string[]; cat: string[]; body: string[]; all: Set<string>; raw: string };
const cache = new WeakMap<Product, Fields>();
const words = (s: string) => norm(s).split(' ').filter(Boolean).map(stem);

function fields(p: Product): Fields {
  const c = cache.get(p);
  if (c) return c;
  const title = words(p.title);
  const cat = words([p.category, p.subcategory, p.brand, p.model, p.sku].filter(Boolean).join(' '));
  const body = words([
    p.summary, p.description, ...(p.features || []), ...(p.box_items || []),
    ...(p.specs || []).map((s) => `${s.label} ${s.value}`),
  ].filter(Boolean).join(' '));
  const f = { title, cat, body, all: new Set([...title, ...cat, ...body]), raw: norm([p.title, p.model, p.sku].join(' ')) };
  cache.set(p, f);
  return f;
}

const has = (list: string[], t: string) => list.some((w) => w === t || w.startsWith(t));

/** Corrige palavra digitada errada usando o vocabulário dos produtos (1–2 letras). */
function correct(t: string, vocab: Set<string>): string {
  if (t.length < 4 || /\d/.test(t) || vocab.has(t)) return t;
  for (const v of vocab) if (v.startsWith(t)) return t;
  let best = t, bestD = 3;
  const max = t.length > 6 ? 2 : 1;
  for (const v of vocab) {
    const d = lev(t, v, max);
    if (d <= max && d < bestD) { best = v; bestD = d; }
  }
  return best;
}

export type SearchResult = { items: Product[]; corrected: string | null; terms: string[] };

export function smartSearch(products: Product[], q: string, soldCount: Record<string, number> = {}): SearchResult {
  const raw = tokens(q);
  if (!raw.length) return { items: products, corrected: null, terms: [] };
  const vocab = new Set<string>();
  products.forEach((p) => fields(p).all.forEach((w) => vocab.add(w)));
  const terms = raw.map((t) => correct(t, vocab));
  const changed = terms.some((t, i) => t !== raw[i]);
  const scored: { p: Product; s: number }[] = [];
  for (const p of products) {
    const f = fields(p);
    let s = 0, ok = true;
    for (const t of terms) {
      if (has(f.title, t)) s += 100;
      else if (has(f.cat, t) || f.raw.includes(t)) s += 30;
      else if (has(f.body, t)) s += 10;
      else { ok = false; break; }
    }
    if (!ok) continue;
    if (isPromoActive(p)) s += 5; // empurrãozinho que não fura o nível acima
    scored.push({ p, s });
  }
  scored.sort((a, b) => Number(a.p.stock === 0) - Number(b.p.stock === 0) || b.s - a.s || (soldCount[b.p.id] || 0) - (soldCount[a.p.id] || 0));
  return { items: scored.map((x) => x.p), corrected: changed ? terms.join(' ') : null, terms };
}

/** Produtos "parecidos": que batem em pelo menos uma palavra. */
export function similar(products: Product[], q: string, n = 4): Product[] {
  const terms = tokens(q);
  return products
    .map((p) => ({ p, s: terms.filter((t) => fields(p).all.has(t) || [...fields(p).all].some((w) => w.length > 3 && lev(t, w, 2) <= 2)).length }))
    .filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, n).map((x) => x.p);
}

const RECENT = 'mr-recent-searches';
export const getRecent = (): string[] => { try { return JSON.parse(localStorage.getItem(RECENT) || '[]'); } catch { return []; } };
export const addRecent = (q: string) => {
  const t = q.trim(); if (!t) return;
  const l = [t, ...getRecent().filter((x) => norm(x) !== norm(t))].slice(0, 5);
  try { localStorage.setItem(RECENT, JSON.stringify(l)); } catch { /* */ }
};
export const clearRecent = () => { try { localStorage.removeItem(RECENT); } catch { /* */ } };
