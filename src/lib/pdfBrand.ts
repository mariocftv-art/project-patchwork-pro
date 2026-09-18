import type jsPDF from 'jspdf';
import logoMRTransparent from '@/assets/logo-mr-transparent.png';
import { CompanyProfile } from '@/lib/companyProfile';

export type RGB = [number, number, number];

export function hexToRgb(hex: string, fallback: RGB = [30, 58, 138]): RGB {
  const clean = (hex || '').trim().replace('#', '');
  if (clean.length !== 6) return fallback;
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return fallback;
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/** Garante contraste mínimo: cores muito claras caem para um tom escuro seguro */
export function safeDark(color: RGB, fallback: RGB = [30, 58, 138]): RGB {
  const luminance = (0.299 * color[0] + 0.587 * color[1] + 0.114 * color[2]) / 255;
  return luminance > 0.72 ? fallback : color;
}

export function loadImageAsBase64(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('canvas context indisponível'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = src;
  });
}

export interface BrandTheme {
  primary: RGB;
  secondary: RGB;
  accent: RGB;
  ink: RGB;
  muted: RGB;
  surface: RGB;
}

export function buildTheme(profile: CompanyProfile): BrandTheme {
  return {
    primary: safeDark(hexToRgb(profile.primary_color)),
    secondary: safeDark(hexToRgb(profile.secondary_color, [15, 23, 42]), [15, 23, 42]),
    accent: safeDark(hexToRgb(profile.accent_color, [37, 99, 235]), [37, 99, 235]),
    ink: [33, 37, 41],
    muted: [110, 118, 129],
    surface: [244, 246, 250],
  };
}

export const PAGE_MARGIN = 16;

/**
 * Cabeçalho institucional moderno (faixa colorida + logo + dados da empresa).
 * Retorna o Y onde o conteúdo pode começar.
 */
export async function drawDocumentHeader(
  doc: jsPDF,
  profile: CompanyProfile,
  theme: BrandTheme,
  documentTitle: string,
  meta: Array<{ label: string; value: string }>
): Promise<number> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const bandHeight = 46;

  doc.setFillColor(...theme.primary);
  doc.rect(0, 0, pageWidth, bandHeight, 'F');
  doc.setFillColor(...theme.accent);
  doc.rect(0, bandHeight, pageWidth, 2.5, 'F');

  // Logo
  let textX = PAGE_MARGIN;
  try {
    const logoSource = profile.logo_url || logoMRTransparent;
    const logoBase64 = await loadImageAsBase64(logoSource);
    doc.addImage(logoBase64, 'PNG', PAGE_MARGIN, 5, 36, 36);
    textX = PAGE_MARGIN + 40;
  } catch {
    textX = PAGE_MARGIN;
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(profile.name, textX, 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  if (profile.tagline) doc.text(profile.tagline, textX, 24);

  const contactLines = [
    profile.cnpj ? `CNPJ ${profile.cnpj}` : '',
    [profile.phone, profile.whatsapp ? `WhatsApp ${formatWhatsApp(profile.whatsapp)}` : '']
      .filter(Boolean)
      .join('  •  '),
    [profile.email, profile.website].filter(Boolean).join('  •  '),
    [profile.address, [profile.city, profile.state].filter(Boolean).join('/')]
      .filter(Boolean)
      .join(' - '),
  ].filter(Boolean);

  doc.setFontSize(7.6);
  contactLines.slice(0, 3).forEach((line, i) => {
    doc.text(line, textX, 30 + i * 4.6);
  });

  // Bloco de identificação do documento (direita)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(documentTitle.toUpperCase(), pageWidth - PAGE_MARGIN, 15, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  meta.forEach((item, i) => {
    doc.text(`${item.label}: ${item.value}`, pageWidth - PAGE_MARGIN, 23 + i * 5.5, {
      align: 'right',
    });
  });

  return bandHeight + 12;
}

export function formatWhatsApp(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  const local = digits.startsWith('55') ? digits.slice(2) : digits;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return raw;
}

/** Card claro com título — devolve o Y após o card */
export function drawCard(
  doc: jsPDF,
  theme: BrandTheme,
  x: number,
  y: number,
  width: number,
  title: string,
  lines: string[]
): number {
  const lineHeight = 5.4;
  const height = 13 + Math.max(lines.length, 1) * lineHeight;
  doc.setFillColor(...theme.surface);
  doc.roundedRect(x, y, width, height, 2.5, 2.5, 'F');
  doc.setFillColor(...theme.accent);
  doc.roundedRect(x, y, 2, height, 1, 1, 'F');

  doc.setTextColor(...theme.primary);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(title.toUpperCase(), x + 6, y + 8);

  doc.setTextColor(...theme.ink);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  lines.forEach((line, i) => {
    doc.text(line, x + 6, y + 15 + i * lineHeight);
  });
  return y + height;
}

/** Rodapé profissional com numeração em todas as páginas */
export function drawFooters(doc: jsPDF, profile: CompanyProfile, theme: BrandTheme) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const total = (doc as any).getNumberOfPages();

  const footerLine =
    profile.pdf_footer_text?.trim() ||
    [
      profile.name,
      profile.whatsapp ? `WhatsApp ${formatWhatsApp(profile.whatsapp)}` : '',
      profile.phone,
      profile.email,
      profile.website,
    ]
      .filter(Boolean)
      .join('  |  ');

  for (let page = 1; page <= total; page++) {
    doc.setPage(page);
    doc.setFillColor(...theme.primary);
    doc.rect(0, pageHeight - 14, pageWidth, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(footerLine, PAGE_MARGIN, pageHeight - 5.5);
    if (total > 1) {
      doc.text(`Página ${page} de ${total}`, pageWidth - PAGE_MARGIN, pageHeight - 5.5, {
        align: 'right',
      });
    }
  }
}
