import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase-server';
import { sendSMS } from '@/lib/sms';

export async function GET(request: Request) {
  // Simple auth check to ensure only authorized callers (like Vercel Cron) can hit this
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const adminClient = createSupabaseAdmin();
    
    // Fetch all active devices that still owe money
    const { data: devices, error } = await adminClient
      .from('devices')
      .select(`
        id,
        device_model,
        next_payment_date,
        payment_cycle_amount,
        payment_status,
        customers (
          phone_number,
          full_name,
          payment_cycle
        )
      `)
      .eq('payment_status', 'current')
      .gt('remaining_balance', 0)
      .not('next_payment_date', 'is', null);

    if (error) {
      console.error('Failed to fetch devices for cron:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const today = new Date();
    // Reset time to midnight for accurate day comparison
    today.setHours(0, 0, 0, 0);

    let messagesSent = 0;

    for (const device of devices) {
      const cust: any = device.customers;
      if (!cust || !cust.phone_number) continue;

      const nextDate = new Date(device.next_payment_date);
      nextDate.setHours(0, 0, 0, 0);

      // Calculate difference in days
      const diffTime = nextDate.getTime() - today.getTime();
      const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const cycle = cust.payment_cycle || 'monthly';
      let shouldWarn = false;

      // Smart Cycle-based Warning Thresholds
      if (cycle === 'daily' && daysUntilDue === 0) {
        shouldWarn = true; // Warn on the day it's due
      } else if (cycle === 'weekly' && daysUntilDue === 1) {
        shouldWarn = true; // Warn 1 day before
      } else if (cycle === 'bi_weekly' && daysUntilDue === 2) {
        shouldWarn = true; // Warn 2 days before
      } else if (cycle === 'monthly' && daysUntilDue === 3) {
        shouldWarn = true; // Warn 3 days before
      }

      if (shouldWarn) {
        const whenDue = daysUntilDue === 0 ? 'TODAY' : `in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}`;
        const msg = `Hi ${cust.full_name}, your Nexora device payment of GH₵${device.payment_cycle_amount} is due ${whenDue} (${nextDate.toLocaleDateString()}). Please pay to avoid service interruption.`;
        
        await sendSMS(cust.phone_number, msg);
        messagesSent++;
      }
    }

    return NextResponse.json({ success: true, messagesSent });
  } catch (err: any) {
    console.error('Cron error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
