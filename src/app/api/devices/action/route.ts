import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { hasPermission } from '@/lib/permissions';
import { executeDeviceAction } from '@/lib/scalefusion';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { deviceId, actionType, ...options } = body;

    if (!deviceId || !actionType) {
      return NextResponse.json(
        { success: false, error: 'deviceId and actionType are required.' },
        { status: 400 }
      );
    }

    const result = await executeDeviceAction(deviceId, actionType, options);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message || 'Action failed.' },
        { status: result.statusCode || 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: `Action ${actionType} executed successfully.` },
    });
  } catch (error) {
    console.error('[/api/devices/action] Server Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unable to execute device action.',
      },
      { status: 500 }
    );
  }
}
