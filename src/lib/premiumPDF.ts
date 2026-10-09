import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoMRTransparent from '@/assets/logo-generic.png';
import { CompanyProfile } from '@/lib/companyProfile';
import { formatBRL } from '@/lib/formatCurrency';
import { hexToRgb, RGB } from '@/lib/pdfBrand';
import { buildScopeLines, categorize, CATEGORY_BADGE } from '@/lib/docScope';
import { loadDocImage } from '@/lib/docImages';

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
  /** Oculta o valor deste item para o cliente (PDF, prévia, impressão, WhatsApp) */
  hidePrice?: boolean;
}

/** O valor do item fica escondido do cliente? */
export const isPriceHidden = (d: Pick<PremiumDocData, 'showItemPrices'>, it: DocItem) => d.showItemPrices === false || !!it.hidePrice;

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
  /** Mostrar valores de cada item (padrão: sim) */
  showItemPrices?: boolean;
  discount?: number;
  /** Valor a cobrar digitado à mão (null = somatório) */
  chargedTotal?: number | null;
  /** Nome da linha de ajuste (ex.: Desconto comercial) */
  adjustmentLabel?: string;
  shipping?: number;
  payment?: DocPayment;
  warranty?: DocWarranty;
  notes?: string;
  contractText?: string;
  showSignatures?: boolean;
  /** Assinaturas eletrônicas confirmadas (imagem PNG em data URL) */
  signatures?: { contratante?: DocSignature; contratada?: DocSignature };
}

export interface DocSignature {
  image: string;
  name: string;
  signedAt: string;
  ratio?: number;
  /** CPF/CNPJ de quem assinou (rodapé de autenticidade) */
  document?: string | null;
  ip?: string | null;
  /** Código de integridade do documento */
  code?: string | null;
  /** A arte já traz o nome e o risco da empresa (não repetir embaixo) */
  includesBrand?: boolean;
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

export function computeTotals(data: Pick<PremiumDocData, 'items' | 'discount' | 'shipping' | 'payment' | 'chargedTotal'>) {
  let productsC = 0;
  let servicesC = 0;
  data.items.forEach((it) => {
    const line = Math.round(cents(it.unitPrice) * (Number(it.quantity) || 0));
    if (it.kind === 'service') servicesC += line;
    else productsC += line;
  });
  const discountC = cents(data.discount || 0);
  const shippingC = cents(data.shipping || 0);
  const calculatedC = Math.max(0, productsC + servicesC + shippingC - discountC);
  const charged = data.chargedTotal;
  const totalC = charged != null && Number.isFinite(Number(charged)) && Number(charged) >= 0 ? cents(Number(charged)) : calculatedC;
  const adjustmentC = totalC - calculatedC;

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
    calculated: calculatedC / 100,
    adjustment: adjustmentC / 100,
    installments,
    installmentValue,
    installmentTotal,
  };
}

export const lineTotal = (it: DocItem) =>
  Math.round(cents(it.unitPrice) * (Number(it.quantity) || 0)) / 100;

/* ============ Cláusulas do contrato ============ */

