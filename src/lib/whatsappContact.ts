import { supabase } from '@/integrations/supabase/client';
import { getBrand, waLink } from '@/lib/brand';

export const DEFAULT_SUPPORT_TEMPLATE = `Olá! Vim pelo site da {EMPRESA}.
Preciso de suporte para o meu sistema de segurança instalado.
Sou cliente: *{NOME_CLIENTE}*
Endereço: {ENDERECO}
Contrato: {NUMERO_CONTRATO} — instalado em {DATA_INSTALACAO}`;

export const DEFAULT_SALES_TEMPLATE = `Olá! Vim pelo site da {EMPRESA}.
Estou interessado em um sistema de monitoramento e gostaria de um orçamento.
Sou *{NOME_CLIENTE}*.`;

export const CONTACT_VARIABLES = ['{EMPRESA}', '{NOME_CLIENTE}', '{ENDERECO}', '{NUMERO_CONTRATO}', '{DATA_INSTALACAO}'];

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

/** Abre o WhatsApp numa aba já aberta no toque (evita bloqueio de pop-up) e registra o contato. */
export function openWhatsApp(text: string, kind: Parameters<typeof logContact>[0]) {
  void logContact(kind);
  window.open(waLink(text, getBrand()), '_blank', 'noopener');
}
