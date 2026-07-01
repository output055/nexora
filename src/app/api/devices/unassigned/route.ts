import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { hasPermission } from '@/lib/permissions';

// Helper to safely extract string fields from Miradore's dynamic payload
function getStringField(record: Record<string, any>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

export async function GET(request: Request) {
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

    // 1. Point the fetch request directly to the base device list endpoint
    const MIRADORE_API_KEY = process.env.MIRADORE_API_KEY || '';
    const MIRADORE_SITE_NAME = process.env.MIRADORE_SITE_NAME || '';
    
    if (!MIRADORE_API_KEY || !MIRADORE_SITE_NAME) {
      throw new Error('Miradore credentials not configured in environment variables.');
    }

    const endpoint = `https://online.miradore.com/${MIRADORE_SITE_NAME}/api/v2/Device`;
    
    // 2. Authentication Header: custom X-API-Key
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'X-API-Key': MIRADORE_API_KEY,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error text');
      console.error(`[/api/devices/unassigned] Network error: ${response.status} - ${response.statusText}`, errorText);
      throw new Error(`Miradore API responded with ${response.status}: ${response.statusText}`);
    }

    const rawData = await response.json();
    const records: Record<string, any>[] = Array.isArray(rawData) ? rawData : (rawData?.items || []);

    // 3. Filter the results locally: only unassigned devices where platform is Android
    const unassignedAndroidDevices = records.filter(record => {
      // Check if it's an Android device (platform or OS field usually indicates this, or not Apple)
      const probe = JSON.stringify(record).toLowerCase();
      const isAndroid = probe.includes('android');
      
      // Check if assigned (userEmailAddress is empty/missing)
      const email = getStringField(record, ['userEmailAddress', 'UserEmailAddress', 'User', 'user']);
      const isUnassigned = !email;

      return isAndroid && isUnassigned;
    }).map(record => ({
      id: getStringField(record, ['id', 'Id', 'ID']),
      serial: getStringField(record, ['identifier', 'Identifier', 'SerialNumber', 'serialNumber', 'Serial', 'serial']),
      model: getStringField(record, ['model', 'Model', 'friendlyName', 'FriendlyName']) || 'Unknown Android Device'
    })).filter(device => device.id && device.serial); // Cleaned JSON response ensures we have required fields

    return NextResponse.json({
      success: true,
      data: unassignedAndroidDevices,
    });
  } catch (error) {
    console.error('[/api/devices/unassigned] Server Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unable to fetch unassigned devices.',
      },
      { status: 500 }
    );
  }
}
