'use server';

import { createServiceRoleSupabaseClient } from '@/lib/supabase';
import type { Customer } from '@/types';

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
