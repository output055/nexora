import type { OsPlatform, MdmDeviceLockPayload, MdmResponse } from '@/types';

const API_KEY = process.env.SCALEFUSION_API_KEY ?? '';

export interface ScalefusionDevice {
  id: string;   
  serial: string;
  model: string;
}

type ScalefusionDeviceRecord = Record<string, unknown>;

/**
 * Base URL for Scalefusion API v1.
 */
function getScalefusionBase(): string {
  return `https://api.scalefusion.com/api/v1`;
}

/**
 * Required headers for Scalefusion API requests.
 */
function getScalefusionHeaders(): Record<string, string> {
  return {
    'Authorization': `Token ${API_KEY}`,
    'Content-Type': 'application/json',
  };
}

function getStringField(record: ScalefusionDeviceRecord, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

export interface ScalefusionDeviceProfile {
  id: number;
  name: string;
  type: string;
}

/**
 * Fetch all device profiles from Scalefusion.
 * Uses GET /api/v1/device_profiles.json
 */
export async function fetchDeviceProfiles(): Promise<ScalefusionDeviceProfile[]> {
  if (!API_KEY) {
    throw new Error('Scalefusion credentials not configured.');
  }

  const endpoint = `${getScalefusionBase()}/device_profiles.json`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: getScalefusionHeaders(),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Scalefusion profiles fetch failed: ${response.statusText}. ${errorText}`);
  }

  return await response.json() as ScalefusionDeviceProfile[];
}

/**
 * Fetch all devices of a given platform that exist in Scalefusion.
 * 
 * Uses GET /api/v2/devices.json
 */
export async function fetchDevicesByPlatform(
  platform: 'android' | 'ios',
  profileId?: string | null
): Promise<ScalefusionDevice[]> {
  if (!API_KEY) {
    throw new Error('Scalefusion credentials not configured.');
  }

  const baseUrl = 'https://api.scalefusion.com/api/v2';
  const endpoint = profileId 
    ? `${baseUrl}/devices.json?device_profile_id=${profileId}`
    : `${baseUrl}/devices.json`;

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: getScalefusionHeaders(),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Scalefusion device fetch failed: ${response.statusText}. ${errorText}`);
  }

  const result = await response.json();
  const rawDevices = Array.isArray(result.devices) ? result.devices : [];

  return rawDevices
    .map((item: any) => (item.device ? item.device : item)) // v2 wraps in { device: {...} }
    .filter((device: ScalefusionDeviceRecord) => {
      // Scalefusion generally returns platform as OS or similar.
      const devPlatform = getStringField(device, ['os_name', 'platform', 'os', 'os_type']).toLowerCase();
      if (!devPlatform) return true; 
      if (platform === 'ios') return devPlatform.includes('ios') || devPlatform.includes('apple');
      return devPlatform.includes('android');
    })
    .map((record: ScalefusionDeviceRecord) => ({
      id: getStringField(record, ['id', 'device_id']),
      serial: getStringField(record, ['serial_number', 'imei_no', 'imei', 'serial', 'serial_no']),
      model: getStringField(record, ['device_model', 'model', 'name', 'model_name']) || 'Unknown Model',
    }))
    .filter((device: ScalefusionDevice) => device.id && device.serial);
}

/**
 * Convenience wrapper — fetches Apple devices only.
 */
export async function fetchAppleDevices(): Promise<ScalefusionDevice[]> {
  return fetchDevicesByPlatform('ios');
}



/**
 * Locks a device via Scalefusion MDM.
 * 
 * Uses POST /api/v1/devices/lock.json
 */
export async function lockDevice(
  deviceId: string,
  platform: OsPlatform,
  lockPayload: MdmDeviceLockPayload
): Promise<MdmResponse> {
  if (!API_KEY) {
    return { success: false, statusCode: 500, message: 'Scalefusion credentials not configured.' };
  }

  const endpoint = `${getScalefusionBase()}/devices/lock.json`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: getScalefusionHeaders(),
      body: JSON.stringify({
        device_ids: [parseInt(deviceId, 10) || deviceId],
        message: lockPayload.NotificationText,
      }),
    });

    if (response.ok) {
      return { success: true, statusCode: response.status };
    }

    const errorText = await response.text().catch(() => 'Unknown error');
    return {
      success: false,
      statusCode: response.status,
      message: `Scalefusion lock failed: ${response.statusText}. ${errorText}`,
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 503,
      message: err instanceof Error ? err.message : 'Network error contacting Scalefusion.',
    };
  }
}

/**
 * Unlocks a device via Scalefusion MDM.
 *
 * Uses POST /api/v1/devices/unlock.json
 */
export async function unlockDevice(deviceId: string, platform?: OsPlatform): Promise<MdmResponse> {
  if (!API_KEY) {
    return { success: false, statusCode: 500, message: 'Scalefusion credentials not configured.' };
  }

  const endpoint = `${getScalefusionBase()}/devices/unlock.json`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: getScalefusionHeaders(),
      body: JSON.stringify({
        device_ids: [parseInt(deviceId, 10) || deviceId]
      }),
    });

    if (response.ok) {
      return { success: true, statusCode: response.status };
    }

    const errorText = await response.text().catch(() => 'Unknown error');
    return {
      success: false,
      statusCode: response.status,
      message: `Scalefusion unlock failed: ${response.statusText}. ${errorText}`,
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 503,
      message: err instanceof Error ? err.message : 'Network error contacting Scalefusion.',
    };
  }
}

export interface ScalefusionDeviceDetails {
  id: number;
  model: string;
  make: string;
  serial_no: string;
  os_type: string;
  os_version: string;
  charging: boolean;
  locked: boolean;
  last_connected_at: string;
  [key: string]: any;
}

export async function getDeviceDetails(deviceId: string): Promise<ScalefusionDeviceDetails> {
  if (!API_KEY) throw new Error('Scalefusion credentials not configured.');
  
  const endpoint = `${getScalefusionBase()}/devices/${deviceId}.json`;
  
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: getScalefusionHeaders(),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Failed to fetch device details: ${response.statusText}. ${errorText}`);
  }

  return response.json();
}

export async function executeDeviceAction(
  deviceId: string,
  actionType: string,
  options: Record<string, string | boolean> = {}
): Promise<MdmResponse> {
  if (!API_KEY) {
    return { success: false, statusCode: 500, message: 'Scalefusion credentials not configured.' };
  }

  const endpoint = `${getScalefusionBase()}/devices/actions.json?device_ids=${deviceId}`;
  
  // API requires form data
  const bodyParams = new URLSearchParams();
  bodyParams.append('action_type', actionType);
  for (const [key, value] of Object.entries(options)) {
    bodyParams.append(key, String(value));
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyParams.toString(),
    });

    if (response.ok) {
      return { success: true, statusCode: response.status };
    }

    const errorText = await response.text().catch(() => 'Unknown error');
    return {
      success: false,
      statusCode: response.status,
      message: `Scalefusion action failed: ${response.statusText}. ${errorText}`,
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 503,
      message: err instanceof Error ? err.message : 'Network error contacting Scalefusion.',
    };
  }
}