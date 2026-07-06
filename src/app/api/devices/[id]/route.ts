import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { hasPermission } from '@/lib/permissions';
import { getDeviceDetails, getDeviceLocation } from '@/lib/hexnode';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const resolvedParams = await params;
    const deviceId = resolvedParams.id;
    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: 'Device ID is required.' },
        { status: 400 }
      );
    }

    const details = await getDeviceDetails(deviceId);
    const location = await getDeviceLocation(deviceId);

    return NextResponse.json({
      success: true,
      data: {
        ...details,
        location,
      },
    });
  } catch (error) {
    console.error(`[/api/devices/details] Server Error:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unable to fetch device details.',
      },
      { status: 500 }
    );
  }
}
