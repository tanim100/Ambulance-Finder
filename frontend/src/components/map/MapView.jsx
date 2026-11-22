'use client';
// src/components/map/MapView.jsx
// Interactive Leaflet map with Live Current Location Pin, Ambulance Markers, Destination Hospital & Navigation Route

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
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      box-shadow: 0 4px 14px rgba(220,38,38,0.55);
      cursor: pointer;
      animation: pulse-ring 2s infinite ease-out;
    ">
      🚑
      <span style="
        position: absolute;
        top: -2px;
        right: -2px;
        width: 12px;
        height: 12px;
        background: #10B981;
        border: 2px solid white;
        border-radius: 50%;
      "></span>
    </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });

// High-visibility pulsing Current Location User Icon
export const createUserIcon = () =>
  L.divIcon({
    className: 'custom-user-icon',
    html: `<div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
      <div style="
        position: absolute;
        width: 36px;
        height: 36px;
        background: rgba(37, 99, 235, 0.35);
        border-radius: 50%;
        animation: leaflet-pulse 2s infinite ease-out;
      "></div>
      <div style="
        position: relative;
        background: #2563EB;
        border: 3px solid white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        box-shadow: 0 2px 10px rgba(37,99,235,0.7);
      "></div>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });

// Destination Hospital Icon (Emerald Green with Hospital Pulse)
export const createHospitalIcon = () =>
  L.divIcon({
    className: 'custom-hospital-icon',
    html: `<div style="
      position: relative;
      background: #059669;
      border: 3px solid white;
      border-radius: 50%;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      box-shadow: 0 4px 14px rgba(5,150,105,0.6);
      cursor: pointer;
      animation: hospital-pulse 2s infinite ease-out;
    ">
      🏥
      <span style="
        position: absolute;
        top: -2px;
        right: -2px;
        width: 12px;
        height: 12px;
        background: #EF4444;
        border: 2px solid white;
        border-radius: 50%;
      "></span>
    </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });

// Auto-fit bounds to encompass user, driver, and destination hospital
function MapFitBounds({ userLocation, driverLocation, hospitalLocation }) {
  const map = useMap();
  const hasFitted = useRef(false);

  useEffect(() => {
    const validPoints = [];
    if (userLocation?.lat && userLocation?.lng) validPoints.push([userLocation.lat, userLocation.lng]);
    if (driverLocation?.lat && driverLocation?.lng) validPoints.push([driverLocation.lat, driverLocation.lng]);
    if (hospitalLocation?.lat && hospitalLocation?.lng) validPoints.push([hospitalLocation.lat, hospitalLocation.lng]);

    if (validPoints.length >= 2 && !hasFitted.current) {
      try {
        const bounds = L.latLngBounds(validPoints);
        map.fitBounds(bounds, { padding: [55, 55], maxZoom: 16 });
        hasFitted.current = true;
      } catch {}
    }
  }, [userLocation?.lat, userLocation?.lng, driverLocation?.lat, driverLocation?.lng, hospitalLocation?.lat, hospitalLocation?.lng, map]);

  return null;
}

// Auto-recenter when center prop changes
function MapRecenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && Array.isArray(center) && center[0] && center[1]) {
      map.flyTo(center, zoom || map.getZoom() || 15, { duration: 0.8 });
    }
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

export default function MapView({
  center = [23.8103, 90.4125], // Default: Dhaka
  zoom = 14,
  userLocation = null,
  ambulances = [],
  driverLocation = null,
  hospitalLocation = null,
  route = null,
  onAmbulanceClick = null,
  onLocationSelect = null,
  className = '',
  height = '100%',
}) {
  const effectiveUserLoc = userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number'
    ? userLocation
    : null;

  return (
    <div className={`relative rounded-2xl overflow-hidden ${className}`} style={{ height, width: '100%' }}>
      {/* Global CSS for pulsing markers */}
      <style jsx global>{`
        @keyframes leaflet-pulse {
          0% { transform: scale(0.6); opacity: 0.9; }
          70% { transform: scale(1.6); opacity: 0; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.6); }
          70% { box-shadow: 0 0 0 12px rgba(220, 38, 38, 0); }
          100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
        }
        @keyframes hospital-pulse {
          0% { box-shadow: 0 0 0 0 rgba(5, 150, 105, 0.6); }
          70% { box-shadow: 0 0 0 14px rgba(5, 150, 105, 0); }
          100% { box-shadow: 0 0 0 0 rgba(5, 150, 105, 0); }
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
        <MapFitBounds userLocation={effectiveUserLoc} driverLocation={driverLocation} hospitalLocation={hospitalLocation} />
        {onLocationSelect && <MapClickHandler onLocationSelect={onLocationSelect} />}

        {/* Route polyline — dual layer (glow + navigation path) */}
        {route && route.length > 1 && (
          <>
            {/* Outer Route Glow */}
            <Polyline
              positions={route}
              pathOptions={{
                color: '#2563EB',
                weight: 7,
                opacity: 0.35,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Inner Dashed Road Navigation Path */}
            <Polyline
              positions={route}
              pathOptions={{
                color: '#DC2626',
                weight: 4,
                opacity: 0.95,
                dashArray: '8, 8',
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </>
        )}

        {/* User / Patient Pickup Location Marker */}
        {effectiveUserLoc && (
          <Marker
            position={[effectiveUserLoc.lat, effectiveUserLoc.lng]}
            icon={createUserIcon()}
          >
            <Popup>
              <div className="text-center p-1">
                <p className="font-bold text-sm text-blue-600">📍 {effectiveUserLoc.label || 'Patient Pickup'}</p>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  {effectiveUserLoc.lat.toFixed(4)}, {effectiveUserLoc.lng.toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Destination Hospital Marker */}
        {hospitalLocation && typeof hospitalLocation.lat === 'number' && typeof hospitalLocation.lng === 'number' && (
          <Marker
            position={[hospitalLocation.lat, hospitalLocation.lng]}
            icon={createHospitalIcon()}
          >
            <Popup>
              <div className="text-center p-1.5 min-w-[180px]">
                <p className="font-bold text-sm text-emerald-800 flex items-center justify-center gap-1">
                  🏥 {hospitalLocation.name || 'Destination Hospital'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{hospitalLocation.area || 'Emergency Center'}</p>
                {hospitalLocation.emergency && (
                  <p className="text-[11px] text-emerald-600 font-medium mt-1 bg-emerald-50 py-0.5 px-1.5 rounded">
                    {hospitalLocation.emergency}
                  </p>
                )}
                {hospitalLocation.hotline && (
                  <a
                    href={`tel:${hospitalLocation.hotline}`}
                    className="inline-block mt-2 text-xs font-bold bg-emerald-600 text-white px-2.5 py-1 rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    📞 ER Hotline: {hospitalLocation.hotline}
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
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

        {/* Assigned Driver Live Marker */}
        {driverLocation && typeof driverLocation.lat === 'number' && typeof driverLocation.lng === 'number' && (
          <Marker
            position={[driverLocation.lat, driverLocation.lng]}
            icon={createAmbulanceIcon('En Route')}
          >
            <Popup>
              <div className="text-center p-1">
                <p className="font-bold text-sm text-red-600">🚑 Ambulance Live Location</p>
                <p className="text-xs text-gray-600 font-mono mt-0.5">
                  Lat: {driverLocation.lat.toFixed(4)}, Lng: {driverLocation.lng.toFixed(4)}
                </p>
                {driverLocation.speed && (
                  <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                    Speed: {driverLocation.speed} km/h
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
