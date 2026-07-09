import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from '@/lib/supabase';
import { hasPermission } from '@/lib/permissions';
import { updateDeviceAssetOwner } from '@/lib/scalefusion';
import type { Customer, OsPlatform, PaymentCycle, ResidentialStatus } from '@/types';

type RegisterDevicePayload = {
  full_name: string;
  phone_number: string;
  ghana_card_id: string;
  alternative_phone_number: string;
  whatsapp_number: string;
  digital_address: string;
  location_landmarks: string;
  residential_status: ResidentialStatus;
  landlord_contact: string;
  occupation: string;
  place_of_work: string;
  payment_cycle: PaymentCycle;
  os_platform: OsPlatform;
  device_model: string;
  mdm_device_id: string;
  total_owed: number;
  ghana_card_scan: File;
};

const GHANA_CARD_PATTERN = /^GHA-\d{9}-\d$/i;
const MAX_SCAN_BYTES = 8 * 1024 * 1024;
const ALLOWED_SCAN_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

const cleanString = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
};

function parseRegisterPayload(formData: FormData):
  | { payload: RegisterDevicePayload }
  | { error: string } {
  const payload = {
    full_name: cleanString(formData, 'full_name'),
    phone_number: cleanString(formData, 'phone_number'),
    ghana_card_id: cleanString(formData, 'ghana_card_id').toUpperCase(),
    alternative_phone_number: cleanString(formData, 'alternative_phone_number'),
    whatsapp_number: cleanString(formData, 'whatsapp_number'),
    digital_address: cleanString(formData, 'digital_address').toUpperCase(),
    location_landmarks: cleanString(formData, 'location_landmarks'),
    residential_status: cleanString(formData, 'residential_status'),
    landlord_contact: cleanString(formData, 'landlord_contact'),
    occupation: cleanString(formData, 'occupation'),
    place_of_work: cleanString(formData, 'place_of_work'),
    payment_cycle: cleanString(formData, 'payment_cycle'),
    os_platform: cleanString(formData, 'os_platform'),
    device_model: cleanString(formData, 'device_model'),
    mdm_device_id: cleanString(formData, 'mdm_device_id'),
    total_owed: Number(cleanString(formData, 'total_owed')),
    ghana_card_scan: formData.get('ghana_card_scan'),
  };

  if (!payload.device_model) return { error: 'Device model is required.' };
  if (!payload.mdm_device_id) return { error: 'Miradore device id, serial, or IMEI is required.' };
  if (!['iOS', 'Android'].includes(payload.os_platform)) return { error: 'os_platform must be iOS or Android.' };
  if (!Number.isFinite(payload.total_owed) || payload.total_owed <= 0) return { error: 'Total financed amount must be a positive number.' };

  if (!payload.ghana_card_id) return { error: 'Ghana Card ID is required.' };
  if (!GHANA_CARD_PATTERN.test(payload.ghana_card_id)) return { error: 'Ghana Card ID must match GHA-XXXXXXXXX-X.' };
  if (!(payload.ghana_card_scan instanceof File) || payload.ghana_card_scan.size === 0) return { error: 'Ghana Card scan/photo is required.' };
  if (payload.ghana_card_scan.size > MAX_SCAN_BYTES) return { error: 'Ghana Card scan must be 8MB or smaller.' };
  if (!ALLOWED_SCAN_TYPES.has(payload.ghana_card_scan.type)) return { error: 'Ghana Card scan must be a JPG, PNG, WebP, or PDF file.' };
  if (!payload.full_name) return { error: 'Full legal name is required.' };

  if (!payload.phone_number) return { error: 'Primary phone number is required.' };
  if (!payload.alternative_phone_number) return { error: 'Alternative or emergency phone number is required.' };
  if (!payload.whatsapp_number) return { error: 'Active WhatsApp number is required.' };

  if (!payload.digital_address) return { error: 'Ghana Post Digital Address is required.' };
  if (!payload.location_landmarks) return { error: 'Location landmarks are required.' };
  if (!['owner', 'renting', 'family_house', 'other'].includes(payload.residential_status)) return { error: 'Residential status is required.' };

  if (!payload.occupation) return { error: 'Occupation is required.' };
  if (!payload.place_of_work) return { error: 'Place of work is required.' };
  if (!['daily', 'weekly', 'bi_weekly'].includes(payload.payment_cycle)) return { error: 'Preferred payment cycle is required.' };

  return {
    payload: {
      ...payload,
      os_platform: payload.os_platform as OsPlatform,
      residential_status: payload.residential_status as ResidentialStatus,
      payment_cycle: payload.payment_cycle as PaymentCycle,
      ghana_card_scan: payload.ghana_card_scan,
    },
  };
}

