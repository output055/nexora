'use server';

import { createServiceRoleSupabaseClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import type { Device } from '@/types';
import { logAudit } from '@/lib/audit';

export async function updateDeviceAction(id: string, updates: Partial<Device>) {
  try {
    const supabase = createServiceRoleSupabaseClient();
    
    const safeUpdates = { ...updates };
    delete safeUpdates.id;
    delete safeUpdates.created_at;
    safeUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('devices')
      .update(safeUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    
    revalidatePath('/dashboard/admin/devices');
    revalidatePath(`/dashboard/admin/customers/${updates.customer_id || ''}`);
    await logAudit(`Updated device details for ID: ${id}`);
    return { success: true, data };
  } catch (error: any) {
    console.error('Failed to update device:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteDeviceAction(id: string) {
  try {
    const supabase = createServiceRoleSupabaseClient();
    
    const { error } = await supabase
      .from('devices')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === '23503') {
        throw new Error('Cannot delete this device because there are payments or other records attached.');
      }
      throw new Error(error.message);
    }
    
    revalidatePath('/dashboard/admin/devices');
    revalidatePath('/dashboard/admin/customers');
    await logAudit(`Deleted device with ID: ${id}`);
    return { success: true };
  } catch (error: any) {
    console.error('Failed to delete device:', error);
    return { success: false, error: error.message };
  }
}
