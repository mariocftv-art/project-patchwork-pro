import { ORDER_TIMELINE, getOrderStatusInfo, getTimelineIndex, isCancelled } from '@/lib/orderStatus';
import { Check, XCircle } from 'lucide-react';

interface Props {
  status?: string | null;
  className?: string;
}

/** Linha do tempo do pedido: etapas concluídas, etapa atual destacada e futuras neutras. */
export default function OrderStatusTimeline({ status, className = '' }: Props) {
  if (isCancelled(status)) {
    return (
      <div className={`flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 ${className}`}>
        <XCircle className="h-6 w-6 text-red-600 shrink-0" />
        <div>
          <p className="font-semibold text-red-700">Pedido cancelado</p>
          <p className="text-sm text-red-600">Fale com nossa equipe pelo WhatsApp para mais detalhes.</p>
        </div>
      </div>
    );
  }

  const currentIndex = Math.max(getTimelineIndex(status), 0);

  return (
    <ol className={`space-y-0 ${className}`}>
      {ORDER_TIMELINE.map((step, index) => {
        const info = getOrderStatusInfo(step);
        const done = index < currentIndex;
        const current = index === currentIndex;
        const last = index === ORDER_TIMELINE.length - 1;

        return (
          <li key={step} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm transition-colors ${
                  current
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : done
                    ? 'border-ml-green/40 bg-ml-green/10 text-ml-green'
                    : 'border-border bg-muted text-muted-foreground'
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : <span>{info.emoji}</span>}
              </span>
              {!last && (
                <span
                  className={`w-0.5 flex-1 min-h-6 ${done ? 'bg-ml-green/40' : 'bg-border'}`}
                />
              )}
            </div>
            <div className={`pb-5 ${last ? 'pb-0' : ''}`}>
              <p
                className={`text-sm ${
                  current
                    ? 'font-semibold text-foreground'
                    : done
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                {info.label}
              </p>
              {current && (
                <p className="text-xs text-muted-foreground">Etapa atual do seu pedido</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
