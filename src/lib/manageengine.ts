/**
 * ManageEngine MDM Cloud API Client Utility
 * 
 * ==========================================
 * REQUIRED ZOHO OAUTH 2.0 SCOPES
 * ==========================================
 * To manage mobile endpoints, the Zoho API Console client must be authorized
 * with the following scopes:
 * 
 * - `MDMOnDemand.MDMInventory.READ` (To fetch devices, inventory details, etc.)
 * - `MDMOnDemand.MDMInventory.CREATE` (To execute actions, assign devices, etc.)
 * 
 * Ensure these are requested when initially generating the `ZOHO_REFRESH_TOKEN`.
 */

import { createServiceRoleSupabaseClient } from './supabase';

export interface ZohoTokenResponse {
  access_token: string;
  expires_in: number;
  api_domain?: string;
  token_type?: string;
}

/**
 * Fetches a fresh OAuth access token from Zoho using the configured refresh token.
 * Caches the token in Supabase to prevent rate-limiting from Zoho's auth endpoint
 * across multiple serverless instances.
 * 
 * @returns {Promise<string>} The valid access_token.
 */
// Global promise to deduplicate concurrent token refresh requests within the same instance
let tokenRefreshPromise: Promise<string> | null = null;

export async function getValidAccessToken(forceRefresh = false): Promise<string> {
  const supabase = createServiceRoleSupabaseClient();
  const tokenKey = 'zoho_mdm_token';

  if (!forceRefresh) {
    // 1. Try to fetch existing token from Supabase
    const { data: existingSetting, error: fetchError } = await supabase
      .from('system_settings')
      .select('value, expires_at')
      .eq('key', tokenKey)
      .single();

    if (!fetchError && existingSetting && existingSetting.expires_at) {
      const expiryTime = new Date(existingSetting.expires_at).getTime();
      if (Date.now() < expiryTime) {
        return existingSetting.value;
      }
    }
  }

  // 2. Token is missing or expired. If a fetch is already in progress, wait for it.
  if (tokenRefreshPromise) {
    return tokenRefreshPromise;
  }

  tokenRefreshPromise = (async () => {
    try {
      const clientId = process.env.CLIENT_ID;
      const clientSecret = process.env.CLIENT_SECRET;
      const refreshToken = process.env.ZOHO_REFRESH_TOKEN;

      if (!clientId || !clientSecret || !refreshToken) {
        throw new Error('Missing Zoho OAuth credentials in environment variables.');
      }

      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      });

      const accountsUrl = process.env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.com';

      const response = await fetch(`${accountsUrl}/oauth/v2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Zoho API responded with status ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`Zoho OAuth Error: ${data.error} - ${data.error_description || ''}`);
      }

      const newToken = data.access_token;
      // expires_in is typically in seconds. We buffer by 1 minute (60000 ms)
      const newExpiryTime = new Date(Date.now() + (data.expires_in * 1000) - 60000).toISOString();

      // 3. Upsert the new token into Supabase
      await supabase
        .from('system_settings')
        .upsert({ 
          key: tokenKey, 
          value: newToken, 
          expires_at: newExpiryTime 
        }, { onConflict: 'key' });

      return newToken;
    } finally {
      // Clear the promise once it completes or fails
      tokenRefreshPromise = null;
    }
  })();

  return tokenRefreshPromise;
}

/**
 * Helper to fetch from ManageEngine with auto token-refresh on 401
 */
async function manageEngineFetch(url: string, options: any = {}, retry = true): Promise<Response> {
  // If retry is false, we are retrying after a 401, so we FORCE a fresh token
  const accessToken = await getValidAccessToken(!retry);
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Zoho-oauthtoken ${accessToken}`
    }
  });

  // If 401 Unauthorized and we haven't retried yet, force a token refresh and retry
  if (response.status === 401 && retry) {
    console.warn(`[manageEngineFetch] 401 Unauthorized for ${url}. Force refreshing token and retrying...`);
    return manageEngineFetch(url, options, false);
  }

  return response;
}

/**
 * Example wrapper utility demonstrating how to make an authenticated call 
 * to the ManageEngine Cloud endpoint.
 * 
 * This function:
 * 1. Retrieves a fresh token using the rotator logic.
 * 2. Constructs the authenticated request.
 * 3. Includes the required Zoho header explicitly.
 * 
 * @returns {Promise<any>} The device JSON payload from ManageEngine.
 */
