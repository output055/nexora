'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
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
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const queryDeviceId = searchParams.get('deviceId');
    if (queryDeviceId && initialDevices.length > 0) {
      const device = initialDevices.find(d => String(d.device_id) === queryDeviceId || d.mdm_device_id === queryDeviceId);
      if (device) {
        setSelectedDevice(device);
      }
    }
  }, [searchParams, initialDevices]);

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
