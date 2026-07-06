import type { OsPlatform, MdmDeviceLockPayload, MdmResponse } from '@/types';

const API_KEY = process.env.HEXNODE_API_KEY ?? '';
const PORTAL_NAME = process.env.HEXNODE_PORTAL_NAME ?? '';

export interface HexnodeDevice {
  id: string;   
  serial: string;
  model: string;
}

type HexnodeDeviceRecord = Record<string, unknown>;

/**
 * Base URL for Hexnode API v1.
 */
function getHexnodeBase(): string {
  if (!PORTAL_NAME) {
    // Default fallback if portal name is not configured
    return `https://hexnode.com/api/v1`;
  }
  return `https://${PORTAL_NAME}.uem.hexnode.com/api/v1`;
}

/**
 * Required headers for Hexnode API requests.
 */
function getHexnodeHeaders(): Record<string, string> {
  return {
    'Authorization': API_KEY, // Hexnode usually requires just the API key, sometimes it's 'Bearer <key>' or specific custom header, but standard is often Authorization: <key>
    'Content-Type': 'application/json',
  };
}

function getStringField(record: HexnodeDeviceRecord, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

export interface HexnodeDeviceProfile {
  id: number;
  name: string;
  type: string;
}

/**
 * Fetch all device profiles from Hexnode.
 * Using policies endpoint to represent profiles.
 */
export async function fetchDeviceProfiles(): Promise<HexnodeDeviceProfile[]> {
  if (!API_KEY || !PORTAL_NAME) {
    throw new Error('Hexnode credentials not configured.');
  }

  const endpoint = `${getHexnodeBase()}/policies/`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: getHexnodeHeaders(),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Hexnode policies fetch failed: ${response.statusText}. ${errorText}`);
  }

  const result = await response.json();
  // Hexnode API usually paginates or wraps in a list, we will assume standard list or result.results
  const policies = Array.isArray(result) ? result : (result.results || []);
  
  return policies.map((p: any) => ({
    id: p.id,
    name: p.policy_name || p.name || 'Unknown Policy',
    type: 'policy',
  }));
}

export interface HexnodeFetchDevicesParams {
  order_by?: 'asc' | 'desc';
  platform?: 'ios' | 'android' | 'windows';
  is_active?: boolean;
  device_type?: 'smartphone' | 'tablet';
  page?: number;
  per_page?: number;
}

export interface HexnodeDevicesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: HexnodeDeviceRecord[];
}

/**
 * Fetch a single page of devices with optional filters based on Hexnode API.
 */
export async function fetchDevices(params: HexnodeFetchDevicesParams = {}): Promise<HexnodeDevicesResponse> {
  if (!API_KEY || !PORTAL_NAME) {
    throw new Error('Hexnode credentials not configured.');
  }

  const queryParts: string[] = [];
  if (params.order_by) queryParts.push(`order_by=${encodeURIComponent(params.order_by)}`);
  if (params.platform) queryParts.push(`platform=${encodeURIComponent(params.platform)}`);
  if (params.is_active !== undefined) queryParts.push(`is_active=${params.is_active ? 'True' : 'False'}`);
  if (params.device_type) queryParts.push(`device_type=${encodeURIComponent(params.device_type)}`);
  if (params.page !== undefined) queryParts.push(`page=${params.page}`);
  if (params.per_page !== undefined) queryParts.push(`per_page=${params.per_page}`);

  const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  const endpoint = `${getHexnodeBase()}/devices/${queryString}`;

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: getHexnodeHeaders(),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Hexnode devices fetch failed: ${response.statusText}. ${errorText}`);
  }

  return response.json();
}

/**
 * Fetch all devices of a given platform that exist in Hexnode, automatically handling pagination.
 */