/**
 * Texto padrão do contrato. As marcações {ESCOPO}, {VALOR_TOTAL}, {PAGAMENTO} e {GARANTIA_*}
 * são trocadas na hora de gerar, sempre a partir dos itens e dados atuais do documento.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function buildDefaultContractText(_data?: Pick<PremiumDocData, 'items' | 'warranty'>): string {
  return [
    '1. OBJETO DO CONTRATO',
    'A CONTRATADA realizará o fornecimento, instalação, configuração e testes do sistema de CFTV descrito neste contrato, incluindo organização dos componentes e entrega do sistema em funcionamento.',
    '',
    '2. EQUIPAMENTOS E SERVIÇOS',
    'Os equipamentos, materiais e serviços, com quantidades, valores unitários e totais, são os descritos na tabela de itens deste documento, totalizando {VALOR_TOTAL}.',
    '',
    '3. ESCOPO DA INSTALAÇÃO',
    'O serviço será executado conforme os equipamentos, quantidades e serviços descritos neste contrato. O sistema contratado contempla:',
    '{ESCOPO}',
    '',
    '4. GARANTIA — {GARANTIA_PERIODO}',
    'A garantia seguirá o período de {GARANTIA_PERIODO_MIN} e as condições registradas neste documento. A garantia não cobre danos decorrentes de mau uso, alterações não autorizadas, intervenção de terceiros, vandalismo, surtos elétricos, descargas atmosféricas ou danos externos.',
    '',
    '5. VALOR E CONDIÇÕES',
    'O valor global do fornecimento, materiais e serviços descritos neste contrato é de {VALOR_TOTAL}. {PAGAMENTO}',
    '',
    '6. ALTERAÇÃO DE ESCOPO',
    'Qualquer alteração ou serviço adicional solicitado posteriormente poderá ser objeto de orçamento complementar e dependerá de aprovação das partes.',
    '',
    '7. ACESSO AO LOCAL E INFRAESTRUTURA',
    'O cliente deverá disponibilizar acesso ao local e as condições necessárias para a execução do serviço. Quando houver infraestrutura elétrica, de rede ou física inadequada, eventuais adequações não previstas neste documento poderão ser cobradas separadamente, mediante aprovação do cliente.',
    '',
    '8. DISPOSIÇÕES GERAIS',
    'A assinatura deste documento representa a concordância das partes com o escopo, o valor e as condições aqui descritos.',
  ].join('\n');
}

function paymentSentence(data: PremiumDocData, totals: ReturnType<typeof computeTotals>) {
  const p = data.payment;
  if (!p?.method) return 'A forma e o cronograma de pagamento serão definidos e registrados entre as partes.';
  if (p.method === 'parcelado')
    return `Pagamento parcelado em ${totals.installments}x de ${formatBRL(totals.installmentValue)} (total parcelado de ${formatBRL(totals.installmentTotal)}).`;
  if (p.method === 'personalizado') return `Condição de pagamento: ${(p.customText || '').trim().replace(/\n+/g, '; ')}.`;
  return `Forma de pagamento: ${PAYMENT_LABELS[p.method]}.`;
}

export function warrantyPeriod(w?: DocWarranty): string {
  if (!w?.option || w.option === 'none') return '';
  return w.option === 'custom' ? (w.customPeriod || '').trim() : WARRANTY_LABELS[w.option];
}

/**
 * Troca as marcações pelo conteúdo atual. Em contratos antigos (sem {ESCOPO}), os tópicos
 * logo abaixo do título de ESCOPO são refeitos a partir dos itens reais.
 * Remove a cláusula de garantia se nenhuma foi escolhida e renumera as cláusulas.
 */
export function resolveContractText(data: PremiumDocData): string {
  const raw = data.contractText || '';
  if (!raw.trim()) return '';
  const totals = computeTotals(data);
  const scope = buildScopeLines(data.items);
  let lines = raw.split('\n');

  if (!raw.includes('{ESCOPO}')) {
    const hi = lines.findIndex((l) => /^\d+\.\s.*ESCOPO/i.test(l.trim()));
    if (hi >= 0) {
      let end = hi + 1;
      while (end < lines.length && !/^\d+\.\s/.test(lines[end].trim())) end++;
      const body = lines.slice(hi + 1, end);
      const rest = body.filter((l) => !/^\s*[•\-✓]/.test(l));
      const firstBullet = body.findIndex((l) => /^\s*[•\-✓]/.test(l));
      const intro = firstBullet >= 0 ? body.slice(0, firstBullet).filter((l) => !/^\s*[•\-✓]/.test(l)) : rest;
      const tail = firstBullet >= 0 ? body.slice(firstBullet).filter((l) => !/^\s*[•\-✓]/.test(l)) : [];
      lines = [...lines.slice(0, hi + 1), ...intro, '{ESCOPO}', ...tail, ...lines.slice(end)];
    }
  }

  // Garantia: sem garantia escolhida => remove a cláusula que usa as marcações
  const period = warrantyPeriod(data.warranty);
  if (!period) {
    const gi = lines.findIndex((l) => l.includes('{GARANTIA_PERIODO}') && /^\d+\.\s/.test(l.trim()));
    if (gi >= 0) {
      let end = gi + 1;
      while (end < lines.length && !/^\d+\.\s/.test(lines[end].trim())) end++;
      lines.splice(gi, end - gi);
    }
  }

  let n = 0;
  const out = lines
    .map((l) => (/^\d+\.\s/.test(l.trim()) ? l.trim().replace(/^\d+\./, `${++n}.`) : l))
    .join('\n')
    .replace(/\{ESCOPO\}/g, scope.length ? scope.join('\n') : '• Conforme itens descritos na tabela deste documento.')
    .replace(/\{VALOR_TOTAL\}/g, formatBRL(totals.total))
    .replace(/\{PAGAMENTO\}/g, paymentSentence(data, totals))
    .replace(/\{GARANTIA_PERIODO\}/g, period.toUpperCase())
    .replace(/\{GARANTIA_PERIODO_MIN\}/g, period);
  return out;
}

