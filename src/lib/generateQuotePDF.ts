import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface QuoteItem {
  name: string;
  quantity: number;
  price: number;
}

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
  total: number;
  customerName?: string;
  customerPhone?: string;
  validityDays?: number;
}

const defaultCompanyInfo: CompanyInfo = {
  name: 'MR Segurança Máxima',
  cnpj: '00.000.000/0001-00', // Será substituído pelo valor real
  address: 'São Paulo - SP',
  phone: '(11) 96257-9428',
  email: 'contato@mrseguranca.com',
};

export function generateQuotePDF(data: QuoteData, companyInfo?: Partial<CompanyInfo>) {
  const company = { ...defaultCompanyInfo, ...companyInfo };
  const doc = new jsPDF();
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;
  
  // Header com logo e dados da empresa
  doc.setFillColor(30, 58, 138); // Azul escuro
  doc.rect(0, 0, pageWidth, 50, 'F');
  
  // Nome da empresa
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(company.name, margin, 25);
  
  // Subtítulo
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistemas de Segurança Eletrônica', margin, 35);
  
  // Dados da empresa no header
  doc.setFontSize(9);
  doc.text(`CNPJ: ${company.cnpj}`, pageWidth - margin, 20, { align: 'right' });
  doc.text(company.address, pageWidth - margin, 27, { align: 'right' });
  doc.text(`Tel: ${company.phone}`, pageWidth - margin, 34, { align: 'right' });
  doc.text(company.email, pageWidth - margin, 41, { align: 'right' });
  
  yPos = 60;
  
  // Título do documento
  doc.setTextColor(30, 58, 138);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('ORÇAMENTO', margin, yPos);
  
  // Número e data
  const quoteNumber = `ORC-${Date.now().toString().slice(-8)}`;
  const today = new Date().toLocaleDateString('pt-BR');
  const validUntil = new Date(Date.now() + (data.validityDays || 15) * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Nº: ${quoteNumber}`, pageWidth - margin, yPos - 5, { align: 'right' });
  doc.text(`Data: ${today}`, pageWidth - margin, yPos + 2, { align: 'right' });
  doc.text(`Válido até: ${validUntil}`, pageWidth - margin, yPos + 9, { align: 'right' });
  
  yPos += 20;
  
  // Dados do cliente (se fornecidos)
  if (data.customerName || data.customerPhone) {
    doc.setFillColor(245, 247, 250);
    doc.rect(margin, yPos, pageWidth - margin * 2, 25, 'F');
    
    doc.setTextColor(30, 58, 138);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE', margin + 5, yPos + 8);
    
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    if (data.customerName) {
      doc.text(`Nome: ${data.customerName}`, margin + 5, yPos + 17);
    }
    if (data.customerPhone) {
      doc.text(`Telefone: ${data.customerPhone}`, margin + 100, yPos + 17);
    }
    
    yPos += 35;
  }
  
  // Tabela de produtos
  const tableData = data.items.map((item, index) => [
    (index + 1).toString(),
    item.name,
    item.quantity.toString(),
    `R$ ${item.price.toFixed(2)}`,
    `R$ ${(item.price * item.quantity).toFixed(2)}`,
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Produto/Serviço', 'Qtd', 'Valor Unit.', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [60, 60, 60],
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 35, halign: 'right' },
      4: { cellWidth: 35, halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });
  
  // @ts-ignore - autoTable adds lastAutoTable property
  yPos = doc.lastAutoTable.finalY + 15;
  
  // Resumo de valores
  const summaryX = pageWidth - margin - 80;
  
  doc.setFillColor(245, 247, 250);
  doc.rect(summaryX - 10, yPos - 5, 90, 50, 'F');
  
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'normal');
  
  doc.text('Subtotal:', summaryX, yPos + 5);
  doc.text(`R$ ${data.subtotal.toFixed(2)}`, pageWidth - margin, yPos + 5, { align: 'right' });
  
  doc.text('Frete:', summaryX, yPos + 15);
  doc.text(data.shipping === 0 ? 'Grátis' : `R$ ${data.shipping.toFixed(2)}`, pageWidth - margin, yPos + 15, { align: 'right' });
  
  // Linha separadora
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.5);
  doc.line(summaryX, yPos + 22, pageWidth - margin, yPos + 22);
  
  // Total
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text('TOTAL:', summaryX, yPos + 35);
  doc.text(`R$ ${data.total.toFixed(2)}`, pageWidth - margin, yPos + 35, { align: 'right' });
  
  yPos += 65;
  
  // Observações e condições
  doc.setFillColor(255, 251, 235); // Amarelo claro
  doc.rect(margin, yPos, pageWidth - margin * 2, 40, 'F');
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.5);
  doc.rect(margin, yPos, pageWidth - margin * 2, 40, 'S');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9);
  doc.text('OBSERVAÇÕES:', margin + 5, yPos + 10);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 60, 20);
  doc.text('• Este orçamento é válido por ' + (data.validityDays || 15) + ' dias a partir da data de emissão.', margin + 5, yPos + 20);
  doc.text('• Preços sujeitos a alteração sem aviso prévio após o período de validade.', margin + 5, yPos + 28);
  doc.text('• Para confirmar o pedido, entre em contato pelo WhatsApp.', margin + 5, yPos + 36);
  
  // Rodapé
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor(30, 58, 138);
  doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
  
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(`${company.name} | ${company.phone} | ${company.email}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  
  // Salvar o PDF
  doc.save(`orcamento-mr-seguranca-${quoteNumber}.pdf`);
}

export function generateWhatsAppMessage(items: QuoteItem[], total: number, customerName?: string): string {
  const itemsList = items.map(item => 
    `• ${item.name} (${item.quantity}x) - R$ ${(item.price * item.quantity).toFixed(2)}`
  ).join('\n');
  
  const message = `Olá! Gostaria de finalizar minha compra.

${customerName ? `*Nome:* ${customerName}\n` : ''}
*Itens do pedido:*
${itemsList}

*Total:* R$ ${total.toFixed(2)}

Aguardo confirmação para prosseguir com o pagamento.`;

  return encodeURIComponent(message);
}
