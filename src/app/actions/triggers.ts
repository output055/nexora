'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { logAudit } from '@/lib/audit';
import { requireAdmin } from '@/lib/auth-guard';

export async function getTriggers() {
  try {
    await requireAdmin();
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
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createTrigger(data: any) {
  try {
    const authCtx = await requireAdmin();
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from('automated_triggers')
      .insert(data);

    if (error) {
      console.error('Failed to create trigger:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/admin/communications/settings');
    await logAudit(`Created notification trigger: ${data.event_key || data.trigger_type || 'Unknown'} by ${authCtx.user.email}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateTrigger(id: string, data: any) {
  try {
    const authCtx = await requireAdmin();
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
    await logAudit(`Updated notification trigger ID: ${id} by ${authCtx.user.email}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteTrigger(id: string) {
  try {
    const authCtx = await requireAdmin();
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
    await logAudit(`Deleted notification trigger ID: ${id} by ${authCtx.user.email}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
