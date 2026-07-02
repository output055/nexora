import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { hasPermission } from '@/lib/permissions';
import { unlockDevice } from '@/lib/scalefusion';
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

    const currentCustomer = customer as Customer;
    const currentBalance = Number(currentCustomer.remaining_balance);
    const newBalance = Math.max(0, currentBalance - parsed.amount);
    const paymentStatus: PaymentStatus = newBalance === 0 ? 'current' : currentCustomer.payment_status;

    const { error: paymentError } = await supabase.from('payments').insert({
      customer_id: currentCustomer.id,
      amount_paid: parsed.amount,
      collector_id: user.id,
    });

    if (paymentError) {
      return NextResponse.json(
        { success: false, error: paymentError.message },
        { status: 500 }
      );
    }

    const { data: updatedCustomer, error: updateError } = await supabase
      .from('customers')
      .update({
        remaining_balance: newBalance,
        payment_status: paymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentCustomer.id)
      .select('*')
      .single();

    if (updateError || !updatedCustomer) {
      await supabase.from('audit_logs').insert({
        actor_name: user.email ?? 'Unknown',
        action_description: `PAYMENT POSTED but balance update failed for ${currentCustomer.full_name} - ${updateError?.message ?? 'unknown error'}`,
      });

      return NextResponse.json(
        { success: false, error: updateError?.message ?? 'Payment posted but customer balance update failed.' },
        { status: 500 }
      );
    }

    await supabase.from('audit_logs').insert({
      actor_name: user.email ?? 'Unknown',
      action_description: `Logged payment of GHS ${parsed.amount.toLocaleString()} for ${currentCustomer.full_name} - balance ${newBalance === 0 ? 'cleared' : `now GHS ${newBalance.toLocaleString()}`}`,
    });

    let unlockResult: { attempted: boolean; success: boolean; error?: string } = {
      attempted: false,
      success: false,
    };

    if (newBalance === 0) {
      const mirResult = await unlockDevice(currentCustomer.miradore_device_id);
      unlockResult = {
        attempted: true,
        success: mirResult.success,
        error: mirResult.message,
      };

      await supabase.from('audit_logs').insert({
        actor_name: 'System (auto)',
        action_description: mirResult.success
          ? `AUTO UNLOCK triggered for device ${currentCustomer.miradore_device_id} (${currentCustomer.full_name}) - balance cleared`
          : `AUTO UNLOCK FAILED for ${currentCustomer.full_name} (${currentCustomer.os_platform}) - ${mirResult.message ?? 'MDM unlock command failed'}`,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        customer: updatedCustomer as Customer,
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
