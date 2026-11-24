'use client';
// src/components/map/MapView.jsx
// Smooth, Jitter-Free Leaflet Map with Stable Singletons, Smooth Interpolation & Dual-Layer Road Routing

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

// ── Static Cached Icons (Created ONCE so React never recreates DOM nodes) ──
let cachedAmbulanceIcon = null;
export const createAmbulanceIcon = (status = 'En Route') => {
  if (typeof window === 'undefined') return null;
  if (!cachedAmbulanceIcon) {
    cachedAmbulanceIcon = L.divIcon({
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
  }
  return cachedAmbulanceIcon;
};

let cachedUserIcon = null;
export const createUserIcon = () => {
  if (typeof window === 'undefined') return null;
  if (!cachedUserIcon) {
    cachedUserIcon = L.divIcon({
      className: 'custom-user-icon',
      html: `<div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
        <div style="
          position: absolute;
          width: 36px;
          height: 36px;
          background: rgba(37, 99, 235, 0.35);
          border-radius: 50%;
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
  }
  return cachedUserIcon;
};

let cachedHospitalIcon = null;
export const createHospitalIcon = () => {
  if (typeof window === 'undefined') return null;
  if (!cachedHospitalIcon) {
    cachedHospitalIcon = L.divIcon({
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
  }
  return cachedHospitalIcon;
};

// ── Smooth 60FPS Animated Marker with requestAnimationFrame Interpolation ──
function SmoothMarker({ position, icon, duration = 900, children, eventHandlers }) {
  const markerRef = useRef(null);
  const animFrameRef = useRef(null);
  const currentPosRef = useRef(position);
  const targetPosRef = useRef(position);
  const startTimeRef = useRef(null);
  const fromPosRef = useRef(position);

  useEffect(() => {
    if (!position || typeof position[0] !== 'number' || typeof position[1] !== 'number') return;

    // Check if position actually moved
    if (
      currentPosRef.current &&
      currentPosRef.current[0] === position[0] &&
      currentPosRef.current[1] === position[1]
    ) {
      return;
    }

    fromPosRef.current = currentPosRef.current || position;
    targetPosRef.current = position;
    startTimeRef.current = performance.now();

    const animate = (time) => {
      if (!markerRef.current) return;
      const elapsed = time - startTimeRef.current;
      const progress = Math.min(1, elapsed / duration);

      // Smooth ease-out cubic interpolation: 1 - (1 - progress)^3
      const ease = 1 - Math.pow(1 - progress, 3);

      const lat = fromPosRef.current[0] + (targetPosRef.current[0] - fromPosRef.current[0]) * ease;
      const lng = fromPosRef.current[1] + (targetPosRef.current[1] - fromPosRef.current[1]) * ease;

      currentPosRef.current = [lat, lng];
      try {
        markerRef.current.setLatLng([lat, lng]);
      } catch {}

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [position?.[0], position?.[1], duration]);

  if (!position || typeof position[0] !== 'number' || typeof position[1] !== 'number') return null;

  return (
    <Marker
      ref={markerRef}
      position={position}
      icon={icon}
      eventHandlers={eventHandlers}
    >
      {children}
    </Marker>
  );
}

// ── Smart Bounds Fitter (Fits camera ONCE per phase or hospital switch, NEVER on micro GPS ticks) ──
function MapFitBounds({ userLocation, driverLocation, hospitalLocation, phaseKey }) {
  const map = useMap();
  const lastKeyRef = useRef('');

  useEffect(() => {
    const key = `${phaseKey || 'def'}_${hospitalLocation?.name || 'none'}_${Boolean(userLocation)}_${Boolean(driverLocation)}`;
    if (lastKeyRef.current === key) return;

    const validPoints = [];
    if (userLocation?.lat && userLocation?.lng) validPoints.push([userLocation.lat, userLocation.lng]);
    if (driverLocation?.lat && driverLocation?.lng) validPoints.push([driverLocation.lat, driverLocation.lng]);
    if (hospitalLocation?.lat && hospitalLocation?.lng) validPoints.push([hospitalLocation.lat, hospitalLocation.lng]);

    if (validPoints.length >= 2) {
      try {
        const bounds = L.latLngBounds(validPoints);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true, duration: 0.6 });
        lastKeyRef.current = key;
      } catch {}
    } else if (validPoints.length === 1 && !lastKeyRef.current) {
      map.setView(validPoints[0], 15, { animate: false });
      lastKeyRef.current = key;
    }
  }, [userLocation, driverLocation, hospitalLocation, phaseKey, map]);

  return null;
}

// ── Map Click Listener to pick location ──
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
  phaseKey = '',
  onAmbulanceClick = null,
  onLocationSelect = null,
  className = '',
  height = '100%',
}) {
  const effectiveUserLoc = userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number'
    ? userLocation
    : null;

  const ambIcon = createAmbulanceIcon();
  const userIcon = createUserIcon();
  const hospIcon = createHospitalIcon();

  return (
    <div className={`relative rounded-2xl overflow-hidden ${className}`} style={{ height, width: '100%' }}>
      {/* Global CSS for zero-jitter smooth marker gliding */}
      <style jsx global>{`
        .leaflet-marker-icon {
          transition: transform 0.6s linear !important;
          will-change: transform;
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

        {/* Fits bounds smoothly when phase/hospital changes, completely silent during GPS movement */}
        <MapFitBounds
          userLocation={effectiveUserLoc}
          driverLocation={driverLocation}
          hospitalLocation={hospitalLocation}
          phaseKey={phaseKey}
        />

        {onLocationSelect && <MapClickHandler onLocationSelect={onLocationSelect} />}

        {/* Route polyline — dual layer (glow + high-visibility dashed road navigation) */}
        {route && route.length > 1 && (
          <>
            {/* Outer Route Glow Layer */}
            <Polyline
              key={`glow-${route.length}-${route[0]?.[0]?.toFixed?.(3)}`}
              positions={route}
              pathOptions={{
                color: '#2563EB',
                weight: 8,
                opacity: 0.45,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Inner High-Visibility Road Direction Layer */}
            <Polyline
              key={`nav-${route.length}-${route[0]?.[0]?.toFixed?.(3)}`}
              positions={route}
              pathOptions={{
                color: '#DC2626',
                weight: 5,
                opacity: 0.95,
                dashArray: '10, 8',
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </>
        )}

        {/* User / Patient Pickup Location Marker (Smooth 60fps Interpolation) */}
        {effectiveUserLoc && (
          <SmoothMarker
            position={[effectiveUserLoc.lat, effectiveUserLoc.lng]}
            icon={userIcon}
            duration={800}
          >
            <Popup>
              <div className="text-center p-1">
                <p className="font-bold text-sm text-blue-600">📍 {effectiveUserLoc.label || 'Patient Pickup'}</p>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  {effectiveUserLoc.lat.toFixed(4)}, {effectiveUserLoc.lng.toFixed(4)}
                </p>
              </div>
            </Popup>
          </SmoothMarker>
        )}

        {/* Destination Hospital Marker */}
        {hospitalLocation && typeof hospitalLocation.lat === 'number' && typeof hospitalLocation.lng === 'number' && (
          <Marker
            position={[hospitalLocation.lat, hospitalLocation.lng]}
            icon={hospIcon}
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
            icon={ambIcon}
            eventHandlers={{
              click: () => onAmbulanceClick?.(amb),
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-bold text-gray-900">{amb.vehicleNumber || 'Ambulance'}</p>
                <p className="text-red-600 font-medium text-xs">{amb.type || 'Standard'} Ambulance</p>
                <p className="text-gray-500 text-xs mt-1">Driver: {amb.driver || 'Assigned Driver'}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Assigned Driver Live Marker (Smooth 60fps Interpolation) */}
        {driverLocation && typeof driverLocation.lat === 'number' && typeof driverLocation.lng === 'number' && (
          <SmoothMarker
            position={[driverLocation.lat, driverLocation.lng]}
            icon={ambIcon}
            duration={800}
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
          </SmoothMarker>
        )}
      </MapContainer>
    </div>
  );
}
