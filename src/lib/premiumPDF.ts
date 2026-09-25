import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoMRTransparent from '@/assets/logo-mr-transparent.png';
import { CompanyProfile } from '@/lib/companyProfile';
import { formatBRL } from '@/lib/formatCurrency';
import { hexToRgb, loadImageAsBase64, RGB } from '@/lib/pdfBrand';

/* ============ Tipos do documento ============ */

export type DocType = 'orcamento' | 'contrato' | 'os' | 'recibo';
export type PaymentMethod = '' | 'avista' | 'pix' | 'dinheiro' | 'cartao' | 'parcelado' | 'personalizado';
export type WarrantyOption = '' | 'none' | '3m' | '6m' | '1y' | 'custom';

export interface DocCustomer {
  name: string;
  fantasy?: string;
  cpf?: string;
  cnpj?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  street?: string;
  number?: string;
  complement?: string;
  district?: string;
  city?: string;
  state?: string;
  cep?: string;
  note?: string;
}

export interface DocItem {
  description: string;
  quantity: number;
  unitPrice: number;
  kind?: 'product' | 'service';
  imageUrl?: string;
}

export interface DocPayment {
  method: PaymentMethod;
  installments?: number;
  installmentValue?: number;
  customText?: string;
}

export interface DocWarranty {
  option: WarrantyOption;
  customPeriod?: string;
  text?: string;
}

export interface PremiumDocData {
  docType: DocType;
  number: string;
  date: Date;
  validityDays?: number;
  serviceTitle?: string;
  customer: DocCustomer;
  items: DocItem[];
  discount?: number;
  shipping?: number;
  payment?: DocPayment;
  warranty?: DocWarranty;
  notes?: string;
  showSignatures?: boolean;
}

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  orcamento: 'Orçamento',
  contrato: 'Contrato',
  os: 'Ordem de Serviço',
  recibo: 'Recibo',
};

const DOC_TITLES: Record<DocType, string> = {
  orcamento: 'ORÇAMENTO CFTV',
  contrato: 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS',
  os: 'ORDEM DE SERVIÇO',
  recibo: 'RECIBO',
};

export const PAYMENT_LABELS: Record<Exclude<PaymentMethod, ''>, string> = {
  avista: 'À vista',
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
  parcelado: 'Parcelado',
  personalizado: 'Personalizado',
};

export const WARRANTY_LABELS: Record<Exclude<WarrantyOption, ''>, string> = {
  none: 'Sem garantia',
  '3m': '3 meses',
  '6m': '6 meses',
  '1y': '1 ano',
  custom: 'Personalizada',
};

/* ============ Cálculos (sempre em centavos para evitar erro) ============ */

const cents = (v: number) => Math.round((Number(v) || 0) * 100);

export function computeTotals(data: Pick<PremiumDocData, 'items' | 'discount' | 'shipping' | 'payment'>) {
  let productsC = 0;
  let servicesC = 0;
  data.items.forEach((it) => {
    const line = Math.round(cents(it.unitPrice) * (Number(it.quantity) || 0));
    if (it.kind === 'service') servicesC += line;
    else productsC += line;
  });
  const discountC = cents(data.discount || 0);
  const shippingC = cents(data.shipping || 0);
  const totalC = Math.max(0, productsC + servicesC + shippingC - discountC);

  let installments = 0;
  let installmentValue = 0;
  let installmentTotal = 0;
  if (data.payment?.method === 'parcelado' && (data.payment.installments || 0) > 0) {
    installments = Math.floor(data.payment.installments!);
    const ivC = data.payment.installmentValue
      ? cents(data.payment.installmentValue)
      : Math.ceil(totalC / installments);
    installmentValue = ivC / 100;
    installmentTotal = (ivC * installments) / 100;
  }

  return {
    products: productsC / 100,
    services: servicesC / 100,
    discount: discountC / 100,
    shipping: shippingC / 100,
    total: totalC / 100,
    installments,
    installmentValue,
    installmentTotal,
  };
}

