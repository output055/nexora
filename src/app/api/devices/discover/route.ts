import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { hasPermission } from '@/lib/permissions';
import { fetchDevicesByPlatform } from '@/lib/scalefusion';

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
    const devices = await fetchDevicesByPlatform(platform);

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
