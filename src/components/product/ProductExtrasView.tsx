import type React from 'react';
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

function Fold({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group border-b border-border">
      <summary className="flex items-center justify-between gap-2 cursor-pointer list-none min-h-12 font-semibold text-foreground [&::-webkit-details-marker]:hidden">
        {title}<span className="text-muted-foreground transition-transform group-open:rotate-90" aria-hidden>▸</span>
      </summary>
      <div className="pb-4">{children}</div>
    </details>
  );
}

export function ProductDescription({ product, shipping }: { product: Product; shipping?: React.ReactNode }) {
  const summary = product.summary || product.description;
  const features = product.features ?? [];
  const specs = product.specs ?? [];
  const box = product.box_items ?? [];
  return (
    <div className="border-t border-border">
      {summary && (
        <Fold title="Descrição">
          <p className="text-sm text-ml-gray leading-relaxed whitespace-pre-line">{summary}</p>
          {product.ideal_for && <p className="mt-3 text-sm rounded-lg border-l-4 border-primary bg-muted p-3"><strong>Ideal para:</strong> {product.ideal_for}</p>}
        </Fold>
      )}
      {features.length > 0 && (
        <Fold title="Principais recursos">
          <ul className="list-disc pl-5 space-y-1 text-sm text-foreground">{features.map((f, i) => <li key={i}>{f}</li>)}</ul>
        </Fold>
      )}
      {specs.length > 0 && (
        <Fold title="Ficha técnica">
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
        </Fold>
      )}
      {box.length > 0 && (
        <Fold title="O que vem na caixa">
          <ul className="list-disc pl-5 space-y-1 text-sm text-foreground">{box.map((f, i) => <li key={i}>{f}</li>)}</ul>
        </Fold>
      )}
      {shipping && <Fold title="Envio e instalação">{shipping}</Fold>}
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
  const [picked, setPicked] = useState<string[]>([]);

  const add = (p: Product) =>
    addToCart.mutate({ product_id: p.id, quantity: 1 }, { onSuccess: () => toast({ title: 'Adicionado ao carrinho', description: p.title }) });

  const bundleAll = [product, ...bundle];
  const selected = bundleAll.filter((p) => p.id === product.id || picked.includes(p.id));
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
          <h2 className="text-lg font-semibold text-foreground mb-3">Compre junto</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {bundleAll.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 sm:flex-1">
                {i > 0 && <span className="text-xl text-ml-gray hidden sm:inline">+</span>}
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <Checkbox
                    checked={p.id === product.id || picked.includes(p.id)}
                    disabled={p.id === product.id}
                    onCheckedChange={(v) => setPicked((u) => (v ? [...u, p.id] : u.filter((x) => x !== p.id)))}
                    aria-label={`Incluir ${p.title}`}
                  />
                  <img loading="lazy" decoding="async" src={p.image_url || '/placeholder.svg'} alt="" className="w-14 h-14 object-contain bg-white rounded border border-border" />
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
            <button type="button" onClick={addBundle} className="ml-btn-primary px-6 min-h-11">
              {selected.length === 1 ? 'Adicionar ao carrinho' : `Adicionar os ${selected.length} ao carrinho — ${brl(bundleTotal)}`}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
