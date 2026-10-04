import { Camera, HardDrive, Zap, Bell, Phone, DoorOpen, Settings, Cable, Wrench, Tag, type LucideIcon } from 'lucide-react';

/** Ícones disponíveis para categorias (nome salvo no banco → ícone). */
export const CATEGORY_ICONS: Record<string, { label: string; Icon: LucideIcon }> = {
  camera: { label: 'Câmera', Icon: Camera },
  'hard-drive': { label: 'Gravador', Icon: HardDrive },
  zap: { label: 'Raio (cerca)', Icon: Zap },
  bell: { label: 'Sino (alarme)', Icon: Bell },
  phone: { label: 'Interfone', Icon: Phone },
  'door-open': { label: 'Porta (porteiro)', Icon: DoorOpen },
  settings: { label: 'Engrenagem', Icon: Settings },
  cable: { label: 'Cabo', Icon: Cable },
  wrench: { label: 'Ferramenta', Icon: Wrench },
  tag: { label: 'Etiqueta', Icon: Tag },
};

export function CategoryIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = CATEGORY_ICONS[name || '']?.Icon ?? Tag;
  return <Icon className={className} />;
}

/** Link da categoria na loja (Instalações tem página própria). */
export const categoryPath = (slug: string) =>
  slug === 'instalacoes' ? '/servicos' : `/?categoria=${encodeURIComponent(slug)}`;
