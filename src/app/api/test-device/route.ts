import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getDeviceDetails } from '@/lib/hexnode';
import { createServiceRoleSupabaseClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createServiceRoleSupabaseClient();
    const { data: devices } = await supabase.from('devices').select('hexnode_device_id').limit(1);
    
    let deviceId = devices?.[0]?.hexnode_device_id;
    if (!deviceId) {
      return NextResponse.json({ error: 'No devices found in DB.' });
    }
    
    const details = await getDeviceDetails(deviceId);
    return NextResponse.json(details);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
