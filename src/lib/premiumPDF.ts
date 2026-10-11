import { AWARENESS_TEXT, CLAUSE_HEAD, HIGHLIGHT_END, HIGHLIGHT_START, VERSION_LINE } from './contractClauses';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoMRTransparent from '@/assets/logo-generic.png';
import { CompanyProfile } from '@/lib/companyProfile';
import { formatBRL } from '@/lib/formatCurrency';
import { hexToRgb, RGB } from '@/lib/pdfBrand';
import { buildScopeLines, categorize, CATEGORY_BADGE } from '@/lib/docScope';
import { loadDocImage } from '@/lib/docImages';

export * from '@/lib/docModel';
import { fmtCpfCnpj, fmtPhoneBR, docStatusLabel, DOC_TITLES, computeTotals, lineTotal, isPriceHidden, resolveContractText, warrantyPeriod, PAYMENT_LABELS, WARRANTY_LABELS, DOC_TYPE_LABELS, docFileName, validateDoc } from '@/lib/docModel';
import type { DocType, DocItem, DocCustomer, DocPayment, DocWarranty, PremiumDocData, DocSignature, PaymentMethod, WarrantyOption } from '@/lib/docModel';


/* ============ Desenho ============ */

const BLACK: RGB = [14, 14, 16];
const PANEL: RGB = [26, 26, 30];
const WHITE: RGB = [255, 255, 255];
const INK: RGB = [28, 28, 32];
const MUTED: RGB = [105, 105, 112];
const PAPER: RGB = [251, 249, 243];
const SURFACE: RGB = [244, 242, 236];
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
  const h = 39;
  doc.setFillColor(...BLACK);
  doc.rect(SIDEBAR_W + 1.4, 0, PAGE_W - SIDEBAR_W, h, 'F');
  doc.setFillColor(...t.gold);
  doc.rect(SIDEBAR_W + 1.4, h, PAGE_W - SIDEBAR_W, 0.7, 'F');

  let tx = LEFT;
  if (logo) {
    try {
      // Logo da Personalização: 22 mm (~83 px), proporção preservada
      const pr = doc.getImageProperties(logo);
      const ratio = pr.width / pr.height || 1;
      const lh = 22;
      const lw = Math.min(34, lh * ratio);
      doc.addImage(logo, 'PNG', LEFT - 1, 4, lw, lw / ratio);
      tx = LEFT + lw + 4;
    } catch (e) {
      console.error('logo do PDF', e);
    }
  }
  // Nome: primeira palavra em dourado + restante em branco
  const name = (profile.name || 'MR SEGURANÇA MÁXIMA').toUpperCase().trim();
  const [firstWord, ...rest] = name.split(/\s+/);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setCharSpace(-0.15);
  doc.setTextColor(...t.gold);
  doc.text(firstWord, tx, 12.5);
  const fw = doc.getTextWidth(firstWord + ' ');
  doc.setTextColor(...WHITE);
  doc.text(rest.join(' '), tx + fw, 12.5);
  doc.setCharSpace(0);
  doc.setFillColor(...t.red);
  doc.rect(tx, 15, 16, 0.7, 'F');
  doc.setDrawColor(...t.gold);
  doc.setLineWidth(0.2);
  doc.line(tx + 17, 15.35, RIGHT, 15.35);
  const headline = (profile.pdf_headline ?? '').trim();
  const subline = (profile.pdf_subline ?? '').trim();
  const maxW = RIGHT - tx;
  if (headline) {
    doc.setTextColor(...t.gold);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.6);
    doc.text(doc.splitTextToSize(headline, maxW)[0], tx, 21);
  }
  if (subline) {
    doc.setTextColor(200, 200, 200);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.6);
    doc.text(doc.splitTextToSize(subline, maxW)[0], tx, 25.3);
  }
  // Linha fina de contato: CNPJ · telefone · e-mail · cidade
  const city = [profile.city, profile.state].filter(Boolean).join('/');
  const contact = [
    profile.cnpj ? `CNPJ ${fmtCpfCnpj(profile.cnpj)}` : '',
    fmtPhoneBR(profile.phone || profile.whatsapp),
    profile.email,
    city,
  ].filter((v) => v && String(v).trim()).join('  ·  ');
  if (contact) {
    doc.setTextColor(185, 185, 185);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(doc.splitTextToSize(contact, RIGHT - LEFT + 1)[0], LEFT - 1, 34);
  }

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
  if (logo) { try { doc.addImage(logo, 'PNG', LEFT - 2, 2, 14, 14); } catch { /* sem logo */ } }
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text((profile.name || '').toUpperCase(), LEFT + 15, 9);
  doc.setTextColor(...t.gold);
  doc.setFontSize(8);
  doc.text(`${title}  •  Nº ${number}`, LEFT + 15, 14);
}

