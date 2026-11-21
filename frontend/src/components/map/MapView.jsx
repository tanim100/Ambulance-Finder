'use client';
// src/components/map/MapView.jsx
// Interactive Leaflet map with Live Current Location Pin, Ambulance Markers & Recenter Controls

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons for Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom red ambulance icon with pulse
export const createAmbulanceIcon = (status = 'En Route') =>
  L.divIcon({
    className: 'custom-ambulance-icon',
    html: `<div style="
      position: relative;
      background: #DC2626;
      border: 3px solid white;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      box-shadow: 0 4px 12px rgba(220,38,38,0.5);
      cursor: pointer;
    ">
      🚑
      <span style="
        position: absolute;
        top: -2px;
        right: -2px;
        width: 10px;
        height: 10px;
        background: #10B981;
        border: 2px solid white;
        border-radius: 50%;
      "></span>
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });

// High-visibility pulsing Current Location User Icon
export const createUserIcon = () =>
  L.divIcon({
    className: 'custom-user-icon',
    html: `<div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      <div style="
        position: absolute;
        width: 32px;
        height: 32px;
        background: rgba(37, 99, 235, 0.35);
        border-radius: 50%;
        animation: leaflet-pulse 2s infinite ease-out;
      "></div>
      <div style="
        position: relative;
        background: #2563EB;
        border: 3px solid white;
        border-radius: 50%;
        width: 18px;
        height: 18px;
        box-shadow: 0 2px 8px rgba(37,99,235,0.7);
      "></div>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });

// Auto-recenter only when center changes significantly (avoid jitter)
function MapRecenter({ center, zoom }) {
  const map = useMap();
  const lastCenterRef = useRef(null);

  useEffect(() => {
    if (!center || !Array.isArray(center) || !center[0] || !center[1]) return;

    const [newLat, newLng] = center;
    const prev = lastCenterRef.current;

    // Only fly if moved more than ~50 meters (0.0005 degrees) to avoid constant re-centering
    if (prev) {
      const dist = Math.sqrt(
        Math.pow(newLat - prev[0], 2) + Math.pow(newLng - prev[1], 2)
      );
      if (dist < 0.0005) return;
    }

    lastCenterRef.current = center;
    map.flyTo(center, zoom || map.getZoom() || 15, { duration: 0.8 });
  }, [center, zoom, map]);

  return null;
}

// Map Click Listener to pick location
function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      if (onLocationSelect) {
        onLocationSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
}

// Smoothly moving marker that updates position without re-mounting
function LiveMarker({ position, icon, popupContent }) {
  const markerRef = useRef(null);

  useEffect(() => {
    if (markerRef.current && position) {
      markerRef.current.setLatLng(position);
    }
  }, [position]);

  if (!position || !position[0] || !position[1]) return null;

  return (
    <Marker
      position={position}
      icon={icon}
      ref={markerRef}
    >
      {popupContent && <Popup>{popupContent}</Popup>}
    </Marker>
  );
}

export default function MapView({
  center = [23.8103, 90.4125], // Default: Dhaka
  zoom = 15,
  userLocation = null,
  ambulances = [],
  driverLocation = null,
  route = null,
  onAmbulanceClick = null,
  onLocationSelect = null,
  className = '',
  height = '100%',
}) {
  // Ensure we always have valid coordinates for user position
  const effectiveUserLoc =
    userLocation && typeof userLocation.lat === 'number'
      ? userLocation
      : null;

  const userPos = effectiveUserLoc
    ? [effectiveUserLoc.lat, effectiveUserLoc.lng]
    : null;

  const driverPos =
    driverLocation && typeof driverLocation.lat === 'number' && typeof driverLocation.lng === 'number'
      ? [driverLocation.lat, driverLocation.lng]
      : null;

  return (
    <div className={`relative rounded-2xl overflow-hidden ${className}`} style={{ height, width: '100%' }}>
      {/* Global CSS for pulsing location radar */}
      <style>{`
        @keyframes leaflet-pulse {
          0% { transform: scale(0.6); opacity: 0.9; }
          70% { transform: scale(1.6); opacity: 0; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>

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
        {onLocationSelect && <MapClickHandler onLocationSelect={onLocationSelect} />}

        {/* User / Patient Location Marker — Blue pulsing dot */}
        {userPos && (
          <LiveMarker
            position={userPos}
            icon={createUserIcon()}
            popupContent={
              <div className="text-center p-1">
                <p className="font-bold text-sm text-blue-600">📍 Patient Pickup Location</p>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  {effectiveUserLoc.lat.toFixed(5)}, {effectiveUserLoc.lng.toFixed(5)}
                </p>
                {effectiveUserLoc.label && (
                  <p className="text-[11px] text-gray-400 mt-0.5">{effectiveUserLoc.label}</p>
                )}
              </div>
            }
          />
        )}

        {/* Nearby Ambulance markers */}
        {ambulances.map((amb, i) => (
          <Marker
            key={amb._id || i}
            position={[
              amb.location?.lat || amb.lat || 23.81,
              amb.location?.lng || amb.lng || 90.41,
            ]}
            icon={createAmbulanceIcon(amb.status)}
            eventHandlers={{
              click: () => onAmbulanceClick?.(amb),
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-bold text-gray-900">{amb.vehicleNumber || 'Ambulance'}</p>
                <p className="text-red-600 font-medium text-xs">{amb.type || 'Standard'} Ambulance</p>
                <p className="text-gray-500 text-xs mt-1">Driver: {amb.driver || 'Assigned Driver'}</p>
                <p className="text-gray-400 text-[11px] font-mono mt-0.5">
                  {(amb.location?.lat || amb.lat).toFixed(4)}, {(amb.location?.lng || amb.lng).toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Assigned Driver Live Marker — Red ambulance icon, smooth position update */}
        {driverPos && (
          <LiveMarker
            position={driverPos}
            icon={createAmbulanceIcon('En Route')}
            popupContent={
              <div className="text-center p-1">
                <p className="font-bold text-sm text-red-600">🚑 Ambulance Live Location</p>
                <p className="text-xs text-gray-600 font-mono mt-0.5">
                  Lat: {driverLocation.lat.toFixed(5)}, Lng: {driverLocation.lng.toFixed(5)}
                </p>
                {driverLocation.speed && (
                  <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                    Speed: {driverLocation.speed} km/h
                  </p>
                )}
              </div>
            }
          />
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
