'use client';
// src/components/map/MapView.jsx
// Leaflet map wrapper — must be dynamically imported with ssr: false

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons for Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom red ambulance icon
export const createAmbulanceIcon = () =>
  L.divIcon({
    className: 'custom-ambulance-icon',
    html: `<div style="
      background: #DC2626;
      border: 3px solid white;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      box-shadow: 0 2px 8px rgba(220,38,38,0.5);
    ">🚑</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });

// Custom user location icon
export const createUserIcon = () =>
  L.divIcon({
    className: 'custom-user-icon',
    html: `<div style="
      background: #2563EB;
      border: 3px solid white;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      box-shadow: 0 2px 6px rgba(37,99,235,0.6);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });

// Auto-recenter when center prop changes
function MapRecenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom(), { animate: true });
    }
  }, [center, zoom, map]);
  return null;
}

export default function MapView({
  center = [23.8103, 90.4125], // Default: Dhaka, Bangladesh
  zoom = 13,
  userLocation = null,
  ambulances = [],
  driverLocation = null,
  route = null,
  onAmbulanceClick = null,
  className = '',
  height = '100%',
}) {
  return (
    <div className={`relative rounded-2xl overflow-hidden ${className}`} style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <MapRecenter center={center} zoom={zoom} />

        {/* User location marker */}
        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={createUserIcon()}
          >
            <Popup>
              <p className="font-semibold text-sm">📍 Your Location</p>
            </Popup>
          </Marker>
        )}

        {/* Ambulance markers */}
        {ambulances.map((amb, i) => (
          <Marker
            key={amb._id || i}
            position={[
              amb.location?.lat || amb.lat || 23.81,
              amb.location?.lng || amb.lng || 90.41,
            ]}
            icon={createAmbulanceIcon()}
            eventHandlers={{
              click: () => onAmbulanceClick?.(amb),
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-bold">{amb.vehicleNumber}</p>
                <p className="text-gray-600">{amb.type} Ambulance</p>
                <p className="text-gray-500">Driver: {amb.driver}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Driver location marker */}
        {driverLocation && (
          <Marker
            position={[driverLocation.lat, driverLocation.lng]}
            icon={createAmbulanceIcon()}
          >
            <Popup>
              <p className="font-semibold text-sm">🚑 Ambulance En Route</p>
            </Popup>
          </Marker>
        )}

        {/* Route polyline */}
        {route && route.length > 1 && (
          <Polyline
            positions={route}
            color="#DC2626"
            weight={4}
            opacity={0.8}
            dashArray="8, 4"
          />
        )}
      </MapContainer>
    </div>
  );
}
