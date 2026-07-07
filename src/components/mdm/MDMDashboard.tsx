'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { DeviceMgmtModal } from './DeviceMgmtModal';
import { Search, MapPin, Smartphone, ShieldAlert } from 'lucide-react';

// Dynamically import the map to avoid SSR issues with Leaflet
const LeafletMap = dynamic(() => import('./LeafletMap'), { 
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0D1526] text-slate-400">
      <div className="animate-pulse flex flex-col items-center">
        <MapPin size={32} className="mb-2 text-blue-500/50" />
        <span>Loading map...</span>
      </div>
    </div>
  )
});

interface MDMDashboardProps {
  initialDevices: any[];
  initialLocations: any[];
}

export function MDMDashboard({ initialDevices, initialLocations }: MDMDashboardProps) {
  const [devices, setDevices] = useState(initialDevices);
  const [locations, setLocations] = useState(initialLocations);
  const [selectedDevice, setSelectedDevice] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDevices = devices.filter(d => 
    d.device_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.serial_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-[calc(100vh-140px)]">
      {/* Left Panel: Device List */}
      <div className="w-full xl:w-[400px] flex flex-col gap-4 bg-[#111827] border border-white/10 rounded-2xl p-4 overflow-hidden shadow-xl shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Search devices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          />
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {filteredDevices.map((device) => {
            const loc = locations.find(l => l.device_id === device.device_id);
            return (
              <motion.button
                key={device.device_id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setSelectedDevice(device)}
                className="w-full text-left bg-white/[0.02] border border-white/5 hover:border-blue-500/30 rounded-xl p-3 transition-colors group"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-slate-200 group-hover:text-blue-400 transition-colors">
                    {device.device_name || 'Unnamed Device'}
                  </span>
                  {loc && <MapPin size={14} className="text-emerald-500" />}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Smartphone size={12} />
                  <span>{device.platform_type || 'Unknown OS'}</span>
                  <span>•</span>
                  <span>{device.model || 'Unknown Model'}</span>
                </div>
              </motion.button>
            );
          })}
          {filteredDevices.length === 0 && (
            <div className="text-center text-slate-500 text-sm py-8">No devices found.</div>
          )}
        </div>
      </div>

      {/* Right Panel: Map */}
      <div className="flex-1 bg-[#111827] border border-white/10 rounded-2xl overflow-hidden shadow-xl relative min-h-[400px] z-0">
        <LeafletMap 
          locations={locations} 
          devices={devices} 
          onMarkerClick={(device) => setSelectedDevice(device)} 
        />
      </div>

      {/* Device Management Modal */}
      {selectedDevice && (
        <DeviceMgmtModal 
          device={selectedDevice} 
          location={locations.find(l => l.device_id === selectedDevice.device_id)}
          onClose={() => setSelectedDevice(null)} 
        />
      )}
    </div>
  );
}
