'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Smartphone, MapPin, Trash2, ChevronUp, Loader2 } from 'lucide-react';
import { getDeviceLocationAction, requestDeviceLocationUpdateAction } from '@/app/actions/devices';
import { getHumanReadableDeviceName } from '@/lib/deviceMapping';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

const LeafletMap = dynamic(() => import('./LeafletMap'), { 
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-[#0D1526] text-slate-400">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={32} className="text-blue-500/50 animate-spin" />
        <span className="animate-pulse">Loading map...</span>
      </div>
    </div>
  )
});

interface GeoTrackingTabProps {
  device: any;
  initialLocation?: any;
}

export function GeoTrackingTab({ device, initialLocation }: GeoTrackingTabProps) {
  const [deviceLocation, setDeviceLocation] = useState<any>(initialLocation);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [pingingLocation, setPingingLocation] = useState(false);
  
  const [locationHistory, setLocationHistory] = useState<any[]>([]);
  const [showHistoryView, setShowHistoryView] = useState(false);

  const fetchLastLocation = async () => {
    setFetchingLocation(true);
    const res = await getDeviceLocationAction(device.device_id);
    if (res.success && res.data) {
      let locData = res.data;
      if (Array.isArray(res.data.locations) && res.data.locations.length > 0) {
        // Sort by located_time descending to get the most recent one
        const sorted = [...res.data.locations].sort((a, b) => {
          const timeA = parseInt(a.located_time) || 0;
          const timeB = parseInt(b.located_time) || 0;
          return timeB - timeA;
        });
        locData = sorted[0];
        setLocationHistory(sorted);
      }
      
      if (locData && locData.latitude) {
        setDeviceLocation((prev: any) => {
          // If the coordinates haven't changed, preserve the already-fetched address
          if (prev?.latitude === locData.latitude && prev?.longitude === locData.longitude) {
            return { ...locData, address: prev.address };
          }
          return locData;
        });
      }
    }
    setFetchingLocation(false);
  };

  useEffect(() => {
    // Always fetch the freshest location data when opening the tab
    fetchLastLocation();
  }, [device.device_id]);

  useEffect(() => {
    // If we have coordinates but no address, let's reverse geocode it!
    if (deviceLocation?.latitude && deviceLocation?.longitude && !deviceLocation?.address) {
      const getAddress = async () => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${deviceLocation.latitude}&lon=${deviceLocation.longitude}`);
          const data = await res.json();
          if (data && data.display_name) {
            setDeviceLocation((prev: any) => ({ ...prev, address: data.display_name }));
          }
        } catch (err) {
          console.error("Failed to reverse geocode:", err);
        }
      };
      getAddress();
    }
  }, [deviceLocation?.latitude, deviceLocation?.longitude]);

  useEffect(() => {
    if (showHistoryView && locationHistory.length > 0) {
      const fetchMissingAddresses = async () => {
        // Only process the first 3 locations lazily
        const topHistory = locationHistory.slice(0, 3);
        let updated = false;
        const newHistory = [...locationHistory];

        for (let i = 0; i < topHistory.length; i++) {
          const loc = topHistory[i];
          if (loc.latitude && loc.longitude && !loc.address) {
            try {
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.latitude}&lon=${loc.longitude}`);
              const data = await res.json();
              if (data && data.display_name) {
                newHistory[i] = { ...newHistory[i], address: data.display_name };
                updated = true;
              }
            } catch (err) {
              console.error("Failed to reverse geocode history:", err);
            }
            // Sleep slightly to respect Nominatim rate limit (1 request per second max)
            await new Promise(resolve => setTimeout(resolve, 1100));
          }
        }
        
        if (updated) {
          setLocationHistory(newHistory);
        }
      };
      fetchMissingAddresses();
    }
  }, [showHistoryView, locationHistory.length]);

  const handlePingLocation = async () => {
    setPingingLocation(true);
    const res = await requestDeviceLocationUpdateAction(device.device_id);
    if (res.success) {
      if (res.data && Object.keys(res.data).length <= 1) {
        toast.success('Location update requested. No immediate data returned by device.');
      } else {
        toast.success('Location update requested from device.');
      }
    } else {
      toast.error('Failed to request location: ' + res.error);
    }
    setPingingLocation(false);
  };

  const formattedDate = deviceLocation?.located_time 
    ? new Date(parseInt(deviceLocation.located_time)).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
      })
    : 'N/A';

  return (
    <div className="relative w-full h-[calc(100vh-200px)] rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-lg bg-slate-50 dark:bg-[#0D1526]">
      {/* Map Background */}
      <div className="absolute inset-0 z-0">
        <LeafletMap 
          locations={showHistoryView ? locationHistory : (deviceLocation && deviceLocation.latitude ? [deviceLocation] : [])} 
          devices={[device]} 
          onMarkerClick={() => {}} 
          showHistoryTrail={showHistoryView}
        />
      </div>

      {/* Floating Card */}
      <div className="absolute top-4 right-4 w-full max-w-[380px] bg-white dark:bg-[#111827] rounded-xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden z-10 flex flex-col">
        {/* Card Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <Smartphone className="text-slate-600 dark:text-slate-400" size={20} />
            <h3 className="font-medium text-slate-800 dark:text-slate-200 text-sm truncate max-w-[200px]">
              {getHumanReadableDeviceName(device.product_name) || getHumanReadableDeviceName(device.model_name) || getHumanReadableDeviceName(device.model) || device.product_name || device.model_name || device.model || device.device_name || 'Unknown Device'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePingLocation} 
              disabled={pingingLocation}
              className="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors disabled:opacity-50"
              title="Refresh Location"
            >
              <RefreshCw size={16} className={pingingLocation ? 'animate-spin' : ''} />
            </button>
            <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
              <ChevronUp size={16} />
            </button>
          </div>
        </div>

        {/* Card Body */}
        {!showHistoryView ? (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-[100px_1fr] gap-2 text-xs">
              <div className="text-slate-500 dark:text-slate-400">Last located at</div>
              <div className="text-slate-800 dark:text-slate-200 font-medium flex items-center gap-2">
                : {fetchingLocation ? <span className="animate-pulse">Fetching...</span> : formattedDate}
              </div>

              <div className="text-slate-500 dark:text-slate-400 mt-2">Last located</div>
              <div className="text-slate-800 dark:text-slate-200 leading-relaxed mt-2">
                : {deviceLocation?.address || 'Unknown'}
              </div>

              <div className="text-slate-500 dark:text-slate-400 mt-2">Coordinates</div>
              <div className="text-slate-800 dark:text-slate-200 mt-2">
                : lat: {deviceLocation?.latitude || 'N/A'} <span className="ml-2">lon: {deviceLocation?.longitude || 'N/A'}</span>
              </div>

              <div className="text-slate-500 dark:text-slate-400 mt-2">Location Status</div>
              <div className="text-slate-800 dark:text-slate-200 mt-2">
                : Enabled
              </div>
            </div>

            {locationHistory.length > 1 && (
              <div className="pt-2 text-center">
                <button 
                  onClick={() => setShowHistoryView(true)}
                  className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 text-xs font-medium inline-flex items-center gap-1 transition-colors"
                >
                  Location History &gt;&gt;
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col h-[300px]">
            <div className="p-3 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
              <button 
                onClick={() => setShowHistoryView(false)}
                className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 text-xs font-medium flex items-center gap-1 transition-colors"
              >
                &lt; Back to Current
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {locationHistory.map((loc, idx) => (
                <div key={idx} className="relative pl-6 pb-4 border-l-2 border-blue-500/30 last:border-l-transparent last:pb-0">
                  <div className="absolute left-[-5px] top-0 w-[8px] h-[8px] rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
                    {loc.located_time ? new Date(parseInt(loc.located_time)).toLocaleString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
                    }) : 'Unknown Time'}
                  </div>
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-1 leading-snug">
                    {loc.address || `Lat: ${loc.latitude}, Lon: ${loc.longitude}`}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Coordinates: {loc.latitude}, {loc.longitude}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Card Footer Actions */}
        <div className="grid grid-cols-2 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-black/20">
          <button className="flex flex-col items-center justify-center gap-1 p-3 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors group border-r border-slate-100 dark:border-white/5">
            <MapPin size={18} className="text-blue-500 group-hover:scale-110 transition-transform" />
            <span className="text-blue-600 dark:text-blue-400 text-xs font-medium">Enable Lost Mode</span>
          </button>
          <button className="flex flex-col items-center justify-center gap-1 p-3 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors group">
            <Trash2 size={18} className="text-red-500 group-hover:scale-110 transition-transform" />
            <span className="text-red-600 dark:text-red-400 text-xs font-medium">Deprovision</span>
          </button>
        </div>
      </div>
    </div>
  );
}
