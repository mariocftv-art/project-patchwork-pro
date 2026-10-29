import { getCompanyProfile, CompanyProfile } from '@/lib/companyProfile';
import { formatBRL } from '@/lib/formatCurrency';
import { buildPremiumPDF, docFileName, PremiumDocData, uploadPDF } from '@/lib/premiumPDF';
import { supabase } from '@/integrations/supabase/client';

interface QuoteItem {
  name: string;
  description?: string;
  quantity: number;
  price: number;
  imageUrl?: string;
  kind?: 'product' | 'service';
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
  docData: PremiumDocData;
  profile: CompanyProfile;
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

  // O banco cria o orçamento e devolve o número (visitante não usa o contador direto)
  const dbItems = data.items.map((i) => ({
    description: i.description ? `${i.name} — ${i.description}` : i.name,
    name: i.name,
    quantity: i.quantity,
    unitPrice: i.price,
    price: i.price,
    kind: i.kind || 'product',
    imageUrl: i.imageUrl || null,
  }));
  const { data: num, error: rpcError } = await supabase.rpc('create_cart_quote', {
    _customer_name: data.customerName || '',
    _customer_email: data.customerEmail || '',
    _customer_phone: data.customerPhone || '',
    _customer_address: data.customerAddress || '',
    _items: dbItems,
    _subtotal: data.subtotal,
    _shipping: data.shipping,
    _total: data.total,
  });
  if (rpcError || typeof num !== 'string') throw rpcError || new Error('Sem número do orçamento');
  const quoteNumber = num;
  const docData: PremiumDocData = {
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
      kind: i.kind || 'product',
      imageUrl: i.imageUrl,
    })),
    discount: data.discount,
    shipping: data.shipping,
    notes: profile.pdf_notes_text,
  };
  const doc = await buildPremiumPDF(docData, profile);

  // Alguns celulares bloqueiam o download direto; o link do PDF segue pelo WhatsApp
  try { doc.save(docFileName("orcamento", quoteNumber)); } catch (e) { console.warn('Download do PDF bloqueado:', e); }
  const pdfUrl = await uploadPDF(doc, quoteNumber);
  if (pdfUrl) await supabase.rpc('attach_cart_quote_pdf', { _quote_number: quoteNumber, _pdf_url: pdfUrl });
  return { pdfUrl, quoteNumber, docData, profile };
}

export { generateWhatsAppMessage } from '@/lib/cartWhatsApp';
