import { MDMDashboard } from '@/components/mdm/MDMDashboard';
import { getDevicesAction, getAllDeviceLocationsAction } from '@/app/actions/devices';

export default async function MDMPage() {
  // Fetch initial data on the server
  const [devicesRes, locationsRes] = await Promise.all([
    getDevicesAction(),
    getAllDeviceLocationsAction()
  ]);

  const initialDevices = devicesRes.success && devicesRes.data?.devices ? devicesRes.data.devices : [];
  // Note: Adjust the locations property based on actual Zoho response structure
  const initialLocations = locationsRes.success && locationsRes.data?.locations ? locationsRes.data.locations : [];

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
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
