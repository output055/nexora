import { NextResponse } from 'next/server';
import { createServiceRoleSupabaseClient } from '@/lib/supabase';
import { sendDeviceCommand } from '@/lib/manageengine';
import { getAllSystemSettings } from '@/app/actions/settings';

export async function GET(request: Request) {
  // 1. Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceRoleSupabaseClient();
    
    // In a real scenario, this query would check `payment_cycle` against the last payment date.
    // For simplicity, we find devices that are currently 'current' but have missed their cycle
    // (e.g. they owe > 0 and their next expected payment date has passed).
    // Let's assume we have a view or SQL function, but for now we just select those matching a simple condition.
    // For this demonstration, let's just fetch all devices that should be locked.
    // E.g., `remaining_balance > 0 AND last_payment_date < NOW() - INTERVAL '1 week'`
    
    // Since we don't have the exact cycle logic fully built into SQL yet, 
    // we'll mock the query to get theoretically overdue devices.
    
    // NOTE: This logic needs to be tailored to the exact schema definition of 'due date'.
    const { data: overdueDevices, error } = await supabase
      .from('devices')
      .select('id, mdm_device_id, customer_id')
      .eq('payment_status', 'current')
      .gt('remaining_balance', 0);
      // .lt('next_payment_due', new Date().toISOString()); // Assuming a next_payment_due column existed

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const settings = await getAllSystemSettings();
    const lockCommand = settings['mdm_overdue_lock_command'] || 'LostMode';
    const lostModeMessage = settings['mdm_lost_mode_message'] || 'Your device has been locked due to a missed installment payment. Please contact support.';
    const lostModePhone = settings['mdm_lost_mode_phone'] || '+233000000000';
    const kioskPin = settings['mdm_kiosk_pin'] || '1234';
    
    const results = [];
    
    // For each overdue device, set status to overdue and lock it
    for (const device of overdueDevices || []) {
      const { error: updateError } = await supabase
        .from('devices')
        .update({ payment_status: 'overdue' })
        .eq('id', device.id);

      if (!updateError) {
        try {
          await sendDeviceCommand(device.mdm_device_id, lockCommand, {
            lock_message: lostModeMessage,
            phone_number: lostModePhone,
            passcode: kioskPin // Assuming 'passcode' or 'pin' is the key for Kiosk mode in ME
          });
          
          await supabase.from('audit_logs').insert({
            actor_name: 'System Cron',
            action_description: `Automatically locked device ${device.mdm_device_id} (${lockCommand}) due to missed payment.`
          });
          
          results.push({ id: device.id, status: 'locked' });
        } catch (mdmError: any) {
          console.error(`Failed to lock device ${device.mdm_device_id}:`, mdmError);
          results.push({ id: device.id, status: 'failed_lock', error: mdmError.message });
        }
      }
    }

    return NextResponse.json({ success: true, processed: results });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
