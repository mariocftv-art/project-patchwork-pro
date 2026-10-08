import { uploadImage } from '@/lib/imageUpload';
import { supabase } from '@/integrations/supabase/client';

export interface ServicePhoto {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  created_at: string;
  display_order: number;
  is_active: boolean;
}

export interface GallerySettings {
  id: string | null;
  menuEnabled: boolean;
  subtitle: string;
}

export const DEFAULT_GALLERY_SUBTITLE = 'Veja de perto o que já entregamos';

export const servicePhotosApi = {
  /** Todas as fotos (painel), na ordem escolhida. */
  async list(): Promise<ServicePhoto[]> {
    const { data, error } = await supabase
      .from('service_photos')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as ServicePhoto[];
  },

  /** Só as fotos ativas (site). */
  async listActive(): Promise<ServicePhoto[]> {
    return (await this.list()).filter((p) => p.is_active !== false);
  },

  async create(photo: { title: string; description: string | null; image_url: string }): Promise<void> {
    const { data: last } = await supabase.from('service_photos').select('display_order').order('display_order', { ascending: false }).limit(1).maybeSingle();
    const { error } = await supabase.from('service_photos').insert({ ...photo, display_order: (last?.display_order ?? 0) + 1 });
    if (error) throw error;
  },

  async setActive(id: string, is_active: boolean): Promise<void> {
    const { error } = await supabase.from('service_photos').update({ is_active }).eq('id', id);
    if (error) throw error;
  },

  async reorder(ids: string[]): Promise<void> {
    const results = await Promise.all(ids.map((id, i) => supabase.from('service_photos').update({ display_order: i + 1 }).eq('id', id)));
    const err = results.find((r) => r.error)?.error;
    if (err) throw err;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('service_photos').delete().eq('id', id);
    if (error) throw error;
  },

  async uploadImage(file: File, onProgress?: (pct: number) => void): Promise<string> {
    return uploadImage(file, { bucket: 'service-photos', folder: 'gallery', onProgress });
  },

  async deleteImage(imageUrl: string): Promise<void> {
    const fileName = imageUrl.split('/').pop();
    if (fileName) await supabase.storage.from('service-photos').remove([fileName]);
  },

  async getSettings(): Promise<GallerySettings> {
    const { data } = await supabase.from('company_profile').select('id, gallery_menu_enabled, gallery_subtitle').limit(1).maybeSingle();
    return {
      id: data?.id ?? null,
      menuEnabled: data?.gallery_menu_enabled !== false,
      subtitle: data?.gallery_subtitle?.trim() || DEFAULT_GALLERY_SUBTITLE,
    };
  },

  async saveSettings(s: GallerySettings): Promise<void> {
    if (!s.id) throw new Error('Salve primeiro os dados da empresa em Personalização.');
    const { error } = await supabase.from('company_profile')
      .update({ gallery_menu_enabled: s.menuEnabled, gallery_subtitle: s.subtitle.trim() || null })
      .eq('id', s.id);
    if (error) throw error;
  },
};