const DOC_FILE_LABEL: Record<DocType, string> = {
  orcamento: 'Orcamento',
  contrato: 'Contrato',
  os: 'OS',
  recibo: 'Recibo',
};

/** Ex.: MR-Seguranca-Maxima-Orcamento-MR-2026-0007.pdf */
export function docFileName(docType: DocType, number: string) {
  return `MR-Seguranca-Maxima-${DOC_FILE_LABEL[docType] || 'Orcamento'}-${(number || 'previa').replace(/[^\w-]/g, '')}.pdf`;
}

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
  if (data.docType === 'contrato') {
    if (!cpf && !cnpj) errors.push('Contrato: informe o CPF ou o CNPJ do cliente.');
    else if (cpf.length === 11 && !isValidCPFDigits(cpf)) errors.push('CPF inválido. Confira os números.');
  }
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
const SURFACE: RGB = [244, 242, 236];
const BLUE: RGB = [21, 101, 192]; // #1565C0
const BLUE_2: RGB = [25, 118, 210]; // #1976D2
const BLUE_LIGHT: RGB = [234, 243, 255]; // #EAF3FF
const RED_SOFT: RGB = [198, 40, 40]; // #C62828
let EXTRA = 0;
const G = (base: number) => base + EXTRA;

const PAGE_W = 210;
const PAGE_H = 297;
const SIDEBAR_W = 13;
const LEFT = SIDEBAR_W + 9;
const RIGHT = PAGE_W - 12;
const CONTENT_W = RIGHT - LEFT;
const FOOTER_H = 18;

interface Theme {
  gold: RGB;
  red: RGB;
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
    doc.setFillColor(...t.red);
    doc.circle(SIDEBAR_W / 2, y, 0.9, 'F');
    y += 4;
    doc.setTextColor(...t.gold);
    const tw = doc.getTextWidth(w);
    doc.text(w, SIDEBAR_W / 2 + 1.2, y + tw, { angle: 90 });
    y += tw + 8;
  });
}

async function tryLoad(src?: string | null, maxPx?: number) {
  if (!src) return null;
  return loadDocImage(src, maxPx);
}

function drawFullHeader(doc: jsPDF, profile: CompanyProfile, t: Theme, logo: string | null, title: string) {
  const h = 32;
  doc.setFillColor(...BLACK);
  doc.rect(SIDEBAR_W + 1.4, 0, PAGE_W - SIDEBAR_W, h, 'F');
  doc.setFillColor(...t.gold);
  doc.rect(SIDEBAR_W + 1.4, h, PAGE_W - SIDEBAR_W, 0.7, 'F');

  let tx = LEFT;
  if (logo) {
    doc.addImage(logo, 'PNG', LEFT - 1, 4, 24, 24);
    tx = LEFT + 27;
  }
  // Nome: "MR" em dourado + restante em branco, espaçamento justo
  const name = (profile.name || 'MR SEGURANÇA MÁXIMA').toUpperCase().trim();
  const [firstWord, ...rest] = name.split(/\s+/);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setCharSpace(-0.15);
  doc.setTextColor(...t.gold);
  doc.text(firstWord, tx, 14);
  const fw = doc.getTextWidth(firstWord + ' ');
  doc.setTextColor(...WHITE);
  doc.text(rest.join(' '), tx + fw, 14);
  doc.setCharSpace(0);
  doc.setFillColor(...t.red);
  doc.rect(tx, 16.6, 16, 0.7, 'F');
  doc.setTextColor(...t.gold);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.6);
  doc.text('CÂMERAS E ALARMES', tx, 22);
  doc.setTextColor(215, 215, 215);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.text('MONITORAMENTO 24H', tx, 26.5);

  // título do documento
  let y = h + 11;
  doc.setTextColor(...BLACK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(title.length > 22 ? 15 : 19);
  doc.text(title, LEFT, y);
  y += 3;
  doc.setFillColor(...t.gold);
  doc.rect(LEFT, y, 40, 0.9, 'F');
  doc.setFillColor(...t.red);
  doc.rect(LEFT + 40, y, 8, 0.9, 'F');
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
  if (logo) doc.addImage(logo, 'PNG', LEFT - 1, y + 2.5, 13, 13);
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.3);
  doc.text((profile.name || '').toUpperCase(), LEFT + 15, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const wa = profile.phone || profile.whatsapp;
  if (wa) doc.text(`WhatsApp: ${wa}`, LEFT + 15, y + 12.5);
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
  if (total > 1) doc.text(`Página ${page}`, RIGHT, y + 17, { align: 'right' });
}

