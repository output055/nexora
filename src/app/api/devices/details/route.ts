import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getDeviceDetails } from '@/lib/hexnode';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Device ID is required.' }, { status: 400 });
    }

    const hexnodeData = await getDeviceDetails(id);

    const imei = hexnodeData?.network?.imei_1 || hexnodeData?.network?.imei || hexnodeData?.device?.imei_1 || hexnodeData?.device?.imei || null;
    const serial_number = hexnodeData?.device?.serial_number || hexnodeData?.serial_no || null;
    const os_version = hexnodeData?.device?.os_version || hexnodeData?.os_version || null;

    return NextResponse.json({
      success: true,
      data: {
        imei,
        serial_number,
        os_version,
      },
    });
  } catch (error) {
    console.error('[/api/devices/details]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch device details.' },
      { status: 500 }
    );
  }
}
