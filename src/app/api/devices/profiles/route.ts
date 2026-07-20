import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { hasPermission } from '@/lib/permissions';
import { fetchManageEngineProfiles } from '@/lib/manageengine';

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

    const profiles = await fetchManageEngineProfiles();

    return NextResponse.json({
      success: true,
      data: profiles,
    });
  } catch (error) {
    console.error('[/api/devices/profiles] Server Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unable to fetch device profiles.',
      },
      { status: 500 }
    );
  }
}
