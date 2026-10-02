import { useBrand, waLink } from '@/lib/brand';
import bg from '@/assets/cta-fachada-noite.jpg';

const MSG = 'Olá! Cheguei pelo site da MR Segurança Máxima e gostaria de solicitar um orçamento para um sistema de segurança. Podemos conversar?';

/** Faixa compacta de chamada para orçamento (WhatsApp da empresa vem da Personalização). */
export default function QuoteCTA() {
  const brand = useBrand();
  const line = 'absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent';
  return (
    <section
      className="relative overflow-hidden rounded-lg bg-foreground bg-cover bg-center"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <div className="absolute inset-0 bg-foreground/75" aria-hidden />
      <span className={`${line} top-0`} aria-hidden />
      <span className={`${line} bottom-0`} aria-hidden />
      <div className="relative px-4 py-6 md:px-10 md:py-8 text-center">
        <h2 className="font-serif text-xl md:text-3xl font-bold tracking-wide text-primary">
          Não sabe quantas câmeras precisa?
        </h2>
        <p className="mt-2 md:mt-3 mx-auto max-w-2xl text-sm md:text-base text-background/85">
          Agende uma visita técnica: avaliamos seu imóvel e montamos o projeto ideal, sem compromisso.
        </p>
        <a
          href={waLink(MSG, brand)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 md:mt-5 inline-flex w-full sm:w-auto min-h-12 items-center justify-center rounded-md bg-primary px-8 text-sm md:text-base font-bold uppercase text-primary-foreground transition-shadow hover:shadow-[0_0_18px_hsl(var(--primary)/0.6)]"
        >
          Solicitar orçamento
        </a>
      </div>
    </section>
  );
}
