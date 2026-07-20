import { fetchManageEngineDevices, getDeviceLocationWithAddress } from '@/lib/manageengine';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const devicesData = await fetchManageEngineDevices();
    const firstDevice = devicesData?.devices?.[0];
    
    let deviceDetails = null;
    let networkInfo = null;
    
    // Attempt to fetch detailed device info for the first device
    if (firstDevice?.device_id) {
      try {
        const baseUrl = process.env.MDM_API_URL || 'https://mdm.manageengine.com';
        
        // We will try to fetch using fetchManageEngineDevices style but for a specific device
        // Since we don't have getDeviceDetails exposed, we can't easily fetch it without the token logic
        // But let's just return the list data first to see what properties are there.
      } catch (e) {
        // ignore
      }
    }

    return NextResponse.json({
      success: true,
      firstDevice: firstDevice,
      firstDeviceKeys: firstDevice ? Object.keys(firstDevice) : [],
      allData: devicesData
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
