import { supabase } from '@/integrations/supabase/client';
import { formatBRL } from '@/lib/formatCurrency';
import type { Product } from '@/lib/supabaseApi';

export type PriceType = 'fixo' | 'a_partir' | 'consulta';
export type ServiceUnit = 'camera' | 'ponto' | 'metro' | 'equipamento' | 'servico';

export interface ServiceItem {
  id: string;
  title: string;
  description: string | null;
  summary: string | null;
  icon: string;
  image_url: string | null;
  image_illustrative?: boolean;
  features: string[];
  excluded: string[];
  conditions: { label: string; value: string }[];
  price: number | null;
  original_price: number | null;
  price_type: PriceType;
  unit: ServiceUnit;
  min_qty: number | null;
  promo_enabled: boolean;
  promo_price: number | null;
  promo_until: string | null;
  related_ids: string[];
  display_order: number;
  active: boolean;
}

export const UNIT_OPTIONS: { value: ServiceUnit; label: string; short: string; perUnit: string }[] = [
  { value: 'camera', label: 'por câmera', short: 'câmera', perUnit: 'por câmera instalada' },
  { value: 'ponto', label: 'por ponto', short: 'ponto', perUnit: 'por ponto instalado' },
  { value: 'metro', label: 'por metro', short: 'metro', perUnit: 'por metro' },
  { value: 'equipamento', label: 'por equipamento', short: 'equipamento', perUnit: 'por equipamento instalado' },
  { value: 'servico', label: 'por serviço', short: 'serviço', perUnit: 'por serviço' },
];
export const unitInfo = (u: string) => UNIT_OPTIONS.find((o) => o.value === u) || UNIT_OPTIONS[4];
/** Unidades em que o cliente escolhe a quantidade */
export const isCountable = (u: string) => ['camera', 'ponto', 'metro', 'equipamento'].includes(u);

/** Prefixo usado no carrinho para diferenciar serviço de produto */
export const SERVICE_PREFIX = 'svc:';
export const isServiceCartId = (id: string) => id.startsWith(SERVICE_PREFIX);

export function servicePromoActive(s: Pick<ServiceItem, 'promo_enabled' | 'promo_price' | 'promo_until' | 'price'>) {
  const p = Number(s.price || 0);
  const pp = Number(s.promo_price || 0);
  return !!s.promo_enabled && pp > 0 && pp < p && (!s.promo_until || new Date(s.promo_until).getTime() > Date.now());
}

/** Preço cobrado agora (promo quando ativa); null = sob consulta */
export function serviceCharge(s: ServiceItem): number | null {
  if (s.price_type === 'consulta' || !s.price || Number(s.price) <= 0) return null;
  return servicePromoActive(s) ? Number(s.promo_price) : Number(s.price);
}

export function servicePriceLabel(s: ServiceItem) {
  const v = serviceCharge(s);
  if (v == null) return 'Sob consulta';
  return (s.price_type === 'a_partir' ? 'A partir de ' : '') + formatBRL(v);
}

const norm = (r: Record<string, unknown>): ServiceItem => ({
  ...(r as unknown as ServiceItem),
  features: (r.features as string[]) || [],
  excluded: (r.excluded as string[]) || [],
  conditions: Array.isArray(r.conditions) ? (r.conditions as ServiceItem['conditions']) : [],
  related_ids: (r.related_ids as string[]) || [],
  price: r.price == null ? null : Number(r.price),
  promo_price: r.promo_price == null ? null : Number(r.promo_price),
});

export const servicesApi = {
  async listActive(): Promise<ServiceItem[]> {
    const { data, error } = await supabase.from('installation_services').select('*').eq('active', true).order('display_order');
    if (error) throw error;
    return (data || []).map((r) => norm(r as Record<string, unknown>));
  },
  async listAll(): Promise<ServiceItem[]> {
    const { data, error } = await supabase.from('installation_services').select('*').order('display_order');
    if (error) throw error;
    return (data || []).map((r) => norm(r as Record<string, unknown>));
  },
  async get(id: string): Promise<ServiceItem | null> {
    const { data, error } = await supabase.from('installation_services').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? norm(data as Record<string, unknown>) : null;
  },
};

/** Serviço com preço vira um "item" com o mesmo formato de produto, só para o carrinho e o checkout. */
export function serviceAsCartProduct(s: ServiceItem): Product & { is_service: true; unit_label: string } {
  const charge = serviceCharge(s) || 0;
  return {
    id: SERVICE_PREFIX + s.id,
    title: s.title,
    description: s.summary || s.description,
    price: charge,
    original_price: servicePromoActive(s) ? Number(s.price) : null,
    category: 'servico',
    subcategory: null,
    brand: null,
    model: null,
    sku: null,
    image_url: s.image_url,
    gallery_urls: [],
    stock: 9999,
    featured: false,
    on_sale: false,
    status: s.active ? 'active' : 'inactive',
    created_at: null,
    updated_at: null,
    is_service: true,
    unit_label: unitInfo(s.unit).perUnit,
  } as unknown as Product & { is_service: true; unit_label: string };
}

/** Produtos + serviços contratáveis: usado só pelo carrinho e pelo checkout. */
export async function catalogForCart(): Promise<Product[]> {
  const { productsApi } = await import('@/lib/supabaseApi');
  const [prods, svcs] = await Promise.all([productsApi.list(), servicesApi.listActive().catch(() => [])]);
  return [...prods, ...svcs.filter((s) => serviceCharge(s) != null).map(serviceAsCartProduct)];
}
