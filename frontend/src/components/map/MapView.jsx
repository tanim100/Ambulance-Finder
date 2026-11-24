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
        background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
        border: 3px solid #FFFFFF;
        border-radius: 50%;
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        box-shadow: 0 4px 16px rgba(220,38,38,0.55);
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
          box-shadow: 0 0 6px rgba(16,185,129,0.8);
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
      html: `<div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
        <div style="
          position: absolute;
          width: 42px;
          height: 42px;
          background: rgba(37, 99, 235, 0.22);
          border-radius: 50%;
          animation: pinPulseRipple 2s ease-out infinite;
        "></div>
        <div style="
          position: relative;
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          border: 2.5px solid #FFFFFF;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(37,99,235,0.45);
        ">
          <span style="color: #FFFFFF; font-weight: 800; font-size: 13px; font-family: system-ui, -apple-system, sans-serif; line-height: 1;">A</span>
        </div>
        <div style="
          position: absolute;
          bottom: 2px;
          background: #1D4ED8;
          color: white;
          font-size: 8.5px;
          font-weight: 700;
          padding: 1px 4px;
          border-radius: 4px;
          letter-spacing: 0.3px;
          white-space: nowrap;
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
          transform: translateY(12px);
        ">PICKUP</div>
      </div>`,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -22],
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
      html: `<div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
        <div style="
          position: absolute;
          width: 42px;
          height: 42px;
          background: rgba(220, 38, 38, 0.2);
          border-radius: 50%;
          animation: pinPulseRipple 2s ease-out infinite;
        "></div>
        <div style="
          position: relative;
          background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%);
          border: 2.5px solid #FFFFFF;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(220,38,38,0.5);
        ">
          <span style="color: #FFFFFF; font-weight: 800; font-size: 13px; font-family: system-ui, -apple-system, sans-serif; line-height: 1;">B</span>
        </div>
        <span style="
          position: absolute;
          top: -2px;
          right: -2px;
          background: white;
          border-radius: 50%;
          width: 15px;
          height: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.25);
        ">🏥</span>
        <div style="
          position: absolute;
          bottom: 2px;
          background: #DC2626;
          color: white;
          font-size: 8.5px;
          font-weight: 700;
          padding: 1px 4px;
          border-radius: 4px;
          letter-spacing: 0.3px;
          white-space: nowrap;
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
          transform: translateY(12px);
        ">HOSPITAL</div>
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
      {/* Floating Modern A -> B Navigation Route Badge */}
      {route && route.length > 1 && (
        <div className="absolute top-3 left-3 z-[1000] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl shadow-lg border border-gray-200/90 dark:border-slate-700/90 flex items-center gap-2 pointer-events-none text-xs font-semibold select-none">
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black shadow-sm">A</span>
            <span className="text-gray-800 dark:text-gray-200 font-medium">
              {effectiveUserLoc?.label || 'Pickup'}
            </span>
          </div>
          <span className="text-blue-500 font-bold">➔</span>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-black shadow-sm">B</span>
            <span className="text-gray-800 dark:text-gray-200 font-medium">
              {hospitalLocation?.name ? (hospitalLocation.name.length > 22 ? hospitalLocation.name.slice(0, 20) + '…' : hospitalLocation.name) : 'Hospital'}
            </span>
          </div>
        </div>
      )}

      {/* Global CSS for zero-jitter smooth marker gliding & route animation */}
      <style jsx global>{`
        .leaflet-marker-icon {
          transition: transform 0.6s linear !important;
          will-change: transform;
        }
        @keyframes routeDashFlow {
          from {
            stroke-dashoffset: 48;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        .leaflet-route-flow {
          animation: routeDashFlow 2s linear infinite !important;
        }
        @keyframes pinPulseRipple {
          0% {
            transform: scale(0.9);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.35);
            opacity: 0.25;
          }
          100% {
            transform: scale(1.7);
            opacity: 0;
          }
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

        {/* Route polyline — Standard Google Maps & Uber style navigation polyline */}
        {route && route.length > 1 && (
          <>
            {/* 1. Ambient Drop Shadow / Soft Glow */}
            <Polyline
              key={`shadow-${route.length}-${route[0]?.[0]?.toFixed?.(3)}`}
              positions={route}
              pathOptions={{
                color: '#0F172A',
                weight: 10,
                opacity: 0.16,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* 2. Navigation Road Casing / Border (Rich Royal Blue for High Contrast) */}
            <Polyline
              key={`casing-${route.length}-${route[0]?.[0]?.toFixed?.(3)}`}
              positions={route}
              pathOptions={{
                color: '#1E40AF',
                weight: 7,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* 3. Core Solid Highway Navigation Line (Vibrant Electric Blue) */}
            <Polyline
              key={`core-${route.length}-${route[0]?.[0]?.toFixed?.(3)}`}
              positions={route}
              pathOptions={{
                color: '#3B82F6',
                weight: 4.5,
                opacity: 1.0,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* 4. Directional Highway Centerline Flow (Subtle Animated Navigation Flow) */}
            <Polyline
              key={`flow-${route.length}-${route[0]?.[0]?.toFixed?.(3)}`}
              positions={route}
              pathOptions={{
                color: '#E0F2FE',
                weight: 1.8,
                opacity: 0.85,
                dashArray: '8, 16',
                className: 'leaflet-route-flow',
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
