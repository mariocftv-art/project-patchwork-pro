import { CompanyProfile } from '@/lib/companyProfile';
import { formatBRL } from '@/lib/formatCurrency';
import { categorize, ItemCategory } from '@/lib/docScope';
import {
  computeTotals,
  DOC_TYPE_LABELS,
  lineTotal,
  PAYMENT_LABELS,
  PremiumDocData,
  warrantyPeriod,
} from '@/lib/premiumPDF';

const SEP = '━━━━━━━━━━━━━━━━━━';

const GROUPS: Array<{ title: string; emoji: string; cats: ItemCategory[] }> = [
  { title: 'Câmeras', emoji: '📹', cats: ['CAMERA'] },
  { title: 'Gravadores', emoji: '🎥', cats: ['DVR', 'NVR'] },
  { title: 'Armazenamento', emoji: '💾', cats: ['HD'] },
  { title: 'Energia', emoji: '⚡', cats: ['FONTE'] },
  { title: 'Cabeamento', emoji: '🔌', cats: ['CABO'] },
  { title: 'Conectores', emoji: '🔩', cats: ['CONECTOR'] },
  { title: 'Rack', emoji: '🗄️', cats: ['RACK'] },
  { title: 'Controle de acesso', emoji: '🔐', cats: ['CONTROLE_ACESSO'] },
  { title: 'Interfonia', emoji: '📞', cats: ['INTERFONE', 'PORTEIRO'] },
  { title: 'Cerca elétrica', emoji: '⚡', cats: ['CERCA_ELETRICA'] },
  { title: 'Alarme', emoji: '🚨', cats: ['ALARME'] },
  { title: 'Equipamentos', emoji: '📦', cats: ['OUTRO'] },
  { title: 'Serviços', emoji: '🔧', cats: ['SERVICO'] },
];

function address(d: PremiumDocData) {
  const c = d.customer;
  return [
    [c.street, c.number].filter(Boolean).join(', '),
    c.complement,
    c.district,
    [c.city, c.state].filter(Boolean).join('/'),
  ]
    .filter((v) => v && String(v).trim())
    .join(' - ');
}

const ITEM_EMOJI: Partial<Record<ItemCategory, string>> = {
  CAMERA: '📹', DVR: '🎥', NVR: '🎥', HD: '💾', FONTE: '⚡', SERVICO: '🔧',
};

/**
 * Template EXCLUSIVO de ORÇAMENTO/documentos (QuoteWhatsAppTemplate).
 * Pedidos da loja usam whatsappTemplates.ts — nunca misturar.
 */
export function buildQuoteWhatsAppMessage(
  data: PremiumDocData,
  profile: CompanyProfile,
  opts: { pdfUrl?: string | null } = {}
): string {
  const t = computeTotals(data);
  const label = DOC_TYPE_LABELS[data.docType];
  const L = label.toUpperCase();
  const company = (profile.name || 'Minha Empresa').trim();
  const out: string[] = [];
  const push = (...l: string[]) => out.push(...l);

  push(`🛡️ *${company.toUpperCase()}*`, '', `📄 *${L} Nº ${data.number || '—'}*`, '');
  if (data.customer.name?.trim()) push('👤 *CLIENTE*', data.customer.name.trim(), '');
  push('📅 *DATA*', data.date.toLocaleDateString('pt-BR'));
  if (data.validityDays && data.docType !== 'recibo') {
    const v = new Date(data.date.getTime() + data.validityDays * 86400000).toLocaleDateString('pt-BR');
    push('', '⏳ *VALIDADE*', v);
  }
  push('', SEP, '', `📦 *ITENS DO ${L}*`);

  const items = data.items.filter((i) => i.description?.trim() && Number(i.quantity) > 0);
  GROUPS.forEach((g) => {
    const list = items.filter((i) => g.cats.includes(categorize(i)));
    if (!list.length) return;
    push('', `${g.emoji} *${g.title.toUpperCase()}*`);
    list.forEach((i) => {
      const q = Number(i.quantity);
      const e = ITEM_EMOJI[categorize(i)] || g.emoji;
      push(`${e} ${q}x ${i.description.trim()}`, `💰 ${formatBRL(Number(i.unitPrice) || 0)} cada`, `💵 Total: ${formatBRL(lineTotal(i))}`, '');
    });
  });
  if (out[out.length - 1] === '') out.pop();
  push('', SEP, '', '💰 *RESUMO FINANCEIRO*', '', `Subtotal: ${formatBRL(t.products + t.services)}`);
  if (t.shipping > 0) push(`Frete: ${formatBRL(t.shipping)}`);
  if (t.discount > 0) push(`Desconto: - ${formatBRL(t.discount)}`);
  push('', SEP, '', `💰 *TOTAL: ${formatBRL(t.total)}*`, '');

  const p = data.payment;
  push('💳 *FORMA DE PAGAMENTO*', '');
  const status = `Status: A combinar com a ${company}.`;
  if (p?.method === 'parcelado') {
    push(`Forma escolhida: PARCELADO — ${t.installments}x de ${formatBRL(t.installmentValue)}`, status);
  } else if (p?.method === 'personalizado' && p.customText?.trim()) {
    push(...p.customText.split('\n').map((l) => l.trim()).filter(Boolean), status);
  } else if (p?.method && p.method !== 'personalizado') {
    push(`Forma escolhida: ${PAYMENT_LABELS[p.method].toUpperCase()}`, status);
  } else {
    push(`A combinar com a ${company}.`);
  }

  const period = warrantyPeriod(data.warranty);
  if (period) push('', '🛡️ *GARANTIA*', '', `${period} de garantia.`);

  const notes = (data.notes || '').split('\n').map((l) => l.trim()).filter(Boolean);
  if (notes.length) push('', '📝 *OBSERVAÇÕES*', '', ...notes);

  if (opts.pdfUrl) push('', `📄 *${L} EM PDF*`, '', `🔗 ${opts.pdfUrl}`);

  push('', SEP, `🛡️ *${company.toUpperCase()}*`);
  if (profile.phone || profile.whatsapp) push(`📱 ${profile.phone || profile.whatsapp}`);

  return out.join('\n').normalize('NFC');
}

/**
 * Link do WhatsApp. Usa api.whatsapp.com/send (o redirecionamento do wa.me
 * corrompe emojis de 4 bytes e eles chegam como "�").
 */
export function whatsappUrl(phoneRaw: string, msg: string) {
  const phone = (phoneRaw || '').replace(/\D/g, '');
  const to = phone ? (phone.startsWith('55') ? phone : `55${phone}`) : '';
  return `https://api.whatsapp.com/send?${to ? `phone=${to}&` : ''}text=${encodeURIComponent(msg.normalize('NFC'))}`;
}
