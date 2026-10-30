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
import { createServiceRoleSupabaseClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { getAllSystemSettings } from './settings';
import { logAudit } from '@/lib/audit';
import { requirePermission } from '@/lib/auth-guard';

/**
 * Get all devices (general list)
 */
export async function getDevicesAction(excludeRemoved = true) {
  try {
    await requirePermission('manage_devices');
    const data = await fetchManageEngineDevices({ excludeRemoved });
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
    await requirePermission('manage_devices');
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
    await requirePermission('manage_devices');
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
    await requirePermission('manage_devices');
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
    await requirePermission('manage_devices');
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
    await requirePermission('manage_devices');
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
    await requirePermission('manage_devices');
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
    await requirePermission('manage_devices');
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
    await requirePermission('manage_devices');
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
    const authCtx = await requirePermission('manage_devices');

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
    await logAudit(`Executed manual MDM command: ${commandName} on device MDM ID: ${deviceId} by ${authCtx.user.email}`);
    return { success: true, data };
  } catch (error: any) {
    console.error(`Action error sending command ${commandName}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Sync devices between ManageEngine MDM and Credifon.
 * - Forces a fresh fetch of active devices from ManageEngine (excluding removed/unmanaged devices)
 * - Fetches device locations
 * - Syncs updated device specs (os_version, serial_number, imei) into Credifon's database for matching devices
 * - Revalidates relevant dashboard paths
 */
export async function syncMdmDevicesAction() {
  try {
    const authCtx = await requirePermission('manage_devices');

    // 1. Fetch fresh devices from ManageEngine with excludeRemoved=true and force token refresh
    const [devicesData, locationsData] = await Promise.all([
      fetchManageEngineDevices({ excludeRemoved: true, forceRefresh: true }),
      getAllDeviceLocations().catch(() => ({ locations: [] }))
    ]);

    const mdmDevices = devicesData?.devices || [];
    const mdmLocations = locationsData?.locations || [];

    // 2. Sync active devices info with Credifon's Supabase database
    const supabase = createServiceRoleSupabaseClient();
    const { data: dbDevices, error: dbError } = await supabase
      .from('devices')
      .select('id, mdm_device_id, serial_number, os_version, imei');

    if (!dbError && dbDevices && dbDevices.length > 0) {
      const mdmMap = new Map<string, any>();
      mdmDevices.forEach((d: any) => {
        mdmMap.set(String(d.device_id), d);
      });

      for (const dev of dbDevices) {
        const mdmDev = mdmMap.get(dev.mdm_device_id);
        if (mdmDev) {
          const updates: Record<string, any> = {};
          if (mdmDev.os_version && mdmDev.os_version !== dev.os_version) {
            updates.os_version = mdmDev.os_version;
          }
          if (mdmDev.serial_number && !dev.serial_number) {
            updates.serial_number = mdmDev.serial_number;
          }
          if (mdmDev.imei && !dev.imei) {
            updates.imei = mdmDev.imei;
          }
          if (Object.keys(updates).length > 0) {
            updates.updated_at = new Date().toISOString();
            await supabase.from('devices').update(updates).eq('id', dev.id);
          }
        }
      }
    }

    revalidatePath('/dashboard/admin/mdm');
    revalidatePath('/dashboard/admin/devices');
    revalidatePath('/dashboard/admin/billing');

    await logAudit(`Synced MDM devices with Credifon: ${mdmDevices.length} active devices retrieved by ${authCtx.user.email}`);

    return {
      success: true,
      message: `Successfully synced ${mdmDevices.length} active devices from MDM.`,
      data: {
        devices: mdmDevices,
        locations: mdmLocations,
        total: mdmDevices.length
      }
    };
  } catch (error: any) {
    console.error('Error syncing MDM devices:', error);
    return {
      success: false,
      error: error.message || 'Failed to sync devices from MDM.'
    };
  }
}
