import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { productsApi, Product } from '@/lib/supabaseApi';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Escolhidos no admin; se vazio, produtos da mesma categoria (destaques primeiro). */
function pick(all: Product[], product: Product, ids: string[] | undefined, max: number, exclude: string[] = []) {
  const avail = all.filter((p) => p.id !== product.id && p.stock > 0 && p.status !== 'inactive' && !exclude.includes(p.id));
  const chosen = (ids ?? []).map((id) => avail.find((p) => p.id === id)).filter((p): p is Product => !!p);
  if (chosen.length) return chosen.slice(0, max);
  return avail
    .filter((p) => p.category === product.category)
    .sort((a, b) => Number(!!b.featured) - Number(!!a.featured))
    .slice(0, max);
}

export function ProductDescription({ product }: { product: Product }) {
  const summary = product.summary || product.description;
  const features = product.features ?? [];
  const specs = product.specs ?? [];
  const box = product.box_items ?? [];
  return (
    <div className="space-y-6">
      {summary && (
        <section>
          <h3 className="font-semibold text-foreground mb-2">Descrição</h3>
          <p className="text-sm text-ml-gray leading-relaxed whitespace-pre-line">{summary}</p>
        </section>
      )}
      {features.length > 0 && (
        <section>
          <h3 className="font-semibold text-foreground mb-2">Principais recursos</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-foreground">{features.map((f, i) => <li key={i}>{f}</li>)}</ul>
        </section>
      )}
      {specs.length > 0 && (
        <section>
          <h3 className="font-semibold text-foreground mb-2">Ficha técnica</h3>
          <table className="w-full text-sm border border-border rounded overflow-hidden">
            <tbody>
              {specs.map((s, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-muted' : 'bg-card'}>
                  <th className="text-left font-medium p-2 w-2/5 align-top">{s.label}</th>
                  <td className="p-2 break-words">{s.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      {box.length > 0 && (
        <section>
          <h3 className="font-semibold text-foreground mb-2">O que vem na caixa</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-foreground">{box.map((f, i) => <li key={i}>{f}</li>)}</ul>
        </section>
      )}
      {product.ideal_for && (
        <section className="rounded-lg border-l-4 border-primary bg-muted p-3">
          <h3 className="font-semibold text-foreground mb-1">Ideal para</h3>
          <p className="text-sm text-foreground">{product.ideal_for}</p>
        </section>
      )}
    </div>
  );
}

export function ShippingInstallBox({ withInstall }: { withInstall: boolean }) {
  return (
    <div className="rounded-lg bg-muted p-4 text-sm space-y-2 mb-4">
      <p className="font-semibold text-foreground">📦 Envio e instalação</p>
      {withInstall && (
        <p><strong>Grande São Paulo</strong> — instalação inclusa no valor. Entramos em contato pelo WhatsApp em até 24h para combinar a melhor data e horário com você.</p>
      )}
      <p><strong>{withInstall ? 'Demais regiões' : 'Envio'}</strong> — enviamos o equipamento já configurado e testado, por transportadora ou Correios. O frete é calculado pelo seu CEP e combinado antes do envio.</p>
      {withInstall && <p><strong>Prazo</strong> — agendamento em até 24h úteis · instalação normalmente em 2 a 5 dias.</p>}
      <p className="text-ml-gray">Precisa para uma data específica? Fale com a gente, a gente se organiza.</p>
    </div>
  );
}

export function RelatedBlocks({ product }: { product: Product }) {
  const { data: all = [] } = useQuery({ queryKey: ['products'], queryFn: () => productsApi.list() });
  const { addToCart } = useCart();
  const { toast } = useToast();
  const related = useMemo(() => pick(all, product, product.related_ids, 6), [all, product]);
  const bundle = useMemo(() => pick(all, product, product.bundle_ids, 2, related.length && !(product.bundle_ids?.length) ? related.slice(0, 2).map((r) => r.id) : []), [all, product, related]);
  const [unchecked, setUnchecked] = useState<string[]>([]);

  const add = (p: Product) =>
    addToCart.mutate({ product_id: p.id, quantity: 1 }, { onSuccess: () => toast({ title: 'Adicionado ao carrinho', description: p.title }) });

  const bundleAll = [product, ...bundle];
  const selected = bundleAll.filter((p) => !unchecked.includes(p.id));
  const bundleTotal = selected.reduce((s, p) => s + p.price, 0);

  const addBundle = async () => {
    for (const p of selected) await addToCart.mutateAsync({ product_id: p.id, quantity: 1 });
    toast({ title: 'Adicionado ao carrinho', description: `${selected.length} produto(s)` });
  };

  return (
    <div className="space-y-8 mt-8">
      {related.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">Complete sua instalação</h2>
          <div className="flex gap-3 overflow-x-auto snap-x pb-2 -mx-1 px-1">
            {related.map((p) => (
              <div key={p.id} className="snap-start shrink-0 w-36 sm:w-44 border border-border rounded-lg p-2 flex flex-col bg-card">
                <Link to={`/produto/${p.id}`} className="block">
                  <img src={p.image_url || '/placeholder.svg'} alt={p.title} className="aspect-square w-full object-contain bg-white rounded" loading="lazy" />
                  <p className="text-xs leading-4 h-8 line-clamp-2 mt-2 text-foreground" title={p.title}>{p.title}</p>
                </Link>
                <p className={`text-sm font-bold mt-1 ${p.promo_active ? 'text-promo' : 'text-price'}`}>{brl(p.price)}</p>
                <button type="button" onClick={() => add(p)} className="mt-2 w-full rounded bg-primary text-primary-foreground text-xs font-semibold py-1.5 hover:opacity-90">
                  + Adicionar
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {bundle.length > 0 && (
        <section className="border border-border rounded-lg p-4">
          <h2 className="text-lg font-semibold text-foreground mb-3">Compre junto e economize</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {bundleAll.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 sm:flex-1">
                {i > 0 && <span className="text-xl text-ml-gray hidden sm:inline">+</span>}
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <Checkbox
                    checked={!unchecked.includes(p.id)}
                    onCheckedChange={(v) => setUnchecked((u) => (v ? u.filter((x) => x !== p.id) : [...u, p.id]))}
                    aria-label={`Incluir ${p.title}`}
                  />
                  <img src={p.image_url || '/placeholder.svg'} alt="" className="w-14 h-14 object-contain bg-white rounded border border-border" />
                  <span className="text-xs">
                    <span className="line-clamp-2">{p.title}</span>
                    <strong className={p.promo_active ? 'text-promo' : 'text-price'}>{brl(p.price)}</strong>
                  </span>
                </label>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-4 border-t border-border">
            <p className="text-sm">Total: <strong className="text-lg text-price">{brl(bundleTotal)}</strong></p>
            <button type="button" disabled={!selected.length} onClick={addBundle} className="ml-btn-primary px-6 disabled:opacity-50">
              Adicionar os {selected.length} ao carrinho
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
