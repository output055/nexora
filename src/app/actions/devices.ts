'use server';

import { 
  getAllDeviceLocations,
  getDeviceApps,
  associateDeviceApps,
  requestDeviceLocationUpdate,
  getDeviceRestrictions,
  getDeviceCertificates,
  getDeviceFileVault,
  fetchManageEngineDevices,
  getDeviceLocationWithAddress
} from '@/lib/manageengine';

/**
 * Get all devices (general list)
 */
export async function getDevicesAction() {
  try {
    const data = await fetchManageEngineDevices();
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get locations of all devices
 */
export async function getAllDeviceLocationsAction() {
  try {
    const data = await getAllDeviceLocations();
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get location of a specific device
 */
export async function getDeviceLocationAction(deviceId: string) {
  try {
    const data = await getDeviceLocationWithAddress(deviceId);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get apps for a specific device
 */
export async function getDeviceAppsAction(deviceId: string) {
  try {
    const data = await getDeviceApps(deviceId);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Associate an app to a device
 */
export async function associateDeviceAppAction(deviceId: string, appIds: string[]) {
  try {
    const data = await associateDeviceApps(deviceId, appIds);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Request a location update from the device
 */
export async function requestDeviceLocationUpdateAction(deviceId: string) {
  try {
    const data = await requestDeviceLocationUpdate(deviceId);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get device security details (aggregates multiple endpoints)
 */
export async function getDeviceSecurityAction(deviceId: string) {
  try {
    // Run them in parallel
    const [restrictions, certificates, filevault] = await Promise.all([
      getDeviceRestrictions(deviceId).catch(e => ({ error: e.message })),
      getDeviceCertificates(deviceId).catch(e => ({ error: e.message })),
      getDeviceFileVault(deviceId).catch(e => ({ error: e.message }))
    ]);

    return { 
      success: true, 
      data: {
        restrictions,
        certificates,
        filevault
      } 
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
