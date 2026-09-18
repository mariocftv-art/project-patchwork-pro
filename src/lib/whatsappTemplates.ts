import { formatBRL } from '@/lib/formatCurrency';
import { getOrderStatusLabel } from '@/lib/orderStatus';
import {
  CompanyProfile,
  DEFAULT_ADMIN_TEMPLATE,
  DEFAULT_CUSTOMER_TEMPLATE,
} from '@/lib/companyProfile';

export const WHATSAPP_VARIABLES = [
  '{EMPRESA}',
  '{NOME_CLIENTE}',
  '{NUMERO_PEDIDO}',
  '{DATA}',
  '{HORARIO}',
  '{PRODUTOS}',
  '{SUBTOTAL}',
  '{FRETE}',
  '{DESCONTO}',
  '{TOTAL}',
  '{STATUS}',
  '{TELEFONE}',
  '{ENDERECO}',
  '{LINK_PEDIDO}',
  '{LINK_ADMIN}',
];

export interface OrderMessageItem {
  name: string;
  quantity: number;
  price: number;
}

export interface OrderMessageData {
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  items: OrderMessageItem[];
  subtotal: number;
  shippingFee?: number | null;
  discount?: number | null;
  total: number;
  status?: string | null;
  createdAt?: string | Date;
}

function productLines(items: OrderMessageItem[]): string {
  if (!items.length) return '—';
  return items
    .map(
      (item) =>
        `📹 ${item.quantity}x ${item.name}\n💰 ${formatBRL(item.price)} cada\n💵 Total: ${formatBRL(
          item.price * item.quantity
        )}`
    )
    .join('\n\n');
}

function buildVars(data: OrderMessageData, profile: CompanyProfile) {
  const date = data.createdAt ? new Date(data.createdAt) : new Date();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shipping =
    data.shippingFee && data.shippingFee > 0 ? formatBRL(data.shippingFee) : 'A combinar';
  const discount = data.discount && data.discount > 0 ? formatBRL(data.discount) : 'Não aplicado';

  return {
    '{EMPRESA}': profile.name,
    '{NOME_CLIENTE}': data.customerName?.trim() || 'Cliente',
    '{NUMERO_PEDIDO}': data.orderNumber,
    '{DATA}': date.toLocaleDateString('pt-BR'),
    '{HORARIO}': date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    '{PRODUTOS}': productLines(data.items),
    '{SUBTOTAL}': formatBRL(data.subtotal),
    '{FRETE}': shipping,
    '{DESCONTO}': discount,
    '{TOTAL}': formatBRL(data.total),
    '{STATUS}': getOrderStatusLabel(data.status),
    '{TELEFONE}': data.customerPhone?.trim() || 'Não informado',
    '{ENDERECO}': data.customerAddress?.trim() || 'Não informado',
    '{LINK_PEDIDO}': `${origin}/rastrear-pedido?pedido=${data.orderNumber}`,
    '{LINK_ADMIN}': `${origin}/admin`,
  } as Record<string, string>;
}

function render(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (text, [key, value]) => text.split(key).join(value),
    template
  );
}

export function buildCustomerOrderMessage(
  data: OrderMessageData,
  profile: CompanyProfile
): string {
  const template = profile.whatsapp_customer_template?.trim() || DEFAULT_CUSTOMER_TEMPLATE;
  return render(template, buildVars(data, profile));
}

export function buildAdminOrderMessage(data: OrderMessageData, profile: CompanyProfile): string {
  const template = profile.whatsapp_admin_template?.trim() || DEFAULT_ADMIN_TEMPLATE;
  return render(template, buildVars(data, profile));
}

/** Link wa.me pronto (mensagem já codificada) */
export function whatsappLink(phone: string, message: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  const normalized = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