export async function fetchDevicesByPlatform(
  platform: 'android' | 'ios',
  profileId?: string | null
): Promise<HexnodeDevice[]> {
  if (!API_KEY || !PORTAL_NAME) {
    throw new Error('Hexnode credentials not configured.');
  }

  let allDevices: HexnodeDeviceRecord[] = [];
  let nextUrl: string | null = `${getHexnodeBase()}/devices/?platform=${platform}&per_page=250`;

  while (nextUrl) {
    const response = await fetch(nextUrl, {
      method: 'GET',
      headers: getHexnodeHeaders(),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Hexnode device fetch failed: ${response.statusText}. ${errorText}`);
    }

    const result = await response.json();
    const rawDevices = result.results || [];
    allDevices = allDevices.concat(rawDevices);
    
    nextUrl = result.next || null;
  }

  return allDevices
    .map((record: HexnodeDeviceRecord) => ({
      id: getStringField(record, ['id', 'device_id']),
      serial: getStringField(record, ['serial_number', 'imei_no', 'imei', 'serial', 'serial_no']),
      model: getStringField(record, ['model_name', 'device_model', 'model', 'name']) || 'Unknown Model',
    }))
    .filter((device: HexnodeDevice) => device.id && device.serial);
}

/**
 * Convenience wrapper — fetches Apple devices only.
 */
export async function fetchAppleDevices(): Promise<HexnodeDevice[]> {
  return fetchDevicesByPlatform('ios');
}



/**
 * Locks a device via Hexnode MDM.
 */
export async function lockDevice(
  deviceId: string,
  platform: OsPlatform,
  lockPayload: MdmDeviceLockPayload
): Promise<MdmResponse> {
  if (!API_KEY || !PORTAL_NAME) {
    return { success: false, statusCode: 500, message: 'Hexnode credentials not configured.' };
  }

  // Action is usually device_lock
  const endpoint = `${getHexnodeBase()}/devices/${encodeURIComponent(deviceId)}/actions/`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: getHexnodeHeaders(),
      body: JSON.stringify({
        action_name: 'device_lock',
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
      message: `Hexnode lock failed: ${response.statusText}. ${errorText}`,
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 503,
      message: err instanceof Error ? err.message : 'Network error contacting Hexnode.',
    };
  }
}

/**
 * Unlocks a device via Hexnode MDM.
 */
export async function unlockDevice(deviceId: string, platform?: OsPlatform): Promise<MdmResponse> {
  if (!API_KEY || !PORTAL_NAME) {
    return { success: false, statusCode: 500, message: 'Hexnode credentials not configured.' };
  }

  const endpoint = `${getHexnodeBase()}/devices/${encodeURIComponent(deviceId)}/actions/`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: getHexnodeHeaders(),
      body: JSON.stringify({
        action_name: 'clear_passcode',
      }),
    });

    if (response.ok) {
      return { success: true, statusCode: response.status };
    }

    const errorText = await response.text().catch(() => 'Unknown error');
    return {
      success: false,
      statusCode: response.status,
      message: `Hexnode unlock failed: ${response.statusText}. ${errorText}`,
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 503,
      message: err instanceof Error ? err.message : 'Network error contacting Hexnode.',
    };
  }
}

export interface HexnodeDeviceDetails {
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

export async function getDeviceDetails(deviceId: string): Promise<HexnodeDeviceDetails> {
  if (!API_KEY || !PORTAL_NAME) throw new Error('Hexnode credentials not configured.');
  
  const endpoint = `${getHexnodeBase()}/devices/${deviceId}/`;
  
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: getHexnodeHeaders(),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Failed to fetch device details: ${response.statusText}. ${errorText}`);
  }

  return response.json();
}

export interface HexnodeDeviceLocation {
  latitude: string;
  longitude: string;
  reported_time?: string;
  long_name?: string;
}

export async function getDeviceLocation(deviceId: string): Promise<HexnodeDeviceLocation | null> {
  if (!API_KEY || !PORTAL_NAME) throw new Error('Hexnode credentials not configured.');
  
  const endpoint = `${getHexnodeBase()}/devices/${deviceId}/locations/?page=1`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: getHexnodeHeaders(),
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.results && data.results.length > 0) {
      return data.results[0] as HexnodeDeviceLocation;
    }
    return null;
  } catch (err) {
    console.error('Error fetching device location:', err);
    return null;
  }
}