export async function fetchManageEngineDevices(): Promise<any> {
  try {
    const baseUrl = process.env.MDM_API_URL || 'https://mdm.manageengine.com';
    const url = `${baseUrl}/api/v1/mdm/devices`;

    const response = await manageEngineFetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ManageEngine API responded with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Error fetching ManageEngine devices:', error);
    throw error;
  }
}

export async function fetchManageEngineProfiles(): Promise<any[]> {
  try {
    const baseUrl = process.env.MDM_API_URL || 'https://mdm.manageengine.com';
    const url = `${baseUrl}/api/v1/mdm/profiles`;

    const response = await manageEngineFetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ManageEngine API responded with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    // ManageEngine API typically returns profiles in a 'profiles' array.
    const profiles = data.profiles || data || [];
    return profiles.map((p: any) => ({
      id: String(p.profile_id || p.id),
      name: p.profile_name || p.name || 'Unnamed Profile',
      type: p.platform_type || p.type || 'Unknown'
    }));

  } catch (error) {
    console.error('Error fetching ManageEngine profiles:', error);
    throw error;
  }
}

/**
 * Fetch locations of a specific managed device
 * GET /api/v1/mdm/devices/{device_id}/locations
 */
export async function getDeviceLocation(deviceId: string): Promise<any> {
  try {
    const baseUrl = process.env.MDM_API_URL || 'https://mdm.manageengine.com';
    const url = `${baseUrl}/api/v1/mdm/devices/${deviceId}/locations`;
    
    const response = await manageEngineFetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ManageEngine API responded with status ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching location for device ${deviceId}:`, error);
    throw error;
  }
}

/**
 * Fetch locations of a specific managed device
 * GET /api/v1/mdm/devices/{device_id}/locations
 */
export async function getDeviceLocationWithAddress(deviceId: string): Promise<any> {
  try {
    const baseUrl = process.env.MDM_API_URL || 'https://mdm.manageengine.com';
    const url = `${baseUrl}/api/v1/mdm/devices/${deviceId}/locations`;
    
    const response = await manageEngineFetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      // If location services are disabled (412) or other expected errors, return empty location data gracefully
      if (response.status === 412 || response.status === 400 || response.status === 404) {
        return {};
      }
      throw new Error(`ManageEngine API responded with status ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching location for device ${deviceId}:`, error);
    return {}; // Graceful fallback
  }
}

/**
 * Fetch locations of all managed devices
 * GET /api/v1/mdm/devices/locations
 */
export async function getAllDeviceLocations(): Promise<any> {
  try {
    const baseUrl = process.env.MDM_API_URL || 'https://mdm.manageengine.com';
    const url = `${baseUrl}/api/v1/mdm/devices/locations`;
    const response = await manageEngineFetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.manageengine.mdm.v1+json',
      }
    });
    
    // If the endpoint is not supported by this ManageEngine tier, return empty array gracefully
    if (!response.ok) {
      if (response.status === 405 || response.status === 404 || response.status === 406) {
        console.warn('Batch location endpoint not supported. Returning empty array.');
        return { locations: [] };
      }
      throw new Error(await response.text());
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching all device locations:`, error);
    // Don't crash the server component, just return empty locations
    return { locations: [] };
  }
}

/**
 * Get apps installed on a device
 * GET /api/v1/mdm/devices/{device_id}/apps
 */
export async function getDeviceApps(deviceId: string): Promise<any> {
  try {
    const baseUrl = process.env.MDM_API_URL || 'https://mdm.manageengine.com';
    const url = `${baseUrl}/api/v1/mdm/devices/${deviceId}/apps`;
    const response = await manageEngineFetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });
    if (!response.ok) throw new Error(await response.text());
    return await response.json();
  } catch (error) {
    console.error(`Error fetching apps for device ${deviceId}:`, error);
    throw error;
  }
}

/**
 * Associate apps to a device
 * POST /api/v1/mdm/devices/{device_id}/apps
 */
export async function associateDeviceApps(deviceId: string, appIds: string[]): Promise<any> {
  try {
    const baseUrl = process.env.MDM_API_URL || 'https://mdm.manageengine.com';
    const url = `${baseUrl}/api/v1/mdm/devices/${deviceId}/apps`;
    const response = await manageEngineFetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_ids: appIds,
        invite_user: false,
        do_not_uninstall: false
      })
    });
    if (!response.ok) throw new Error(await response.text());
    return await response.json();
  } catch (error) {
    console.error(`Error associating apps to device ${deviceId}:`, error);
    throw error;
  }
}

