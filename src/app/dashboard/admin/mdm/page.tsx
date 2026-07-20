import { MDMDashboard } from '@/components/mdm/MDMDashboard';
import { getDevicesAction, getAllDeviceLocationsAction } from '@/app/actions/devices';

export default async function MDMPage() {
  // Fetch initial data on the server
  const [devicesRes, locationsRes] = await Promise.all([
    getDevicesAction(),
    getAllDeviceLocationsAction()
  ]);

  const initialDevices = devicesRes.success && devicesRes.data?.devices ? devicesRes.data.devices : [];
  const initialLocations = locationsRes.success && locationsRes.data?.locations ? locationsRes.data.locations : [];

  const errorMessage = !devicesRes.success ? devicesRes.error : !locationsRes.success ? locationsRes.error : null;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {errorMessage && (
        <div className="bg-red-500/20 border border-red-500/30 text-red-200 p-4 rounded-xl">
          <p className="font-semibold text-sm">Failed to connect to ManageEngine MDM</p>
          <p className="text-xs opacity-80 mt-1">{errorMessage}</p>
        </div>
      )}
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-xl font-semibold text-white tracking-tight">MDM Map & Audit Dashboard</h3>
      </div>
      
      <MDMDashboard 
        initialDevices={initialDevices} 
        initialLocations={initialLocations} 
      />
    </div>
  );
}
