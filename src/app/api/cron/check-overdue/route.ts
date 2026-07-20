import { NextResponse } from 'next/server';
import { createServiceRoleSupabaseClient } from '@/lib/supabase';
import { sendDeviceCommand } from '@/lib/manageengine';
import { getAllSystemSettings } from '@/app/actions/settings';
import { sendTriggerSMS } from '@/lib/sms';

export async function GET(request: Request) {
  // 1. Verify cron secret to prevent unauthorized access (skip in local development)
  const authHeader = request.headers.get('authorization');
  if (process.env.NODE_ENV !== 'development' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceRoleSupabaseClient();
    
    // The cron job will look for devices where next_payment_date has passed,
    // and they still have a remaining balance > 0.
    const { data: overdueDevices, error } = await supabase
      .from('devices')
      .select(`
        id, 
        mdm_device_id, 
        customer_id, 
        payment_cycle_amount,
        customers (
          id,
          phone_number,
          full_name
        )
      `)
      .in('payment_status', ['current', 'overdue'])
      .gt('remaining_balance', 0)
      .lt('next_payment_date', new Date().toISOString());

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const settings = await getAllSystemSettings();
    const lockCommand = settings['mdm_overdue_lock_command'] || 'LostMode';
    const lostModeMessage = settings['mdm_lost_mode_message'] || 'Your device has been locked due to a missed installment payment. Please contact support.';
    const lostModePhone = settings['mdm_lost_mode_phone'] || '+233000000000';
    const kioskPin = settings['mdm_kiosk_pin'] || '1234';
    
    const results = [];
    
    // For each overdue device, ensure it is set to overdue and locked
    for (const device of overdueDevices || []) {
      const isNewlyOverdue = device.payment_status === 'current';

      if (isNewlyOverdue) {
        const { error: updateError } = await supabase
          .from('devices')
          .update({ payment_status: 'overdue' })
          .eq('id', device.id);
          
        if (updateError) {
          console.error(`Failed to update status for ${device.id}`, updateError);
          continue; // Skip this device if we can't update its status
        }
      }

      try {
        // Map UI setting values to actual ManageEngine API command names
        let apiCommandName = lockCommand;
        if (lockCommand === 'LostMode') apiCommandName = 'enable_lost_mode';
        if (lockCommand === 'DeviceLock') apiCommandName = 'lock';
        
        await sendDeviceCommand(device.mdm_device_id, apiCommandName, {
          lock_message: lostModeMessage,
          phone_number: lostModePhone,
          passcode: kioskPin 
        });
        
        // ONLY log and send SMS if this is the FIRST time it's being locked, 
        // to prevent spamming the user and using up SMS credits on retries
        if (isNewlyOverdue) {
          await supabase.from('audit_logs').insert({
            actor_name: 'System Cron',
            action_description: `Automatically locked device ${device.mdm_device_id} (${lockCommand}) due to missed payment.`
          });
          
          const cust: any = device.customers;
          if (cust && cust.phone_number) {
            await sendTriggerSMS(
              'device_locked',
              cust.phone_number,
              {
                customer_name: cust.full_name,
                amount_due: Number(device.payment_cycle_amount || 0).toFixed(2),
              },
              cust.id
            );
          }
        }
        
        results.push({ id: device.id, status: isNewlyOverdue ? 'locked' : 'retried_lock' });
      } catch (mdmError: any) {
        console.error(`Failed to lock device ${device.mdm_device_id}:`, mdmError);
        results.push({ id: device.id, status: 'failed_lock', error: mdmError.message });
      }
    }

    return NextResponse.json({ success: true, processed: results });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
