import { formatBRL } from '@/lib/formatCurrency';

interface QuoteItem { name: string; quantity: number; price: number }

/** Mensagem simples de WhatsApp (mantida para compatibilidade) */
export function generateWhatsAppMessage(
  items: QuoteItem[],
  total: number,
  customerName?: string
): string {
  const itemsList = items
    .map((item) => `• ${item.quantity}x ${item.name} — ${formatBRL(item.price * item.quantity)}`)
    .join('\n');

  const message = `Olá! Gostaria de finalizar minha compra.
${customerName ? `\n*Nome:* ${customerName}\n` : ''}
*Itens do pedido:*
${itemsList}

*Total:* ${formatBRL(total)}

Aguardo confirmação para prosseguir com o pagamento.`;

  return encodeURIComponent(message);
}