/**
 * Request device location update
 * POST /api/v1/mdm/devices/{device_id}/locations_with_address
 */
export async function requestDeviceLocationUpdate(deviceId: string): Promise<any> {
  try {
    const baseUrl = process.env.MDM_API_URL || 'https://mdm.manageengine.com';
    const url = `${baseUrl}/api/v1/mdm/devices/${deviceId}/locations_with_address`;
    const response = await manageEngineFetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      try {
        const parsed = JSON.parse(errorText);
        throw new Error(parsed.error_description || errorText);
      } catch (e: any) {
        throw new Error(e.message === 'Unexpected end of JSON input' || e instanceof SyntaxError ? errorText : e.message);
      }
    }
    return await response.json();
  } catch (error) {
    console.error(`Error requesting location update for device ${deviceId}:`, error);
    throw error;
  }
}

/**
 * Get device restrictions
 * GET /api/v1/mdm/devices/{device_id}/restrictions
 */
export async function getDeviceRestrictions(deviceId: string): Promise<any> {
  try {
    const baseUrl = process.env.MDM_API_URL || 'https://mdm.manageengine.com';
    const url = `${baseUrl}/api/v1/mdm/devices/${deviceId}/restrictions`;
    const response = await manageEngineFetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });
    if (!response.ok) throw new Error(await response.text());
    return await response.json();
  } catch (error) {
    console.error(`Error fetching restrictions for device ${deviceId}:`, error);
    throw error;
  }
}

/**
 * Get device certificates
 * GET /api/v1/mdm/devices/{device_id}/certificates
 */
export async function getDeviceCertificates(deviceId: string): Promise<any> {
  try {
    const baseUrl = process.env.MDM_API_URL || 'https://mdm.manageengine.com';
    const url = `${baseUrl}/api/v1/mdm/devices/${deviceId}/certificates`;
    const response = await manageEngineFetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });
    if (!response.ok) throw new Error(await response.text());
    return await response.json();
  } catch (error) {
    console.error(`Error fetching certificates for device ${deviceId}:`, error);
    throw error;
  }
}

/**
 * Get device FileVault details (macOS)
 * GET /api/v1/mdm/devices/{device_id}/filevault
 */
export async function getDeviceFileVault(deviceId: string): Promise<any> {
  try {
    const baseUrl = process.env.MDM_API_URL || 'https://mdm.manageengine.com';
    const url = `${baseUrl}/api/v1/mdm/devices/${deviceId}/filevault`;
    const response = await manageEngineFetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });
    if (!response.ok) throw new Error(await response.text());
    return await response.json();
  } catch (error) {
    console.error(`Error fetching FileVault details for device ${deviceId}:`, error);
    throw error;
  }
}

/**
 * Get device alerts
 * GET /api/v1/mdm/devices/{device_id}/alerts
 */
export async function getDeviceAlerts(deviceId: string): Promise<any> {
  try {
    const baseUrl = process.env.MDM_API_URL || 'https://mdm.manageengine.com';
    const url = `${baseUrl}/api/v1/mdm/devices/${deviceId}/alerts`;
    const response = await manageEngineFetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });
    if (!response.ok) {
      if (response.status === 404 || response.status === 405) {
        return { alerts: [] }; // Fallback if endpoint not supported for tier
      }
      throw new Error(await response.text());
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching alerts for device ${deviceId}:`, error);
    return { alerts: [] };
  }
}

/**
 * Send a remote command to a device
 * POST /api/v1/mdm/actions/{command_name}
 */
export async function sendDeviceCommand(deviceId: string, commandName: string, commandData: any = {}): Promise<any> {
  try {
    const baseUrl = process.env.MDM_API_URL || 'https://mdm.manageengine.com';
    const url = `${baseUrl}/api/v1/mdm/devices/${deviceId}/actions/${commandName}`;
    
    // The ManageEngine endpoint for single device action takes fields directly in the body
    const payload = {
      ...commandData
    };

    const response = await manageEngineFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(await response.text());
    }
    
    // ManageEngine often returns 202 Accepted with no body for commands
    if (response.status === 202 || response.status === 204) {
      return { status: 'success', message: 'Command accepted' };
    }

    const text = await response.text();
    return text ? JSON.parse(text) : { status: 'success' };
  } catch (error) {
    console.error(`Error sending command ${commandName} to device ${deviceId}:`, error);
    throw error;
  }
}

// ── Groups & Profiles ─────────────────────────────────────────────────────────

/**
 * Fetch all device groups
 * GET /api/v1/mdm/groups
 */
export async function fetchGroups(): Promise<any> {
  try {
    const baseUrl = process.env.MDM_API_URL || 'https://mdm.manageengine.com';
    const url = `${baseUrl}/api/v1/mdm/groups`;
    const response = await manageEngineFetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ManageEngine API responded with status ${response.status}: ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching groups:', error);
    throw error;
  }
}

/**
 * Fetch details of a specific group, including members
 * GET /api/v1/mdm/groups/{group_id}
 */
export async function getGroupDetails(groupId: string | number): Promise<any> {
  try {
    const baseUrl = process.env.MDM_API_URL || 'https://mdm.manageengine.com';
    const url = `${baseUrl}/api/v1/mdm/groups/${groupId}`;
    const response = await manageEngineFetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ManageEngine API responded with status ${response.status}: ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching group details for ${groupId}:`, error);
    throw error;
  }
}

