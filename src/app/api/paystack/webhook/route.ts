import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceRoleSupabaseClient } from '@/lib/supabase';
import { sendDeviceCommand } from '@/lib/manageengine';
import { getSystemSetting } from '@/app/actions/settings';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-paystack-signature');
    const secret = process.env.PAYSTACK_SECRET_KEY;

    if (!secret || !signature) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify signature
    const hash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
    if (hash !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);

    if (event.event === 'charge.success') {
      const data = event.data;
      const { metadata, amount, reference } = data;
      const { customerId, deviceId } = metadata || {};

      if (!customerId) {
        return NextResponse.json({ error: 'Missing customer ID in metadata' }, { status: 400 });
      }

      const amountPaidGhs = amount / 100;
      const supabase = createServiceRoleSupabaseClient();

      // 1. Fetch Device to check if it's overdue
      let deviceBeforePayment = null;
      if (deviceId) {
        const { data: device, error: deviceError } = await supabase
          .from('devices')
          .select('payment_status, mdm_device_id')
          .eq('id', deviceId)
          .single();
        if (!deviceError && device) {
          deviceBeforePayment = device;
        }
      }

      // 2. Insert Payment using service_role
      const { error: insertError } = await supabase
        .from('payments')
        .insert({
          customer_id: customerId,
          device_id: deviceId || null,
          amount_paid: amountPaidGhs,
          payment_method: 'paystack_momo',
          transaction_reference: reference,
        });

      if (insertError) {
        console.error('Webhook: Error inserting payment:', insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      // 3. Automated MDM Enforcement & Status Update
      const { data: updatedDevice } = await supabase
        .from('devices')
        .select('remaining_balance')
        .eq('id', deviceId)
        .single();
        
      const newBalance = updatedDevice?.remaining_balance || 0;
      let nextStatus = undefined;
      
      if (newBalance <= 0) {
        nextStatus = 'completed';
      } else if (deviceBeforePayment && deviceBeforePayment.payment_status === 'overdue') {
        nextStatus = 'current';
      }

      if (nextStatus) {
        const { error: updateError } = await supabase
          .from('devices')
          .update({ payment_status: nextStatus })
          .eq('id', deviceId);

        if (!updateError && deviceBeforePayment?.payment_status === 'overdue') {
          try {
            const lockCommand = await getSystemSetting('mdm_overdue_lock_command') || 'LostMode';
            if (lockCommand === 'LostMode') {
              await sendDeviceCommand(deviceBeforePayment.mdm_device_id, 'RemoveLostMode');
            }
            // Add other unlock conditions based on the configured lock mode if needed.
            
            await supabase.from('audit_logs').insert({
              actor_name: 'Paystack Webhook',
              action_description: `Automatically unlocked device ${deviceBeforePayment.mdm_device_id} after successful payment ${reference}.`
            });
          } catch (mdmError) {
            console.error('Webhook: Failed to send unlock command:', mdmError);
          }
        }
      }
    }

    return NextResponse.json({ status: 'success' });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
