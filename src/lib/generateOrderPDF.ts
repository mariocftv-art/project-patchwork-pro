import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getCompanyProfile } from '@/lib/companyProfile';
import { formatBRL } from '@/lib/formatCurrency';
import { getOrderStatusLabel } from '@/lib/orderStatus';
import { buildTheme, drawCard, drawDocumentHeader, drawFooters, PAGE_MARGIN } from '@/lib/pdfBrand';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  imageUrl?: string;
}

interface ShippingAddress {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

interface OrderData {
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  customer_cpf: string | null;
  status: string;
  items: OrderItem[];
  subtotal: number;
  shipping_fee: number;
  total: number;
  payment_method: string | null;
  shipping_address: ShippingAddress | null;
  created_at: string;
}

const paymentLabels: Record<string, string> = {
  pix: 'PIX',
  credit: 'Cartão de Crédito',
  boleto: 'Boleto Bancário',
};

export async function generateOrderPDF(order: OrderData): Promise<void> {
  const profile = await getCompanyProfile(true);
  const theme = buildTheme(profile);
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;
  const created = new Date(order.created_at);

  let yPos = await drawDocumentHeader(doc, profile, theme, `Pedido #${order.order_number}`, [
    { label: 'Data', value: created.toLocaleDateString('pt-BR') },
    { label: 'Hora', value: created.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) },
    { label: 'Status', value: getOrderStatusLabel(order.status) },
  ]);

  const addr = order.shipping_address;
  const halfWidth = (contentWidth - 8) / 2;

  const customerLines = [
    `Nome: ${order.customer_name}`,
    `E-mail: ${order.customer_email}`,
    order.customer_phone ? `Telefone: ${order.customer_phone}` : '',
    order.customer_cpf ? `CPF: ${order.customer_cpf}` : '',
  ].filter(Boolean);

  const addressLines = addr
    ? [
        `${addr.street}, ${addr.number}${addr.complement ? ` - ${addr.complement}` : ''}`,
        addr.neighborhood,
        `${addr.city} - ${addr.state}`,
        `CEP: ${addr.cep}`,
      ]
    : ['Não informado'];

  const leftEnd = drawCard(doc, theme, PAGE_MARGIN, yPos, halfWidth, 'Dados do cliente', customerLines);
  const rightEnd = drawCard(
    doc,
    theme,
    PAGE_MARGIN + halfWidth + 8,
    yPos,
    halfWidth,
    'Endereço de entrega',
    addressLines
  );
  yPos = Math.max(leftEnd, rightEnd) + 8;

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Produto', 'Qtd', 'Valor unit.', 'Total']],
    body: order.items.map((item, index) => [
      (index + 1).toString(),
      item.name,
      item.quantity.toString(),
      formatBRL(item.price),
      formatBRL(item.price * item.quantity),
    ]),
    theme: 'plain',
    styles: {
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
      halign: 'left',
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN, top: 24, bottom: 24 },
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  yPos = (doc as any).lastAutoTable.finalY + 10;

  const pageHeight = doc.internal.pageSize.getHeight();
  const summaryHeight = 52;
  if (yPos + summaryHeight + 20 > pageHeight - 20) {
    doc.addPage();
    yPos = 24;
  }

  const boxWidth = 88;
  const boxX = pageWidth - PAGE_MARGIN - boxWidth;
  doc.setFillColor(...theme.surface);
  doc.roundedRect(boxX, yPos, boxWidth, summaryHeight, 3, 3, 'F');

  const rowY = (i: number) => yPos + 10 + i * 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...theme.ink);
  doc.text('Subtotal', boxX + 6, rowY(0));
  doc.text(formatBRL(order.subtotal), boxX + boxWidth - 6, rowY(0), { align: 'right' });
  doc.text('Frete', boxX + 6, rowY(1));
  doc.text(
    order.shipping_fee > 0 ? formatBRL(order.shipping_fee) : 'A combinar',
    boxX + boxWidth - 6,
    rowY(1),
    { align: 'right' }
  );
  doc.text('Pagamento', boxX + 6, rowY(2));
  doc.text(
    paymentLabels[order.payment_method || ''] || order.payment_method || 'Não informado',
    boxX + boxWidth - 6,
    rowY(2),
    { align: 'right' }
  );

  const totalY = yPos + summaryHeight - 14;
  doc.setFillColor(...theme.primary);
  doc.roundedRect(boxX, totalY, boxWidth, 14, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TOTAL', boxX + 6, totalY + 9);
  doc.setFontSize(12.5);
  doc.text(formatBRL(order.total), boxX + boxWidth - 6, totalY + 9, { align: 'right' });

  drawCard(doc, theme, PAGE_MARGIN, yPos, contentWidth - boxWidth - 8, 'Separação do pedido', [
    `Status atual: ${getOrderStatusLabel(order.status)}`,
    `Itens: ${order.items.reduce((sum, i) => sum + i.quantity, 0)} unidade(s)`,
    'Conferir produtos, embalar e registrar a saída.',
  ]);

  drawFooters(doc, profile, theme);
  doc.save(`pedido-${order.order_number}.pdf`);
}
