import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { hasPermission } from '@/lib/permissions';
import { fetchManageEngineDevices } from '@/lib/manageengine';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - authentication required.' },
        { status: 401 }
      );
    }

    const permitted = await hasPermission(user.id, 'manage_devices');
    if (!permitted) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - you lack the "manage_devices" permission.' },
        { status: 403 }
      );
    }

    const platform = request.nextUrl.searchParams.get('platform') === 'ios' ? 'ios' : 'android';
    const manageEngineData = await fetchManageEngineDevices();
    
    const { data: boundDevices } = await supabase.from('devices').select('mdm_device_id');
    const boundIds = new Set(boundDevices?.map(d => d.mdm_device_id) || []);

    // Map ManageEngine format to expected frontend format and filter out bounded devices
    const devices = (manageEngineData.devices || [])
      .filter((d: any) => d.platform_type?.toLowerCase() === platform)
      .map((d: any) => ({
        id: String(d.device_id),
        serial: d.serial_number || 'N/A',
        model: d.model || d.product_name || 'Unknown Device',
        imei: d.imei || '',
        os_version: d.os_version || '',
      }))
      .filter((d: any) => !boundIds.has(d.id));

    return NextResponse.json({
      success: true,
      data: devices,
    });
  } catch (error) {
    console.error('[/api/devices/discover] Server Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unable to fetch devices.',
      },
      { status: 500 }
    );
  }
}
