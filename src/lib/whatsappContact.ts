import { supabase } from '@/integrations/supabase/client';
import { getBrand, waLink } from '@/lib/brand';

const HEAD = `🛡️ *{EMPRESA_MAIUSCULA}*
━━━━━━━━━━━━━━━━━━`;

export const DEFAULT_SUPPORT_TEMPLATE = `${HEAD}
🔧 *SOLICITAÇÃO DE SUPORTE TÉCNICO*

Olá! Vim pelo site da {EMPRESA}.

👤 *Cliente:* {NOME_CLIENTE}
📍 *Endereço:* {ENDERECO}
📄 *Contrato:* {NUMERO_CONTRATO}
📅 *Instalado em:* {DATA_INSTALACAO}

Preciso de suporte para o meu sistema de segurança instalado.

_Aguardo o atendimento de um técnico especializado._`;

export const DEFAULT_SALES_TEMPLATE = `${HEAD}
💰 *SOLICITAÇÃO DE ORÇAMENTO*

Olá! Vim pelo site da {EMPRESA}.

👤 *Nome:* {NOME_CLIENTE}

Tenho interesse em um sistema de segurança e gostaria de um orçamento:

🎥 Câmeras de segurança
🔔 Alarme monitorado
⚡ Cerca elétrica
🚪 Interfone / porteiro eletrônico
🏠 Automação de portão

_Aguardo o contato de um técnico especializado._`;

export const PRODUCT_QUESTION_TEMPLATE = `${HEAD}
🔍 *DÚVIDA SOBRE PRODUTO*

Olá! Vim pelo site da {EMPRESA}.

📦 *Produto:* {NOME_DO_PRODUTO}
💵 *Valor:* {PRECO}
🔗 {LINK_DO_PRODUTO}

Gostaria de mais informações sobre este produto.`;

/** Nome da empresa sem emoji do início, para as mensagens. */
export const companyVars = (name: string) => {
  const n = (name || '').replace(/^[^\p{L}\d]+/u, '').trim();
  return { EMPRESA: n, EMPRESA_MAIUSCULA: n.toLocaleUpperCase('pt-BR') };
};

export const CONTACT_VARIABLES = ['{EMPRESA}', '{EMPRESA_MAIUSCULA}', '{NOME_CLIENTE}', '{ENDERECO}', '{NUMERO_CONTRATO}', '{DATA_INSTALACAO}'];

/** Troca as variáveis; linha com variável vazia some inteira. */
export function fillTemplate(tpl: string, vars: Record<string, string | null | undefined>) {
  return tpl.split('\n').filter((line) => {
    const used = line.match(/\{[A-Z_]+\}/g) || [];
    return used.every((v) => (vars[v.slice(1, -1)] || '').trim());
  }).map((line) => line.replace(/\{([A-Z_]+)\}/g, (_, k) => (vars[k] || '').trim()))
    .join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export async function logContact(kind: 'suporte' | 'orcamento' | 'produto' | 'busca') {
  try {
    const { data } = await supabase.auth.getSession();
    const u = data.session?.user;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('whatsapp_contacts').insert({
      kind, page: window.location.pathname + window.location.search, user_id: u?.id ?? null, user_email: u?.email ?? null,
    });
  } catch { /* registro não pode impedir o contato */ }
}

function showForwarding(company: string) {
  const el = document.createElement('div');
  el.setAttribute('role', 'status');
  el.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-foreground/60 p-4';
  el.innerHTML = '<div class="keep-light rounded-xl border-2 border-primary bg-card text-card-foreground px-6 py-5 text-center shadow-2xl max-w-xs"><p class="font-bold text-lg"></p><p class="text-sm mt-1">Encaminhando você para um <strong>técnico especializado</strong>...</p></div>';
  (el.querySelector('p') as HTMLElement).textContent = `🛡️ ${company}`;
  document.body.appendChild(el);
  return () => el.remove();
}

/** Mostra 1s "Encaminhando…", abre o WhatsApp (aba aberta já no toque, para não ser bloqueada) e registra o contato. */
export function openWhatsApp(text: string, kind: Parameters<typeof logContact>[0]) {
  void logContact(kind);
  const brand = getBrand();
  const url = waLink(text, brand);
  const w = window.open('', '_blank');
  if (w) { try { w.opener = null; } catch { /* ignore */ } }
  const hide = showForwarding(companyVars(brand.name).EMPRESA_MAIUSCULA);
  setTimeout(() => {
    hide();
    if (w && !w.closed) w.location.href = url; else window.location.href = url;
  }, 1000);
}
