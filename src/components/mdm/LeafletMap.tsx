'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getHumanReadableDeviceName } from '@/lib/deviceMapping';

// Fix for default marker icon issues in Leaflet with Webpack/Next.js
const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Helper to create a numbered circle icon for history pins
const createNumberedIcon = (num: number) => {
  return new L.DivIcon({
    html: `<div style="background-color: white; border: 2px solid #3b82f6; color: #3b82f6; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">${num}</div>`,
    className: 'custom-numbered-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });
};

interface LeafletMapProps {
  locations: any[];
  devices: any[];
  onMarkerClick: (device: any) => void;
  showHistoryTrail?: boolean;
}

function MapUpdater({ center, zoom, locations, showHistoryTrail }: { center: [number, number], zoom: number, locations: any[], showHistoryTrail?: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (showHistoryTrail && locations.length > 1) {
      // Create a bounds object covering all history points
      const bounds = L.latLngBounds(locations.map(loc => [loc.latitude, loc.longitude]));
      // Fly to fit the bounds, with a little padding
      map.flyToBounds(bounds, { duration: 1.5, padding: [50, 50] });
    } else {
      map.flyTo(center, zoom, { duration: 1.5 });
    }
  }, [center, zoom, map, showHistoryTrail, locations]);
  return null;
}

export default function LeafletMap({ locations, devices, onMarkerClick, showHistoryTrail }: LeafletMapProps) {
  // Center map on the first location if available, otherwise default to a global view (0,0)
  const hasLocation = locations.length > 0 && locations[0].latitude;
  const targetCenter: [number, number] = hasLocation
    ? [locations[0].latitude, locations[0].longitude]
    : [20, 0];
  
  const targetZoom = hasLocation ? 14 : 2;

  return (
    <MapContainer 
      center={targetCenter} 
      zoom={targetZoom} 
      style={{ height: '100%', width: '100%', borderRadius: '1rem' }}
    >
      <MapUpdater center={targetCenter} zoom={targetZoom} locations={locations} showHistoryTrail={showHistoryTrail} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {showHistoryTrail && locations.length > 1 && (
        <Polyline 
          positions={locations.map(loc => [loc.latitude, loc.longitude]) as [number, number][]} 
          color="#3b82f6" 
          weight={3} 
          opacity={0.8}
        />
      )}

      {locations.map((loc, index) => {
        if (!loc.latitude || !loc.longitude) return null;
        const device = devices.find(d => d.device_id === loc.device_id);
        
        return (
          <Marker 
            key={`${loc.device_id}-${loc.located_time || index}`} 
            position={[loc.latitude, loc.longitude]}
            icon={showHistoryTrail ? createNumberedIcon(index + 1) : customIcon}
            eventHandlers={{
              click: () => {
                if (device) onMarkerClick(device);
              },
            }}
          >
            <Popup>
              <div className="font-medium text-slate-800">
                {device ? (getHumanReadableDeviceName(device.product_name) || getHumanReadableDeviceName(device.model_name) || getHumanReadableDeviceName(device.model) || device.product_name || device.model_name || device.model || device.device_name || 'Unknown Device') : 'Unknown Device'}
              </div>
              <div className="text-xs text-slate-500">
                Click to view details
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
