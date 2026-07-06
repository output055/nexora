import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { hasPermission } from '@/lib/permissions';
import { fetchDevicesByPlatform } from '@/lib/hexnode';

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
    const profileId = request.nextUrl.searchParams.get('profile_id');
    const devices = await fetchDevicesByPlatform(platform, profileId);

    // Cross-check against the Nexora DB to filter out devices already assigned to a customer
    const { data: assignedDevices, error: dbError } = await supabase
      .from('devices')
      .select('hexnode_device_id')
      .not('hexnode_device_id', 'is', null);

    if (dbError) {
      throw new Error(`Database error checking assigned devices: ${dbError.message}`);
    }

    const assignedIds = new Set(assignedDevices.map(d => String(d.hexnode_device_id)));
    const unassignedDevices = devices.filter(d => !assignedIds.has(String(d.id)));

    return NextResponse.json({
      success: true,
      data: unassignedDevices,
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
