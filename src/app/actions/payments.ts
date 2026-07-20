'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { sendDeviceCommand } from '@/lib/manageengine';
import { getSystemSetting } from './settings';
import { sendSMS, sendTriggerSMS } from '@/lib/sms';

export interface LogPaymentInput {
  customerId: string;
  deviceId?: string;
  amount: number;
  paymentMethod: 'cash' | 'paystack_momo' | 'bank_transfer';
  transactionReference?: string;
  isDownPayment?: boolean;
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
          customers(phone_number, payment_cycle)
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

      // Calculate next payment date advancement (Skip if down payment)
      let nextDate = deviceBeforePayment?.next_payment_date 
        ? new Date(deviceBeforePayment.next_payment_date) 
        : new Date();
        
      if (!input.isDownPayment && deviceBeforePayment && deviceBeforePayment.payment_cycle_amount > 0) {
        const cust: any = deviceBeforePayment.customers;
        const cycle = (Array.isArray(cust) ? cust[0]?.payment_cycle : cust?.payment_cycle) || 'monthly';
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
        updatePayload.payment_status = 'completed';
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
            await sendDeviceCommand(deviceBeforePayment!.mdm_device_id, 'disable_lost_mode');
            // Automatically clear the passcode that ManageEngine sets during Lost Mode
            await sendDeviceCommand(deviceBeforePayment!.mdm_device_id, 'clear_passcode');
          } else if (lockCommand === 'DeviceLock') {
             // Depending on MDM, 'DeviceLock' might not have a direct 'Unlock', it just requires the user to enter passcode.
             // But if we have an explicit unlock, we call it here.
          }
          
          // Log to audit
          await supabase.from('audit_logs').insert({
            actor_name: 'System',
            action_description: `Automatically unlocked device ${deviceBeforePayment!.mdm_device_id} after payment.`
          });
        } catch (mdmError) {
          console.error('Failed to send unlock command to MDM:', mdmError);
          // Don't fail the payment if MDM fails, just log it.
        }
      }

      if (!updateError && needsUnenroll) {
        // Trigger MDM Unenroll Command (Corporate Wipe)
        try {
          await sendDeviceCommand(deviceBeforePayment!.mdm_device_id, 'corporate_wipe');
          
          await supabase.from('audit_logs').insert({
            actor_name: 'System',
            action_description: `Automatically unenrolled device ${deviceBeforePayment!.mdm_device_id} (Fully Paid).`
          });
        } catch (mdmError) {
          console.error('Failed to send CorporateWipe command to MDM:', mdmError);
        }
      }

      // Send SMS Receipt via automated trigger
      const cust: any = deviceBeforePayment?.customers;
      if (cust && cust.phone_number) {
        await sendTriggerSMS(
          'payment_receipt',
          cust.phone_number,
          {
            amount_paid: Number(input.amount).toFixed(2),
            balance: Number(newBalance).toFixed(2),
            customer_name: cust.full_name
          },
          cust.id
        );
      }

    revalidatePath('/dashboard/admin/customers');
    return { success: true };
  } catch (error: any) {
    console.error('Unexpected error in logPayment:', error);
    return { success: false, error: error.message };
  }
}

export async function reversePayment(paymentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();

    // 1. Check Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // 2. Fetch Payment
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      return { success: false, error: 'Payment not found' };
    }

    // 3. Fetch Device
    let deviceData = null;
    if (payment.device_id) {
      const { data: device, error: deviceError } = await supabase
        .from('devices')
        .select(`*, customers(phone_number, payment_cycle)`)
        .eq('id', payment.device_id)
        .single();
      
      if (!deviceError && device) {
        deviceData = device;
      }
    }

    // 4. Delete Payment
    const { error: deleteError } = await supabase
      .from('payments')
      .delete()
      .eq('id', paymentId);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    // 5. Revert Device State
    if (deviceData) {
      const isDownPayment = (deviceData.remaining_balance + payment.amount_paid) >= deviceData.total_owed;
      let nextDate = deviceData.next_payment_date ? new Date(deviceData.next_payment_date) : new Date();

      if (!isDownPayment && deviceData.payment_cycle_amount > 0) {
        const cust: any = deviceData.customers;
        const cycle = (Array.isArray(cust) ? cust[0]?.payment_cycle : cust?.payment_cycle) || 'monthly';
        const ratio = payment.amount_paid / deviceData.payment_cycle_amount;
        
        let daysToSubtract = 0;
        if (cycle === 'daily') daysToSubtract = ratio * 1;
        else if (cycle === 'weekly') daysToSubtract = ratio * 7;
        else if (cycle === 'bi_weekly') daysToSubtract = ratio * 14;
        else daysToSubtract = ratio * 30;
        
        nextDate.setHours(nextDate.getHours() - (daysToSubtract * 24));
      }

      const updatePayload: any = { 
        next_payment_date: nextDate.toISOString(),
        remaining_balance: deviceData.remaining_balance + payment.amount_paid
      };

      let needsLock = false;
      if (nextDate < new Date() || isDownPayment) {
        updatePayload.payment_status = 'overdue';
        needsLock = true;
      } else if (deviceData.payment_status === 'completed') {
        updatePayload.payment_status = 'current';
      }
      
      await supabase.from('devices').update(updatePayload).eq('id', deviceData.id);

      if (needsLock) {
        try {
          const lockCommand = await getSystemSetting('mdm_overdue_lock_command') || 'LostMode';
          let apiCommandName = lockCommand;
          if (lockCommand === 'LostMode') apiCommandName = 'enable_lost_mode';
          if (lockCommand === 'DeviceLock') apiCommandName = 'lock';

          await sendDeviceCommand(deviceData.mdm_device_id, apiCommandName, {
            lock_message: await getSystemSetting('mdm_lost_mode_message') || 'Your device has been locked due to a missed installment payment. Please contact support.',
            phone_number: await getSystemSetting('mdm_lost_mode_phone') || '+233000000000',
            passcode: await getSystemSetting('mdm_kiosk_pin') || '1234'
          });

          await supabase.from('audit_logs').insert({
            actor_name: 'System',
            action_description: `Automatically locked device ${deviceData.mdm_device_id} after payment reversal made it overdue.`
          });
        } catch (mdmError) {
          console.error('Failed to send lock command on reversal:', mdmError);
        }
      }
    }

    // 6. Audit Log
    await supabase.from('audit_logs').insert({
      actor_name: user.email || 'Unknown',
      action_description: `Reversed payment of GH₵${payment.amount_paid} for customer ${payment.customer_id}`
    });

    revalidatePath('/dashboard/admin/customers');
    return { success: true };
  } catch (error: any) {
    console.error('Unexpected error in reversePayment:', error);
    return { success: false, error: error.message };
  }
}
