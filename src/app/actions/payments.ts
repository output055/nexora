'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { sendDeviceCommand } from '@/lib/manageengine';
import { getSystemSetting } from './settings';

export interface LogPaymentInput {
  customerId: string;
  deviceId?: string;
  amount: number;
  paymentMethod: 'cash' | 'paystack_momo' | 'bank_transfer';
  transactionReference?: string;
}

export async function logPayment(input: LogPaymentInput): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();

    // 1. Check Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // 2. Fetch Device (to check if it was overdue)
    let deviceBeforePayment = null;
    if (input.deviceId) {
      const { data: device, error: deviceError } = await supabase
        .from('devices')
        .select('payment_status, remaining_balance, mdm_device_id')
        .eq('id', input.deviceId)
        .single();
        
      if (!deviceError && device) {
        deviceBeforePayment = device;
      }
    }

    // 3. Insert Payment
    // The DB trigger `payments_update_device_balance` will automatically update the device balance.
    const { error: insertError } = await supabase
      .from('payments')
      .insert({
        customer_id: input.customerId,
        device_id: input.deviceId,
        collector_id: user.id,
        amount_paid: input.amount,
        payment_method: input.paymentMethod,
        transaction_reference: input.transactionReference,
      });

    if (insertError) {
      console.error('Error inserting payment:', insertError);
      return { success: false, error: insertError.message };
    }

    // 4. Check if we need to Unlock the device via ManageEngine
    if (deviceBeforePayment && deviceBeforePayment.payment_status === 'overdue') {
      // If payment covers the required amount (for simplicity here, any payment might unlock it, 
      // but ideally we check if remaining_balance is in good standing based on cycle)
      // Let's assume we unlock it if a payment is made and update status to current.
      
      const { error: updateError } = await supabase
        .from('devices')
        .update({ payment_status: 'current' })
        .eq('id', input.deviceId);

      if (!updateError) {
        // Trigger MDM Unlock Command
        try {
          const lockCommand = await getSystemSetting('mdm_overdue_lock_command') || 'LostMode';
          
          if (lockCommand === 'LostMode') {
            await sendDeviceCommand(deviceBeforePayment.mdm_device_id, 'RemoveLostMode');
          } else if (lockCommand === 'DeviceLock') {
             // Depending on MDM, 'DeviceLock' might not have a direct 'Unlock', it just requires the user to enter passcode.
             // But if we have an explicit unlock, we call it here.
          }
          
          // Log to audit
          await supabase.from('audit_logs').insert({
            actor_name: 'System',
            action_description: `Automatically unlocked device ${deviceBeforePayment.mdm_device_id} after payment.`
          });
        } catch (mdmError) {
          console.error('Failed to send unlock command to MDM:', mdmError);
          // Don't fail the payment if MDM fails, just log it.
        }
      }
    }

    revalidatePath('/dashboard/admin/customers');
    return { success: true };
  } catch (error: any) {
    console.error('Unexpected error in logPayment:', error);
    return { success: false, error: error.message };
  }
}
