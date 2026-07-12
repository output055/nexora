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
        .select(`
          payment_status, 
          remaining_balance, 
          mdm_device_id, 
          payment_cycle_amount, 
          next_payment_date, 
          customers(payment_cycle)
        `)
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

      // Calculate next payment date advancement
      let nextDate = deviceBeforePayment?.next_payment_date 
        ? new Date(deviceBeforePayment.next_payment_date) 
        : new Date();
        
      if (deviceBeforePayment && deviceBeforePayment.payment_cycle_amount > 0) {
        const cycle = deviceBeforePayment.customers?.payment_cycle || 'monthly';
        const ratio = input.amount / deviceBeforePayment.payment_cycle_amount;
        
        let daysToAdd = 0;
        if (cycle === 'daily') daysToAdd = ratio * 1;
        else if (cycle === 'weekly') daysToAdd = ratio * 7;
        else if (cycle === 'bi_weekly') daysToAdd = ratio * 14;
        else daysToAdd = ratio * 30; // fallback monthly
        
        nextDate.setHours(nextDate.getHours() + (daysToAdd * 24));
      }

      // If they are currently overdue, we unlock them AND update the next payment date.
      // Even if they are 'current', we should still advance their next payment date!
      const updatePayload: any = { next_payment_date: nextDate.toISOString() };
      
      let needsUnlock = false;
      let needsUnenroll = false;
      
      const newBalance = Math.max((deviceBeforePayment?.remaining_balance || 0) - input.amount, 0);

      if (newBalance <= 0) {
        needsUnenroll = true;
      } else if (deviceBeforePayment && deviceBeforePayment.payment_status === 'overdue') {
        updatePayload.payment_status = 'current';
        needsUnlock = true;
      }
      
      const { error: updateError } = await supabase
        .from('devices')
        .update(updatePayload)
        .eq('id', input.deviceId);

      if (!updateError && needsUnlock) {
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

      if (!updateError && needsUnenroll) {
        // Trigger MDM Unenroll Command (Corporate Wipe)
        try {
          await sendDeviceCommand(deviceBeforePayment.mdm_device_id, 'CorporateWipe');
          
          await supabase.from('audit_logs').insert({
            actor_name: 'System',
            action_description: `Automatically unenrolled device ${deviceBeforePayment.mdm_device_id} (Fully Paid).`
          });
        } catch (mdmError) {
          console.error('Failed to send CorporateWipe command to MDM:', mdmError);
        }
      }

    revalidatePath('/dashboard/admin/customers');
    return { success: true };
  } catch (error: any) {
    console.error('Unexpected error in logPayment:', error);
    return { success: false, error: error.message };
  }
}
