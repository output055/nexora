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
  getDeviceLocationWithAddress,
  getDeviceDetails,
  getDeviceAlerts,
  sendDeviceCommand
} from '@/lib/manageengine';
import { getAllSystemSettings } from './settings';

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
 * Get details of a specific device
 */
export async function getDeviceDetailsAction(deviceId: string) {
  try {
    const data = await getDeviceDetails(deviceId);
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

/**
 * Get alerts for a specific device
 */
export async function getDeviceAlertsAction(deviceId: string) {
  try {
    const data = await getDeviceAlerts(deviceId);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Execute a remote command on a specific device
 */
export async function executeDeviceCommandAction(deviceId: string, commandName: string, commandData: any = {}) {
  try {
    let payload = { ...commandData };

    // Auto-inject settings for Lost Mode / Kiosk Mode if missing
    if (commandName === 'enable_lost_mode' || commandName === 'LostMode' || commandName === 'KioskMode') {
      const settings = await getAllSystemSettings();
      
      if (commandName === 'enable_lost_mode' || commandName === 'LostMode') {
        payload.lock_message = payload.lock_message || settings['mdm_lost_mode_message'] || 'Your device has been locked.';
        payload.phone_number = payload.phone_number || settings['mdm_lost_mode_phone'] || '';
        
        // Ensure invalid parameters aren't sent
        delete payload.message;
        delete payload.lost_mode_message;
      }
      
      if (commandName === 'KioskMode' && !payload.passcode) {
        payload.passcode = settings['mdm_kiosk_pin'] || '1234';
      }
    }

    const data = await sendDeviceCommand(deviceId, commandName, payload);
    return { success: true, data };
  } catch (error: any) {
    console.error(`Action error sending command ${commandName}:`, error);
    return { success: false, error: error.message };
  }
}
