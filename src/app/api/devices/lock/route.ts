import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { hasPermission } from '@/lib/permissions';
import { lockDevice } from '@/lib/hexnode';
import type { MdmDeviceLockPayload } from '@/types';

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
    const permitted = await hasPermission(user.id, 'force_lock_device');
    if (!permitted) {
      return NextResponse.json(
        { success: false, error: 'Forbidden — you lack the "force_lock_device" permission.' },
        { status: 403 }
      );
    }

    // ── 4. Fetch device record ──────────────────────────────────────────────
    const { data: device, error: devError } = await supabase
      .from('devices')
      .select('id, hexnode_device_id, os_platform, customers(id, full_name)')
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

    // ── 5. Build lock payload ─────────────────────────────────────────────────
    const contactPhone = process.env.LOCK_CONTACT_PHONE ?? '+1-800-000-0000';
    const footnote = process.env.LOCK_FOOTNOTE_TEXT ?? 'Please pay your outstanding balance to unlock this device.';

    const lockPayload: MdmDeviceLockPayload = {
      NotificationText: `This device has been locked due to an overdue balance. Please call ${contactPhone} to make a payment.`,
      PhoneNumber: contactPhone,
      FootnoteText: footnote,
    };

    // ── 6. Fire Miradore lock command ──────────────────────────────────────────
    const mirResult = await lockDevice(
      device.hexnode_device_id,
      device.os_platform as OsPlatform,
      lockPayload
    );

    if (!mirResult.success) {
      // Log failed attempt
      await supabase.from('audit_logs').insert({
        actor_name: user.email ?? 'Unknown',
        action_description: `LOCK FAILED for ${customerFullName} (${device.os_platform}) — ${mirResult.message}`,
      });
      return NextResponse.json(
        { success: false, error: mirResult.message ?? 'MDM lock command failed.' },
        { status: mirResult.statusCode }
      );
    }

    // ── 7. Update device payment_status ──────────────────────────────────────
    await supabase
      .from('devices')
      .update({ payment_status: 'overdue', updated_at: new Date().toISOString() })
      .eq('id', device.id);

    // ── 8. Write audit log ────────────────────────────────────────────────────
    await supabase.from('audit_logs').insert({
      actor_name: user.email ?? 'Unknown',
      action_description: `Triggered LOCK on device ${device.hexnode_device_id} (${customerFullName}) — ${device.os_platform} ${device.os_platform === 'iOS' ? 'Lost Mode' : 'Device Lock'} activated`,
    });

    return NextResponse.json({
      success: true,
      data: { message: `Device locked successfully for ${customerFullName}.` },
    });

  } catch (err) {
    console.error('[/api/devices/lock]', err);
    return NextResponse.json(
      { success: false, error: 'An unexpected server error occurred.' },
      { status: 500 }
    );
  }
}
