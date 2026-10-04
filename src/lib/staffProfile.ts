import { supabase } from '@/integrations/supabase/client';

export type StaffProfile = {
  user_id: string; full_name: string | null; photo_url: string | null; phone: string | null;
  on_the_way_template: string | null; reminder_enabled: boolean; reminder_hour: number;
  show_header_shortcut: boolean; theme: 'light' | 'dark' | null;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tbl = () => (supabase as any).from('staff_profiles');
const COLS = 'user_id,full_name,photo_url,phone,on_the_way_template,reminder_enabled,reminder_hour,show_header_shortcut,theme';

export async function loadMyProfile(userId: string): Promise<StaffProfile> {
  const { data } = await tbl().select(COLS).eq('user_id', userId).maybeSingle();
  return data || { user_id: userId, full_name: null, photo_url: null, phone: null, on_the_way_template: null, reminder_enabled: false, reminder_hour: 7, show_header_shortcut: true, theme: null };
}
export async function saveMyProfile(p: StaffProfile) {
  const { error } = await tbl().upsert({ ...p, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw error;
}
