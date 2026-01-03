import { supabase } from '@/integrations/supabase/client';

export interface ServicePhoto {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  created_at: string;
}

export const servicePhotosApi = {
  async list(): Promise<ServicePhoto[]> {
    const { data, error } = await supabase
      .from('service_photos')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async create(photo: Omit<ServicePhoto, 'id' | 'created_at'>): Promise<ServicePhoto> {
    const { data, error } = await supabase
      .from('service_photos')
      .insert(photo)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('service_photos')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async uploadImage(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('service-photos')
      .upload(fileName, file);
    
    if (uploadError) throw uploadError;
    
    const { data } = supabase.storage
      .from('service-photos')
      .getPublicUrl(fileName);
    
    return data.publicUrl;
  },

  async deleteImage(imageUrl: string): Promise<void> {
    const fileName = imageUrl.split('/').pop();
    if (fileName) {
      await supabase.storage
        .from('service-photos')
        .remove([fileName]);
    }
  }
};