const getScanExtension = (file: File) => {
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const parsed = parseRegisterPayload(formData);

    if ('error' in parsed) {
      return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized - authentication required.' }, { status: 401 });
    }

    const permitted = await hasPermission(user.id, 'manage_devices');
    if (!permitted) {
      return NextResponse.json({ success: false, error: 'Forbidden - you lack the "manage_devices" permission.' }, { status: 403 });
    }

    const admin = createServiceRoleSupabaseClient();
    const { payload } = parsed;

    const { data: existingDevice } = await admin
      .from('customers')
      .select('id')
      .eq('mdm_device_id', payload.mdm_device_id)
      .maybeSingle();

    if (existingDevice) {
      return NextResponse.json({ success: false, error: 'This device is already linked to a customer.' }, { status: 409 });
    }

    const { data: existingGhanaCard } = await admin
      .from('customers')
      .select('id')
      .eq('ghana_card_id', payload.ghana_card_id)
      .maybeSingle();

    if (existingGhanaCard) {
      return NextResponse.json({ success: false, error: 'This Ghana Card ID is already registered.' }, { status: 409 });
    }

    const scanPath = `${payload.ghana_card_id}/${Date.now()}-${payload.mdm_device_id}.${getScanExtension(payload.ghana_card_scan)}`;
    const { error: uploadError } = await admin.storage
      .from('ghana-card-scans')
      .upload(scanPath, payload.ghana_card_scan, {
        contentType: payload.ghana_card_scan.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ success: false, error: uploadError.message }, { status: 500 });
    }

    const { data: customer, error: customerError } = await admin
      .from('customers')
      .insert({
        full_name: payload.full_name,
        phone_number: payload.phone_number,
        ghana_card_id: payload.ghana_card_id,
        ghana_card_scan_path: scanPath,
        alternative_phone_number: payload.alternative_phone_number,
        whatsapp_number: payload.whatsapp_number,
        digital_address: payload.digital_address,
        location_landmarks: payload.location_landmarks,
        residential_status: payload.residential_status,
        landlord_contact: payload.landlord_contact || null,
        occupation: payload.occupation,
        place_of_work: payload.place_of_work,
        payment_cycle: payload.payment_cycle,
        os_platform: payload.os_platform,
        device_model: payload.device_model,
        mdm_device_id: payload.mdm_device_id,
        total_owed: payload.total_owed,
        remaining_balance: payload.total_owed,
        payment_status: 'current',
      })
      .select('*')
      .single();

    if (customerError || !customer) {
      await admin.storage.from('ghana-card-scans').remove([scanPath]);
      return NextResponse.json(
        { success: false, error: customerError?.message ?? 'Unable to create customer profile.' },
        { status: 500 }
      );
    }

    const { error: auditError } = await admin.from('audit_logs').insert({
      actor_name: user.email ?? 'Unknown',
      action_description: `Admin registered new ${payload.os_platform} device ${payload.mdm_device_id} to customer ${payload.full_name} (${payload.ghana_card_id})`,
    });

    if (auditError) {
      await admin.from('customers').delete().eq('id', customer.id);
      await admin.storage.from('ghana-card-scans').remove([scanPath]);
      return NextResponse.json({ success: false, error: auditError.message }, { status: 500 });
    }

    let miradoreSync = { attempted: false, success: false, error: undefined as string | undefined };

    if (payload.os_platform === 'iOS') {
      const result = await updateDeviceAssetOwner(payload.mdm_device_id, payload.full_name);
      miradoreSync = {
        attempted: true,
        success: result.success,
        error: result.message,
      };

      if (!result.success) {
        await admin.from('audit_logs').insert({
          actor_name: 'System (auto)',
          action_description: `Miradore asset sync failed for ${payload.mdm_device_id} (${payload.full_name}) - ${result.message ?? 'unknown error'}`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        customer: customer as Customer,
        miradoreSync,
      },
    });
  } catch (error) {
    console.error('[/api/devices/register]', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected server error occurred.' },
      { status: 500 }
    );
  }
}