export const lineTotal = (it: DocItem) =>
  Math.round(cents(it.unitPrice) * (Number(it.quantity) || 0)) / 100;

/* ============ Validação antes de gerar ============ */

export function validateDoc(data: PremiumDocData): string[] {
  const errors: string[] = [];
  const c = data.customer;
  if (!c.name?.trim()) errors.push('Informe o nome do cliente.');
  if (!c.phone?.trim() && !c.whatsapp?.trim()) errors.push('Informe o telefone ou WhatsApp do cliente.');
  const cpf = (c.cpf || '').replace(/\D/g, '');
  if (cpf && cpf.length !== 11) errors.push('CPF deve ter 11 números.');
  const cnpj = (c.cnpj || '').replace(/\D/g, '');
  if (cnpj && cnpj.length !== 14) errors.push('CNPJ deve ter 14 números.');
  if (c.cep && c.cep.replace(/\D/g, '').length !== 8) errors.push('CEP deve ter 8 números.');
  if (!data.items.length) errors.push('Adicione pelo menos um item.');
  data.items.forEach((it, i) => {
    if (!it.description?.trim()) errors.push(`Item ${i + 1}: falta a descrição.`);
    if (!(Number(it.quantity) > 0)) errors.push(`Item ${i + 1}: quantidade inválida.`);
    if (!(Number(it.unitPrice) >= 0) || Number.isNaN(Number(it.unitPrice)))
      errors.push(`Item ${i + 1}: valor inválido.`);
  });
  const t = computeTotals(data);
  if ((data.discount || 0) < 0) errors.push('Desconto não pode ser negativo.');
  if (t.total <= 0 && data.docType !== 'contrato') errors.push('O valor total precisa ser maior que zero.');
  if (data.payment?.method === 'parcelado' && !(Number(data.payment.installments) >= 2))
    errors.push('Informe a quantidade de parcelas (mínimo 2).');
  if (data.payment?.method === 'personalizado' && !data.payment.customText?.trim())
    errors.push('Descreva a condição de pagamento personalizada.');
  if (data.warranty?.option === 'custom' && !data.warranty.customPeriod?.trim())
    errors.push('Informe o prazo da garantia personalizada.');
  return errors;
}

/* ============ Desenho ============ */

const BLACK: RGB = [14, 14, 16];
const PANEL: RGB = [26, 26, 30];
const WHITE: RGB = [255, 255, 255];
const INK: RGB = [28, 28, 32];
const MUTED: RGB = [105, 105, 112];
const PAPER: RGB = [251, 249, 243];

const PAGE_W = 210;
const PAGE_H = 297;
const SIDEBAR_W = 13;
const LEFT = SIDEBAR_W + 9;
const RIGHT = PAGE_W - 12;
const CONTENT_W = RIGHT - LEFT;
const FOOTER_H = 20;

interface Theme {
  gold: RGB;
  red: RGB;
}

function drawCamera(doc: jsPDF, x: number, y: number, s: number, t: Theme) {
  // Câmera bullet estilizada (vetorial)
  doc.setFillColor(...PANEL);
  doc.setDrawColor(...t.gold);
  doc.setLineWidth(0.5);
  // suporte
  doc.rect(x + 24 * s, y + 13 * s, 3 * s, 8 * s, 'FD');
  doc.roundedRect(x + 19 * s, y + 20 * s, 13 * s, 3 * s, 1, 1, 'FD');
  // corpo
  doc.roundedRect(x, y, 34 * s, 13 * s, 2.5 * s, 2.5 * s, 'FD');
  // viseira
  doc.setFillColor(...BLACK);
  doc.roundedRect(x - 1.5 * s, y - 2 * s, 30 * s, 3 * s, 1, 1, 'FD');
  // lente
  doc.setFillColor(...BLACK);
  doc.circle(x + 3 * s, y + 6.5 * s, 4.5 * s, 'FD');
  doc.setFillColor(...t.gold);
  doc.circle(x + 3 * s, y + 6.5 * s, 2.2 * s, 'F');
  doc.setFillColor(...WHITE);
  doc.circle(x + 2.2 * s, y + 5.7 * s, 0.7 * s, 'F');
  // led
  doc.setFillColor(...t.red);
  doc.circle(x + 30 * s, y + 4 * s, 1 * s, 'F');
}

