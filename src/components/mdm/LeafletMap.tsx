'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

interface LeafletMapProps {
  locations: any[];
  devices: any[];
  onMarkerClick: (device: any) => void;
}

export default function LeafletMap({ locations, devices, onMarkerClick }: LeafletMapProps) {
  // Center map on the first location if available, otherwise default to a global view (0,0)
  const defaultCenter: [number, number] = locations.length > 0 && locations[0].latitude
    ? [locations[0].latitude, locations[0].longitude]
    : [20, 0];

  return (
    <MapContainer 
      center={defaultCenter} 
      zoom={2} 
      style={{ height: '100%', width: '100%', borderRadius: '1rem' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {locations.map((loc) => {
        if (!loc.latitude || !loc.longitude) return null;
        const device = devices.find(d => d.device_id === loc.device_id);
        
        return (
          <Marker 
            key={loc.device_id} 
            position={[loc.latitude, loc.longitude]}
            icon={customIcon}
            eventHandlers={{
              click: () => {
                if (device) onMarkerClick(device);
              },
            }}
          >
            <Popup>
              <div className="font-medium text-slate-800">
                {device?.device_name || 'Unknown Device'}
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
