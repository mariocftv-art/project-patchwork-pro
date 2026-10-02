import { Link, useNavigate } from 'react-router-dom';
import { Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatBRL } from '@/lib/formatCurrency';
import { ServiceItem, serviceCharge, servicePromoActive, unitInfo } from '@/lib/servicesApi';

export function ServicePrice({ s, big = false }: { s: ServiceItem; big?: boolean }) {
  const charge = serviceCharge(s);
  if (charge == null) return <p className={big ? 'text-xl font-semibold text-foreground' : 'text-base font-semibold text-foreground'}>Solicitar orçamento</p>;
  const promo = servicePromoActive(s);
  const pct = promo ? Math.round((1 - charge / Number(s.price)) * 100) : 0;
  return (
    <div>
      {promo && (
        <p className="text-sm">
          <span className="line-through text-destructive">{formatBRL(Number(s.price))}</span>{' '}
          <span className="rounded bg-destructive text-destructive-foreground text-xs font-bold px-1.5 py-0.5">{pct}% OFF</span>
        </p>
      )}
      <p className={`${big ? 'text-3xl' : 'text-xl'} font-bold ${promo ? 'text-promo' : 'text-price'}`}>
        {s.price_type === 'a_partir' && <span className="text-sm font-medium">A partir de </span>}
        {formatBRL(charge)}
      </p>
      <p className="text-xs text-muted-foreground">{unitInfo(s.unit).perUnit}</p>
    </div>
  );
}

export default function ServiceCard({ s }: { s: ServiceItem }) {
  const navigate = useNavigate();
  const href = `/servicos/${s.id}`;
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col hover:shadow-lg hover:border-primary/50 transition-all">
      <Link to={href} className="block aspect-square w-full overflow-hidden bg-muted">
        {s.image_url ? (
          <img src={s.image_url} alt={s.title} className="w-full h-full object-cover" loading="lazy" width={1024} height={1024} />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Camera className="w-16 h-16 text-muted-foreground" /></div>
        )}
      </Link>
      <div className="p-4 flex flex-col flex-1 gap-2">
        <Link to={href} className="font-semibold text-foreground line-clamp-2 hover:underline">{s.title}</Link>
        {(s.summary || s.description) && <p className="text-sm text-muted-foreground line-clamp-2">{s.summary || s.description}</p>}
        <div className="mt-auto pt-2"><ServicePrice s={s} /></div>
        <Button className="w-full min-h-11" onClick={() => navigate(href)}>
          {serviceCharge(s) == null ? 'Solicitar orçamento' : 'Contratar instalação'}
        </Button>
      </div>
    </div>
  );
}
