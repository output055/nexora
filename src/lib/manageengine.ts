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

export interface ZohoTokenResponse {
  access_token: string;
  expires_in: number;
  api_domain?: string;
  token_type?: string;
}

/**
 * Fetches a fresh OAuth access token from Zoho using the configured refresh token.
 * This shares the underlying rotator logic used by the API route.
 * 
 * @returns {Promise<string>} The new valid access_token.
 */
export async function getValidAccessToken(): Promise<string> {
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

  const response = await fetch('https://accounts.zoho.com/oauth/v2/token', {
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

  return data.access_token;
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
    // 1. Fetch a fresh token using the rotator code
    const accessToken = await getValidAccessToken();

    // 2. Define the ManageEngine API endpoint
    // Note: The base URL might be different based on your Zoho DC (e.g., .com, .eu, .in)
    const url = 'https://mdm.manageengine.com/api/v1/mdm/devices';

    // 3. Construct the fetch request explicitly including the Zoho header syntax
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        // Data flows directly from the retrieved token straight to this request header
        'Authorization': `Zoho-oauthtoken ${accessToken}`
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

/**
 * Fetch locations of a specific managed device
 * GET /api/v1/mdm/devices/{device_id}/locations
 */
export async function getDeviceLocation(deviceId: string): Promise<any> {
  try {
    const accessToken = await getValidAccessToken();
    const url = `https://mdm.manageengine.com/api/v1/mdm/devices/${deviceId}/locations`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Zoho-oauthtoken ${accessToken}`
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
    const accessToken = await getValidAccessToken();
    const url = `https://mdm.manageengine.com/api/v1/mdm/devices/${deviceId}/locations`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Zoho-oauthtoken ${accessToken}`
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
    const accessToken = await getValidAccessToken();
    const url = `https://mdm.manageengine.com/api/v1/mdm/devices/locations`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.manageengine.mdm.v1+json',
        'Authorization': `Zoho-oauthtoken ${accessToken}`
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
    const accessToken = await getValidAccessToken();
    const url = `https://mdm.manageengine.com/api/v1/mdm/devices/${deviceId}/apps`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Zoho-oauthtoken ${accessToken}`
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
    const accessToken = await getValidAccessToken();
    const url = `https://mdm.manageengine.com/api/v1/mdm/devices/${deviceId}/apps`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Zoho-oauthtoken ${accessToken}`
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
    const accessToken = await getValidAccessToken();
    const url = `https://mdm.manageengine.com/api/v1/mdm/devices/${deviceId}/locations_with_address`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Zoho-oauthtoken ${accessToken}`
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
    const accessToken = await getValidAccessToken();
    const url = `https://mdm.manageengine.com/api/v1/mdm/devices/${deviceId}/restrictions`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Zoho-oauthtoken ${accessToken}`
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
    const accessToken = await getValidAccessToken();
    const url = `https://mdm.manageengine.com/api/v1/mdm/devices/${deviceId}/certificates`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Zoho-oauthtoken ${accessToken}`
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
    const accessToken = await getValidAccessToken();
    const url = `https://mdm.manageengine.com/api/v1/mdm/devices/${deviceId}/filevault`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Zoho-oauthtoken ${accessToken}`
      }
    });
    if (!response.ok) throw new Error(await response.text());
    return await response.json();
  } catch (error) {
    console.error(`Error fetching FileVault details for device ${deviceId}:`, error);
    throw error;
  }
}
