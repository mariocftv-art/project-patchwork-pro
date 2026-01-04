import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoMRTransparent from '@/assets/logo-mr-transparent.png';

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

const statusLabels: Record<string, string> = {
  pending: 'Aguardando Confirmação',
  confirmed: 'Confirmado',
  preparing: 'Em Preparação',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const paymentLabels: Record<string, string> = {
  pix: 'PIX',
  credit: 'Cartão de Crédito',
  boleto: 'Boleto Bancário',
};

// Function to load image as base64
async function loadImageAsBase64(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } else {
        reject(new Error('Could not get canvas context'));
      }
    };
    img.onerror = reject;
    img.src = src;
  });
}

export async function generateOrderPDF(order: OrderData): Promise<void> {
  const doc = new jsPDF();
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;
  
  // Header com logo e dados da empresa
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, pageWidth, 50, 'F');
  
  // Adiciona a logo
  try {
    const logoBase64 = await loadImageAsBase64(logoMRTransparent);
    doc.addImage(logoBase64, 'PNG', margin, 5, 40, 40);
  } catch (e) {
    console.log('Logo não carregou:', e);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('MR', margin + 10, 28);
  }
  
  // Nome da empresa
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Segurança Máxima', margin + 45, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('CNPJ: 45.858.215/0001-86', margin + 45, 30);
  doc.text('Tel: (11) 96257-9428', margin + 45, 38);
  
  // Número do pedido no header
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`PEDIDO #${order.order_number}`, pageWidth - margin, 25, { align: 'right' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const orderDate = new Date(order.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(orderDate, pageWidth - margin, 35, { align: 'right' });
  
  yPos = 60;
  
  // Status do pedido
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPos, pageWidth - margin * 2, 15, 'F');
  doc.setTextColor(30, 58, 138);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Status: ${statusLabels[order.status] || order.status}`, margin + 5, yPos + 10);
  
  yPos += 25;
  
  // Dados do cliente
  doc.setFillColor(245, 247, 250);
  doc.rect(margin, yPos, pageWidth - margin * 2, order.shipping_address ? 55 : 35, 'F');
  
  doc.setTextColor(30, 58, 138);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE', margin + 5, yPos + 10);
  
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  doc.text(`Nome: ${order.customer_name}`, margin + 5, yPos + 20);
  doc.text(`Email: ${order.customer_email}`, margin + 100, yPos + 20);
  
  if (order.customer_phone) {
    doc.text(`Telefone: ${order.customer_phone}`, margin + 5, yPos + 28);
  }
  if (order.customer_cpf) {
    doc.text(`CPF: ${order.customer_cpf}`, margin + 100, yPos + 28);
  }
  
  if (order.shipping_address) {
    const addr = order.shipping_address;
    doc.text('Endereço:', margin + 5, yPos + 38);
    const addressLine = `${addr.street}, ${addr.number}${addr.complement ? ' - ' + addr.complement : ''}, ${addr.neighborhood}`;
    doc.text(addressLine, margin + 35, yPos + 38);
    doc.text(`${addr.city} - ${addr.state}, CEP: ${addr.cep}`, margin + 35, yPos + 46);
    yPos += 55;
  } else {
    yPos += 35;
  }
  
  yPos += 10;
  
  // Tabela de produtos
  doc.setTextColor(30, 58, 138);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('ITENS DO PEDIDO', margin, yPos + 5);
  
  yPos += 10;
  
  const tableData = order.items.map((item, index) => [
    (index + 1).toString(),
    item.name,
    item.quantity.toString(),
    `R$ ${item.price.toFixed(2)}`,
    `R$ ${(item.price * item.quantity).toFixed(2)}`,
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Produto', 'Qtd', 'Valor Unit.', 'Total']],
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
      minCellHeight: 12,
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });
  
  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 15;
  
  // Resumo de valores
  const summaryX = pageWidth - margin - 80;
  
  doc.setFillColor(245, 247, 250);
  doc.rect(summaryX - 10, yPos - 5, 90, 55, 'F');
  
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'normal');
  
  doc.text('Subtotal:', summaryX, yPos + 5);
  doc.text(`R$ ${order.subtotal.toFixed(2)}`, pageWidth - margin, yPos + 5, { align: 'right' });
  
  doc.text('Frete:', summaryX, yPos + 15);
  doc.text('A combinar', pageWidth - margin, yPos + 15, { align: 'right' });
  
  doc.text('Pagamento:', summaryX, yPos + 25);
  doc.text(paymentLabels[order.payment_method || ''] || order.payment_method || 'Não informado', pageWidth - margin, yPos + 25, { align: 'right' });
  
  // Linha separadora
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.5);
  doc.line(summaryX, yPos + 32, pageWidth - margin, yPos + 32);
  
  // Total
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text('TOTAL:', summaryX, yPos + 45);
  doc.text(`R$ ${order.total.toFixed(2)}`, pageWidth - margin, yPos + 45, { align: 'right' });
  
  // Rodapé
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor(30, 58, 138);
  doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
  
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('MR Segurança Máxima | (11) 96257-9428 | contato@mrseguranca.com', pageWidth / 2, pageHeight - 10, { align: 'center' });
  
  // Salvar PDF
  doc.save(`pedido-${order.order_number}.pdf`);
}
