'use server';

import { createServiceRoleSupabaseClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { logAudit } from '@/lib/audit';
import { requireAdmin, requireAuth } from '@/lib/auth-guard';

const SECRET_KEYS = new Set([
  'zoho_mdm_token',
  'sms_api_key',
  'paystack_secret_key',
  'client_secret',
  'refresh_token',
]);

/**
 * Internal helper for server-only operations to fetch settings including secrets.
 * NOT a server action.
 */
export async function getInternalSystemSetting(key: string): Promise<string | null> {
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
 * Get a specific system setting by key.
 * Secrets are masked/hidden unless caller is an authenticated administrator.
 */
export async function getSystemSetting(key: string): Promise<string | null> {
  if (SECRET_KEYS.has(key)) {
    // Only verified administrators can fetch secret settings
    try {
      await requireAdmin();
    } catch {
      return null;
    }
  }

  return getInternalSystemSetting(key);
}

/**
 * Get all system settings.
 * Sensitive API keys and OAuth tokens are redacted unless caller is an admin.
 */
export async function getAllSystemSettings(): Promise<Record<string, string>> {
  let isAdmin = false;
  try {
    const authCtx = await requireAuth();
    isAdmin = authCtx.isAdmin;
  } catch {
    isAdmin = false;
  }

  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from('system_settings')
    .select('key, value');

  if (error || !data) return {};

  const settings: Record<string, string> = {};
  data.forEach((row) => {
    if (!isAdmin && SECRET_KEYS.has(row.key)) {
      // Omit secret keys for non-admins
      return;
    }
    settings[row.key] = row.value;
  });

  return settings;
}

/**
 * Update a system setting. Requires superadmin or admin role.
 */
export async function updateSystemSetting(key: string, value: string): Promise<{ success: boolean; error?: string }> {
  try {
    const authCtx = await requireAdmin();
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
    revalidatePath('/dashboard/admin/system-settings');
    await logAudit(`Updated system setting: ${key} by ${authCtx.user.email}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Update multiple system settings at once. Requires admin role.
 */
export async function updateSystemSettings(settings: Record<string, string>): Promise<{ success: boolean; error?: string }> {
  try {
    const authCtx = await requireAdmin();
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
    revalidatePath('/dashboard/admin/settings');
    revalidatePath('/dashboard/admin/system-settings');
    await logAudit(`Updated multiple system settings in bulk by ${authCtx.user.email}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