/**
 * Add devices to a group
 * POST /api/v1/mdm/groups/{group_id}/members
 */
export async function addDevicesToGroup(groupId: string | number, deviceIds: (string | number)[]): Promise<any> {
  try {
    const baseUrl = process.env.MDM_API_URL || 'https://mdm.manageengine.com';
    const url = `${baseUrl}/api/v1/mdm/groups/${groupId}/members`;
    const response = await manageEngineFetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ device_ids: deviceIds }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ManageEngine API responded with status ${response.status}: ${errorText}`);
    }
    if (response.status === 202 || response.status === 204) {
      return { status: 'success', message: 'Devices added to group' };
    }
    const text = await response.text();
    return text ? JSON.parse(text) : { status: 'success' };
  } catch (error) {
    console.error(`Error adding devices to group ${groupId}:`, error);
    throw error;
  }
}

/**
 * Fetch all device profiles
 * GET /api/v1/mdm/profiles
 */
export async function fetchMdmProfiles(): Promise<any> {
  try {
    const baseUrl = process.env.MDM_API_URL || 'https://mdm.manageengine.com';
    const url = `${baseUrl}/api/v1/mdm/profiles`;
    const response = await manageEngineFetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ManageEngine API responded with status ${response.status}: ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching MDM profiles:', error);
    throw error;
  }
}

/**
 * Associate profile(s) to a specific device
 * POST /api/v1/mdm/devices/{device_id}/profiles
 */
export async function associateProfileToDevice(deviceId: string | number, profileIds: (string | number)[]): Promise<any> {
  try {
    const baseUrl = process.env.MDM_API_URL || 'https://mdm.manageengine.com';
    const url = `${baseUrl}/api/v1/mdm/devices/${deviceId}/profiles`;
    const response = await manageEngineFetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ profile_ids: profileIds }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ManageEngine API responded with status ${response.status}: ${errorText}`);
    }
    if (response.status === 202 || response.status === 204) {
      return { status: 'success', message: 'Profile associated to device' };
    }
    const text = await response.text();
    return text ? JSON.parse(text) : { status: 'success' };
  } catch (error) {
    console.error(`Error associating profile to device ${deviceId}:`, error);
    throw error;
  }
}

/**
 * Associate profile(s) to a group
 * POST /api/v1/mdm/groups/{group_id}/profiles
 */
export async function associateProfileToGroup(groupId: string | number, profileIds: (string | number)[]): Promise<any> {
  try {
    const baseUrl = process.env.MDM_API_URL || 'https://mdm.manageengine.com';
    const url = `${baseUrl}/api/v1/mdm/groups/${groupId}/profiles`;
    const response = await manageEngineFetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ profile_ids: profileIds }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ManageEngine API responded with status ${response.status}: ${errorText}`);
    }
    if (response.status === 202 || response.status === 204) {
      return { status: 'success', message: 'Profile associated to group' };
    }
    const text = await response.text();
    return text ? JSON.parse(text) : { status: 'success' };
  } catch (error) {
    console.error(`Error associating profile to group ${groupId}:`, error);
    throw error;
  }
}
