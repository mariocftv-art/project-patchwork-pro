import { MessageCircle, CalendarCheck } from 'lucide-react';
import { useBrand, waLink } from '@/lib/brand';

/** Faixa escura de chamada para orçamento (WhatsApp da empresa vem da Personalização). */
export default function QuoteCTA() {
  const brand = useBrand();
  return (
    <section className="rounded-lg bg-foreground border-l-4 border-primary px-5 py-6 md:px-10 md:py-8">
      <div className="flex flex-col md:flex-row md:items-center gap-5 md:gap-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl md:text-2xl font-bold text-primary">Não sabe quantas câmeras precisa?</h2>
          <p className="mt-2 text-sm md:text-base text-background/85 max-w-2xl">
            Agendamos uma visita técnica gratuita, avaliamos seu imóvel e montamos o projeto ideal — sem compromisso.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 shrink-0">
          <a
            href={waLink('Olá! Gostaria de solicitar um orçamento de sistema de segurança.', brand)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3.5 text-sm md:text-base font-bold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <MessageCircle className="w-5 h-5" /> SOLICITAR ORÇAMENTO NO WHATSAPP
          </a>
          <a
            href={waLink('Olá! Gostaria de agendar uma visita técnica gratuita.', brand)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-md border-2 border-background px-6 py-3 text-sm md:text-base font-semibold text-background hover:bg-background hover:text-foreground transition-colors"
          >
            <CalendarCheck className="w-5 h-5" /> AGENDAR VISITA TÉCNICA
          </a>
        </div>
      </div>
    </section>
  );
}