function ensureSpace(doc: jsPDF, y: number, needed: number) {
  if (y + needed > PAGE_H - FOOTER_H - 3) {
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
  EXTRA = 0;
  const first = await buildOnce(data, profile);
  // Uma página só e sobrando espaço: distribui melhor os blocos
  if (first.pages === 1 && first.free > 25) {
    EXTRA = Math.min(5, (first.free - 12) / 7);
    const second = await buildOnce(data, profile);
    EXTRA = 0;
    if (second.pages === 1) return second.doc;
  }
  EXTRA = 0;
  return first.doc;
}

async function buildOnce(data: PremiumDocData, profile: CompanyProfile): Promise<{ doc: jsPDF; pages: number; free: number }> {
  const t: Theme = {
    gold: hexToRgb(profile.pdf_gold_color, [201, 162, 39]),
    red: hexToRgb(profile.pdf_red_color, [200, 16, 46]),
  };
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  // Helvetica só cobre Latin-1: emojis/símbolos viravam "Ø=Þáþ". Remove-os de todo texto.
  const clean = (s: unknown) =>
    typeof s === 'string' ? s.replace(/[^\u0009\u000A\u000D\u0020-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026]/g, '').replace(/^\s+(?=\S)/, (m) => m) : s;
  const origText = doc.text.bind(doc);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (doc as any).text = (txt: any, ...args: any[]) =>
    origText(Array.isArray(txt) ? txt.map(clean) : clean(txt), ...args);
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
  doc.setFillColor(...SURFACE);
  doc.rect(LEFT, y, CONTENT_W, 10, 'F');
  doc.setFillColor(...t.gold);
  doc.rect(LEFT, y, 1.2, 10, 'F');
  ids.forEach(([label, value], i) => {
    const x = LEFT + i * cellW;
    if (i > 0) {
      doc.setDrawColor(215, 210, 195);
      doc.setLineWidth(0.2);
      doc.line(x, y + 2, x, y + 8);
    }
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.text(label, x + 4, y + 4);
    doc.setTextColor(...BLACK);
    doc.setFontSize(8.8);
    doc.text(value, x + 4, y + 8.2);
  });
  y += 10 + G(5);

  /* ---- Cliente + Empresa ---- */
  const c = data.customer;
  const clientRows: Array<[string, string]> = (
    [
      ['Nome', c.name],
      ['Fantasia', c.fantasy],
      ['CPF/CNPJ', [c.cpf, c.cnpj].filter((v) => v && v.trim()).join(' • ')],
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
      ['Instagram', profile.instagram],
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
  y += blockH + G(6);

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
    y += h + G(6);
  }

  /* ---- Tabela ---- */
  // Aguarda todas as imagens (ou a falha delas) antes de montar a tabela
  const images = await Promise.all(data.items.map((it) => tryLoad(it.imageUrl, 240)));
  const hasImages = true; // coluna de foto sempre presente: foto real ou ícone neutro da categoria
  const badges = data.items.map((it) => CATEGORY_BADGE[categorize(it)]);
  const anyPriceHidden = data.items.some((it) => isPriceHidden(data, it));
  const allPricesHidden = data.items.length > 0 && data.items.every((it) => isPriceHidden(data, it));
  y = ensureSpace(doc, y, 30);

  autoTable(doc, {
    startY: y,
    head: [allPricesHidden ? ['ITEM', 'DESCRIÇÃO', 'QUANT.'] : ['ITEM', 'DESCRIÇÃO', 'QUANT.', 'VALOR UNIT.', 'TOTAL']],
    body: data.items.map((it, i) => {
      const row = [
        String(i + 1).padStart(2, '0'),
        it.description + (it.kind === 'service' ? '\n(Serviço Técnico Especializado)' : ''),
        String(it.quantity),
      ];
      if (allPricesHidden) return row;
      const hid = isPriceHidden(data, it);
      return [...row, hid ? '—' : formatBRL(Number(it.unitPrice) || 0), hid ? 'Incluso' : formatBRL(lineTotal(it))];
    }),
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 9.2,
      textColor: INK,
      lineColor: [226, 222, 210],
      lineWidth: { top: 0, right: 0, left: 0, bottom: 0.25 },
      cellPadding: { top: 3.4, bottom: 3.4, left: 3.2, right: 3.2 },
      valign: 'middle',
      minCellHeight: hasImages ? 11.5 : 9,
    },
    headStyles: {
      fillColor: BLACK,
      textColor: t.gold,
      fontStyle: 'bold',
      fontSize: 8.6,
      lineColor: t.gold,
      lineWidth: { top: 0, right: 0, left: 0, bottom: 0.8 },
      minCellHeight: 9,
    },
    bodyStyles: { fillColor: WHITE },
    alternateRowStyles: { fillColor: [250, 249, 245] },
    columnStyles: {
      0: { cellWidth: hasImages ? 22 : 14, halign: 'center', fontStyle: 'bold', textColor: MUTED },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: allPricesHidden ? 24 : 20, halign: 'center', textColor: INK },
      3: { cellWidth: 28, halign: 'right', fontStyle: 'bold', textColor: BLUE_2 },
      4: { cellWidth: 30, halign: 'right', fontStyle: 'bold', textColor: BLUE, fontSize: 9.8 },
    },
    margin: { left: LEFT, right: PAGE_W - RIGHT, top: 26, bottom: FOOTER_H + 6 },
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    didParseCell: (h) => {
      if (h.section === 'head') {
        h.cell.styles.halign = (['center', 'left', 'center', 'right', 'right'] as const)[h.column.index];
      }
      if (h.section === 'body' && h.column.index === 0) {
        h.cell.styles.halign = 'left';
      }
    },
    didDrawCell: (h) => {
      if (h.section === 'body' && h.column.index === 0) {
        const img = images[h.row.index];
        const size = Math.min(9, h.cell.height - 2.5);
        const bx = h.cell.x + h.cell.width - 1.5 - size;
        const by = h.cell.y + (h.cell.height - size) / 2;
        let drawn = false;
        if (img) {
          try {
            const pr = doc.getImageProperties(img);
            const ratio = pr.width / pr.height || 1;
            const iw = ratio >= 1 ? size : size * ratio;
            const ih = ratio >= 1 ? size / ratio : size;
            doc.addImage(img, bx + (size - iw) / 2, h.cell.y + (h.cell.height - ih) / 2, iw, ih);
            drawn = true;
          } catch {
            drawn = false;
          }
        }
        if (!drawn) {
          // Ícone neutro da categoria (sem foto inventada)
          doc.setFillColor(...SURFACE);
          doc.setDrawColor(...t.gold);
          doc.setLineWidth(0.3);
          doc.roundedRect(bx, by, size, size, 1.2, 1.2, 'FD');
          doc.setTextColor(...MUTED);
          doc.setFont('helvetica', 'bold');
          const label = badges[h.row.index];
          doc.setFontSize(label.length > 4 ? 4.4 : 5.2);
          doc.text(label, bx + size / 2, by + size / 2 + 0.9, { align: 'center' });
        }
      }
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + G(6);

  /* ---- Resumo + Total ---- */
  const summary: Array<[string, string]> = [];
  if (anyPriceHidden) {
    // valores ocultos: só o total, com frete/desconto embutidos
  } else if (totals.services > 0 && totals.products > 0) {
    summary.push(['Equipamentos', formatBRL(totals.products)]);
    summary.push(['Serviço Técnico Especializado', formatBRL(totals.services)]);
  } else {
    summary.push(['Subtotal', formatBRL(totals.products + totals.services)]);
  }
  if (totals.shipping > 0) summary.push(['Frete', formatBRL(totals.shipping)]);
  if (totals.discount > 0) summary.push(['Desconto', `- ${formatBRL(totals.discount)}`]);
  if (totals.adjustment !== 0) {
    const lbl = (data.adjustmentLabel || '').trim() || (totals.adjustment < 0 ? 'Desconto comercial' : 'Acréscimo');
    summary.push([lbl, `${totals.adjustment < 0 ? '- ' : '+ '}${formatBRL(Math.abs(totals.adjustment))}`]);
  }

  if (anyPriceHidden) summary.length = 0;
  const sumH = summary.length ? summary.length * 6 + 4 : 0;
  const totalBoxH = 22;
  y = ensureSpace(doc, y, sumH + totalBoxH + 4);
  const boxW = 92;
  const boxX = RIGHT - boxW;
  doc.setFillColor(...BLUE_LIGHT);
  doc.setDrawColor(...t.gold);
  doc.setLineWidth(0.35);
  if (sumH) doc.rect(boxX, y, boxW, sumH, 'FD');
  doc.setFontSize(9);
  summary.forEach(([l, v], i) => {
    const isDiscount = v.startsWith('- ');
    doc.setTextColor(...(isDiscount ? RED_SOFT : MUTED));
    doc.setFont('helvetica', 'normal');
    doc.text(l, boxX + 4, y + 6 + i * 6);
    doc.setTextColor(...(isDiscount ? RED_SOFT : BLUE));
    doc.setFont('helvetica', 'bold');
    doc.text(v, RIGHT - 4, y + 6 + i * 6, { align: 'right' });
  });
  y += sumH ? sumH + 3 : 0;

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
  doc.setFontSize(22);
  const totalStr = formatBRL(totals.total);
  doc.text(totalStr, RIGHT - 6, y + 14.5, { align: 'right' });
  const tw = doc.getTextWidth(totalStr);
  doc.setFillColor(...BLUE_2);
  doc.rect(RIGHT - 6 - tw, y + 16.8, tw, 0.9, 'F');
  y += totalBoxH + G(7);

  /* ---- Observações ---- */
  const notes = (data.notes || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (notes.length) {
    doc.setFontSize(9);
    const wrapped = notes.flatMap((n) => doc.splitTextToSize(n.replace(/^[-•✓]\s*/, ''), CONTENT_W - 12).map((l: string, k: number) => (k === 0 ? `\u0001${l}` : l)) as string[]);
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
      chunk.forEach((l, j) => {
        const first = l.startsWith('\u0001');
        if (first) {
          doc.setFillColor(...t.gold);
          doc.rect(LEFT + 4.5, y + 10.6 + j * 4.8, 1.6, 1.6, 'F');
        }
        doc.text(first ? l.slice(1) : l, LEFT + 8.5, y + 12.5 + j * 4.8);
      });
      y += h + G(6);
      idx += chunk.length;
    }
  }

  /* ---- Cláusulas do contrato ---- */
  const resolvedContract = resolveContractText(data);
  const clauses = resolvedContract.split('\n');
  if (clauses.some((l) => l.trim())) {
    y = ensureSpace(doc, y, 30);
    y = sectionTitle(doc, t, LEFT, y, CONTENT_W, data.docType === 'contrato' ? 'Cláusulas do contrato' : 'Condições do serviço');
    y += 5;
    clauses.forEach((raw) => {
      const line = raw.trim();
      if (!line) {
        y += 1.5;
        return;
      }
      const isHead = /^\d+\.\s/.test(line) || (line === line.toUpperCase() && line.length < 60 && /[A-Z]/.test(line));
      const isBullet = /^[•\-✓]/.test(line);
      if (isHead) {
        y = ensureSpace(doc, y, 12);
        y += 1.2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.6);
        doc.setTextColor(...BLACK);
        doc.setFillColor(...t.red);
        doc.rect(LEFT, y - 3.2, 1.2, 4.2, 'F');
        doc.text(line, LEFT + 3.5, y);
        doc.setDrawColor(...t.gold);
        doc.setLineWidth(0.3);
        doc.line(LEFT + 3.5, y + 1.6, LEFT + 3.5 + Math.min(doc.getTextWidth(line), CONTENT_W - 4), y + 1.6);
        y += 5.2;
        return;
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...INK);
      const text = isBullet ? line.replace(/^[•\-✓]\s*/, '') : line;
      const indent = isBullet ? 8.5 : 3.5;
      const wrapped = doc.splitTextToSize(text, CONTENT_W - indent - 2) as string[];
      wrapped.forEach((l, k) => {
        y = ensureSpace(doc, y, 6);
        if (isBullet && k === 0) {
          doc.setFillColor(...t.gold);
          doc.rect(LEFT + 4.5, y - 2.2, 1.5, 1.5, 'F');
        }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...INK);
        doc.text(l, LEFT + indent, y);
        y += 4.4;
      });
      y += 0.5;
    });
    y += G(4);
  }

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
      payLines.push(`FORMA DE PAGAMENTO: ${PAYMENT_LABELS[pay.method].toUpperCase()}`);
    }
    if (data.docType !== 'recibo') payLines.push('STATUS: A COMBINAR COM A MR SEGURANÇA MÁXIMA');
  } else if (data.docType === 'orcamento') {
    payLines.push('PAGAMENTO: A COMBINAR COM A MR SEGURANÇA MÁXIMA');
  }
  const w = data.warranty;
  const warrantyLines: string[] = [];
  const warrantyInClauses = /\bGARANTIA\b/.test(resolvedContract.toUpperCase().split('\n').filter((l) => /^\d+\.\s/.test(l.trim())).join(' '));
  if (w?.option && !warrantyInClauses) {
    const period = w.option === 'custom' ? w.customPeriod || '' : WARRANTY_LABELS[w.option];
    warrantyLines.push(w.option === 'none' ? 'SEM GARANTIA' : `${period.toUpperCase()} DE GARANTIA`);
    if (w.option !== 'none' && w.text?.trim()) warrantyLines.push(w.text.trim());
  }

  const blocks: Array<{ title: string; lines: string[] }> = [];
  if (payLines.length) blocks.push({ title: 'Condições de pagamento', lines: payLines });
  if (warrantyLines.length) blocks.push({ title: 'Garantia', lines: warrantyLines });

  if (blocks.length) {
    const bw = blocks.length === 2 ? (CONTENT_W - gap) / 2 : CONTENT_W;
    doc.setFontSize(9);
    const wrapped = blocks.map((b) => b.lines.flatMap((l) => doc.splitTextToSize(l, bw - 8) as string[]));
    const bh = 7 + 4 + Math.max(...wrapped.map((l) => l.length)) * 4.6 + 1;
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
        doc.text(l, x + 4, y + 12 + j * 4.6);
      });
    });
    y += bh + G(6);
  }

  /* ---- Assinaturas ---- */
  if (data.showSignatures || data.signatures?.contratante || data.signatures?.contratada) {
    const hasImg = !!(data.signatures?.contratante || data.signatures?.contratada);
    y = ensureSpace(doc, y, hasImg ? 46 : 32);
    y += hasImg ? 22 : 9;
    const sw = (CONTENT_W - 16) / 2;
    const fmt = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    const sc = data.signatures?.contratante;
    const sm = data.signatures?.contratada;
    const sigs = [
      {
        sig: sc,
        title: data.docType === 'contrato' ? 'CONTRATANTE' : 'ASSINATURA DO CLIENTE',
        lines: [`Nome: ${sc?.name || c.name || ''}`, sc ? `Assinado eletronicamente em ${fmt(sc.signedAt)}` : 'Data: ____/____/________'],
      },
      {
        sig: sm,
        title: data.docType === 'contrato' ? 'CONTRATADA' : 'ASSINATURA DA CONTRATADA',
        lines: [
          profile.name,
          sm ? `Responsável: ${sm.name}` : profile.responsible_name ? `Responsável: ${profile.responsible_name}` : '',
          sm ? `Assinado eletronicamente em ${fmt(sm.signedAt)}` : 'Data: ____/____/________',
        ].filter(Boolean),
      },
    ];
    const goldRule = (x0: number, yy: number, w0: number) => {
      // Risco dourado: escuro → claro no meio → escuro, sumindo nas pontas
      const n = 60;
      const dark: [number, number, number] = [150, 108, 28];
      const light: [number, number, number] = [244, 214, 122];
      const paper: [number, number, number] = [255, 255, 255];
      for (let k = 0; k < n; k++) {
        const u = (k + 0.5) / n;
        const mid = 1 - Math.abs(u - 0.5) * 2; // 0 nas pontas, 1 no meio
        const fade = Math.min(1, Math.min(u, 1 - u) / 0.18);
        const g = dark.map((d, j) => d + (light[j] - d) * mid);
        const c = g.map((v, j) => Math.round(paper[j] + (v - paper[j]) * fade)) as [number, number, number];
        doc.setDrawColor(...c);
        doc.setLineWidth(0.7);
        doc.line(x0 + (w0 * k) / n, yy, x0 + (w0 * (k + 1)) / n + 0.05, yy);
      }
    };
    const fmtCnpj = (v?: string | null) => {
      const d = String(v || '').replace(/\D/g, '');
      return d.length === 14 ? d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : v || '';
    };
    let extra = 0;
    sigs.forEach((s, i) => {
      const x = LEFT + i * (sw + 16);
      const isCompany = i === 1 && data.docType === 'contrato';
      const embedded = isCompany && !!s.sig?.includesBrand;
      if (s.sig?.image) {
        try {
          const ih = embedded ? 22 : 18;
          let iw = ih * (s.sig.ratio || 3);
          let h = ih;
          if (iw > sw - 6) { iw = sw - 6; h = iw / (s.sig.ratio || 3); }
          doc.addImage(s.sig.image, 'PNG', x + (sw - iw) / 2, y - h - 0.5 + (embedded ? 8 : 0), iw, h);
        } catch (e) {
          console.error('assinatura', e);
        }
      }
      if (!isCompany) {
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
        return;
      }
      const when = sm ? `Assinado em ${new Date(sm.signedAt).toLocaleDateString('pt-BR')} às ${new Date(sm.signedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Data: ____/____/________';
      const cnpj = profile.cnpj ? `CNPJ: ${fmtCnpj(profile.cnpj)}` : '';
      let ly = y;
      if (embedded) {
        ly = y + 10;
      } else {
        doc.setDrawColor(...BLACK);
        doc.setLineWidth(0.4);
        doc.line(x, y, x + sw, y);
        goldRule(x + 4, y + 1.6, sw - 8);
        doc.setTextColor(...BLACK);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.6);
        doc.text(String(profile.name || '').toUpperCase(), x + sw / 2, y + 6.5, { align: 'center', charSpace: 0.8 });
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...MUTED);
        const resp = sm?.name || profile.responsible_name;
        const role = (profile as { responsible_role?: string }).responsible_role;
        if (resp) { doc.text(`Responsável: ${resp}${role ? ` — ${role}` : ''}`, x + sw / 2, y + 11, { align: 'center' }); ly = y + 4.5; }
        ly += 6.5;
      }
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...MUTED);
      doc.setFontSize(8.6);
      [cnpj, when].filter(Boolean).forEach((l, j) => doc.text(l, x + sw / 2, ly + 4.5 + j * 4.6, { align: 'center' }));
      extra = Math.max(extra, ly - y);
    });
    y += 24 + Math.max(0, extra - 6);

    // Rodapé de autenticidade
    const fmtDoc = (v?: string | null) => {
      const x = String(v || '').replace(/\D/g, '');
      if (x.length === 11) return x.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      if (x.length === 14) return x.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
      return v || '';
    };
    const auth = [sc, sm].filter(Boolean) as DocSignature[];
    if (auth.length) {
      const code = (auth.find((a) => a.code)?.code || '').slice(0, 16).toUpperCase();
      const lines = auth.map((a) => {
        const dl = a.document ? `, ${String(a.document).replace(/\D/g, '').length > 11 ? 'CNPJ' : 'CPF'} ${fmtDoc(a.document)}` : '';
        return `Assinado eletronicamente por ${a.name}${dl}, em ${fmt(a.signedAt)}${a.ip ? `, IP ${a.ip}` : ''}`;
      });
      if (code) lines.push(`Código do documento: ${code}`);
      y = ensureSpace(doc, y, lines.length * 4 + 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(...MUTED);
      lines.forEach((l) => {
        const wrapped = doc.splitTextToSize(l, CONTENT_W) as string[];
        wrapped.forEach((w) => { doc.text(w, LEFT, y); y += 3.6; });
      });
    }
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

  return { doc, pages: total, free: PAGE_H - FOOTER_H - 6 - y };
}

/** Número único e sequencial: MR-2026-0001 */
export async function nextDocNumber(): Promise<string> {
  const { supabase } = await import('@/integrations/supabase/client');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('next_quote_number');
  if (!error && typeof data === 'string') return data;
  // Sem número inventado no navegador: o banco é o único que numera
  throw error || new Error('Não foi possível gerar o número do orçamento.');
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

function isValidCPFDigits(d: string): boolean {
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (n: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}
