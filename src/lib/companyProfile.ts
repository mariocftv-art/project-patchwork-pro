import { supabase } from '@/integrations/supabase/client';

export interface CompanyProfile {
  id?: string;
  name: string;
  tagline: string;
  cnpj: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  state: string;
  website: string;
  instagram: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  pdf_footer_text: string;
  pdf_notes_text: string;
  quote_validity_days: number;
  whatsapp_customer_template: string;
  whatsapp_admin_template: string;
  responsible_name: string;
  footer_slogan: string;
  default_warranty: string;
  default_warranty_text: string;
  pdf_gold_color: string;
  pdf_red_color: string;
}

export const DEFAULT_CUSTOMER_TEMPLATE = `🛡️ *{EMPRESA}*

✅ *PEDIDO REALIZADO COM SUCESSO!*

Olá, *{NOME_CLIENTE}*!

Recebemos seu pedido e ele foi registrado com sucesso.

📦 *DADOS DO PEDIDO*
🔹 *Pedido:* #{NUMERO_PEDIDO}
🔹 *Data:* {DATA} às {HORARIO}
🔹 *Status:* {STATUS}

🛒 *PRODUTOS*
{PRODUTOS}

💰 *RESUMO*
Subtotal: {SUBTOTAL}
Frete: {FRETE}
Desconto: {DESCONTO}
━━━━━━━━━━━━
💰 *TOTAL: {TOTAL}*

📲 *PRÓXIMO PASSO*
Nossa equipe entrará em contato pelo WhatsApp para finalizar o atendimento e combinar a forma de pagamento.

🔎 *Acompanhar pedido:*
{LINK_PEDIDO}

Obrigado por comprar com a *{EMPRESA}*! 🛡️`;

export const DEFAULT_ADMIN_TEMPLATE = `🚨 *NOVO PEDIDO RECEBIDO*
🛡️ *{EMPRESA}*

📦 *PEDIDO #{NUMERO_PEDIDO}*

👤 *CLIENTE*
Nome: {NOME_CLIENTE}
WhatsApp: {TELEFONE}
Endereço: {ENDERECO}

🛒 *ITENS DO PEDIDO*
{PRODUTOS}

💰 *VALORES*
Subtotal: {SUBTOTAL}
Frete: {FRETE}
Desconto: {DESCONTO}
━━━━━━━━━━━━
💰 *TOTAL: {TOTAL}*

📅 Data: {DATA}
🕐 Horário: {HORARIO}
🔎 *Status:* {STATUS}

🔗 *Acompanhar pedido:*
{LINK_PEDIDO}`;

export const defaultCompanyProfile: CompanyProfile = {
  name: 'MR Segurança Máxima',
  tagline: 'Sistemas de Segurança Eletrônica',
  cnpj: '45.858.215/0001-86',
  phone: '(11) 96257-9428',
  whatsapp: '5511962579428',
  email: 'contato@mrseguranca.com',
  address: '',
  city: 'São Paulo',
  state: 'SP',
  website: '',
  instagram: '@linkmrstore',
  logo_url: null,
  primary_color: '#1E3A8A',
  secondary_color: '#0F172A',
  accent_color: '#2563EB',
  pdf_footer_text: '',
  pdf_notes_text:
    'Este orçamento é válido pelo prazo indicado acima.\nPreços sujeitos a alteração após o período de validade.\nO pagamento é combinado via WhatsApp após a confirmação do pedido.',
  quote_validity_days: 15,
  whatsapp_customer_template: DEFAULT_CUSTOMER_TEMPLATE,
  whatsapp_admin_template: DEFAULT_ADMIN_TEMPLATE,
  responsible_name: 'Rogério',
  footer_slogan: 'SEGURANÇA DE VERDADE. TRANQUILIDADE SEMPRE.',
  default_warranty: '',
  default_warranty_text:
    'Todos os equipamentos instalados e configurados possuem garantia conforme as condições estabelecidas neste orçamento.',
  pdf_gold_color: '#C9A227',
  pdf_red_color: '#C8102E',
};

function normalize(row: Record<string, unknown> | null): CompanyProfile {
  if (!row) return defaultCompanyProfile;
  const merged = { ...defaultCompanyProfile } as CompanyProfile;
  (Object.keys(defaultCompanyProfile) as Array<keyof CompanyProfile>).forEach((key) => {
    const value = row[key as string];
    if (value !== null && value !== undefined && value !== '') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (merged as any)[key] = value;
    }
  });
  merged.id = (row.id as string) ?? undefined;
  merged.logo_url = (row.logo_url as string) || null;
  return merged;
}

let cached: CompanyProfile | null = null;

export async function getCompanyProfile(forceRefresh = false): Promise<CompanyProfile> {
  if (cached && !forceRefresh) return cached;
  try {
    const { data, error } = await supabase
      .from('company_profile')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    cached = normalize(data as Record<string, unknown> | null);
  } catch (e) {
    console.error('[companyProfile] falha ao carregar, usando padrão:', e);
    cached = defaultCompanyProfile;
  }
  return cached;
}

export async function saveCompanyProfile(profile: CompanyProfile): Promise<CompanyProfile> {
  const payload = {
    name: profile.name,
    tagline: profile.tagline,
    cnpj: profile.cnpj,
    phone: profile.phone,
    whatsapp: profile.whatsapp.replace(/\D/g, ''),
    email: profile.email,
    address: profile.address,
    city: profile.city,
    state: profile.state,
    website: profile.website,
    instagram: profile.instagram,
    logo_url: profile.logo_url,
    primary_color: profile.primary_color,
    secondary_color: profile.secondary_color,
    accent_color: profile.accent_color,
    pdf_footer_text: profile.pdf_footer_text,
    pdf_notes_text: profile.pdf_notes_text,
    quote_validity_days: profile.quote_validity_days,
    whatsapp_customer_template: profile.whatsapp_customer_template,
    whatsapp_admin_template: profile.whatsapp_admin_template,
    responsible_name: profile.responsible_name,
    footer_slogan: profile.footer_slogan,
    default_warranty: profile.default_warranty,
    default_warranty_text: profile.default_warranty_text,
    pdf_gold_color: profile.pdf_gold_color,
    pdf_red_color: profile.pdf_red_color,
  };

  if (profile.id) {
    const { data, error } = await supabase
      .from('company_profile')
      .update(payload)
      .eq('id', profile.id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    cached = normalize(data as Record<string, unknown> | null);
  } else {
    const { data, error } = await supabase
      .from('company_profile')
      .insert(payload)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    cached = normalize(data as Record<string, unknown> | null);
  }
  return cached;
}
