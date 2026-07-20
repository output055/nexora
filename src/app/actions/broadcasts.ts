'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import { sendSMS } from '@/lib/sms';

export async function getCustomersForSelect() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Unauthorized' };

  const { data, error } = await supabase
    .from('customers')
    .select('id, full_name, phone:phone_number')
    .order('full_name');

  if (error) {
    console.error('Failed to fetch customers:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

export async function sendBroadcastSMS(
  targetGroup: string,
  message: string,
  customerId?: string
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Unauthorized' };

  let query = supabase.from('customers').select('id, full_name, phone:phone_number');

  if (targetGroup === 'individual' && customerId) {
    query = query.eq('id', customerId);
  } else if (targetGroup === 'overdue') {
    // Basic logic for overdue (has a status of overdue or similar)
    // For now we'll assume we filter by status
    query = query.eq('status', 'overdue');
  } else if (targetGroup === 'locked') {
    query = query.eq('status', 'locked');
  }
  // 'all' means no filter

  const { data: customers, error } = await query;

  if (error) {
    console.error('Failed to fetch target customers:', error);
    return { success: false, error: error.message };
  }

  if (!customers || customers.length === 0) {
    return { success: false, error: 'No customers found for this target group.' };
  }

  let sentCount = 0;
  for (const customer of customers) {
    // Simple template replacement
    const personalizedMessage = message
      .replace(/{customer_name}/g, customer.full_name)
      .replace(/{amount_due}/g, '0'); // Assuming 0 for now, could fetch from payments

    // Use our sendSMS utility which already logs to sms_logs table!
    const result = await sendSMS(customer.phone, personalizedMessage, customer.id);
    if (result) {
      sentCount++;
    }
  }

  return { success: true, count: sentCount, total: customers.length };
}