function drawShield(doc: jsPDF, cx: number, cy: number, s: number, fill: RGB, stroke: RGB) {
  doc.setFillColor(...fill);
  doc.setDrawColor(...stroke);
  doc.setLineWidth(0.4);
  const w = 6 * s;
  const h = 7 * s;
  doc.lines(
    [
      [w, 0],
      [0, h * 0.45],
      [-w / 2, h * 0.55],
      [-w / 2, -h * 0.55],
      [0, -h * 0.45],
    ],
    cx - w / 2,
    cy - h / 2,
    [1, 1],
    'FD',
    true
  );
}

function sectionTitle(doc: jsPDF, t: Theme, x: number, y: number, w: number, title: string) {
  doc.setFillColor(...BLACK);
  doc.rect(x, y, w, 7, 'F');
  doc.setFillColor(...t.red);
  doc.rect(x, y, 2.2, 7, 'F');
  doc.setDrawColor(...t.gold);
  doc.setLineWidth(0.35);
  doc.line(x, y + 7, x + w, y + 7);
  doc.setTextColor(...t.gold);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.text(title.toUpperCase(), x + 5, y + 4.9);
  return y + 7;
}

/** Bloco com borda dourada e linhas "Rótulo: valor". Retorna a altura. */
function measureInfoBlock(doc: jsPDF, w: number, rows: Array<[string, string]>) {
  doc.setFontSize(8.6);
  let lines = 0;
  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    const lw = doc.getTextWidth(label ? `${label}: ` : '');
    doc.setFont('helvetica', 'normal');
    lines += (doc.splitTextToSize(value, w - 8 - lw) as string[]).length;
  });
  return 7 + 4 + lines * 4.6 + 2;
}

function drawInfoBlock(
  doc: jsPDF,
  t: Theme,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  rows: Array<[string, string]>
) {
  doc.setFillColor(...PAPER);
  doc.setDrawColor(...t.gold);
  doc.setLineWidth(0.5);
  doc.rect(x, y, w, h, 'FD');
  sectionTitle(doc, t, x, y, w, title);
  let cy = y + 7 + 5.2;
  doc.setFontSize(8.6);
  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...INK);
    const prefix = label ? `${label}: ` : '';
    doc.text(prefix, x + 4, cy);
    const lw = doc.getTextWidth(prefix);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...INK);
    const parts = doc.splitTextToSize(value, w - 8 - lw) as string[];
    parts.forEach((p, i) => {
      doc.text(p, x + 4 + lw, cy);
      if (i < parts.length - 1) cy += 4.6;
    });
    cy += 4.6;
  });
}

function drawSidebar(doc: jsPDF, t: Theme) {
  doc.setFillColor(...BLACK);
  doc.rect(0, 0, SIDEBAR_W, PAGE_H, 'F');
  doc.setFillColor(...t.gold);
  doc.rect(SIDEBAR_W, 0, 0.9, PAGE_H, 'F');
  doc.setFillColor(...t.red);
  doc.rect(SIDEBAR_W + 0.9, 0, 0.5, PAGE_H, 'F');

  const words = ['MONITORAMENTO 24H', 'TECNOLOGIA', 'QUALIDADE', 'SUPORTE TÉCNICO'];
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  let y = 95;
  words.forEach((w) => {
    drawShield(doc, SIDEBAR_W / 2, y, 0.55, t.red, t.gold);
    y += 6;
    doc.setTextColor(...t.gold);
    const tw = doc.getTextWidth(w);
    doc.text(w, SIDEBAR_W / 2 + 1.2, y + tw, { angle: 90 });
    y += tw + 8;
  });
}

async function tryLoad(src?: string | null) {
  if (!src) return null;
  try {
    return await loadImageAsBase64(src);
  } catch {
    return null;
  }
}

