'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DeviceDetailsView } from './DeviceDetailsView';
import { EnrolledDevicesTable } from './EnrolledDevicesTable';

interface MDMDashboardProps {
  initialDevices: any[];
  initialLocations: any[];
}

export function MDMDashboard({ initialDevices, initialLocations }: MDMDashboardProps) {
  const [devices, setDevices] = useState(initialDevices);
  const [locations, setLocations] = useState(initialLocations);
  const [selectedDevice, setSelectedDevice] = useState<any | null>(null);

  if (selectedDevice) {
    return (
      <DeviceDetailsView 
        device={selectedDevice} 
        location={locations.find(l => l.device_id === selectedDevice.device_id)}
        onBack={() => setSelectedDevice(null)} 
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
