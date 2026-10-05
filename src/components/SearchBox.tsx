import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Clock, FolderOpen } from 'lucide-react';
import { productsApi, categoriesApi, isPromoActive } from '@/lib/supabaseApi';
import { smartSearch, getRecent, addRecent, clearRecent } from '@/lib/smartSearch';
import { formatBRL } from '@/lib/formatCurrency';

/** Campo de busca com sugestões (estilo Mercado Livre). Mesma aparência dos campos antigos. */
export default function SearchBox({ variant }: { variant: 'desktop' | 'mobile' }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('busca') || '');
  const [debounced, setDebounced] = useState(q);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const box = useRef<HTMLDivElement>(null);
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => productsApi.list(), staleTime: 300000 });
  const { data: cats = [] } = useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.list(), staleTime: 300000 });

  useEffect(() => { setQ(params.get('busca') || ''); }, [params]);
  useEffect(() => { const t = setTimeout(() => setDebounced(q), 250); return () => clearTimeout(t); }, [q]);
  useEffect(() => {
    const h = (e: MouseEvent | TouchEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); document.addEventListener('touchstart', h);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('touchstart', h); };
  }, []);

  const showRecent = q.trim().length < 2;
  const res = useMemo(() => {
    if (debounced.trim().length < 2) return null;
    const list = products.filter((p) => p && typeof p.title === 'string' && p.category !== 'instalacoes');
    return smartSearch(list, debounced);
  }, [debounced, products]);
  const top = res?.items.slice(0, 6) || [];
  const cat = top[0] ? cats.find((c) => c.slug === top[0].category) : null;
  type Row = { key: string; go: () => void };
  const rows: Row[] = showRecent
    ? recent.map((r) => ({ key: 'r' + r, go: () => submit(r) }))
    : [...top.map((p) => ({ key: p.id, go: () => { addRecent(q); setOpen(false); navigate(`/produto/${p.id}`); } })),
       ...(cat ? [{ key: 'cat', go: () => { setOpen(false); navigate(`/?categoria=${encodeURIComponent(cat.slug)}`); } }] : [])];

  function submit(text: string) {
    const t = text.trim(); if (!t) return;
    addRecent(t); setQ(t); setOpen(false); setActive(-1);
    (document.activeElement as HTMLElement | null)?.blur();
    navigate(`/?busca=${encodeURIComponent(t)}`);
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(rows.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(-1, a - 1)); }
    else if (e.key === 'Escape') setOpen(false);
    else if (e.key === 'Enter' && active >= 0 && rows[active]) { e.preventDefault(); rows[active].go(); }
  };
  const focus = () => { setRecent(getRecent()); setOpen(true); };
  const rowCls = (i: number) => `w-full flex items-center gap-3 px-3 min-h-12 text-left text-sm text-foreground hover:bg-secondary ${active === i ? 'bg-secondary' : ''}`;

  const panel = open && (showRecent ? recent.length > 0 : !!res && debounced.trim().length >= 2) && (
    <div role="listbox" className="absolute left-0 right-0 top-full mt-1 z-[60] bg-popover text-popover-foreground border border-border rounded-md shadow-xl max-h-[60vh] overflow-y-auto">
      {showRecent ? (
        <>
          <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground">
            <span>Buscas recentes</span>
            <button type="button" className="underline" onClick={() => { clearRecent(); setRecent([]); }}>Limpar</button>
          </div>
          {recent.map((r, i) => (
            <button key={r} type="button" className={rowCls(i)} onClick={() => submit(r)}>
              <Clock className="w-4 h-4 text-muted-foreground shrink-0" /> {r}
            </button>
          ))}
        </>
      ) : (
        <>
          <button type="button" className="w-full flex items-center gap-2 px-3 min-h-11 text-sm font-bold text-foreground border-b border-border hover:bg-secondary" onClick={() => submit(q)}>
            <Search className="w-4 h-4" /> {res?.corrected || q}
          </button>
          {top.length === 0 && <p className="px-3 py-3 text-sm text-muted-foreground">Nenhuma sugestão — toque na lupa para ver opções.</p>}
          {top.map((p, i) => (
            <button key={p.id} type="button" className={rowCls(i)} onClick={rows[i].go}>
              <img src={p.image_url || '/placeholder.svg'} alt="" className="w-10 h-10 object-contain rounded bg-card shrink-0" loading="lazy" />
              <span className="flex-1 min-w-0 line-clamp-2">{p.title}</span>
              <span className="text-price font-semibold shrink-0">{formatBRL(isPromoActive(p) && p.promo_price ? p.promo_price : p.price)}</span>
            </button>
          ))}
          {cat && (
            <button type="button" className={`${rowCls(top.length)} border-t border-border`} onClick={rows[top.length].go}>
              <FolderOpen className="w-4 h-4 shrink-0" /> Ver todos em <strong>{cat.name}</strong>
            </button>
          )}
        </>
      )}
    </div>
  );

  const input = {
    type: 'search' as const, value: q, enterKeyHint: 'search' as const, autoComplete: 'off',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => { setQ(e.target.value); setOpen(true); setActive(-1); },
    onFocus: focus, onKeyDown: onKey, 'aria-label': 'Buscar produtos',
  };
  const onSubmit = (e: React.FormEvent) => { e.preventDefault(); submit(q); };

  if (variant === 'desktop') return (
    <form onSubmit={onSubmit} className="flex-1 max-w-md">
      <div ref={box} className="relative ml-search flex items-center">
        <input {...input} placeholder="Buscar..." className="w-full px-4 py-2.5 pr-12 text-sm rounded-sm outline-none" />
        <button type="submit" aria-label="Buscar" className="absolute right-0 top-0 bottom-0 px-4 text-ml-gray hover:text-ml-dark-gray border-l border-border"><Search className="w-5 h-5" /></button>
        {panel}
      </div>
    </form>
  );
  return (
    <form onSubmit={onSubmit} className="pb-2">
      <div ref={box} className="relative">
        <div className="relative flex items-center bg-card border border-border rounded-md overflow-hidden">
          <input {...input} placeholder="Buscar produtos..." className="flex-1 px-3 py-2 text-sm outline-none" />
          <button type="submit" aria-label="Buscar" className="px-3 py-2 text-ml-gray hover:text-ml-dark-gray bg-secondary"><Search className="w-4 h-4" /></button>
        </div>
        {panel}
      </div>
    </form>
  );
}
