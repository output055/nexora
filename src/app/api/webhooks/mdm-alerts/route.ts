import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    
    // ManageEngine MDM alert webhooks payload format may vary,
    // so we attempt to extract common fields or fallback to parsing the raw body
    // Typically, you might map these based on actual documentation or test payloads.
    
    const deviceId = payload.device_id || payload.deviceID || payload.mdm_device_id;
    const alertName = payload.alert_name || payload.title || payload.event_name || 'MDM Alert';
    const severity = payload.severity || payload.level || 'Info';
    const description = payload.description || payload.message || JSON.stringify(payload);
    
    if (!deviceId) {
      return NextResponse.json({ error: 'Missing device_id in payload' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Insert the alert into our new device_alerts table
    const { error } = await supabase
      .from('device_alerts')
      .insert({
        device_id: deviceId,
        alert_name: alertName,
        severity: severity,
        description: description,
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
