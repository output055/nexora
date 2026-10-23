import { NextResponse } from 'next/server';
import { createServiceRoleSupabaseClient } from '@/lib/supabase';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const webhookSecret = process.env.MDM_WEBHOOK_SECRET || process.env.CRON_SECRET;
    const providedSecret = req.headers.get('x-mdm-secret') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    if (!webhookSecret || !providedSecret) {
      return NextResponse.json({ error: 'Unauthorized - missing webhook authentication secret' }, { status: 401 });
    }

    const expectedBuffer = Buffer.from(webhookSecret);
    const providedBuffer = Buffer.from(providedSecret);

    if (expectedBuffer.length !== providedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, providedBuffer)) {
      return NextResponse.json({ error: 'Unauthorized - invalid webhook secret' }, { status: 401 });
    }

    const payload = await req.json();
    
    const deviceId = payload.device_id || payload.deviceID || payload.mdm_device_id;
    const alertName = payload.alert_name || payload.title || payload.event_name || 'MDM Alert';
    const severity = payload.severity || payload.level || 'Info';
    const description = payload.description || payload.message || JSON.stringify(payload);
    
    if (!deviceId) {
      return NextResponse.json({ error: 'Missing device_id in payload' }, { status: 400 });
    }

    // Sanitize string lengths to prevent storage abuse
    const safeDeviceId = String(deviceId).slice(0, 100);
    const safeAlertName = String(alertName).slice(0, 200);
    const safeSeverity = String(severity).slice(0, 50);
    const safeDescription = String(description).slice(0, 4000);

    const supabase = createServiceRoleSupabaseClient();

    // Insert the alert into device_alerts table
    const { error } = await supabase
      .from('device_alerts')
      .insert({
        device_id: safeDeviceId,
        alert_name: safeAlertName,
        severity: safeSeverity,
        description: safeDescription,
      });

    if (error) {
      console.error('Failed to insert device alert:', error);
      return NextResponse.json({ error: 'Failed to insert alert into database' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Alert processed successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('MDM Alert Webhook Error:', error);
    return NextResponse.json({ error: 'Internal server error processing webhook' }, { status: 500 });
  }
}
