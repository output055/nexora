'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function getTriggers() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('automated_triggers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch triggers:', error);
    return { success: false, error: error.message };
  }
  return { success: true, data };
}

export async function createTrigger(data: any) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('automated_triggers')
    .insert(data);

  if (error) {
    console.error('Failed to create trigger:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/admin/communications/settings');
  return { success: true };
}

export async function updateTrigger(id: string, data: any) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('automated_triggers')
    .update(data)
    .eq('id', id);

  if (error) {
    console.error('Failed to update trigger:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/admin/communications/settings');
  return { success: true };
}

export async function deleteTrigger(id: string) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('automated_triggers')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete trigger:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/admin/communications/settings');
  return { success: true };
}
