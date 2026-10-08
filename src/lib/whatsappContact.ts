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

/* ---------- O que aconteceu nesta visita (só nesta aba, apagado ao fechar) ---------- */
const VISIT = 'mr-visit';
type Visit = { pages: string[]; searches: string[] };
const readVisit = (): Visit => { try { return { pages: [], searches: [], ...JSON.parse(sessionStorage.getItem(VISIT) || '{}') }; } catch { return { pages: [], searches: [] }; } };
/** Chamado a cada troca de página. */
export function trackVisit(pathname: string, search: string) {
  try {
    const v = readVisit();
    const path = pathname + search;
    if (v.pages[v.pages.length - 1] !== path) v.pages = [...v.pages, path].slice(-30);
    const q = new URLSearchParams(search).get('busca')?.trim();
    if (q && !v.searches.some((x) => x.toLowerCase() === q.toLowerCase())) v.searches = [...v.searches, q.slice(0, 100)].slice(-20);
    sessionStorage.setItem(VISIT, JSON.stringify(v));
  } catch { /* */ }
}

/* ---------- Nome e telefone informados pelo visitante (guardados no aparelho) ---------- */
const CONTACT = 'mr-wa-contact';
export type ContactInfo = { name: string; phone: string };
export const getSavedContact = (): ContactInfo | null => { try { const c = JSON.parse(localStorage.getItem(CONTACT) || 'null'); return c && (c.name || c.phone) ? c : null; } catch { return null; } };
export const saveContact = (c: ContactInfo) => { try { localStorage.setItem(CONTACT, JSON.stringify({ name: c.name.trim().slice(0, 120), phone: c.phone.trim().slice(0, 30) })); } catch { /* */ } };

const PRODUCT_RE = /^\/produto\/([0-9a-f-]{36})/i;
const pathLabel = (p: string, titles: Record<string, string>) => {
  const m = p.match(PRODUCT_RE); if (m) return titles[m[1]] || 'Produto';
  const u = new URL(p, 'http://x');
  if (u.pathname === '/') {
    const b = u.searchParams.get('busca'); if (b) return `Busca: ${b}`;
    const c = u.searchParams.get('categoria'); if (c) return `Categoria: ${c}`;
    return 'Início';
  }
  const names: Record<string, string> = { '/carrinho': 'Carrinho', '/checkout': 'Finalizar compra', '/servicos': 'Serviços', '/servicos-realizados': 'Serviços Realizados', '/rastrear-pedido': 'Rastrear pedido', '/wishlist': 'Favoritos' };
  return names[u.pathname] || u.pathname;
};

export type ContactKind = 'suporte' | 'orcamento' | 'produto' | 'busca';
export type ContactExtra = { customerName?: string; customerPhone?: string; message?: string; searchTerm?: string };

export async function logContact(kind: ContactKind, extra: ContactExtra = {}) {
  try {
    const { data } = await supabase.auth.getSession();
    const u = data.session?.user;
    const visit = readVisit();
    let cartRaw: { product_id: string; quantity: number }[] = [];
    try { cartRaw = JSON.parse(localStorage.getItem('mr_cart_items') || '[]'); } catch { /* */ }
    const here = window.location.pathname;
    const currentId = here.match(PRODUCT_RE)?.[1] || null;
    const ids = [...new Set([...cartRaw.map((c) => c.product_id), ...visit.pages.map((p) => p.match(PRODUCT_RE)?.[1]).filter(Boolean) as string[], ...(currentId ? [currentId] : [])])].slice(0, 40);
    const titles: Record<string, string> = {}; const prices: Record<string, number> = {};
    if (ids.length) {
      const { data: ps } = await supabase.from('products').select('id,title,price,promo_enabled,promo_price,promo_until').in('id', ids);
      (ps || []).forEach((p) => {
        titles[p.id] = p.title;
        const promo = p.promo_enabled && p.promo_price && (!p.promo_until || new Date(p.promo_until) > new Date());
        prices[p.id] = Number(promo ? p.promo_price : p.price) || 0;
      });
    }
    const cart = cartRaw.filter((c) => titles[c.product_id]).slice(0, 30).map((c) => ({ product_id: c.product_id, title: titles[c.product_id], quantity: c.quantity, price: prices[c.product_id] }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('whatsapp_contacts').insert({
      kind, page: here + window.location.search, user_id: u?.id ?? null, user_email: u?.email ?? null,
      customer_name: extra.customerName?.trim().slice(0, 120) || null,
      customer_phone: extra.customerPhone?.trim().slice(0, 30) || null,
      message: extra.message?.slice(0, 4000) || null,
      search_term: extra.searchTerm?.slice(0, 200) || null,
      product_id: currentId, product_title: currentId ? titles[currentId] || null : null,
      cart: cart.length ? cart : null,
      searches: visit.searches.length ? visit.searches : null,
      pages: visit.pages.length ? visit.pages.map((p) => pathLabel(p, titles)) : null,
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
export function openWhatsApp(text: string, kind: ContactKind, extra: ContactExtra = {}) {
  void logContact(kind, { ...extra, message: text });
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
