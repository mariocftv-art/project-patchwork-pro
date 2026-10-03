import { supabase } from '@/integrations/supabase/client';

// Serviços Técnicos Especializados, separados dos produtos físicos
export const TECH_SERVICES: Record<string, string[]> = {
  'CFTV': ['Instalação técnica de câmera', 'Substituição de câmera', 'Remanejamento de câmera', 'Configuração de DVR', 'Configuração de NVR', 'Configuração de acesso remoto', 'Configuração do aplicativo no celular', 'Organização técnica do rack', 'Organização de cabeamento', 'Manutenção de sistema de CFTV', 'Diagnóstico técnico', 'Testes e configuração final'],
  'Alarmes': ['Instalação de central de alarme', 'Instalação de sensores', 'Configuração de central de alarme', 'Configuração de zonas', 'Manutenção técnica de alarme', 'Diagnóstico e testes de alarme'],
  'Cerca elétrica': ['Instalação técnica de cerca elétrica', 'Manutenção de cerca elétrica', 'Substituição de componentes da cerca', 'Revisão de central de cerca', 'Testes de funcionamento da cerca'],
  'Controle de acesso': ['Instalação de controlador de acesso', 'Instalação de leitor de tags', 'Instalação de fechadura eletromagnética', 'Configuração de controle de acesso', 'Cadastro de usuários e tags', 'Testes de abertura e fechamento'],
  'Interfones e porteiros': ['Instalação de interfone', 'Instalação de porteiro eletrônico', 'Instalação de monofone', 'Configuração de central de portaria', 'Manutenção técnica de interfone', 'Diagnóstico e testes de interfone'],
  'Automação': ['Instalação de módulo de automação', 'Configuração de equipamentos de automação', 'Integração de dispositivos compatíveis', 'Manutenção e diagnóstico de automação'],
  'Complementares': ['Passagem de cabos', 'Substituição de cabeamento', 'Instalação de infraestrutura', 'Retirada de equipamento', 'Reinstalação de equipamento', 'Visita técnica', 'Manutenção preventiva', 'Manutenção corretiva', 'Configuração e entrega técnica'],
};

export interface ServiceDefault { name: string; price: number; image_url: string | null }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tbl = () => supabase.from('service_defaults' as any) as any;

export async function listServiceDefaults(): Promise<ServiceDefault[]> {
  const { data, error } = await tbl().select('name,price,image_url');
  if (error) throw error;
  return ((data || []) as ServiceDefault[]).map((r) => ({ ...r, price: Number(r.price) || 0 }));
}

export async function saveServiceDefault(d: ServiceDefault) {
  const { error } = await tbl().upsert({ name: d.name, price: d.price || 0, image_url: d.image_url || null }, { onConflict: 'name' });
  if (error) throw error;
}

/** Envia uma foto de item/serviço para o armazenamento público de documentos e devolve a URL. */
export async function uploadDocImage(file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `item-images/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('quotes').upload(path, file, { contentType: file.type || 'image/jpeg' });
  if (error) throw error;
  return supabase.storage.from('quotes').getPublicUrl(path).data.publicUrl;
}
