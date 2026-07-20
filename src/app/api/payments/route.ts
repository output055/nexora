import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { hasPermission } from '@/lib/permissions';
import { unlockDevice } from '@/lib/scalefusion';
import { sendTriggerSMS } from '@/lib/sms';
import type { Customer, PaymentStatus } from '@/types';

type PaymentRequestBody = {
  customerId?: unknown;
  amount?: unknown;
};

const parsePaymentBody = (body: PaymentRequestBody | null) => {
  const customerId = typeof body?.customerId === 'string' ? body.customerId : '';
  const amount = typeof body?.amount === 'number' ? body.amount : Number(body?.amount);

  if (!customerId) {
    return { error: 'Missing required field: customerId' };
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: 'Payment amount must be a positive number.' };
  }

  return { customerId, amount };
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null) as PaymentRequestBody | null;
    const parsed = parsePaymentBody(body);

    if ('error' in parsed) {
      return NextResponse.json(
        { success: false, error: parsed.error },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - authentication required.' },
        { status: 401 }
      );
    }

    const permitted = await hasPermission(user.id, 'log_payment');
    if (!permitted) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - you lack the "log_payment" permission.' },
        { status: 403 }
      );
    }

    const { data: devices, error: deviceError } = await supabase
      .from('devices')
      .select('*')
      .eq('customer_id', parsed.customerId);

    if (deviceError || !devices || devices.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Customer device not found.' },
        { status: 404 }
      );
    }

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', parsed.customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found.' },
        { status: 404 }
      );
    }

    const currentDevice = devices[0];
    const currentBalance = Number(currentDevice.remaining_balance);
    const newBalance = Math.max(0, currentBalance - parsed.amount);

    // Date advancement logic
    let nextDate = currentDevice.next_payment_date
      ? new Date(currentDevice.next_payment_date)
      : new Date();

    if (currentDevice.payment_cycle_amount > 0) {
      const cycle = customer.payment_cycle || 'monthly';
      const ratio = parsed.amount / currentDevice.payment_cycle_amount;
      
      let daysToAdd = 0;
      if (cycle === 'daily') daysToAdd = ratio * 1;
      else if (cycle === 'weekly') daysToAdd = ratio * 7;
      else if (cycle === 'bi_weekly') daysToAdd = ratio * 14;
      else daysToAdd = ratio * 30; // fallback monthly
      
      nextDate.setHours(nextDate.getHours() + (daysToAdd * 24));
    }

    let paymentStatus: PaymentStatus = currentDevice.payment_status;
    let needsUnlock = false;

    if (newBalance === 0) {
      paymentStatus = 'completed';
    } else if (currentDevice.payment_status === 'overdue') {
      paymentStatus = 'current';
      needsUnlock = true;
    }

    const { error: paymentError } = await supabase.from('payments').insert({
      customer_id: parsed.customerId,
      amount_paid: parsed.amount,
      collector_id: user.id,
    });

    if (paymentError) {
      return NextResponse.json(
        { success: false, error: paymentError.message },
        { status: 500 }
      );
    }

    const { data: updatedDevice, error: updateError } = await supabase
      .from('devices')
      .update({
        remaining_balance: newBalance,
        payment_status: paymentStatus,
        next_payment_date: nextDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentDevice.id)
      .select('*')
      .single();

    if (updateError || !updatedDevice) {
      await supabase.from('audit_logs').insert({
        actor_name: user.email ?? 'Unknown',
        action_description: `PAYMENT POSTED but balance update failed for customer ID ${parsed.customerId} - ${updateError?.message ?? 'unknown error'}`,
      });

      return NextResponse.json(
        { success: false, error: updateError?.message ?? 'Payment posted but customer balance update failed.' },
        { status: 500 }
      );
    }

    await supabase.from('audit_logs').insert({
      actor_name: user.email ?? 'Unknown',
      action_description: `Payment of GH₵${parsed.amount} manually logged for customer ID ${parsed.customerId}`,
    });

    let unlockResult: { attempted: boolean; success: boolean; error?: string } = {
      attempted: false,
      success: false,
    };

    if (needsUnlock || newBalance === 0) {
      const mirResult = await unlockDevice(currentDevice.mdm_device_id);
      unlockResult = {
        attempted: true,
        success: mirResult.success,
        error: mirResult.message,
      };

      await supabase.from('audit_logs').insert({
        actor_name: 'System (auto)',
        action_description: mirResult.success
          ? `AUTO UNLOCK triggered for device ${currentDevice.mdm_device_id} (${customer.full_name}) - payment processed`
          : `AUTO UNLOCK FAILED for ${customer.full_name} (${currentDevice.os_platform}) - ${mirResult.message ?? 'MDM unlock command failed'}`,
      });
    }

    if (customer.phone_number) {
      await sendTriggerSMS(
        'payment_receipt',
        customer.phone_number,
        {
          amount_paid: Number(parsed.amount).toFixed(2),
          balance: Number(newBalance).toFixed(2),
          customer_name: customer.full_name
        },
        customer.id
      );
    }

    // Map device properties onto customer to match RetailerPage expectations
    const updatedCustomerForUI = {
      ...customer,
      device_model: updatedDevice.device_model,
      os_platform: updatedDevice.os_platform,
      payment_status: updatedDevice.payment_status,
      remaining_balance: updatedDevice.remaining_balance,
      total_owed: updatedDevice.total_owed,
    };

    return NextResponse.json({
      success: true,
      data: {
        customer: updatedCustomerForUI,
        payment: {
          amount: parsed.amount,
          wasCleared: newBalance === 0,
        },
        unlock: unlockResult,
      },
    });
  } catch (err) {
    console.error('[/api/payments]', err);
    return NextResponse.json(
      { success: false, error: 'An unexpected server error occurred.' },
      { status: 500 }
    );
  }
}
