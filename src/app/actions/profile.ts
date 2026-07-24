'use server';

import { createServerSupabaseClient, createServiceRoleSupabaseClient } from '@/lib/supabase';

export async function updatePassword(password: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Unauthorized' };

  // Use service role to update password securely without needing old password if we are admin, 
  // actually standard client supabase.auth.updateUser works for the logged in user without old password if they have a session.
  const { error } = await supabase.auth.updateUser({
    password: password
  });

  if (error) {
    console.error('Password update error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function updateProfileInfo(payload: {
  full_name?: string;
  digital_address?: string;
  location_landmarks?: string;
  residential_status?: string;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Unauthorized' };

  // Update auth metadata for full_name
  if (payload.full_name) {
    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: payload.full_name }
    });
    if (authError) return { success: false, error: authError.message };
  }

  // Check if they are a customer
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (customer) {
    // They are a customer, update their record
    // Note: We deliberately exclude emails and phone numbers from the payload 
    // to strictly enforce the rule that they cannot be changed by the customer.
    
    // We use service role to bypass RLS if needed, but customers should have an update policy for themselves.
    // Let's use service role just to be safe if RLS isn't fully configured for self-update.
    const adminClient = createServiceRoleSupabaseClient();
    
    const updateData: any = {};
    if (payload.full_name) updateData.full_name = payload.full_name;
    if (payload.digital_address !== undefined) updateData.digital_address = payload.digital_address;
    if (payload.location_landmarks !== undefined) updateData.location_landmarks = payload.location_landmarks;
    if (payload.residential_status !== undefined) updateData.residential_status = payload.residential_status;

    if (Object.keys(updateData).length > 0) {
      const { error: custError } = await adminClient
        .from('customers')
        .update(updateData)
        .eq('id', customer.id);
        
      if (custError) return { success: false, error: custError.message };
    }
  }

  return { success: true };
}
