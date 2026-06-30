import type { OsPlatform, MiradoreDeviceLockPayload, MiradoreResponse } from '@/types';

const SITE_NAME = process.env.MIRADORE_SITE_NAME ?? '';
const API_KEY = process.env.MIRADORE_API_KEY ?? '';

export interface MiradoreUnassignedDevice {
  id: string;
  serial: string;
  model: string;
}

type MiradoreDeviceRecord = Record<string, unknown>;

function getMiradorBase(): string {
  return `https://online.miradore.com/${SITE_NAME}/api/v2`;
}

function getMiradorHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `ApiKey ${API_KEY}`,
  };
}

function getStringField(record: MiradoreDeviceRecord, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function isAppleDevice(record: MiradoreDeviceRecord): boolean {
  const platform = getStringField(record, ['Platform', 'platform', 'OsPlatform', 'osPlatform', 'OperatingSystem', 'operatingSystem']);
  const manufacturer = getStringField(record, ['Manufacturer', 'manufacturer', 'Vendor', 'vendor']);
  const model = getStringField(record, ['Model', 'model', 'DeviceModel', 'deviceModel']);
  const probe = `${platform} ${manufacturer} ${model}`.toLowerCase();
  return probe.includes('ios') || probe.includes('iphone') || probe.includes('ipad') || probe.includes('apple');
}

function isAssigned(record: MiradoreDeviceRecord): boolean {
  const assignedUser = getStringField(record, [
    'User',
    'user',
    'UserName',
    'userName',
    'AssignedUser',
    'assignedUser',
    'Owner',
    'owner',
    'Email',
    'email',
  ]);
  return Boolean(assignedUser);
}

function normalizeMiradoreCollection(payload: unknown): MiradoreDeviceRecord[] {
  if (Array.isArray(payload)) return payload.filter((item): item is MiradoreDeviceRecord => item !== null && typeof item === 'object');

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    for (const key of ['items', 'Items', 'data', 'Data', 'value', 'Value', 'devices', 'Devices']) {
      const value = record[key];
      if (Array.isArray(value)) {
        return value.filter((item): item is MiradoreDeviceRecord => item !== null && typeof item === 'object');
      }
    }
  }

  return [];
}

/**
 * Fetch Apple hardware that exists in Miradore but has not been assigned to a user.
 * The response normalizer accepts several Miradore collection shapes so the API
 * remains resilient across tenant/API casing differences.
 */
export async function fetchUnassignedAppleDevices(): Promise<MiradoreUnassignedDevice[]> {
  if (!SITE_NAME || !API_KEY) {
    throw new Error('Miradore credentials not configured.');
  }

  const endpoint = `${getMiradorBase()}/Device`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: getMiradorHeaders(),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Miradore device fetch failed: ${response.statusText}. ${errorText}`);
  }

  const records = normalizeMiradoreCollection(await response.json());

  return records
    .filter((record) => isAppleDevice(record) && !isAssigned(record))
    .map((record) => ({
      id: getStringField(record, ['ID', 'Id', 'id', 'DeviceID', 'DeviceId', 'deviceId']),
      serial: getStringField(record, ['SerialNumber', 'serialNumber', 'Serial', 'serial', 'IMEI', 'imei']),
      model: getStringField(record, ['Model', 'model', 'DeviceModel', 'deviceModel', 'Name', 'name']),
    }))
    .filter((device) => device.id && device.serial);
}

/**
 * Best-effort Miradore asset note update after an iOS customer registration.
 * Registration succeeds even if this optional synchronization fails.
 */
export async function updateDeviceAssetOwner(deviceId: string, customerName: string): Promise<MiradoreResponse> {
  if (!SITE_NAME || !API_KEY) {
    return { success: false, statusCode: 500, message: 'Miradore credentials not configured.' };
  }

  const endpoint = `${getMiradorBase()}/Device/${encodeURIComponent(deviceId)}`;

  try {
    const response = await fetch(endpoint, {
      method: 'PATCH',
      headers: getMiradorHeaders(),
      body: JSON.stringify({
        Notes: `Nexora customer: ${customerName}`,
      }),
    });

    if (response.ok) {
      return { success: true, statusCode: response.status };
    }

    const errorText = await response.text().catch(() => 'Unknown error');
    return {
      success: false,
      statusCode: response.status,
      message: `Miradore asset update failed: ${response.statusText}. ${errorText}`,
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 503,
      message: err instanceof Error ? err.message : 'Network error contacting Miradore.',
    };
  }
}

/**
 * Locks a device via Miradore MDM.
 * - iOS: Activates Lost Mode with notification message
 * - Android: Sends Device Lock command
 */
export async function lockDevice(
  deviceId: string,
  platform: OsPlatform,
  payload: MiradoreDeviceLockPayload
): Promise<MiradoreResponse> {
  if (!SITE_NAME || !API_KEY) {
    return { success: false, statusCode: 500, message: 'Miradore credentials not configured.' };
  }

  const endpoint = `${getMiradorBase()}/Device/${encodeURIComponent(deviceId)}/Lock`;

  // Build platform-specific payload
  const body = platform === 'iOS'
    ? {
        NotificationText: payload.NotificationText,
        PhoneNumber: payload.PhoneNumber,
        FootnoteText: payload.FootnoteText,
        PlaySound: false,
      }
    : {
        // Android Device Owner lock — minimal payload
        LockMessage: payload.NotificationText,
      };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: getMiradorHeaders(),
      body: JSON.stringify(body),
    });

    if (response.ok) {
      return { success: true, statusCode: response.status };
    }

    const errorText = await response.text().catch(() => 'Unknown error');
    return {
      success: false,
      statusCode: response.status,
      message: `Miradore lock failed: ${response.statusText}. ${errorText}`,
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 503,
      message: err instanceof Error ? err.message : 'Network error contacting Miradore.',
    };
  }
}

/**
 * Unlocks a device via Miradore MDM.
 * Works for both iOS (clears Lost Mode) and Android (removes Device Lock).
 */
export async function unlockDevice(deviceId: string): Promise<MiradoreResponse> {
  if (!SITE_NAME || !API_KEY) {
    return { success: false, statusCode: 500, message: 'Miradore credentials not configured.' };
  }

  const endpoint = `${getMiradorBase()}/Device/${encodeURIComponent(deviceId)}/Unlock`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: getMiradorHeaders(),
      body: JSON.stringify({}),
    });

    if (response.ok) {
      return { success: true, statusCode: response.status };
    }

    const errorText = await response.text().catch(() => 'Unknown error');
    return {
      success: false,
      statusCode: response.status,
      message: `Miradore unlock failed: ${response.statusText}. ${errorText}`,
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 503,
      message: err instanceof Error ? err.message : 'Network error contacting Miradore.',
    };
  }
}
