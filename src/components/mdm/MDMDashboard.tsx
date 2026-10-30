'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { syncMdmDevicesAction } from '@/app/actions/devices';
import { DeviceDetailsView } from './DeviceDetailsView';
import { EnrolledDevicesTable } from './EnrolledDevicesTable';

interface MDMDashboardProps {
  initialDevices: any[];
  initialLocations: any[];
}

export function MDMDashboardContent({ initialDevices, initialLocations }: MDMDashboardProps) {
  const [devices, setDevices] = useState(initialDevices);
  const [locations, setLocations] = useState(initialLocations);
  const [selectedDevice, setSelectedDevice] = useState<any | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    setDevices(initialDevices);
  }, [initialDevices]);

  useEffect(() => {
    setLocations(initialLocations);
  }, [initialLocations]);

  useEffect(() => {
    const queryDeviceId = searchParams.get('deviceId');
    if (queryDeviceId && devices.length > 0) {
      const device = devices.find(d => String(d.device_id) === queryDeviceId || d.mdm_device_id === queryDeviceId);
      if (device) {
        setSelectedDevice(device);
      }
    }
  }, [searchParams, devices]);

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await syncMdmDevicesAction();
      if (res.success && res.data) {
        setDevices(res.data.devices || []);
        if (res.data.locations) {
          setLocations(res.data.locations);
        }
        toast.success(res.message || `Successfully synced ${res.data.devices?.length || 0} active devices from MDM.`);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to sync devices from MDM.');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while syncing devices.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleBack = () => {
    if (searchParams.has('deviceId')) {
      router.back();
    } else {
      setSelectedDevice(null);
    }
  };

  if (selectedDevice) {
    return (
      <DeviceDetailsView 
        device={selectedDevice} 
        location={locations.find(l => l.device_id === selectedDevice.device_id)}
        onBack={handleBack} 
      />
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key="table"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="w-full"
      >
        <EnrolledDevicesTable 
          devices={devices} 
          onDeviceSelect={(device) => setSelectedDevice(device)} 
          onSync={handleSync}
          isSyncing={isSyncing}
        />
      </motion.div>
    </AnimatePresence>
  );
}

export function MDMDashboard({ initialDevices, initialLocations }: MDMDashboardProps) {
  return (
    <Suspense fallback={<div className="flex flex-col items-center justify-center p-12 text-slate-500 gap-3"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /><span>Loading dashboard...</span></div>}>
      <MDMDashboardContent initialDevices={initialDevices} initialLocations={initialLocations} />
    </Suspense>
  );
}
