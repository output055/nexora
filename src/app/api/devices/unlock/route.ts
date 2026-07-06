import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { hasPermission } from '@/lib/permissions';
import { unlockDevice } from '@/lib/hexnode';

export async function POST(request: NextRequest) {
  try {
    // ── 1. Parse request body ─────────────────────────────────────────────────
    const body = await request.json().catch(() => null);
    if (!body?.customerId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: customerId' },
        { status: 400 }
      );
    }

    // ── 2. Authenticate caller ────────────────────────────────────────────────
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized — authentication required.' },
        { status: 401 }
      );
    }

    // ── 3. Check permission ───────────────────────────────────────────────────
    const permitted = await hasPermission(user.id, 'unlock_device');
    if (!permitted) {
      return NextResponse.json(
        { success: false, error: 'Forbidden — you lack the "unlock_device" permission.' },
        { status: 403 }
      );
    }

    // ── 4. Fetch device record ──────────────────────────────────────────────
    const { data: device, error: devError } = await supabase
      .from('devices')
      .select('id, hexnode_device_id, os_platform, remaining_balance, customers(id, full_name)')
      .eq('customer_id', body.customerId)
      .limit(1)
      .single();

    if (devError || !device || !device.customers) {
      return NextResponse.json(
        { success: false, error: 'Customer or device not found.' },
        { status: 404 }
      );
    }
    const customerFullName = Array.isArray(device.customers) ? device.customers[0]?.full_name : device.customers?.full_name;

    // ── 5. Fire Miradore unlock command ───────────────────────────────────────
    const mirResult = await unlockDevice(device.hexnode_device_id, device.os_platform);

    if (!mirResult.success) {
      await supabase.from('audit_logs').insert({
        actor_name: user.email ?? 'Unknown',
        action_description: `UNLOCK FAILED for ${customerFullName} (${device.os_platform}) — ${mirResult.message}`,
      });
      return NextResponse.json(
        { success: false, error: mirResult.message ?? 'MDM unlock command failed.' },
        { status: mirResult.statusCode }
      );
    }

    // ── 6. Update device payment_status ──────────────────────────────────────
    await supabase
      .from('devices')
      .update({
        payment_status: 'current',
        updated_at: new Date().toISOString(),
      })
      .eq('id', device.id);

    // ── 7. Write audit log ────────────────────────────────────────────────────
    const isAuto = body.isAutoUnlock === true;
    await supabase.from('audit_logs').insert({
      actor_name: isAuto ? 'System (auto)' : user.email ?? 'Unknown',
      action_description: `${isAuto ? 'AUTO ' : ''}UNLOCK triggered for device ${device.hexnode_device_id} (${customerFullName}) — balance cleared`,
    });

    return NextResponse.json({
      success: true,
      data: { message: `Device unlocked successfully for ${customerFullName}.` },
    });

  } catch (err) {
    console.error('[/api/devices/unlock]', err);
    return NextResponse.json(
      { success: false, error: 'An unexpected server error occurred.' },
      { status: 500 }
    );
  }
}
