'use server';

import { createServerSupabaseClient, createServiceRoleSupabaseClient } from '@/lib/supabase';
import { sendSMS } from '@/lib/sms';
import { requirePermission, requireRole } from '@/lib/auth-guard';
import { logAudit } from '@/lib/audit';

export async function getCustomersForSelect() {
  try {
    await requirePermission('view_customers');
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('customers')
      .select('id, full_name, phone:phone_number')
      .order('full_name');

    if (error) {
      console.error('Failed to fetch customers:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function sendBroadcastSMS(
  targetGroup: string,
  message: string,
  customerId?: string
) {
  try {
    const authCtx = await requireRole(['superadmin', 'admin']);
    const supabase = await createServerSupabaseClient();

    let query = supabase.from('customers').select('id, user_id, full_name, phone:phone_number');

    if (targetGroup === 'individual' && customerId) {
      query = query.eq('id', customerId);
    } else if (targetGroup === 'overdue') {
      query = query.eq('status', 'overdue');
    } else if (targetGroup === 'locked') {
      query = query.eq('status', 'locked');
    }

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
      const personalizedMessage = message
        .replace(/{customer_name}/g, customer.full_name)
        .replace(/{amount_due}/g, '0');

      const result = await sendSMS(customer.phone, personalizedMessage, customer.id);
      if (result) {
        sentCount++;
      }

      if (customer.user_id) {
        const adminClient = createServiceRoleSupabaseClient();
        const { error: notifError } = await adminClient.from('notifications').insert({
          user_id: customer.user_id,
          title: 'New Broadcast Message',
          message: personalizedMessage,
          type: 'info',
          is_read: false
        });
        if (notifError) console.error("Notification Insert Error:", notifError);
      }
    }

    await logAudit(`Sent broadcast SMS to ${sentCount} recipients (target: ${targetGroup}) by ${authCtx.user.email}`);
    return { success: true, count: sentCount, total: customers.length };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
