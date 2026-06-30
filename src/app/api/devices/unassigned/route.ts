import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { hasPermission } from '@/lib/permissions';
import { fetchUnassignedAppleDevices } from '@/lib/miradore';

export async function GET() {
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

    const devices = await fetchUnassignedAppleDevices();

    return NextResponse.json({
      success: true,
      data: devices,
    });
  } catch (error) {
    console.error('[/api/devices/unassigned]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unable to fetch unassigned devices.',
      },
      { status: 500 }
    );
  }
}
