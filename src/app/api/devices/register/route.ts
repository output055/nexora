import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from '@/lib/supabase';
import { hasPermission } from '@/lib/permissions';
import { calculatePaymentPlan, calculateNextPaymentDate } from '@/lib/utils/calculator';
import { getSystemSetting } from '@/app/actions/settings';
import { sendSMS } from '@/lib/sms';
import type { Customer, OsPlatform, PaymentCycle, ResidentialStatus } from '@/types';

type RegisterDevicePayload = {
  full_name: string;
  email: string;
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
  imei: string;
  serial_number: string;
  os_version: string;
  base_price: number;
  contract_duration_months: number;
  interest_rate?: number;
  down_payment_type?: 'percentage' | 'fixed';
  down_payment_value?: number;
  ghana_card_scan: File;
};

const GHANA_CARD_PATTERN = /^GHA-\d{9}-\d$/i;
const MAX_SCAN_BYTES = 2 * 1024 * 1024;
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
    email: cleanString(formData, 'email').toLowerCase(),
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
    imei: cleanString(formData, 'imei'),
    serial_number: cleanString(formData, 'serial_number'),
    os_version: cleanString(formData, 'os_version'),
    base_price: Number(cleanString(formData, 'base_price')),
    contract_duration_months: Number(cleanString(formData, 'contract_duration_months')),
    interest_rate: cleanString(formData, 'interest_rate') ? Number(cleanString(formData, 'interest_rate')) : undefined,
    down_payment_type: cleanString(formData, 'down_payment_type') as 'percentage' | 'fixed' || undefined,
    down_payment_value: cleanString(formData, 'down_payment_value') ? Number(cleanString(formData, 'down_payment_value')) : undefined,
    ghana_card_scan: formData.get('ghana_card_scan') as File | null,
  };

  if (!payload.device_model) return { error: 'Device model is required.' };
  if (!payload.mdm_device_id) return { error: 'MDM device id is required.' };
  if (!['iOS', 'Android'].includes(payload.os_platform)) return { error: 'os_platform must be iOS or Android.' };
  if (!Number.isFinite(payload.base_price) || payload.base_price <= 0) return { error: 'Base price must be a positive number.' };
  if (!Number.isFinite(payload.contract_duration_months) || payload.contract_duration_months <= 0) return { error: 'Contract duration must be a positive number of months.' };

  if (!payload.ghana_card_id) return { error: 'Ghana Card ID is required.' };
  if (!GHANA_CARD_PATTERN.test(payload.ghana_card_id)) return { error: 'Ghana Card ID must match GHA-XXXXXXXXX-X.' };
  if (!payload.ghana_card_scan || !payload.ghana_card_scan.size) return { error: 'Ghana Card scan/photo is required.' };
  if (payload.ghana_card_scan.size > MAX_SCAN_BYTES) return { error: 'Ghana Card scan must be 2MB or smaller.' };
  if (!ALLOWED_SCAN_TYPES.has(payload.ghana_card_scan.type)) return { error: 'Ghana Card scan must be a JPG, PNG, WebP, or PDF file.' };
  if (!payload.full_name) return { error: 'Full legal name is required.' };
  if (!payload.email) return { error: 'Email address is required.' };

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

    // Enforce 2MB file size limit for Ghana Card scan
    if (payload.ghana_card_scan.size > 2 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'The uploaded image exceeds the 2MB size limit. Please upload a smaller image.' }, { status: 400 });
    }

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

    // Generate random 6-character password
    const rawPassword = Math.random().toString(36).slice(-6).toUpperCase();
    
    // Auto-create Auth User
    const { data: authUser, error: createUserError } = await admin.auth.admin.createUser({
      email: payload.email,
      password: rawPassword,
      email_confirm: true,
      user_metadata: { full_name: payload.full_name }
    });

    if (createUserError) {
      // If user already exists or other auth error
      await admin.storage.from('ghana-card-scans').remove([scanPath]);
      return NextResponse.json({ success: false, error: `Failed to create login account: ${createUserError.message}` }, { status: 500 });
    }

    // Assign 'customer' role
    const { data: customerRole } = await admin.from('roles').select('id').eq('name', 'customer').single();
    if (customerRole) {
      await admin.from('user_roles').insert({
        user_id: authUser.user.id,
        role_id: customerRole.id
      });
    }

    const { data: customer, error: customerError } = await admin
      .from('customers')
      .insert({
        full_name: payload.full_name,
        email: payload.email,
        user_id: authUser.user.id,
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

    const interestRateStr = await getSystemSetting('payment_interest_rate');
    const downPaymentRateStr = await getSystemSetting('payment_down_payment_rate');
    
    // If the frontend provided an interest rate, use it; otherwise fallback to global setting
    const interestRate = payload.interest_rate !== undefined ? payload.interest_rate : (interestRateStr ? Number(interestRateStr) : 30);
    
    // For down payment, if the frontend provided a value, we pass it depending on the type
    let downPaymentRate = downPaymentRateStr ? Number(downPaymentRateStr) : 40;
    let downPaymentType = payload.down_payment_type || 'percentage';
    let downPaymentFixedAmount: number | undefined = undefined;

    if (payload.down_payment_value !== undefined) {
      if (downPaymentType === 'percentage') {
        downPaymentRate = payload.down_payment_value;
      } else {
        downPaymentFixedAmount = payload.down_payment_value;
      }
    }

    const plan = calculatePaymentPlan({
      basePrice: payload.base_price,
      durationMonths: payload.contract_duration_months,
      cycle: payload.payment_cycle,
      interestRate,
      downPaymentRate,
      downPaymentType,
      downPaymentFixedAmount
    });

    const nextPaymentDate = calculateNextPaymentDate(new Date(), payload.payment_cycle);

    const { data: device, error: deviceError } = await admin
      .from('devices')
      .insert({
        customer_id: customer.id,
        os_platform: payload.os_platform,
        device_model: payload.device_model,
        mdm_device_id: payload.mdm_device_id,
        imei: payload.imei || null,
        serial_number: payload.serial_number || null,
        os_version: payload.os_version || null,
        base_price: plan.basePrice,
        contract_duration_months: payload.contract_duration_months,
        down_payment: plan.downPayment,
        payment_cycle_amount: plan.paymentCycleAmount,
        total_owed: plan.totalContractValue,
        remaining_balance: plan.totalContractValue,
        next_payment_date: nextPaymentDate.toISOString(),
        payment_status: 'overdue',
      })
      .select('*')
      .single();

    if (deviceError || !device) {
      await admin.from('customers').delete().eq('id', customer.id);
      await admin.storage.from('ghana-card-scans').remove([scanPath]);
      return NextResponse.json(
        { success: false, error: deviceError?.message ?? 'Unable to link device.' },
        { status: 500 }
      );
    }

    const { error: auditError } = await admin.from('audit_logs').insert({
      actor_name: user.email ?? 'Unknown',
      action_description: `Admin registered new ${payload.os_platform} device ${payload.mdm_device_id} to customer ${payload.full_name} (${payload.ghana_card_id})`,
    });

    if (auditError) {
      await admin.from('devices').delete().eq('id', device.id);
      await admin.from('customers').delete().eq('id', customer.id);
      await admin.storage.from('ghana-card-scans').remove([scanPath]);
      return NextResponse.json({ success: false, error: auditError.message }, { status: 500 });
    }

    let miradoreSync = { attempted: false, success: false, error: undefined as string | undefined };

    // Placeholder for future ManageEngine device rename/sync if needed
    // if (payload.os_platform === 'iOS') { ... }

    // Merge the inserted device fields into the customer object for the frontend
    const mergedCustomer = {
      ...customer,
      device_model: device.device_model,
      remaining_balance: device.remaining_balance,
      total_owed: device.total_owed,
      mdm_device_id: device.mdm_device_id,
    };

    // Send Welcome SMS
    await sendSMS(
      payload.phone_number,
      `Credifon: Device registered! GHS ${Number(plan.paymentCycleAmount).toFixed(2)} due ${nextPaymentDate.toLocaleDateString('en-GB')}. Login: ${process.env.NEXT_PUBLIC_APP_URL || 'credifon.app'} User: ${payload.email} Pw: ${rawPassword}`
    );

    return NextResponse.json({
      success: true,
      data: {
        customer: mergedCustomer as Customer,
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
// trigger recompilation
