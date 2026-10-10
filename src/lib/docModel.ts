// Dados e regras dos documentos (sem jsPDF) — usado pela loja sem baixar o gerador de PDF.
import { buildScopeLines } from '@/lib/docScope';
import { formatBRL } from '@/lib/formatCurrency';

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

export const DOC_TITLES: Record<DocType, string> = {
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