export async function executeDeviceAction(
  deviceId: string,
  actionType: string,
  options: Record<string, string | boolean> = {}
): Promise<MdmResponse> {
  if (!API_KEY || !PORTAL_NAME) {
    return { success: false, statusCode: 500, message: 'Hexnode credentials not configured.' };
  }

  const endpoint = `${getHexnodeBase()}/actions/${actionType}/`;
  
  try {
    const payload = {
      devices: [Number(deviceId)],
      ...options,
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: getHexnodeHeaders(),
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      return { success: true, statusCode: response.status };
    }

    const errorText = await response.text().catch(() => 'Unknown error');
    return {
      success: false,
      statusCode: response.status,
      message: `Hexnode action failed: ${response.statusText}. ${errorText}`,
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 503,
      message: err instanceof Error ? err.message : 'Network error contacting Hexnode.',
    };
  }
}

/**
 * Wipes a device (factory reset).
 */
export async function wipeDevice(deviceId: string): Promise<MdmResponse> {
  return executeDeviceAction(deviceId, 'wipe_device');
}

/**
 * Restarts a device.
 */
export async function restartDevice(deviceId: string): Promise<MdmResponse> {
  return executeDeviceAction(deviceId, 'restart_device');
}

/**
 * Initiates a device scan to sync device details.
 */
export async function scanDevice(deviceId: string): Promise<MdmResponse> {
  return executeDeviceAction(deviceId, 'scan_device');
}

/**
 * Enables Lost Mode on the device.
 */
export async function enableLostMode(deviceId: string, message: string = 'This device is locked.', phoneNumber?: string): Promise<MdmResponse> {
  return executeDeviceAction(deviceId, 'enable_lost_mode', {
    message,
    phone_number: phoneNumber || '',
  });
}

/**
 * Disables Lost Mode on the device.
 */
export async function disableLostMode(deviceId: string): Promise<MdmResponse> {
  return executeDeviceAction(deviceId, 'disable_lost_mode');
}

/**
 * Scans the current location of the device.
 */
export async function scanLocation(deviceId: string): Promise<MdmResponse> {
  return executeDeviceAction(deviceId, 'scan_location');
}

/**
 * Disenrolls a device from MDM.
 */
export async function disenrollDevice(deviceId: string): Promise<MdmResponse> {
  return executeDeviceAction(deviceId, 'disenroll');
}

/**
 * Powers off the device.
 */
export async function powerOffDevice(deviceId: string): Promise<MdmResponse> {
  return executeDeviceAction(deviceId, 'power_off');
}

/**
 * Initiates a remote ring on the device.
 */
export async function remoteRing(deviceId: string): Promise<MdmResponse> {
  return executeDeviceAction(deviceId, 'remote_ring');
}

/**
 * Enables Kiosk mode.
 */
export async function enableKiosk(deviceId: string): Promise<MdmResponse> {
  return executeDeviceAction(deviceId, 'enable_kiosk');
}

/**
 * Disables Kiosk mode.
 */
export async function disableKiosk(deviceId: string): Promise<MdmResponse> {
  return executeDeviceAction(deviceId, 'disable_kiosk');
}

/**
 * Clears the Activation Lock on an iOS device.
 */
export async function clearActivationLock(deviceId: string): Promise<MdmResponse> {
  return executeDeviceAction(deviceId, 'clear_activation_lock');
}

/**
 * Enables Personal Hotspot.
 */
export async function enablePersonalHotspot(deviceId: string): Promise<MdmResponse> {
  return executeDeviceAction(deviceId, 'enable_personal_hotspot');
}

/**
 * Disables Personal Hotspot.
 */
export async function disablePersonalHotspot(deviceId: string): Promise<MdmResponse> {
  return executeDeviceAction(deviceId, 'disable_personal_hotspot');
}

/**
 * Deletes the device record from Hexnode completely.
 */
export async function deleteDevice(deviceId: string): Promise<MdmResponse> {
  return executeDeviceAction(deviceId, 'delete_device');
}

/**
 * Marks the device as disenrolled in the Hexnode portal.
 */
export async function markAsDisenrolled(deviceId: string): Promise<MdmResponse> {
  return executeDeviceAction(deviceId, 'mark_as_disenrolled');
}
