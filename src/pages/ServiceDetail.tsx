import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, XCircle, Minus, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/hooks/useCart';
import { waLink } from '@/lib/brand';
import { formatBRL } from '@/lib/formatCurrency';
import { productsApi } from '@/lib/supabaseApi';
import { servicesApi, serviceCharge, isCountable, unitInfo, SERVICE_PREFIX } from '@/lib/servicesApi';
import { ServicePrice } from '@/components/services/ServiceCard';

export default function ServiceDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addToCart } = useCart();
  const { data: s, isLoading } = useQuery({ queryKey: ['service', id], queryFn: () => servicesApi.get(id) });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => productsApi.list() });
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (s?.min_qty) setQty((q) => Math.max(q, s.min_qty || 1));
  }, [s?.min_qty]);

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!s || !s.active) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-lg">Serviço não encontrado.</p>
        <Link to="/servicos" className="text-primary underline">Ver todos os serviços</Link>
      </div>
    );
  }

  const charge = serviceCharge(s);
  const countable = isCountable(s.unit);
  const min = Math.max(1, s.min_qty || 1);
  const u = unitInfo(s.unit);
  const related = products.filter((p) => s.related_ids.includes(p.id) && p.stock > 0);

  const contract = () => {
    addToCart.mutate(
      { product_id: SERVICE_PREFIX + s.id, quantity: countable ? qty : 1 },
      {
        onSuccess: () => {
          toast({ title: 'Serviço adicionado ao carrinho', description: s.title });
          navigate('/carrinho');
        },
      },
    );
  };
  const doubt = waLink(`Olá! Tenho uma dúvida sobre o serviço "${s.title}".`);

  return (
    <div className="space-y-8">
      <nav className="text-sm text-muted-foreground">
        <Link to="/servicos" className="hover:underline">← Ver todos os serviços</Link>
      </nav>

      <div className="grid lg:grid-cols-2 gap-8 bg-card rounded-lg border border-border p-4 md:p-6">
        <div>
          <div className="aspect-square rounded-lg overflow-hidden bg-muted border border-border">
            {s.image_url && <img src={s.image_url} alt={s.title} className="w-full h-full object-cover" width={1024} height={1024} />}
          </div>
          {s.image_illustrative && <p className="mt-2 text-center text-xs text-muted-foreground">Imagem ilustrativa</p>}
        </div>

        <div className="space-y-4 min-w-0">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground">SERVIÇO TÉCNICO ESPECIALIZADO</p>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">{s.title}</h1>
          <ServicePrice s={s} big />

          {charge != null && countable && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Quantidade ({u.short}s){s.min_qty ? ` — mínimo ${s.min_qty}` : ''}</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-border rounded">
                  <button type="button" aria-label="Diminuir" className="h-11 w-11 flex items-center justify-center hover:bg-secondary" onClick={() => setQty((q) => Math.max(min, q - 1))}><Minus className="w-4 h-4" /></button>
                  <span className="w-12 text-center font-semibold">{qty}</span>
                  <button type="button" aria-label="Aumentar" className="h-11 w-11 flex items-center justify-center hover:bg-secondary" onClick={() => setQty((q) => Math.min(999, q + 1))}><Plus className="w-4 h-4" /></button>
                </div>
                <p className="text-sm">
                  {qty} × {formatBRL(charge)} = <strong className="text-price text-lg">{formatBRL(qty * charge)}</strong>
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            {charge != null ? (
              <Button className="min-h-12 flex-1 font-bold" onClick={contract}>Contratar instalação</Button>
            ) : (
              <Button className="min-h-12 flex-1 font-bold" asChild>
                <a href={waLink(`Olá! Gostaria de solicitar um orçamento para "${s.title}".`)} target="_blank" rel="noopener noreferrer">Solicitar orçamento</a>
              </Button>
            )}
            <Button variant="outline" className="min-h-12 flex-1" asChild>
              <a href={doubt} target="_blank" rel="noopener noreferrer">Tirar dúvida no WhatsApp</a>
            </Button>
          </div>

          <div className="rounded-lg border border-border bg-muted/40 p-4">
            <p className="font-semibold">📅 Como funciona</p>
            <p className="text-sm text-muted-foreground mt-1">
              Depois de contratar, entramos em contato pelo WhatsApp em até 24h para agendar data e horário.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-4 md:p-6 space-y-6">
        {(s.summary || s.description) && (
          <section>
            <h2 className="text-lg font-semibold mb-2">Descrição</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{s.summary || s.description}</p>
            {s.description && s.summary && s.description !== s.summary && (
              <p className="text-sm text-muted-foreground whitespace-pre-line mt-2">{s.description}</p>
            )}
          </section>
        )}
        {s.features.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-2">O que está incluso</h2>
            <ul className="space-y-1">
              {s.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm"><CheckCircle className="w-4 h-4 mt-0.5 text-promo shrink-0" />{f}</li>
              ))}
            </ul>
          </section>
        )}
        {s.excluded.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-2">O que não está incluso</h2>
            <ul className="space-y-1">
              {s.excluded.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm"><XCircle className="w-4 h-4 mt-0.5 text-destructive shrink-0" />{f}</li>
              ))}
            </ul>
          </section>
        )}
        {s.conditions.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-2">Condições</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {s.conditions.map((c, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="py-2 pr-4 font-medium align-top">{c.label}</td>
                      <td className="py-2 text-muted-foreground">{c.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {related.length > 0 && (
        <section className="bg-card rounded-lg border border-border p-4 md:p-6">
          <h2 className="text-lg font-semibold mb-4">Produtos para esta instalação</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {related.map((p) => (
              <div key={p.id} className="rounded border border-border p-2 flex flex-col gap-2">
                <Link to={`/produto/${p.id}`} className="block aspect-square bg-muted rounded overflow-hidden">
                  {p.image_url && <img src={p.image_url} alt={p.title} className="w-full h-full object-contain" loading="lazy" />}
                </Link>
                <Link to={`/produto/${p.id}`} className="text-xs line-clamp-2 hover:underline">{p.title}</Link>
                <p className="text-sm font-bold text-price">{formatBRL(p.price)}</p>
                <Button size="sm" variant="outline" className="min-h-11 mt-auto" onClick={() => addToCart.mutate({ product_id: p.id, quantity: 1 }, { onSuccess: () => toast({ title: 'Adicionado ao carrinho', description: p.title }) })}>
                  + Adicionar
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
