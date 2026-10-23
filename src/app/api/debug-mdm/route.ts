import { fetchManageEngineDevices } from '@/lib/manageengine';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { hasPermission } from '@/lib/permissions';

export async function GET(request: Request) {
  // Disable in production to prevent information leakage
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Endpoint disabled in production.' }, { status: 404 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permitted = await hasPermission(user.id, 'manage_devices');
    if (!permitted) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const devicesData = await fetchManageEngineDevices();
    const firstDevice = devicesData?.devices?.[0];

    return NextResponse.json({
      success: true,
      firstDevice: firstDevice,
      firstDeviceKeys: firstDevice ? Object.keys(firstDevice) : [],
      allData: devicesData
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