function drawFooter(doc: jsPDF, profile: CompanyProfile, t: Theme, logo: string | null, page: number, total: number, ref: string) {
  const y = PAGE_H - FOOTER_H;
  doc.setFillColor(...BLACK);
  doc.rect(SIDEBAR_W + 1.4, y, PAGE_W - SIDEBAR_W, FOOTER_H, 'F');
  doc.setFillColor(...t.gold);
  doc.rect(SIDEBAR_W + 1.4, y, PAGE_W - SIDEBAR_W, 0.8, 'F');
  if (logo) { try { doc.addImage(logo, 'PNG', LEFT - 1, y + 2.5, 13, 13); } catch { /* sem logo */ } }
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.3);
  doc.text((profile.name || '').toUpperCase(), LEFT + 15, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const wa = profile.phone || profile.whatsapp;
  if (wa) doc.text(`WhatsApp: ${fmtPhoneBR(wa)}`, LEFT + 15, y + 12.5);
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
  doc.setFontSize(6.6);
  doc.text([ref, `Página ${page} de ${total}`, (profile.name || '').trim()].filter(Boolean).join('  ·  '), RIGHT, y + 16.6, { align: 'right' });
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
  const title = data.term ? 'TERMO DE RECEBIMENTO E ACEITE' : DOC_TITLES[data.docType] || 'ORÇAMENTO';
  const totals = computeTotals(data);

  let y = drawFullHeader(doc, profile, t, logo, title);

  /* ---- Identificação ---- */
  const validity =
    data.validityDays && data.docType !== 'recibo'
      ? new Date(data.date.getTime() + data.validityDays * 86400000).toLocaleDateString('pt-BR')
      : '';
  const ids: Array<[string, string]> = data.term ? [
    ['CONTRATO Nº', data.number],
    ['DATA DO CONTRATO', data.date.toLocaleDateString('pt-BR')],
    ['DATA DA CONCLUSÃO', data.term.completedAt ? new Date(data.term.completedAt).toLocaleDateString('pt-BR') : '____/____/________'],
  ] : [
    [`${DOC_TYPE_LABELS[data.docType].toUpperCase()} Nº`, data.number],
    ['DATA', data.date.toLocaleDateString('pt-BR')],
    ...(data.docType === 'contrato'
      ? ([['PRAZO DE EXECUÇÃO', (data.customer.executionTerm || '').trim() || 'CONFORME CLÁUSULAS']] as Array<[string, string]>)
      : validity ? ([['VALIDADE', validity]] as Array<[string, string]>) : []),
    ['STATUS', docStatusLabel(data)],
  ];
  const cellW = CONTENT_W / ids.length;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.4);
  const idLines = ids.map(([, v]) => (doc.splitTextToSize(v, cellW - 6) as string[]).slice(0, 2));
  const idH = 10 + (Math.max(...idLines.map((l) => l.length)) - 1) * 3.8;
  doc.setFillColor(...SURFACE);
  doc.rect(LEFT, y, CONTENT_W, idH, 'F');
  doc.setFillColor(...t.gold);
  doc.rect(LEFT, y, 1.2, idH, 'F');
  ids.forEach(([label], i) => {
    const x = LEFT + i * cellW;
    if (i > 0) {
      doc.setDrawColor(215, 210, 195);
      doc.setLineWidth(0.2);
      doc.line(x, y + 2, x, y + idH - 2);
    }
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.text(label, x + 4, y + 4);
    doc.setTextColor(...BLACK);
    doc.setFontSize(8.4);
    doc.text(idLines[i], x + 4, y + 8.2, { lineHeightFactor: 1.3 });
  });
  y += idH + G(5);

  /* ---- Cliente + Empresa ---- */
  const c = data.customer;
  const clientRows: Array<[string, string]> = (
    [
      ['Nome', c.name],
      ['Fantasia', c.fantasy],
      ['CPF/CNPJ', [c.cpf, c.cnpj].filter((v) => v && v.trim()).map(fmtCpfCnpj).join(' • ')],
      ['Telefone', fmtPhoneBR(c.phone)],
      ['WhatsApp', fmtPhoneBR(c.whatsapp) === fmtPhoneBR(c.phone) ? '' : fmtPhoneBR(c.whatsapp)],
      ['E-mail', c.email],
      ['Endereço', formatAddress(c)],
      ['Instalação', !c.installSame && c.installAddress?.trim() ? c.installAddress.trim() : data.docType === 'contrato' || data.docType === 'os' ? 'No mesmo endereço do cliente' : ''],
      ['Obs.', c.note],
    ] as Array<[string, string | undefined]>
  )
    .filter(([, v]) => !!v && String(v).trim())
    .map(([l, v]) => [l, String(v).trim()]);

  const companyRows: Array<[string, string]> = (
    [
      ['', (profile.name || '').toUpperCase()],
      ['CNPJ', fmtCpfCnpj(profile.cnpj)],
      ['Telefone', fmtPhoneBR(profile.phone)],
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
      1: { cellWidth: 'auto', halign: 'left', overflow: 'linebreak' },
      2: { cellWidth: allPricesHidden ? 24 : 20, halign: 'center', textColor: INK },
      3: { cellWidth: 28, halign: 'right', fontStyle: 'bold', textColor: BLACK },
      4: { cellWidth: 30, halign: 'right', fontStyle: 'bold', textColor: BLACK, fontSize: 9.8 },
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

  if (!data.term) {
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
  doc.setFillColor(...PAPER);
  doc.setDrawColor(...t.gold);
  doc.setLineWidth(0.35);
  if (sumH) doc.rect(boxX, y, boxW, sumH, 'FD');
  doc.setFontSize(9);
  summary.forEach(([l, v], i) => {
    const isDiscount = v.startsWith('- ');
    doc.setTextColor(...(isDiscount ? RED_SOFT : MUTED));
    doc.setFont('helvetica', 'normal');
    doc.text(l, boxX + 4, y + 6 + i * 6);
    doc.setTextColor(...(isDiscount ? RED_SOFT : BLACK));
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
  doc.setTextColor(...t.gold);
  doc.setFontSize(22);
  const totalStr = formatBRL(totals.total);
  doc.text(totalStr, RIGHT - 6, y + 14.5, { align: 'right' });
  const tw = doc.getTextWidth(totalStr);
  doc.setFillColor(...t.red);
  doc.rect(RIGHT - 6 - tw, y + 16.8, tw, 0.9, 'F');
  y += totalBoxH + G(7);

  }

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
  if (clauses.some((l) => l.trim() && l.trim() !== HIGHLIGHT_START && l.trim() !== HIGHLIGHT_END)) {
    y = ensureSpace(doc, y, 30);
    y = sectionTitle(doc, t, LEFT, y, CONTENT_W, data.term ? 'Declaração de recebimento' : data.docType === 'contrato' ? 'Cláusulas do contrato' : 'Condições do serviço');
    y += 5;
    const headOf = (l: string) => /^\d+\.\s/.test(l) || CLAUSE_HEAD.test(l) || (l === l.toUpperCase() && l.length < 60 && /[A-Z]/.test(l));
    const pageNo = () => (doc as unknown as { getCurrentPageInfo: () => { pageNumber: number } }).getCurrentPageInfo().pageNumber;
    // Quadro de destaque (CDC art. 54, §4º): borda, título e texto em negrito
    let box: { page: number; top: number } | null = null;
    const BX = LEFT + 0.5;
    const BW = CONTENT_W - 1;
    const drawBoxPart = (page: number, top: number, bottom: number) => {
      const cur = pageNo();
      doc.setPage(page);
      doc.setDrawColor(...t.red);
      doc.setLineWidth(0.7);
      doc.rect(BX, top, BW, bottom - top);
      doc.setPage(cur);
    };
    const space = (needed: number) => {
      const before = pageNo();
      const ny = ensureSpace(doc, y, needed);
      if (box && pageNo() !== before) {
        drawBoxPart(box.page, box.top, PAGE_H - FOOTER_H - 4);
        box = { page: pageNo(), top: ny - 6 };
        return ny + 1;
      }
      return ny;
    };
    const inBoxAt = (k: number) => {
      let open = false;
      for (let i = 0; i <= k; i++) {
        const l = clauses[i].trim();
        if (l === HIGHLIGHT_START) open = true;
        else if (l === HIGHLIGHT_END) open = false;
      }
      return open;
    };
    // Números das cláusulas em destaque (para a declaração de ciência)
    const boxNums = (from: number) => {
      const n: string[] = [];
      for (let k = from + 1; k < clauses.length && clauses[k].trim() !== HIGHLIGHT_END; k++) {
        const m = clauses[k].trim().match(CLAUSE_HEAD);
        if (m) n.push(`${m[1]}ª`);
      }
      return n.length > 1 ? `${n[0]} a ${n[n.length - 1]}` : n[0] || '';
    };
    // Altura de um bloco (título + texto até o próximo título), para nunca cortar cláusula entre páginas
    const blockHeight = (from: number) => {
      doc.setFont('helvetica', inBoxAt(from) ? 'bold' : 'normal');
      doc.setFontSize(9);
      let h = 6.4;
      for (let k = from + 1; k < clauses.length; k++) {
        const l = clauses[k].trim();
        if (headOf(l) || l === HIGHLIGHT_START || l === HIGHLIGHT_END) break;
        if (!l) { h += 1.5; continue; }
        const ind = /^[•\-✓]/.test(l) ? 8.5 : 3.5;
        h += (doc.splitTextToSize(l.replace(/^[•\-✓]\s*/, ''), CONTENT_W - ind - 4) as string[]).length * 4.4 + 0.5;
      }
      return h;
    };
    const usable = PAGE_H - FOOTER_H - 3 - 26;
    const sc0 = data.signatures?.contratante;
    let boxNumbers = '';
    clauses.forEach((raw, idx) => {
      const line = raw.trim();
      if (line === HIGHLIGHT_START) {
        boxNumbers = boxNums(idx);
        y = ensureSpace(doc, y, 40);
        y += 1;
        box = { page: pageNo(), top: y };
        y += 5;
        // triângulo de aviso + título
        doc.setFillColor(...t.red);
        doc.triangle(BX + 4, y + 0.8, BX + 7.4, y + 0.8, BX + 5.7, y - 2.9, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.text('!', BX + 5.7, y + 0.3, { align: 'center' });
        doc.setTextColor(...t.red);
        doc.setFontSize(10);
        doc.text('CLÁUSULAS DE ATENÇÃO — LEIA COM CUIDADO', BX + 9.5, y);
        y += 6;
        return;
      }
      if (line === HIGHLIGHT_END) {
        if (!box) return;
        // Declaração de ciência + rubrica, dentro do quadro
        const decl = `DECLARAÇÃO DE CIÊNCIA: ${AWARENESS_TEXT.replace('{CLAUSULAS_DESTAQUE}', boxNumbers || 'acima')}`;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.8);
        const dl = doc.splitTextToSize(decl, BW - 8) as string[];
        y = space(dl.length * 4.3 + 16);
        doc.setDrawColor(...t.gold);
        doc.setLineWidth(0.3);
        doc.line(BX + 3, y - 2.5, BX + BW - 3, y - 2.5);
        doc.setTextColor(...BLACK);
        dl.forEach((l) => { doc.text(l, BX + 3.5, y + 1.5); y += 4.3; });
        y += 4;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.6);
        if (sc0?.awareness) {
          doc.text(`Ciência confirmada eletronicamente por ${sc0.name} em ${new Date(sc0.signedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}.`, BX + 3.5, y);
          y += 4.5;
        }
        doc.text('Rubrica do CONTRATANTE:', BX + 3.5, y + 1);
        doc.setDrawColor(...BLACK);
        doc.setLineWidth(0.3);
        doc.line(BX + 42, y + 1.5, BX + 100, y + 1.5);
        y += 5;
        drawBoxPart(box.page, box.top, y);
        box = null;
        y += 4;
        return;
      }
      const bold = !!box;
      if (!line) {
        y += 1.5;
        return;
      }
      if (VERSION_LINE.test(line)) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(...INK);
        doc.text(line, LEFT + 3.5, y);
        y += 5;
        return;
      }
      const isHead = headOf(line);
      if (isHead && CLAUSE_HEAD.test(line)) {
        const bh = blockHeight(idx);
        y = space(Math.min(bh, usable) + 1.2);
      }
      const isBullet = /^[•\-✓]/.test(line);
      if (isHead) {
        y = space(12);
        y += 1.2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.6);
        doc.setTextColor(...BLACK);
        doc.setFillColor(...t.red);
        doc.rect(LEFT + (bold ? 1.8 : 0), y - 3.2, 1.2, 4.2, 'F');
        doc.text(line, LEFT + 3.5 + (bold ? 1 : 0), y);
        doc.setDrawColor(...t.gold);
        doc.setLineWidth(0.3);
        doc.line(LEFT + 3.5, y + 1.6, LEFT + 3.5 + Math.min(doc.getTextWidth(line), CONTENT_W - 6), y + 1.6);
        y += 5.2;
        return;
      }
      const font = bold ? 'bold' : 'normal';
      doc.setFont('helvetica', font);
      doc.setFontSize(9);
      const text = isBullet ? line.replace(/^[•\-✓]\s*/, '') : line;
      const indent = (isBullet ? 8.5 : 3.5) + (bold ? 1 : 0);
      const wrapped = doc.splitTextToSize(text, CONTENT_W - indent - (bold ? 4 : 2)) as string[];
      wrapped.forEach((l, k) => {
        y = space(6);
        if (isBullet && k === 0) {
          doc.setFillColor(...t.gold);
          doc.rect(LEFT + 4.5, y - 2.2, 1.5, 1.5, 'F');
        }
        doc.setFont('helvetica', font);
        doc.setFontSize(9);
        doc.setTextColor(...(bold ? BLACK : INK));
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
  const warrantyInClauses = /\bGARANTIA\b/.test(resolvedContract.toUpperCase().split('\n').filter((l) => /^\d+\.\s/.test(l.trim()) || CLAUSE_HEAD.test(l.trim())).join(' '));
  if (w?.option && !warrantyInClauses) {
    const period = w.option === 'custom' ? w.customPeriod || '' : WARRANTY_LABELS[w.option];
    warrantyLines.push(w.option === 'none' ? 'SEM GARANTIA' : `${period.toUpperCase()} DE GARANTIA`);
    if (w.option !== 'none' && w.text?.trim()) warrantyLines.push(w.text.trim());
  }

  const blocks: Array<{ title: string; lines: string[] }> = [];
  if (payLines.length) blocks.push({ title: 'Condições de pagamento', lines: payLines });
  if (warrantyLines.length) blocks.push({ title: 'Garantia', lines: warrantyLines });

  if (blocks.length && !data.term) {
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
        title: data.docType === 'contrato' || data.term ? 'CONTRATANTE' : 'ASSINATURA DO CLIENTE',
        lines: [`Nome: ${sc?.name || c.name || ''}`, ...(data.term ? [`CPF/CNPJ: ${c.cnpj || c.cpf ? fmtCpfCnpj(c.cnpj || c.cpf || '') : '______________________'}`] : []), sc ? `Assinado eletronicamente em ${fmt(sc.signedAt)}` : 'Data: ____/____/________'],
      },
      {
        sig: sm,
        title: data.term ? 'TÉCNICO RESPONSÁVEL' : data.docType === 'contrato' ? 'CONTRATADA' : 'ASSINATURA DA CONTRATADA',
        lines: data.term ? ['Nome: ______________________________', 'Data: ____/____/________'] : [
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
      const isCompany = i === 1 && data.docType === 'contrato' && !data.term;
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
    const lbl = data.term ? 'Termo de Aceite' : DOC_TYPE_LABELS[data.docType];
    if (p > 1) drawCompactHeader(doc, profile, t, logo, lbl.toUpperCase(), data.number);
    drawFooter(doc, profile, t, logo, p, total, data.term ? `Termo de Aceite — Contrato Nº ${data.number}` : `${lbl} Nº ${data.number}`);
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

/** Termo de Recebimento e Aceite, gerado a partir do contrato (sem valores). */
export function buildAcceptanceTerm(data: PremiumDocData, profile: CompanyProfile, completedAt?: string) {
  const c = data.customer;
  const addr = !c.installSame && c.installAddress?.trim() ? c.installAddress.trim() : 'no endereço do CONTRATANTE indicado acima';
  const text = [
    `1. O CONTRATANTE declara ter recebido, em pleno funcionamento, os equipamentos e serviços listados na tabela acima, referentes ao Contrato Nº ${data.number}, instalados ${addr.startsWith('no ') ? addr : `em ${addr}`}.`,
    '2. Declara que o funcionamento do sistema foi demonstrado, que recebeu as orientações de uso e de acesso remoto e as credenciais de acesso, comprometendo-se a alterá-las imediatamente.',
    '3. Declara ter sido orientado a guardar o gravador (DVR/NVR) e a fonte em local protegido, ventilado, seco e de acesso restrito.',
    '4. A partir desta data passa a contar o prazo de garantia previsto no contrato.',
    'Observações / divergências apontadas na entrega:',
    '______________________________________________________________________________________',
    '______________________________________________________________________________________',
  ].join('\n');
  return buildPremiumPDF({
    ...data, docType: 'contrato', showItemPrices: false, contractText: text, contractClauses: undefined,
    notes: '', payment: undefined, warranty: undefined, showSignatures: true, signatures: undefined, term: { completedAt },
  }, profile);
}
