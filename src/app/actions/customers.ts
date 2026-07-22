'use server';

import { createServiceRoleSupabaseClient } from '@/lib/supabase';
import type { Customer } from '@/types';

export async function getSignedScanUrl(path: string) {
  try {
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
    
    return { success: true, data };
  } catch (error: any) {
    console.error('Failed to update customer:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteCustomerAction(id: string) {
  try {
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
    
    return { success: true };
  } catch (error: any) {
    console.error('Failed to delete customer:', error);
    return { success: false, error: error.message };
  }
}
