import { Cctv, Server, Zap, Siren, Speaker, TvMinimal, Fence, Cable, Wrench, Tag, Images, type LucideIcon } from 'lucide-react';

/** Ícones disponíveis para categorias (nome salvo no banco → ícone). Mesmo traço (lucide). */
export const CATEGORY_ICONS: Record<string, { label: string; Icon: LucideIcon }> = {
  camera: { label: 'Câmera de segurança', Icon: Cctv },
  'hard-drive': { label: 'Gravador (DVR/NVR)', Icon: Server },
  zap: { label: 'Raio (cerca)', Icon: Zap },
  bell: { label: 'Sirene (alarme)', Icon: Siren },
  phone: { label: 'Interfone de parede', Icon: Speaker },
  'door-open': { label: 'Vídeo porteiro', Icon: TvMinimal },
  settings: { label: 'Portão (automação)', Icon: Fence },
  cable: { label: 'Cabo', Icon: Cable },
  wrench: { label: 'Ferramenta', Icon: Wrench },
  tag: { label: 'Etiqueta', Icon: Tag },
  portfolio: { label: 'Galeria', Icon: Images },
};

export function CategoryIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = CATEGORY_ICONS[name || '']?.Icon ?? Tag;
  return <Icon className={className} strokeWidth={1.75} />;
}

/** Link da categoria na loja (Instalações tem página própria). */
export const categoryPath = (slug: string) =>
  slug === 'instalacoes' ? '/servicos' : `/?categoria=${encodeURIComponent(slug)}`;
