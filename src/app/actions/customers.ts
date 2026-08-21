'use server';

import { createServiceRoleSupabaseClient, createServerSupabaseClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import type { Customer } from '@/types';
import { logAudit } from '@/lib/audit';
import { hasPermission } from '@/lib/permissions';

async function checkAccess(permission: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Unauthorized');
  
  const hasAccess = await hasPermission(user.id, permission);
  if (!hasAccess) throw new Error(`Permission denied: Requires ${permission}`);
  
  return user;
}

export async function getSignedScanUrl(path: string) {
  try {
    await checkAccess('view_customers');
    const supabase = createServiceRoleSupabaseClient();
    const { data, error } = await supabase.storage
      .from('ghana-card-scans')
      .createSignedUrl(path, 60 * 60); // 1 hour expiry
      
    if (error) throw error;
    return { success: true, url: data.signedUrl };
  } catch (err: any) {
    console.error('Failed to get signed URL:', err);
    return { success: false, error: err.message };
  }
}

export async function uploadScan(fileName: string, formData: FormData) {
  try {
    // Basic auth check for onboarding
    const supabaseUser = await createServerSupabaseClient();
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const file = formData.get('file') as File;
    if (!file) throw new Error('No file provided');

    const supabase = createServiceRoleSupabaseClient();
    const { data, error } = await supabase.storage
      .from('ghana-card-scans')
      .upload(fileName, file, {
        upsert: false,
        contentType: file.type,
      });
      
    if (error) throw error;
    return { success: true, path: data.path };
  } catch (err: any) {
    console.error('Failed to upload scan:', err);
    return { success: false, error: err.message };
  }
}

export async function updateCustomerAction(id: string, updates: Partial<Customer>) {
  try {
    await checkAccess('edit_customer');
    const supabase = createServiceRoleSupabaseClient();
    
    // Make sure we don't accidentally update id or created_at
    const safeUpdates = { ...updates };
    delete safeUpdates.id;
    delete safeUpdates.created_at;
    safeUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('customers')
      .update(safeUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    
    await logAudit(`Updated customer information for ID: ${id}`);
    return { success: true, data };
  } catch (error: any) {
    console.error('Failed to update customer:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteCustomerAction(id: string) {
  try {
    await checkAccess('delete_customer');
    const supabase = createServiceRoleSupabaseClient();
    
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) {
      // Return a nice error if it's a foreign key constraint issue
      if (error.code === '23503') {
        throw new Error('Cannot delete this customer because they have registered devices or payments attached. Please delete those records first.');
      }
      throw new Error(error.message);
    }
    
    await logAudit(`Deleted customer with ID: ${id}`);
    return { success: true };
  } catch (error: any) {
    console.error('Failed to delete customer:', error);
    return { success: false, error: error.message };
  }
}
