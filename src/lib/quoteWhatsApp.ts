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

/** Mensagem profissional montada só com os dados do documento informado (nada fixo). */
export function buildQuoteWhatsAppMessage(
  data: PremiumDocData,
  profile: CompanyProfile,
  opts: { pdfUrl?: string | null } = {}
): string {
  const t = computeTotals(data);
  const label = DOC_TYPE_LABELS[data.docType];
  const date = data.date.toLocaleDateString('pt-BR');
  const validity =
    data.validityDays && data.docType !== 'recibo'
      ? new Date(data.date.getTime() + data.validityDays * 86400000).toLocaleDateString('pt-BR')
      : '';
  const c = data.customer;
  const out: string[] = [];
  const push = (...l: string[]) => out.push(...l);
  const opt = (emoji: string, name: string, v?: string) => {
    if (v && v.trim()) push(`${emoji} ${name}: ${v.trim()}`);
  };

  push(`🛡️ *NOVO ${label.toUpperCase()} — ${(profile.name || '').toUpperCase()}*`, SEP);
  push(`📋 *${label.toUpperCase()} Nº ${data.number || '—'}*`, `📅 Data: ${date}`);
  if (validity) push(`⏳ Validade: ${validity}`);
  push(`📌 Status: ${label}`, SEP);

  push('👤 *DADOS DO CLIENTE*');
  opt('👤', 'Nome', c.name);
  opt('🏢', 'Empresa', c.fantasy);
  opt('🪪', 'CPF', c.cpf);
  opt('🪪', 'CNPJ', c.cnpj);
  opt('📱', 'WhatsApp', c.whatsapp || c.phone);
  opt('📧', 'E-mail', c.email);
  opt('📍', 'Endereço', address(data));
  push(SEP);

  push(`🏢 *${(profile.name || '').toUpperCase()}*`);
  if (profile.cnpj) push(`CNPJ: ${profile.cnpj}`);
  opt('📱', 'WhatsApp', profile.phone || profile.whatsapp);
  opt('👨‍🔧', 'Responsável', profile.responsible_name);
  push(SEP);

  push(`🛠️ *ITENS DO ${label.toUpperCase()}*`);
  const items = data.items.filter((i) => i.description?.trim() && Number(i.quantity) > 0);
  GROUPS.forEach((g) => {
    const list = items.filter((i) => g.cats.includes(categorize(i)));
    if (!list.length) return;
    push('', `${g.emoji} *${g.title}*`);
    list.forEach((i) => {
      const q = Number(i.quantity);
      push(`• ${q}x ${i.description.trim()}`);
      if (q > 1) push(`   ${formatBRL(Number(i.unitPrice) || 0)} cada`, `   Total: ${formatBRL(lineTotal(i))}`);
      else push(`   ${formatBRL(lineTotal(i))}`);
    });
  });
  push(SEP);

  push('💰 *RESUMO FINANCEIRO*', `Subtotal: ${formatBRL(t.products + t.services)}`);
  if (t.shipping > 0) push(`Frete: ${formatBRL(t.shipping)}`);
  if (t.discount > 0) push(`Desconto: - ${formatBRL(t.discount)}`);
  push(SEP, `💵 *VALOR TOTAL: ${formatBRL(t.total)}*`, SEP);

  const p = data.payment;
  push('💳 *FORMA DE PAGAMENTO*');
  if (p?.method) {
    if (p.method === 'parcelado') {
      push(`• Forma escolhida: Parcelado — ${t.installments}x de ${formatBRL(t.installmentValue)} (total ${formatBRL(t.installmentTotal)})`);
    } else if (p.method === 'personalizado') {
      push(...(p.customText || '').split('\n').filter((l) => l.trim()).map((l) => `• ${l}`));
    } else {
      push(`• Forma escolhida: ${PAYMENT_LABELS[p.method]}`);
    }
    push('• Status: A combinar com a MR Segurança Máxima');
  } else {
    push('• A combinar com a MR Segurança Máxima');
  }
  push(SEP);

  const w = data.warranty;
  if (w?.option) {
    push('🛡️ *GARANTIA*', w.option === 'none' ? 'Sem garantia' : warrantyPeriod(w));
    if (w.option !== 'none' && w.text?.trim()) push(w.text.trim());
    push(SEP);
  }

  const notes = (data.notes || '').split('\n').map((l) => l.trim()).filter(Boolean);
  if (notes.length) push('📝 *OBSERVAÇÕES*', ...notes.map((n) => `• ${n.replace(/^[-•✓]\s*/, '')}`), SEP);

  if (opts.pdfUrl) push('📄 *DOCUMENTO*', '📥 Ver / baixar PDF:', opts.pdfUrl, SEP);

  push(`🛡️ *${(profile.name || '').toUpperCase()}*`, '*Câmeras e Alarmes*', '*Monitoramento 24H*');
  if (profile.phone || profile.whatsapp) push(`📱 ${profile.phone || profile.whatsapp}`);
  const slogan = (profile.footer_slogan || 'Segurança de verdade. Tranquilidade sempre.').trim();
  const [s1, ...s2] = slogan.split(/(?<=\.)\s+/);
  push('', `🔐 *${s1.toUpperCase()}*`);
  if (s2.length) push(`*${s2.join(' ').toUpperCase()}*`);

  return out.join('\n');
}

export function whatsappUrl(phoneRaw: string, msg: string) {
  const phone = (phoneRaw || '').replace(/\D/g, '');
  const to = phone ? (phone.startsWith('55') ? phone : `55${phone}`) : '';
  return `https://wa.me/${to}?text=${encodeURIComponent(msg)}`;
}
