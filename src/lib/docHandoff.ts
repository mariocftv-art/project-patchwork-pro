import type { DocCustomer, DocItem } from '@/lib/docModel';

/** Dados levados de um pedido para um orçamento novo (aba Orçamentos abre o editor já preenchido). */
export interface QuoteHandoff {
  origin: string;
  customer: Partial<DocCustomer> & { name: string };
  items: DocItem[];
  shipping?: number;
}

const KEY = 'mr-quote-handoff';
export const ADMIN_TAB_EVENT = 'mr-admin-tab';
export const HANDOFF_EVENT = 'mr-quote-handoff';

export function sendToQuoteEditor(h: QuoteHandoff) {
  sessionStorage.setItem(KEY, JSON.stringify(h));
  window.dispatchEvent(new CustomEvent(ADMIN_TAB_EVENT, { detail: 'quotes' }));
  window.dispatchEvent(new Event(HANDOFF_EVENT));
}

export function takeQuoteHandoff(): QuoteHandoff | null {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  sessionStorage.removeItem(KEY);
  try {
    return JSON.parse(raw) as QuoteHandoff;
  } catch {
    return null;
  }
}
