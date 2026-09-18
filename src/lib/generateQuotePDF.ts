import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import { getCompanyProfile, CompanyProfile } from '@/lib/companyProfile';
import { formatBRL } from '@/lib/formatCurrency';
import { buildTheme, drawCard, drawDocumentHeader, drawFooters, PAGE_MARGIN } from '@/lib/pdfBrand';

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
    name: companyInfo?.name || stored.name,
    cnpj: companyInfo?.cnpj || stored.cnpj,
    address: companyInfo?.address || stored.address,
    phone: companyInfo?.phone || stored.phone,
    email: companyInfo?.email || stored.email,
    logo_url: companyInfo?.logoUrl || stored.logo_url,
  };

  const theme = buildTheme(profile);
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;

  const quoteNumber = `ORC-${Date.now().toString().slice(-8)}`;
  const validityDays = data.validityDays ?? profile.quote_validity_days ?? 15;
  const today = new Date();
  const validUntil = new Date(today.getTime() + validityDays * 24 * 60 * 60 * 1000);

  let yPos = await drawDocumentHeader(doc, profile, theme, 'Orçamento', [
    { label: 'Nº', value: quoteNumber },
    { label: 'Data', value: today.toLocaleDateString('pt-BR') },
    { label: 'Válido até', value: validUntil.toLocaleDateString('pt-BR') },
  ]);

  // Bloco do cliente
  const clientLines = [
    data.customerName ? `Nome: ${data.customerName}` : '',
    [
      data.customerPhone ? `Telefone: ${data.customerPhone}` : '',
      data.customerEmail ? `E-mail: ${data.customerEmail}` : '',
    ]
      .filter(Boolean)
      .join('    '),
    data.customerAddress ? `Endereço: ${data.customerAddress}` : '',
  ].filter(Boolean);

  if (clientLines.length) {
    yPos = drawCard(doc, theme, PAGE_MARGIN, yPos, contentWidth, 'Cliente', clientLines) + 8;
  }

  // Tabela de produtos
  const tableBody = data.items.map((item, index) => [
    (index + 1).toString(),
    item.name,
    item.description || '—',
    item.quantity.toString(),
    formatBRL(item.price),
    formatBRL(item.price * item.quantity),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Produto/Serviço', 'Descrição', 'Qtd', 'Valor unit.', 'Total']],
    body: tableBody,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: { top: 3.2, bottom: 3.2, left: 3, right: 3 },
      textColor: theme.ink,
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: theme.primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left',
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 52 },
      2: { cellWidth: 'auto', textColor: theme.muted, fontSize: 8 },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN, top: 24, bottom: 24 },
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  yPos = (doc as any).lastAutoTable.finalY + 10;

  const pageHeight = doc.internal.pageSize.getHeight();
  const summaryHeight = 46;
  if (yPos + summaryHeight + 40 > pageHeight - 20) {
    doc.addPage();
    yPos = 24;
  }

  // Resumo financeiro
  const boxWidth = 84;
  const boxX = pageWidth - PAGE_MARGIN - boxWidth;
  doc.setFillColor(...theme.surface);
  doc.roundedRect(boxX, yPos, boxWidth, summaryHeight, 3, 3, 'F');

  const rowY = (i: number) => yPos + 10 + i * 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...theme.ink);
  doc.text('Subtotal', boxX + 6, rowY(0));
  doc.text(formatBRL(data.subtotal), boxX + boxWidth - 6, rowY(0), { align: 'right' });

  doc.text('Frete', boxX + 6, rowY(1));
  doc.text(
    data.shipping && data.shipping > 0 ? formatBRL(data.shipping) : 'A combinar',
    boxX + boxWidth - 6,
    rowY(1),
    { align: 'right' }
  );

  if (data.discount && data.discount > 0) {
    doc.text('Desconto', boxX + 6, rowY(2));
    doc.text(`- ${formatBRL(data.discount)}`, boxX + boxWidth - 6, rowY(2), { align: 'right' });
  }

  // Faixa de TOTAL com destaque forte
  const totalY = yPos + summaryHeight - 14;
  doc.setFillColor(...theme.primary);
  doc.roundedRect(boxX, totalY, boxWidth, 14, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TOTAL', boxX + 6, totalY + 9);
  doc.setFontSize(12.5);
  doc.text(formatBRL(data.total), boxX + boxWidth - 6, totalY + 9, { align: 'right' });

  // Observações
  const notes = (
    profile.pdf_notes_text?.trim() ||
    `Este orçamento é válido por ${validityDays} dias a partir da data de emissão.\nPreços sujeitos a alteração após o período de validade.\nO pagamento é combinado via WhatsApp após a confirmação do pedido.`
  )
    .split('\n')
    .filter(Boolean)
    .map((line) => `• ${line.replace(/^•\s*/, '')}`);

  drawCard(doc, theme, PAGE_MARGIN, yPos, contentWidth - boxWidth - 8, 'Observações', notes);

  drawFooters(doc, profile, theme);

  doc.save(`orcamento-${quoteNumber}.pdf`);

  // Upload para o storage e URL pública
  let pdfUrl: string | null = null;
  try {
    const pdfBlob = doc.output('blob');
    const fileName = `${quoteNumber}-${Date.now()}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('quotes')
      .upload(fileName, pdfBlob, { contentType: 'application/pdf', cacheControl: '3600' });

    if (uploadError) {
      console.error('Erro ao fazer upload do PDF:', uploadError);
    } else if (uploadData) {
      pdfUrl = supabase.storage.from('quotes').getPublicUrl(fileName).data.publicUrl;
    }
  } catch (e) {
    console.error('Erro ao salvar PDF no storage:', e);
  }

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
