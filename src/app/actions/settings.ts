'use server';

import { createServerSupabaseClient, createServiceRoleSupabaseClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { logAudit } from '@/lib/audit';
import { hasPermission } from '@/lib/permissions';

/**
 * Get a specific system setting by key.
 */
export async function getSystemSetting(key: string): Promise<string | null> {
  const supabase = createServiceRoleSupabaseClient();
  
  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', key)
    .single();
    
  if (error || !data) return null;
  return data.value;
}

/**
 * Get all system settings.
 */
export async function getAllSystemSettings(): Promise<Record<string, string>> {
  const supabase = createServiceRoleSupabaseClient();
  
  const { data, error } = await supabase
    .from('system_settings')
    .select('key, value');
    
  if (error || !data) return {};
  
  const settings: Record<string, string> = {};
  data.forEach((row) => {
    settings[row.key] = row.value;
  });
  
  return settings;
}

/**
 * Update a system setting. Requires superadmin or admin role.
 */
export async function updateSystemSetting(key: string, value: string): Promise<{ success: boolean; error?: string }> {
  try {
    const userClient = await createServerSupabaseClient();
    
    // Auth Check (make sure user is logged in before using service role)
    const { data: userData, error: authError } = await userClient.auth.getUser();
    if (authError || !userData?.user) {
      return { success: false, error: 'Unauthorized' };
    }
    
    // Permission Check
    const hasAccess = await hasPermission(userData.user.id, 'manage_settings');
    if (!hasAccess) {
      return { success: false, error: 'Permission denied: Requires manage_settings' };
    }
    
    // Check if user has permission (optional, since this is an admin dashboard action, 
    // but good practice. For now, we trust the UI guard, but let's just use the service role)
    const supabaseAdmin = createServiceRoleSupabaseClient();

    // Upsert the setting using service_role to bypass RLS
    const { error } = await supabaseAdmin
      .from('system_settings')
      .upsert({ key, value })
      .eq('key', key);

    if (error) {
      console.error('Error updating setting:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/admin/settings');
    await logAudit(`Updated system setting: ${key}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Update multiple system settings at once.
 */
export async function updateSystemSettings(settings: Record<string, string>): Promise<{ success: boolean; error?: string }> {
  try {
    const userClient = await createServerSupabaseClient();
    
    // Auth Check
    const { data: userData, error: authError } = await userClient.auth.getUser();
    if (authError || !userData?.user) {
      return { success: false, error: 'Unauthorized' };
    }
    
    // Permission Check
    const hasAccess = await hasPermission(userData.user.id, 'manage_settings');
    if (!hasAccess) {
      return { success: false, error: 'Permission denied: Requires manage_settings' };
    }
    
    const supabaseAdmin = createServiceRoleSupabaseClient();

    const updates = Object.entries(settings).map(([key, value]) => ({ key, value }));

    // Upsert the settings array
    const { error } = await supabaseAdmin
      .from('system_settings')
      .upsert(updates, { onConflict: 'key' });

    if (error) {
      console.error('Error updating settings:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/admin/system-settings');
    await logAudit(`Updated multiple system settings in bulk`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