function drawFullHeader(doc: jsPDF, profile: CompanyProfile, t: Theme, logo: string | null, title: string) {
  const top = 0;
  const h = 40;
  doc.setFillColor(...BLACK);
  doc.rect(SIDEBAR_W + 1.4, top, PAGE_W - SIDEBAR_W, h, 'F');
  // moldura dourada interna
  doc.setDrawColor(...t.gold);
  doc.setLineWidth(0.4);
  doc.rect(SIDEBAR_W + 4, 3, PAGE_W - SIDEBAR_W - 7, h - 6);

  if (logo) {
    doc.addImage(logo, 'PNG', LEFT - 2, 6, 28, 28);
  }

  const cx = (LEFT + 28 + RIGHT - 44) / 2 + 2;
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text((profile.name || '').toUpperCase(), cx, 17, { align: 'center' });
  doc.setFillColor(...t.red);
  doc.rect(cx - 22, 20.5, 44, 0.8, 'F');
  doc.setTextColor(...t.gold);
  doc.setFontSize(9.5);
  doc.text('CÂMERAS E ALARMES', cx, 27, { align: 'center' });
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('MONITORAMENTO 24H', cx, 32.5, { align: 'center' });

  drawCamera(doc, RIGHT - 40, 11, 1, t);

  // título do documento
  let y = h + 7;
  doc.setTextColor(...BLACK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(title.length > 22 ? 16 : 21);
  doc.text(title, LEFT, y + 6);
  y += 10;
  doc.setFillColor(...t.gold);
  doc.rect(LEFT, y, CONTENT_W * 0.72, 1.1, 'F');
  doc.setFillColor(...t.red);
  doc.rect(LEFT + CONTENT_W * 0.72, y, CONTENT_W * 0.28, 1.1, 'F');
  return y + 4;
}

function drawCompactHeader(doc: jsPDF, profile: CompanyProfile, t: Theme, logo: string | null, title: string, number: string) {
  doc.setFillColor(...BLACK);
  doc.rect(SIDEBAR_W + 1.4, 0, PAGE_W - SIDEBAR_W, 18, 'F');
  doc.setFillColor(...t.gold);
  doc.rect(SIDEBAR_W + 1.4, 18, PAGE_W - SIDEBAR_W, 0.8, 'F');
  if (logo) doc.addImage(logo, 'PNG', LEFT - 2, 2, 14, 14);
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text((profile.name || '').toUpperCase(), LEFT + 15, 9);
  doc.setTextColor(...t.gold);
  doc.setFontSize(8);
  doc.text(`${title}  •  Nº ${number}`, LEFT + 15, 14);
}

function drawFooter(doc: jsPDF, profile: CompanyProfile, t: Theme, logo: string | null, page: number, total: number) {
  const y = PAGE_H - FOOTER_H;
  doc.setFillColor(...BLACK);
  doc.rect(SIDEBAR_W + 1.4, y, PAGE_W - SIDEBAR_W, FOOTER_H, 'F');
  doc.setFillColor(...t.gold);
  doc.rect(SIDEBAR_W + 1.4, y, PAGE_W - SIDEBAR_W, 0.8, 'F');
  if (logo) doc.addImage(logo, 'PNG', LEFT - 2, y + 3, 14, 14);
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.3);
  doc.text((profile.name || '').toUpperCase(), LEFT + 15, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const wa = profile.phone || profile.whatsapp;
  doc.text(
    [wa ? `WhatsApp: ${wa}` : '', profile.cnpj ? `CNPJ: ${profile.cnpj}` : ''].filter(Boolean).join('   •   '),
    LEFT + 15,
    y + 13
  );
  const slogan = (profile.footer_slogan || '').trim();
  if (slogan) {
    doc.setTextColor(...t.gold);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    const parts = slogan.split(/(?<=\.)\s+/);
    parts.slice(0, 2).forEach((p, i) => doc.text(p, RIGHT, y + 8 + i * 4.2, { align: 'right' }));
  }
  doc.setTextColor(200, 200, 200);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`Página ${page} de ${total}`, RIGHT, y + 17, { align: 'right' });
}

