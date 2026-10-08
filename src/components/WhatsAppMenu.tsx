import { useEffect, useRef, useState } from 'react';
import { useBrand } from '@/lib/brand';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { companyVars, DEFAULT_SALES_TEMPLATE, DEFAULT_SUPPORT_TEMPLATE, fillTemplate, openWhatsApp, getSavedContact, saveContact } from '@/lib/whatsappContact';
import { maskPhone } from '@/lib/masks';

const WaIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

type Info = { customer_name: string | null; customer_address: string | null; contract_number: string | null; contract_date: string | null } | null;

export default function WhatsAppMenu() {
  const brand = useBrand();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<Info>(null);
  const [ask, setAsk] = useState<null | 'suporte' | 'orcamento'>(null);
  const [fName, setFName] = useState('');
  const [fPhone, setFPhone] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInfo(null);
    if (!user) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).rpc('my_support_info').then(({ data }: { data: Info[] | null }) => setInfo(data?.[0] ?? null));
  }, [user]);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent | TouchEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setAsk(null); } };
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); setAsk(null); } };
    document.addEventListener('mousedown', h); document.addEventListener('touchstart', h); document.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('touchstart', h); document.removeEventListener('keydown', k); };
  }, [open]);

  const meta = (user?.user_metadata || {}) as Record<string, string>;
  const send = (kind: 'suporte' | 'orcamento', guest?: { name: string; phone: string }) => {
    const name = user ? (info?.customer_name || meta.full_name || meta.name || '') : (guest?.name || '');
    const vars = {
      ...companyVars(brand.name),
      NOME_CLIENTE: name,
      ENDERECO: info?.customer_address,
      NUMERO_CONTRATO: info?.contract_number,
      DATA_INSTALACAO: info?.contract_date ? new Date(info.contract_date).toLocaleDateString('pt-BR') : '',
    };
    const tpl = kind === 'suporte' ? (brand.whatsapp_support_template || DEFAULT_SUPPORT_TEMPLATE) : (brand.whatsapp_sales_template || DEFAULT_SALES_TEMPLATE);
    setOpen(false); setAsk(null);
    openWhatsApp(fillTemplate(tpl, vars), kind, { customerName: name, customerPhone: user ? (user.phone || meta.phone || '') : (guest?.phone || '') });
  };
  const go = (kind: 'suporte' | 'orcamento') => {
    if (user) return send(kind);
    const saved = getSavedContact();
    if (saved) return send(kind, saved);
    setFName(''); setFPhone(''); setAsk(kind);
  };
  const continueGuest = (skip: boolean) => {
    if (!ask) return;
    if (skip) return send(ask);
    const c = { name: fName.trim(), phone: fPhone.trim() };
    if (c.name || c.phone) saveContact(c);
    send(ask, c);
  };

  const opt = 'w-full flex items-start gap-3 text-left rounded-lg border border-primary/40 bg-secondary/40 hover:bg-primary/15 px-3 py-3 min-h-12 transition-colors';
  return (
    <div ref={ref} className="fixed bottom-6 left-3 sm:left-6 z-50">
      {open && ask && (
        <form role="dialog" aria-label="Para agilizar seu atendimento" onSubmit={(e) => { e.preventDefault(); continueGuest(false); }} className="keep-light absolute bottom-full mb-2 left-0 w-[min(20rem,calc(100vw-1.5rem))] rounded-xl bg-foreground text-background border-2 border-primary shadow-2xl p-4 space-y-3">
          <p className="font-bold text-primary">🛡️ {companyVars(brand.name).EMPRESA_MAIUSCULA}</p>
          <p className="text-sm">Para agilizar seu atendimento:</p>
          <label className="block text-sm font-semibold">Nome
            <input autoFocus value={fName} onChange={(e) => setFName(e.target.value)} maxLength={120} autoComplete="name" className="mt-1 w-full min-h-11 rounded-md border border-primary/50 bg-background text-foreground px-3" />
          </label>
          <label className="block text-sm font-semibold">WhatsApp
            <input value={fPhone} onChange={(e) => setFPhone(maskPhone(e.target.value))} inputMode="tel" autoComplete="tel" placeholder="(11) 9____-____" className="mt-1 w-full min-h-11 rounded-md border border-primary/50 bg-background text-foreground px-3" />
          </label>
          <button type="submit" className="w-full min-h-12 rounded-md bg-primary text-primary-foreground font-bold">Continuar para o WhatsApp →</button>
          <button type="button" onClick={() => continueGuest(true)} className="w-full text-sm underline opacity-80 min-h-10">pular esta etapa</button>
        </form>
      )}
      {open && !ask && (
        <div role="menu" className="keep-light absolute bottom-full mb-2 left-0 w-[min(20rem,calc(100vw-1.5rem))] rounded-xl bg-foreground text-background border-2 border-primary shadow-2xl p-3 space-y-2">
          <p className="text-sm font-bold text-primary px-1">Como podemos ajudar?</p>
          <button role="menuitem" type="button" className={opt} onClick={() => go('suporte')}>
            <WaIcon className="w-5 h-5 mt-0.5 shrink-0 text-[#25D366]" />
            <span><span className="block font-bold">🛠️ Já sou cliente — preciso de suporte</span><span className="block text-xs opacity-80">Problema com câmera, gravação ou acesso pelo celular</span></span>
          </button>
          <button role="menuitem" type="button" className={opt} onClick={() => go('orcamento')}>
            <WaIcon className="w-5 h-5 mt-0.5 shrink-0 text-[#25D366]" />
            <span><span className="block font-bold">💰 Quero um orçamento</span><span className="block text-xs opacity-80">Instalação de câmeras, alarme, cerca elétrica ou automação</span></span>
          </button>
        </div>
      )}
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="WhatsApp Suporte"
        onClick={() => { setAsk(null); setOpen((o) => !o); }}
        className="flex items-center gap-2 bg-green-500 text-white px-3 sm:px-4 py-2 rounded-full shadow-lg hover:bg-green-600 hover:scale-105 transition-all"
      >
        <WaIcon className="w-5 h-5 shrink-0" />
        <span className="flex flex-col items-center leading-tight text-[11px] sm:text-sm font-semibold">
          <span>WhatsApp</span><span>Suporte</span>
        </span>
      </button>
    </div>
  );
}
