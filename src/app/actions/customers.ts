'use server';

import { createServiceRoleSupabaseClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import type { Customer } from '@/types';
import { logAudit } from '@/lib/audit';
import { requireAuth } from '@/lib/auth-guard';

export async function getSignedScanUrl(path: string) {
  try {
    const authCtx = await requireAuth();

    // If caller is not staff / doesn't have view_customers, verify that this scan belongs to them
    const canViewAll = authCtx.isStaff || authCtx.permissions.includes('view_customers') || authCtx.permissions.includes('manage_customers');
    if (!canViewAll) {
      const supabase = createServiceRoleSupabaseClient();
      const { data: customer } = await supabase
        .from('customers')
        .select('ghana_card_scan_path')
        .eq('user_id', authCtx.user.id)
        .maybeSingle();

      if (!customer || customer.ghana_card_scan_path !== path) {
        throw new Error('Forbidden. You can only view your own identification documents.');
      }
    }

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
    // Basic auth check for onboarding / customer management
    await requireAuth();

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
    const authCtx = await requireAuth();
    const hasEditAccess = authCtx.isSuperAdmin || authCtx.permissions.includes('edit_customer') || authCtx.permissions.includes('manage_customers') || authCtx.isAdmin;
    if (!hasEditAccess) {
      throw new Error('Permission denied: Requires edit_customer permission.');
    }

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
    
    await logAudit(`Updated customer information for ID: ${id} by ${authCtx.user.email}`);
    return { success: true, data };
  } catch (error: any) {
    console.error('Failed to update customer:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteCustomerAction(id: string) {
  try {
    const authCtx = await requireAuth();
    const hasDeleteAccess = authCtx.isSuperAdmin || authCtx.permissions.includes('delete_customer') || authCtx.permissions.includes('manage_customers') || authCtx.isAdmin;
    if (!hasDeleteAccess) {
      throw new Error('Permission denied: Requires delete_customer permission.');
    }

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
    
    await logAudit(`Deleted customer with ID: ${id} by ${authCtx.user.email}`);
    return { success: true };
  } catch (error: any) {
    console.error('Failed to delete customer:', error);
    return { success: false, error: error.message };
  }
}
