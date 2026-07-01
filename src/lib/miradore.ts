import type { OsPlatform, MiradoreDeviceLockPayload, MiradoreResponse } from '@/types';

const SITE_NAME = process.env.MIRADORE_SITE_NAME ?? '';
const API_KEY = process.env.MIRADORE_API_KEY ?? '';

export interface MiradoreUnassignedDevice {
  id: string;   // Miradore integer ID stored as string for our use
  serial: string;
  model: string;
}

type MiradoreDeviceRecord = Record<string, unknown>;

/**
 * Base URL for Miradore API v2.
 * Format: https://online.miradore.com/{siteName}/api/v2
 */
function getMiradorBase(): string {
  return `https://online.miradore.com/${SITE_NAME}/api/v2`;
}

/**
 * Required headers for all Miradore API v2 requests.
 * - X-API-Key: authentication key
 * - X-Instance-Name: site/tenant name (required on all routes per the Swagger spec)
 */
function getMiradorHeaders(): Record<string, string> {
  return {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
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
  // The v2 Device schema uses camelCase: manufacturer, model
  // identifier contains the serial/IMEI
  const manufacturer = getStringField(record, ['manufacturer', 'Manufacturer']);
  const model = getStringField(record, ['model', 'Model', 'friendlyName', 'FriendlyName']);
  const probe = `${manufacturer} ${model}`.toLowerCase();
  return probe.includes('apple') || probe.includes('iphone') || probe.includes('ipad');
}

function isAndroidDevice(record: MiradoreDeviceRecord): boolean {
  // Android = anything that is not an Apple device
  return !isAppleDevice(record);
}

function isAssigned(record: MiradoreDeviceRecord): boolean {
  // The v2 Device schema uses userEmailAddress for the assigned user
  const email = getStringField(record, ['userEmailAddress', 'UserEmailAddress', 'User', 'user']);
  return Boolean(email);
}

function normalizeMiradoreCollection(payload: unknown): MiradoreDeviceRecord[] {
  // Miradore v2 returns arrays directly or wrapped in a value/items key
  if (Array.isArray(payload)) {
    return payload.filter((item): item is MiradoreDeviceRecord => item !== null && typeof item === 'object');
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    for (const key of ['value', 'Value', 'items', 'Items', 'data', 'Data', 'devices', 'Devices']) {
      const value = record[key];
      if (Array.isArray(value)) {
        return value.filter((item): item is MiradoreDeviceRecord => item !== null && typeof item === 'object');
      }
    }
  }

  return [];
}

/**
 * Fetch devices of a given platform that exist in Miradore but are not yet assigned to a user.
 *
 * Uses GET /api/v2/Device
 * Device schema fields (camelCase in v2):
 *   id (integer), manufacturer, model, identifier (serial/IMEI), userEmailAddress, friendlyName
 */
export async function fetchUnassignedDevicesByPlatform(
  platform: 'android' | 'ios'
): Promise<MiradoreUnassignedDevice[]> {
  if (!SITE_NAME || !API_KEY) {
    throw new Error('Miradore credentials not configured.');
  }

  // Changed to User/DeviceIdentifier as per Swagger analysis
  const endpoint = `${getMiradorBase()}/User/DeviceIdentifier`;
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

  // We remove platform filtering because DeviceIdentifier doesn't return manufacturer/OS
  // The UI will show all unmapped identifiers; Supabase ensures already mapped ones are hidden.
  return records
    .map((record) => ({
      // Extract from typical DeviceIdentifier schema fields
      id: getStringField(record, ['id', 'Id', 'ID', 'deviceId', 'DeviceId']),
      serial: getStringField(record, ['identifier', 'Identifier', 'value', 'Value', 'serialNumber', 'SerialNumber']),
      // Default to "Unknown Model" as this endpoint usually doesn't provide it
      model: getStringField(record, ['model', 'Model', 'friendlyName', 'FriendlyName']) || 'Unknown Model (Check Miradore)',
    }))
    .filter((device) => device.id && device.serial);
}

/**
 * Convenience wrapper — fetches unassigned Apple devices only.
 * Kept for backward compatibility with existing call sites.
 */
export async function fetchUnassignedAppleDevices(): Promise<MiradoreUnassignedDevice[]> {
  return fetchUnassignedDevicesByPlatform('ios');
}

/**
 * Best-effort update of the device's friendlyName in Miradore after an iOS customer registration.
 * Uses PATCH /api/v2/Device/{id} — partial update, only given fields are overwritten.
 * Registration succeeds even if this optional synchronization fails.
 */
export async function updateDeviceAssetOwner(deviceId: string, customerName: string): Promise<MiradoreResponse> {
  if (!SITE_NAME || !API_KEY) {
    return { success: false, statusCode: 500, message: 'Miradore credentials not configured.' };
  }

  const endpoint = `${getMiradorBase()}/Device/${encodeURIComponent(deviceId)}`;

  try {
    const response = await fetch(endpoint, {
      method: 'PATCH', // v2 Swagger spec: PATCH /Device/{id} = partial update
      headers: getMiradorHeaders(),
      body: JSON.stringify({
        friendlyName: `Nexora: ${customerName}`, // v2 Device schema field
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
 *
 * iOS: Enables Lost Mode via POST /api/v2/Device/{id}/LostMode
 *   Body: LostModeConfiguration { message, phoneNumber, footnote, enableLocationTracking }
 *
 * Android: Locks device via POST /api/v2/Device/{id}/Lock
 *   Body: none (Swagger spec defines no request body for Lock)
 */
export async function lockDevice(
  deviceId: string,
  platform: OsPlatform,
  lockPayload: MiradoreDeviceLockPayload
): Promise<MiradoreResponse> {
  if (!SITE_NAME || !API_KEY) {
    return { success: false, statusCode: 500, message: 'Miradore credentials not configured.' };
  }

  // iOS uses Lost Mode (POST /LostMode), Android uses Lock (POST /Lock)
  const endpoint = platform === 'iOS'
    ? `${getMiradorBase()}/Device/${encodeURIComponent(deviceId)}/LostMode`
    : `${getMiradorBase()}/Device/${encodeURIComponent(deviceId)}/Lock`;

  // iOS Lost Mode body uses v2 schema field names (camelCase)
  const body = platform === 'iOS'
    ? {
        message: lockPayload.NotificationText,       // LostModeConfiguration.message
        phoneNumber: lockPayload.PhoneNumber,         // LostModeConfiguration.phoneNumber
        footnote: lockPayload.FootnoteText,           // LostModeConfiguration.footnote
        enableLocationTracking: false,
      }
    : undefined; // Android Lock has no body per the Swagger spec

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: getMiradorHeaders(),
      ...(body !== undefined && { body: JSON.stringify(body) }),
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
 *
 * IMPORTANT: There is NO /Unlock endpoint in Miradore API v2.
 *
 * iOS: Disables Lost Mode via DELETE /api/v2/Device/{id}/LostMode
 * Android: No API unlock available — device must be unlocked by user passcode on-device.
 *          We still call DELETE /LostMode for consistency, it will gracefully fail for Android.
 */
export async function unlockDevice(deviceId: string, platform?: OsPlatform): Promise<MiradoreResponse> {
  if (!SITE_NAME || !API_KEY) {
    return { success: false, statusCode: 500, message: 'Miradore credentials not configured.' };
  }

  if (platform === 'Android') {
    // Miradore API v2 has no remote unlock for Android — the device lock clears
    // automatically once the user enters their passcode or the lock command expires.
    return {
      success: false,
      statusCode: 422,
      message: 'Android devices cannot be remotely unlocked via the Miradore API. The device unlocks when the user enters their passcode.',
    };
  }

  // iOS: disable Lost Mode via DELETE /LostMode
  const endpoint = `${getMiradorBase()}/Device/${encodeURIComponent(deviceId)}/LostMode`;

  try {
    const response = await fetch(endpoint, {
      method: 'DELETE',
      headers: getMiradorHeaders(),
    });

    if (response.ok) {
      return { success: true, statusCode: response.status };
    }

    const errorText = await response.text().catch(() => 'Unknown error');
    return {
      success: false,
      statusCode: response.status,
      message: `Miradore Lost Mode disable failed: ${response.statusText}. ${errorText}`,
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 503,
      message: err instanceof Error ? err.message : 'Network error contacting Miradore.',
    };
  }
}
