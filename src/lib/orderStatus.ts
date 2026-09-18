/**
 * Única fonte de verdade dos status de pedido.
 * Os valores gravados no banco continuam os mesmos (pending, confirmed, ...).
 */
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'payment_pending'
  | 'paid'
  | 'preparing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface OrderStatusInfo {
  value: OrderStatus;
  label: string;
  emoji: string;
  /** classes de badge (tokens semânticos evitados aqui por serem cores de estado fixas) */
  badgeClass: string;
}

export const ORDER_STATUSES: OrderStatusInfo[] = [
  { value: 'pending', label: 'Aguardando confirmação', emoji: '⏳', badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'confirmed', label: 'Pedido confirmado', emoji: '✅', badgeClass: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 'payment_pending', label: 'Aguardando pagamento', emoji: '💳', badgeClass: 'bg-amber-100 text-amber-800 border-amber-300' },
  { value: 'paid', label: 'Pagamento confirmado', emoji: '💰', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { value: 'preparing', label: 'Em preparação', emoji: '📦', badgeClass: 'bg-purple-100 text-purple-800 border-purple-300' },
  { value: 'shipped', label: 'Pedido enviado', emoji: '🚚', badgeClass: 'bg-orange-100 text-orange-800 border-orange-300' },
  { value: 'delivered', label: 'Pedido entregue', emoji: '🏠', badgeClass: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'cancelled', label: 'Pedido cancelado', emoji: '❌', badgeClass: 'bg-red-100 text-red-800 border-red-300' },
];

/** Ordem da linha do tempo mostrada ao cliente (cancelado fica fora) */
export const ORDER_TIMELINE: OrderStatus[] = [
  'pending',
  'confirmed',
  'payment_pending',
  'paid',
  'preparing',
  'shipped',
  'delivered',
];

export function getOrderStatusInfo(status?: string | null): OrderStatusInfo {
  return (
    ORDER_STATUSES.find((s) => s.value === (status || '').toLowerCase()) ?? ORDER_STATUSES[0]
  );
}

export function getOrderStatusLabel(status?: string | null): string {
  return getOrderStatusInfo(status).label;
}

export function isCancelled(status?: string | null): boolean {
  return (status || '').toLowerCase() === 'cancelled';
}

/** Índice do status atual na linha do tempo (-1 quando cancelado/desconhecido) */
export function getTimelineIndex(status?: string | null): number {
  return ORDER_TIMELINE.indexOf(getOrderStatusInfo(status).value);
}