function ensureSpace(doc: jsPDF, y: number, needed: number) {
  if (y + needed > PAGE_H - FOOTER_H - 6) {
    doc.addPage();
    return 26;
  }
  return y;
}

function formatAddress(c: DocCustomer) {
  const line1 = [c.street, c.number].filter(Boolean).join(', ');
  const parts = [
    [line1, c.complement].filter(Boolean).join(' - '),
    c.district,
    [c.city, c.state].filter(Boolean).join('/'),
    c.cep ? `CEP ${c.cep}` : '',
  ].filter(Boolean);
  return parts.join(' - ');
}

export async function buildPremiumPDF(data: PremiumDocData, profile: CompanyProfile): Promise<jsPDF> {
  const t: Theme = {
    gold: hexToRgb(profile.pdf_gold_color, [201, 162, 39]),
    red: hexToRgb(profile.pdf_red_color, [200, 16, 46]),
  };
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const logo = (await tryLoad(profile.logo_url)) || (await tryLoad(logoMRTransparent));
  const title = DOC_TITLES[data.docType] || 'ORÇAMENTO';
  const totals = computeTotals(data);

  let y = drawFullHeader(doc, profile, t, logo, title);

  /* ---- Identificação ---- */
  const validity =
    data.validityDays && data.docType !== 'recibo'
      ? new Date(data.date.getTime() + data.validityDays * 86400000).toLocaleDateString('pt-BR')
      : '';
  const ids: Array<[string, string]> = [
    [`${DOC_TYPE_LABELS[data.docType].toUpperCase()} Nº`, data.number],
    ['DATA', data.date.toLocaleDateString('pt-BR')],
    ...(validity ? ([['VALIDADE', validity]] as Array<[string, string]>) : []),
    ['STATUS', DOC_TYPE_LABELS[data.docType].toUpperCase()],
  ];
  const cellW = CONTENT_W / ids.length;
  doc.setFillColor(...PANEL);
  doc.rect(LEFT, y, CONTENT_W, 12, 'F');
  doc.setDrawColor(...t.gold);
  doc.setLineWidth(0.5);
  doc.rect(LEFT, y, CONTENT_W, 12);
  ids.forEach(([label, value], i) => {
    const x = LEFT + i * cellW;
    if (i > 0) doc.line(x, y + 2, x, y + 10);
    doc.setTextColor(...t.gold);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.6);
    doc.text(label, x + 3.5, y + 4.6);
    doc.setTextColor(...WHITE);
    doc.setFontSize(9.2);
    doc.text(value, x + 3.5, y + 9.4);
  });
  y += 17;

  /* ---- Cliente + Empresa ---- */
  const c = data.customer;
  const clientRows: Array<[string, string]> = (
    [
      ['Nome', c.name],
      ['Fantasia', c.fantasy],
      ['CPF', c.cpf],
      ['CNPJ', c.cnpj],
      ['Telefone', c.phone],
      ['WhatsApp', c.whatsapp],
      ['E-mail', c.email],
      ['Endereço', formatAddress(c)],
      ['Obs.', c.note],
    ] as Array<[string, string | undefined]>
  )
    .filter(([, v]) => !!v && String(v).trim())
    .map(([l, v]) => [l, String(v).trim()]);

  const companyRows: Array<[string, string]> = (
    [
      ['', (profile.name || '').toUpperCase()],
      ['CNPJ', profile.cnpj],
      ['Telefone', profile.phone],
      ['Responsável', profile.responsible_name],
      ['E-mail', profile.email],
      ['Endereço', [profile.address, [profile.city, profile.state].filter(Boolean).join('/')].filter(Boolean).join(' - ')],
    ] as Array<[string, string | undefined]>
  )
    .filter(([, v]) => !!v && String(v).trim())
    .map(([l, v]) => [l, String(v).trim()]);

  const gap = 5;
  const leftW = CONTENT_W * 0.58;
  const rightW = CONTENT_W - leftW - gap;
  const blockH = Math.max(measureInfoBlock(doc, leftW, clientRows), measureInfoBlock(doc, rightW, companyRows));
  drawInfoBlock(doc, t, LEFT, y, leftW, blockH, 'Dados do cliente', clientRows);
  drawInfoBlock(doc, t, LEFT + leftW + gap, y, rightW, blockH, 'Dados da empresa', companyRows);
  y += blockH + 6;

  /* ---- Descrição do serviço ---- */
  if (data.serviceTitle?.trim()) {
    y = ensureSpace(doc, y, 20);
    y = sectionTitle(doc, t, LEFT, y, CONTENT_W, 'Descrição do serviço');
    doc.setFillColor(...PAPER);
    doc.setDrawColor(...t.gold);
    const st = doc.splitTextToSize(data.serviceTitle.trim().toUpperCase(), CONTENT_W - 8) as string[];
    const h = 5 + st.length * 5.2;
    doc.rect(LEFT, y, CONTENT_W, h, 'FD');
    doc.setTextColor(...BLACK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    st.forEach((l, i) => doc.text(l, LEFT + 4, y + 6 + i * 5.2));
    y += h + 6;
  }

  /* ---- Tabela ---- */
  const images = await Promise.all(data.items.map((it) => tryLoad(it.imageUrl)));
  const hasImages = images.some(Boolean);
  y = ensureSpace(doc, y, 30);

  autoTable(doc, {
    startY: y,
    head: [['ITEM', 'DESCRIÇÃO', 'QUANT.', 'VALOR UNIT.', 'TOTAL']],
    body: data.items.map((it, i) => [
      String(i + 1).padStart(2, '0'),
      it.description + (it.kind === 'service' ? '\n(Serviço / mão de obra)' : ''),
      String(it.quantity),
      formatBRL(Number(it.unitPrice) || 0),
      formatBRL(lineTotal(it)),
    ]),
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      textColor: INK,
      lineColor: t.gold,
      lineWidth: 0.25,
      cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
      valign: 'middle',
      minCellHeight: hasImages ? 14 : 9,
    },
    headStyles: {
      fillColor: BLACK,
      textColor: t.gold,
      fontStyle: 'bold',
      fontSize: 8.6,
      lineColor: t.gold,
      lineWidth: 0.4,
      minCellHeight: 9,
    },
    bodyStyles: { fillColor: WHITE },
    alternateRowStyles: { fillColor: PAPER },
    columnStyles: {
      0: { cellWidth: hasImages ? 22 : 14, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: LEFT, right: PAGE_W - RIGHT, top: 26, bottom: FOOTER_H + 6 },
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    didParseCell: (h) => {
      if (h.section === 'body' && h.column.index === 0 && images[h.row.index]) {
        h.cell.styles.halign = 'left';
      }
    },
    didDrawCell: (h) => {
      if (h.section === 'body' && h.column.index === 0) {
        const img = images[h.row.index];
        if (img) {
          const size = Math.min(10, h.cell.height - 3);
          try {
            doc.addImage(img, 'PNG', h.cell.x + h.cell.width - size - 1.5, h.cell.y + (h.cell.height - size) / 2, size, size);
          } catch {
            /* imagem inválida: ignora */
          }
        }
      }
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 6;

  /* ---- Resumo + Total ---- */
  const summary: Array<[string, string]> = [];
  if (totals.services > 0 && totals.products > 0) {
    summary.push(['Equipamentos', formatBRL(totals.products)]);
    summary.push(['Serviços / mão de obra', formatBRL(totals.services)]);
  } else {
    summary.push(['Subtotal', formatBRL(totals.products + totals.services)]);
  }
  if (totals.shipping > 0) summary.push(['Frete', formatBRL(totals.shipping)]);
  if (totals.discount > 0) summary.push(['Desconto', `- ${formatBRL(totals.discount)}`]);

  const sumH = summary.length * 6 + 4;
  const totalBoxH = 22;
  y = ensureSpace(doc, y, sumH + totalBoxH + 4);
  const boxW = 92;
  const boxX = RIGHT - boxW;
  doc.setFillColor(...PAPER);
  doc.setDrawColor(...t.gold);
  doc.setLineWidth(0.35);
  doc.rect(boxX, y, boxW, sumH, 'FD');
  doc.setFontSize(9);
  summary.forEach(([l, v], i) => {
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'normal');
    doc.text(l, boxX + 4, y + 6 + i * 6);
    doc.setTextColor(...INK);
    doc.setFont('helvetica', 'bold');
    doc.text(v, RIGHT - 4, y + 6 + i * 6, { align: 'right' });
  });
  y += sumH + 3;

  doc.setFillColor(...BLACK);
  doc.rect(LEFT, y, CONTENT_W, totalBoxH, 'F');
  doc.setDrawColor(...t.gold);
  doc.setLineWidth(0.9);
  doc.rect(LEFT + 1, y + 1, CONTENT_W - 2, totalBoxH - 2);
  doc.setFillColor(...t.red);
  doc.rect(LEFT + 1, y + 1, 3, totalBoxH - 2, 'F');
  doc.setTextColor(...t.gold);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  const totalLabel = data.docType === 'recibo' ? 'VALOR RECEBIDO' : `VALOR TOTAL DO ${DOC_TYPE_LABELS[data.docType].toUpperCase()}`;
  doc.text(totalLabel, LEFT + 9, y + 13);
  doc.setTextColor(...WHITE);
  doc.setFontSize(20);
  doc.text(formatBRL(totals.total), RIGHT - 6, y + 14.5, { align: 'right' });
  y += totalBoxH + 7;

  /* ---- Pagamento + Garantia ---- */
  const pay = data.payment;
  const payLines: string[] = [];
  if (pay?.method) {
    if (pay.method === 'parcelado') {
      payLines.push(`À VISTA: ${formatBRL(totals.total)}`);
      payLines.push(`OU ${totals.installments}x de ${formatBRL(totals.installmentValue)}`);
      payLines.push(`TOTAL PARCELADO: ${formatBRL(totals.installmentTotal)}`);
    } else if (pay.method === 'personalizado') {
      payLines.push(...(pay.customText || '').split('\n').filter(Boolean));
    } else {
      payLines.push(`${PAYMENT_LABELS[pay.method].toUpperCase()}: ${formatBRL(totals.total)}`);
    }
  }
  const w = data.warranty;
  const warrantyLines: string[] = [];
  if (w?.option) {
    const period = w.option === 'custom' ? w.customPeriod || '' : WARRANTY_LABELS[w.option];
    warrantyLines.push(`GARANTIA: ${period.toUpperCase()}`);
    if (w.option !== 'none' && w.text?.trim()) warrantyLines.push(w.text.trim());
  }

  const blocks: Array<{ title: string; lines: string[] }> = [];
  if (payLines.length) blocks.push({ title: 'Condições de pagamento', lines: payLines });
  if (warrantyLines.length) blocks.push({ title: 'Garantia', lines: warrantyLines });

  if (blocks.length) {
    const bw = blocks.length === 2 ? (CONTENT_W - gap) / 2 : CONTENT_W;
    doc.setFontSize(9);
    const wrapped = blocks.map((b) => b.lines.flatMap((l) => doc.splitTextToSize(l, bw - 8) as string[]));
    const bh = 7 + 5 + Math.max(...wrapped.map((l) => l.length)) * 4.8 + 2;
    y = ensureSpace(doc, y, bh + 4);
    blocks.forEach((b, i) => {
      const x = LEFT + i * (bw + gap);
      doc.setFillColor(...PAPER);
      doc.setDrawColor(...t.gold);
      doc.setLineWidth(0.5);
      doc.rect(x, y, bw, bh, 'FD');
      sectionTitle(doc, t, x, y, bw, b.title);
      wrapped[i].forEach((l, j) => {
        const strong = j === 0 || (b.title.startsWith('Condi') && /^(OU|TOTAL)/.test(l));
        doc.setFont('helvetica', strong ? 'bold' : 'normal');
        doc.setTextColor(...(strong ? BLACK : INK));
        doc.setFontSize(9);
        doc.text(l, x + 4, y + 12.5 + j * 4.8);
      });
    });
    y += bh + 6;
  }

  /* ---- Observações ---- */
  const notes = (data.notes || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (notes.length) {
    doc.setFontSize(9);
    const wrapped = notes.flatMap((n) => doc.splitTextToSize(`• ${n.replace(/^[-•]\s*/, '')}`, CONTENT_W - 8) as string[]);
    let idx = 0;
    while (idx < wrapped.length) {
      y = ensureSpace(doc, y, 22);
      const room = Math.floor((PAGE_H - FOOTER_H - 8 - y - 12) / 4.8);
      const chunk = wrapped.slice(idx, idx + Math.max(1, room));
      const h = 7 + 5 + chunk.length * 4.8;
      doc.setFillColor(...PAPER);
      doc.setDrawColor(...t.gold);
      doc.setLineWidth(0.5);
      doc.rect(LEFT, y, CONTENT_W, h, 'FD');
      sectionTitle(doc, t, LEFT, y, CONTENT_W, idx === 0 ? 'Observações importantes' : 'Observações (continuação)');
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...INK);
      doc.setFontSize(9);
      chunk.forEach((l, j) => doc.text(l, LEFT + 4, y + 12.5 + j * 4.8));
      y += h + 6;
      idx += chunk.length;
    }
  }

  /* ---- Assinaturas ---- */
  if (data.showSignatures) {
    y = ensureSpace(doc, y, 34);
    y += 10;
    const sw = (CONTENT_W - 16) / 2;
    const sigs = [
      { title: 'ASSINATURA DO CLIENTE', lines: [`Nome: ${c.name || ''}`, 'Data: ____/____/________'] },
      {
        title: 'ASSINATURA DA CONTRATADA',
        lines: [profile.name, profile.responsible_name ? `Responsável: ${profile.responsible_name}` : ''].filter(Boolean),
      },
    ];
    sigs.forEach((s, i) => {
      const x = LEFT + i * (sw + 16);
      doc.setDrawColor(...BLACK);
      doc.setLineWidth(0.4);
      doc.line(x, y, x + sw, y);
      doc.setTextColor(...BLACK);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.6);
      doc.text(s.title, x + sw / 2, y + 5, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...MUTED);
      s.lines.forEach((l, j) => doc.text(l, x + sw / 2, y + 10 + j * 4.6, { align: 'center' }));
    });
    y += 22;
  }

  /* ---- Elementos fixos em todas as páginas ---- */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const total = (doc as any).getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    drawSidebar(doc, t);
    if (p > 1) drawCompactHeader(doc, profile, t, logo, DOC_TYPE_LABELS[data.docType].toUpperCase(), data.number);
    drawFooter(doc, profile, t, logo, p, total);
  }

  return doc;
}

/** Número único e sequencial: MR-2026-0001 */
export async function nextDocNumber(): Promise<string> {
  const { supabase } = await import('@/integrations/supabase/client');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('next_quote_number');
  if (!error && typeof data === 'string') return data;
  return `MR-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
}

export async function uploadPDF(doc: jsPDF, number: string): Promise<string | null> {
  const { supabase } = await import('@/integrations/supabase/client');
  try {
    const blob = doc.output('blob');
    const fileName = `${number}-${Date.now()}.pdf`;
    const { error } = await supabase.storage
      .from('quotes')
      .upload(fileName, blob, { contentType: 'application/pdf', cacheControl: '3600' });
    if (error) {
      console.error('Erro ao enviar PDF:', error);
      return null;
    }
    return supabase.storage.from('quotes').getPublicUrl(fileName).data.publicUrl;
  } catch (e) {
    console.error('Erro ao enviar PDF:', e);
    return null;
  }
}
