import { getCompanyProfile, CompanyProfile } from '@/lib/companyProfile';
import { formatBRL } from '@/lib/formatCurrency';
import { buildPremiumPDF, nextDocNumber, uploadPDF } from '@/lib/premiumPDF';

interface QuoteItem {
  name: string;
  description?: string;
  quantity: number;
  price: number;
  imageUrl?: string;
}

/** Mantido para compatibilidade com chamadas existentes */
interface CompanyInfo {
  name: string;
  cnpj: string;
  address: string;
  phone: string;
  email: string;
  logoUrl?: string;
}

interface QuoteData {
  items: QuoteItem[];
  subtotal: number;
  shipping: number;
  discount?: number;
  total: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  validityDays?: number;
}

interface QuoteResult {
  pdfUrl: string | null;
  quoteNumber: string;
}

export async function generateQuotePDF(
  data: QuoteData,
  companyInfo?: Partial<CompanyInfo>
): Promise<QuoteResult> {
  const stored = await getCompanyProfile(true);
  const profile: CompanyProfile = {
    ...stored,
    logo_url: companyInfo?.logoUrl || stored.logo_url,
  };

  const quoteNumber = await nextDocNumber();
  const doc = await buildPremiumPDF(
    {
      docType: 'orcamento',
      number: quoteNumber,
      date: new Date(),
      validityDays: data.validityDays ?? profile.quote_validity_days ?? 15,
      customer: {
        name: data.customerName || '',
        phone: data.customerPhone,
        email: data.customerEmail,
        street: data.customerAddress,
      },
      items: data.items.map((i) => ({
        description: i.description ? `${i.name} — ${i.description}` : i.name,
        quantity: i.quantity,
        unitPrice: i.price,
        kind: 'product',
        imageUrl: i.imageUrl,
      })),
      discount: data.discount,
      shipping: data.shipping,
      notes: profile.pdf_notes_text,
    },
    profile
  );

  doc.save(`orcamento-${quoteNumber}.pdf`);
  const pdfUrl = await uploadPDF(doc, quoteNumber);
  return { pdfUrl, quoteNumber };
}

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
