'use client';
// src/components/map/MapView.jsx
// Professional Emergency Medical Dispatch & Turn-by-Turn Navigation Map
// Features: 60FPS Hardware Gliding, CartoDB Voyager Clean Tiles, Strobe Beacons & Phase-Aware Framing

import { useEffect, useRef, useState, useCallback } from 'react';
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

// ── Available Map Tile Presets (100% Free, High Reliability, No API Key Required) ──
export const MAP_TILES = {
  standard: {
    id: 'standard',
    name: 'OpenStreetMap',
    icon: '🗺️',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  },
  esri: {
    id: 'esri',
    name: 'Clean Streets',
    icon: '🏥',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    maxZoom: 18,
  },
  hot: {
    id: 'hot',
    name: 'Humanitarian ER',
    icon: '🚑',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors, Humanitarian OpenStreetMap Team',
    maxZoom: 19,
  },
};

// ── Dynamic Cached Icons with Emergency Visuals & Vehicle Plates ──
const ambulanceIconCache = new Map();

export const createAmbulanceIcon = (plate = 'AMB-01', type = 'Basic') => {
  if (typeof window === 'undefined') return null;

  const tagText = (plate && typeof plate === 'string' && plate.length > 0)
    ? (plate.length > 10 ? plate.slice(0, 10) : plate)
    : 'AMB-01';
  const typeStr = (type && typeof type === 'string') ? type.toLowerCase() : 'basic';
  const cacheKey = `${tagText}_${typeStr}`;

  if (ambulanceIconCache.has(cacheKey)) {
    return ambulanceIconCache.get(cacheKey);
  }

  const isICU = typeStr.includes('icu');
  const isAdv = typeStr.includes('adv');
  const gradient = isICU
    ? 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)'
    : isAdv
    ? 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)'
    : 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)';
  const badgeBg = isICU ? '#7F1D1D' : isAdv ? '#9A3412' : '#0F172A';

  const icon = L.divIcon({
    className: 'custom-ambulance-icon',
    html: `
      <div style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;">
        <!-- Dual Alternating Emergency Strobe LED Beacons -->
        <div style="
          position: absolute;
          top: -6px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 3px;
          z-index: 10;
        ">
          <span class="strobe-red" style="width: 7px; height: 7px; border-radius: 50%; background: #EF4444; border: 1.5px solid white; display: inline-block;"></span>
          <span class="strobe-blue" style="width: 7px; height: 7px; border-radius: 50%; background: #3B82F6; border: 1.5px solid white; display: inline-block;"></span>
        </div>

        <!-- 3D Ambulance Badge -->
        <div style="
          position: relative;
          background: ${gradient};
          border: 3px solid #FFFFFF;
          border-radius: 50%;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          box-shadow: 0 4px 18px rgba(220,38,38,0.6);
          cursor: pointer;
        ">
          ${isICU ? '🏥' : '🚑'}
        </div>

        <!-- License Plate / Vehicle ID Tag -->
        <div style="
          position: absolute;
          bottom: -15px;
          left: 50%;
          transform: translateX(-50%);
          background: ${badgeBg};
          color: #F8FAFC;
          font-size: 8.5px;
          font-weight: 800;
          padding: 1.5px 5px;
          border-radius: 4px;
          letter-spacing: 0.3px;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.35);
          border: 1px solid rgba(255,255,255,0.15);
        ">${tagText}</div>
      </div>
    `,
    iconSize: [48, 54],
    iconAnchor: [24, 27],
    popupAnchor: [0, -27],
  });

  ambulanceIconCache.set(cacheKey, icon);
  return icon;
};

let cachedUserIcon = null;
export const createUserIcon = () => {
  if (typeof window === 'undefined') return null;
  if (!cachedUserIcon) {
    cachedUserIcon = L.divIcon({
      className: 'custom-user-icon',
      html: `
        <div style="position: relative; width: 46px; height: 46px; display: flex; align-items: center; justify-content: center;">
          <!-- Expanding Radar Pulse Wave -->
          <div class="animate-radar-sweep" style="
            position: absolute;
            width: 44px;
            height: 44px;
            background: rgba(37, 99, 235, 0.25);
            border-radius: 50%;
          "></div>

          <!-- 3D Pickup Pin Core -->
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
            box-shadow: 0 4px 14px rgba(37,99,235,0.5);
          ">
            <span style="color: #FFFFFF; font-weight: 800; font-size: 13px; font-family: system-ui, -apple-system, sans-serif; line-height: 1;">📍</span>
          </div>

          <!-- Pickup Tag -->
          <div style="
            position: absolute;
            bottom: -13px;
            left: 50%;
            transform: translateX(-50%);
            background: #1D4ED8;
            color: white;
            font-size: 8.5px;
            font-weight: 800;
            padding: 1.5px 5px;
            border-radius: 4px;
            letter-spacing: 0.4px;
            white-space: nowrap;
            box-shadow: 0 2px 6px rgba(0,0,0,0.25);
          ">PATIENT PICKUP</div>
        </div>
      `,
      iconSize: [46, 50],
      iconAnchor: [23, 25],
      popupAnchor: [0, -25],
    });
  }
  return cachedUserIcon;
};

const hospitalIconCache = new Map();

export const createHospitalIcon = (name = '', distance = null) => {
  if (typeof window === 'undefined') return null;

  const shortTag = name
    ? (name.length > 16 ? name.slice(0, 15) + '…' : name)
    : 'HOSPITAL ER';
  const tagWithDist = distance != null ? `${shortTag} • ${distance}km` : shortTag;
  const cacheKey = tagWithDist;

  if (hospitalIconCache.has(cacheKey)) {
    return hospitalIconCache.get(cacheKey);
  }

  const icon = L.divIcon({
    className: 'custom-hospital-icon',
    html: `
      <div style="position: relative; width: 46px; height: 46px; display: flex; align-items: center; justify-content: center;">
        <!-- Green Emergency Glow Wave -->
        <div class="animate-radar-sweep" style="
          position: absolute;
          width: 44px;
          height: 44px;
          background: rgba(16, 185, 129, 0.22);
          border-radius: 50%;
        "></div>

        <!-- 3D Medical Cross Core -->
        <div style="
          position: relative;
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          border: 2.5px solid #FFFFFF;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          box-shadow: 0 4px 14px rgba(5,150,105,0.55);
          cursor: pointer;
        ">
          🏥
        </div>

        <!-- Hospital Tag -->
        <div style="
          position: absolute;
          bottom: -14px;
          left: 50%;
          transform: translateX(-50%);
          background: #047857;
          color: white;
          font-size: 8.5px;
          font-weight: 800;
          padding: 1.5px 5px;
          border-radius: 4px;
          letter-spacing: 0.3px;
          white-space: nowrap;
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
          border: 1px solid rgba(255,255,255,0.2);
        ">${tagWithDist}</div>
      </div>
    `,
    iconSize: [46, 52],
    iconAnchor: [23, 26],
    popupAnchor: [0, -26],
  });

  hospitalIconCache.set(cacheKey, icon);
  return icon;
};

// ── Smooth 60FPS Animated Marker with requestAnimationFrame Interpolation ──
function SmoothMarker({ position, icon, duration = 800, children, eventHandlers }) {
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

// ── Smart Bounds Fitter (Phase-Aware: Fits only the active leg of the trip) ──
function MapFitBounds({ userLocation, driverLocation, hospitalLocation, phaseKey }) {
  const map = useMap();
  const lastKeyRef = useRef('');

  useEffect(() => {
    const isHospital = phaseKey?.toLowerCase().includes('hospital');

    const validPoints = [];
    if (driverLocation?.lat && driverLocation?.lng) {
      validPoints.push([driverLocation.lat, driverLocation.lng]);
    }

    if (isHospital) {
      if (hospitalLocation?.lat && hospitalLocation?.lng) {
        validPoints.push([hospitalLocation.lat, hospitalLocation.lng]);
      } else if (userLocation?.lat && userLocation?.lng) {
        validPoints.push([userLocation.lat, userLocation.lng]);
      }
    } else {
      // Pickup Phase: Camera focuses tightly on Ambulance + Patient
      if (userLocation?.lat && userLocation?.lng) {
        validPoints.push([userLocation.lat, userLocation.lng]);
      }
    }

    const key = `${isHospital ? 'hosp' : 'pickup'}_${validPoints.map(p => `${p[0].toFixed(2)}_${p[1].toFixed(2)}`).join('-')}`;
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;

    if (validPoints.length >= 2) {
      try {
        const bounds = L.latLngBounds(validPoints);
        map.fitBounds(bounds, { padding: [55, 55], maxZoom: 15, animate: true, duration: 0.8 });
      } catch {}
    } else if (validPoints.length === 1) {
      map.setView(validPoints[0], 15, { animate: true, duration: 0.8 });
    }
  }, [userLocation, driverLocation, hospitalLocation, phaseKey, map]);

  return null;
}

// ── Floating In-Map Controller Toolbar ──
function MapControls({ driverLocation, route, tileStyle, onTileChange }) {
  const map = useMap();

  const handleCenterAmbulance = () => {
    if (driverLocation?.lat && driverLocation?.lng) {
      map.flyTo([driverLocation.lat, driverLocation.lng], 16, { animate: true, duration: 0.8 });
    }
  };

  const handleFitRoute = () => {
    if (route && route.length > 1) {
      const bounds = L.latLngBounds(route);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true, duration: 0.8 });
    }
  };

  const toggleTile = () => {
    const keys = Object.keys(MAP_TILES);
    const nextIdx = (keys.indexOf(tileStyle) + 1) % keys.length;
    onTileChange(keys[nextIdx]);
  };

  const currentTile = MAP_TILES[tileStyle] || MAP_TILES.standard;

  return (
    <div className="absolute bottom-4 right-3 z-[1000] flex flex-col gap-1.5 select-none pointer-events-auto">
      {/* Re-center / Follow Ambulance (Only when active driver route exists) */}
      {driverLocation && route && route.length > 1 && (
        <button
          type="button"
          onClick={handleCenterAmbulance}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/95 dark:bg-slate-900/95 text-rose-600 dark:text-rose-400 shadow-md border border-gray-200/90 dark:border-slate-700/90 hover:bg-rose-50 dark:hover:bg-slate-800 transition-all active:scale-95"
          title="Follow Ambulance GPS"
        >
          <span>🎯</span>
          <span>Follow 🚑</span>
        </button>
      )}

      {/* Fit Entire Route */}
      {route && route.length > 1 && (
        <button
          type="button"
          onClick={handleFitRoute}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/95 dark:bg-slate-900/95 text-blue-600 dark:text-blue-400 shadow-md border border-gray-200/90 dark:border-slate-700/90 hover:bg-blue-50 dark:hover:bg-slate-800 transition-all active:scale-95"
          title="Fit Active Road Route"
        >
          <span>🔄</span>
          <span>Fit Route</span>
        </button>
      )}

      {/* Map Tile Style Switcher */}
      <button
        type="button"
        onClick={toggleTile}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/95 dark:bg-slate-900/95 text-gray-700 dark:text-gray-300 shadow-md border border-gray-200/90 dark:border-slate-700/90 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all active:scale-95"
        title="Change Map Style"
      >
        <span>{currentTile.icon}</span>
        <span>{currentTile.name}</span>
      </button>
    </div>
  );
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
  hospitals = [],
  driverLocation = null,
  hospitalLocation = null,
  route = null,
  phaseKey = '',
  onAmbulanceClick = null,
  onHospitalClick = null,
  onLocationSelect = null,
  className = '',
  height = '100%',
}) {
  const [tileStyle, setTileStyle] = useState('standard'); // Default to 100% Free OpenStreetMap (Zero watermarks)

  const effectiveUserLoc = userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number'
    ? userLocation
    : null;

  const userIcon = createUserIcon();
  const hospIcon = createHospitalIcon();

  const isHospitalPhase = phaseKey?.toLowerCase().includes('hospital');
  const currentTile = MAP_TILES[tileStyle] || MAP_TILES.standard;

  return (
    <div className={`relative rounded-2xl overflow-hidden ${className}`} style={{ height, width: '100%' }}>
      {/* Dynamic Floating Navigation Route Badge (Phase-Aware) — ONLY rendered when active route exists! */}
      {route && route.length > 1 && (
        <div className="absolute top-3 left-3 z-[1000] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl shadow-lg border border-gray-200/90 dark:border-slate-700/90 flex items-center gap-2 pointer-events-none text-xs font-semibold select-none">
          {isHospitalPhase ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-black shadow-xs">🚑</span>
                <span className="text-gray-900 dark:text-gray-100 font-bold">Ambulance (Patient Onboard)</span>
              </div>
              <span className="text-emerald-500 font-bold">➔</span>
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black shadow-xs">🏥</span>
                <span className="text-emerald-800 dark:text-emerald-300 font-bold">
                  {hospitalLocation?.name ? (hospitalLocation.name.length > 24 ? hospitalLocation.name.slice(0, 22) + '…' : hospitalLocation.name) : 'Hospital ER'}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-black shadow-xs">🚑</span>
                <span className="text-gray-900 dark:text-gray-100 font-bold">Ambulance DHA-4421</span>
              </div>
              <span className="text-blue-500 font-bold">➔</span>
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black shadow-xs">📍</span>
                <span className="text-blue-700 dark:text-blue-300 font-bold">
                  {effectiveUserLoc?.label || 'Patient Pickup Point'}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          key={currentTile.id}
          url={currentTile.url}
          attribution={currentTile.attribution}
          maxZoom={currentTile.maxZoom}
        />

        {/* Phase-Aware Camera Bounds Fitter */}
        <MapFitBounds
          userLocation={effectiveUserLoc}
          driverLocation={driverLocation}
          hospitalLocation={hospitalLocation}
          phaseKey={phaseKey}
        />

        {/* Floating In-Map Camera & Tile Controls */}
        <MapControls
          driverLocation={driverLocation}
          route={route}
          tileStyle={tileStyle}
          onTileChange={setTileStyle}
        />

        {onLocationSelect && <MapClickHandler onLocationSelect={onLocationSelect} />}

        {/* Professional Multi-Layer Turn-by-Turn Road Route */}
        {route && route.length > 1 && (
          <>
            {/* 1. Ambient Drop Shadow Layer */}
            <Polyline
              key={`shadow-${route.length}-${route[0]?.[0]?.toFixed?.(3)}`}
              positions={route}
              pathOptions={{
                color: '#0F172A',
                weight: 10,
                opacity: 0.18,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* 2. Casing Border (High Contrast) */}
            <Polyline
              key={`casing-${route.length}-${route[0]?.[0]?.toFixed?.(3)}`}
              positions={route}
              pathOptions={{
                color: isHospitalPhase ? '#047857' : '#1E40AF',
                weight: 7,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* 3. Core Highway Navigation Line */}
            <Polyline
              key={`core-${route.length}-${route[0]?.[0]?.toFixed?.(3)}`}
              positions={route}
              pathOptions={{
                color: isHospitalPhase ? '#10B981' : '#3B82F6',
                weight: 4.5,
                opacity: 1.0,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* 4. Directional Highway Centerline Flow */}
            <Polyline
              key={`flow-${route.length}-${route[0]?.[0]?.toFixed?.(3)}`}
              positions={route}
              pathOptions={{
                color: '#FFFFFF',
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
              <div className="text-center p-1.5 min-w-[170px]">
                <p className="font-bold text-sm text-blue-600 flex items-center justify-center gap-1">
                  📍 {effectiveUserLoc.label || 'Patient Pickup'}
                </p>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  {effectiveUserLoc.lat.toFixed(4)}, {effectiveUserLoc.lng.toFixed(4)}
                </p>
                <div className="mt-1 text-[11px] bg-blue-50 text-blue-700 py-0.5 px-2 rounded font-semibold">
                  Ready for Emergency Boarding
                </div>
              </div>
            </Popup>
          </SmoothMarker>
        )}

        {/* Destination Hospital Marker (Single Selected Target) */}
        {hospitalLocation && typeof hospitalLocation.lat === 'number' && typeof hospitalLocation.lng === 'number' && (
          <Marker
            position={[hospitalLocation.lat, hospitalLocation.lng]}
            icon={hospIcon}
          >
            <Popup>
              <div className="text-center p-1.5 min-w-[190px]">
                <p className="font-bold text-sm text-emerald-800 flex items-center justify-center gap-1">
                  🏥 {hospitalLocation.name || 'Destination Hospital'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{hospitalLocation.area || 'Emergency Department'}</p>
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

        {/* Nearby Emergency Hospitals Fleet with Distance Badges */}
        {hospitals.map((h, i) => {
          if (!h.lat || !h.lng) return null;
          const hospIconWithTag = createHospitalIcon(h.shortName || h.name, h.distance);
          return (
            <Marker
              key={h.id || h._id || `hosp-${i}`}
              position={[h.lat, h.lng]}
              icon={hospIconWithTag}
              eventHandlers={{
                click: () => onHospitalClick?.(h),
              }}
            >
              <Popup>
                <div className="text-center p-1.5 min-w-[210px]">
                  <p className="font-bold text-sm text-emerald-800 flex items-center justify-center gap-1">
                    🏥 {h.name || 'Emergency Hospital'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{h.area || 'Emergency Department'}</p>
                  {h.distance !== undefined && (
                    <div className="my-1.5 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <span>📍 {h.distance} km from you</span>
                      <span>•</span>
                      <span>~{h.estimatedTime || Math.round(h.distance * 3.2)} min drive</span>
                    </div>
                  )}
                  {h.emergency && (
                    <p className="text-[11px] text-emerald-600 font-medium bg-emerald-50/60 p-1 rounded text-left">
                      🚨 {h.emergency}
                    </p>
                  )}
                  <div className="mt-2.5 flex flex-col gap-1.5">
                    {h.hotline && (
                      <a
                        href={`tel:${h.hotline}`}
                        className="flex items-center justify-center gap-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 px-3 rounded-lg transition"
                      >
                        📞 Hotline: {h.hotline}
                      </a>
                    )}
                    <a
                      href={`/request?destination=${encodeURIComponent(h.name)}&lat=${effectiveUserLoc?.lat || 23.8103}&lng=${effectiveUserLoc?.lng || 90.4125}&pickup=${encodeURIComponent(effectiveUserLoc?.label || '')}`}
                      className="flex items-center justify-center gap-1 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white py-1.5 px-3 rounded-lg transition shadow-xs"
                    >
                      🚑 Request Ambulance Here
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Nearby Active Ambulance Fleet with Dynamic Vehicle Badges */}
        {ambulances.map((amb, i) => {
          const vNum = amb.vehicleNumber || `AMB-0${i + 1}`;
          const icon = createAmbulanceIcon(vNum, amb.type);
          return (
            <Marker
              key={amb._id || amb.id || i}
              position={[
                amb.location?.lat || amb.lat || 23.81,
                amb.location?.lng || amb.lng || 90.41,
              ]}
              icon={icon}
              eventHandlers={{
                click: () => onAmbulanceClick?.(amb),
              }}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-bold text-gray-900">{vNum}</p>
                  <p className="text-red-600 font-medium text-xs">{amb.type || 'Standard'} Ambulance</p>
                  <p className="text-gray-500 text-xs mt-1">
                    Driver: {typeof amb.driver === 'object' ? (amb.driver?.name || amb.driver?.licenseNumber || 'Assigned Driver') : String(amb.driver || 'Assigned Driver')}
                  </p>
                  {amb.distance !== undefined && (
                    <p className="text-blue-600 font-semibold text-xs mt-0.5">📍 {amb.distance} km away</p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Assigned Ambulance Live Marker (Smooth 60fps Interpolation) */}
        {driverLocation && typeof driverLocation.lat === 'number' && typeof driverLocation.lng === 'number' && (
          <SmoothMarker
            position={[driverLocation.lat, driverLocation.lng]}
            icon={createAmbulanceIcon(driverLocation.vehicleNumber || 'DHA-4421', driverLocation.type || 'Advanced')}
            duration={800}
          >
            <Popup>
              <div className="text-center p-1.5 min-w-[180px]">
                <p className="font-bold text-sm text-red-600 flex items-center justify-center gap-1">
                  🚑 Live Ambulance GPS
                </p>
                <p className="text-xs text-gray-700 font-semibold mt-0.5">
                  DHA-AMB-4421 (ALS Unit)
                </p>
                <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                  Lat: {driverLocation.lat.toFixed(4)}, Lng: {driverLocation.lng.toFixed(4)}
                </p>
                <div className="mt-1 flex items-center justify-center gap-2 text-[11px]">
                  <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                    ⚡ {driverLocation.speed || 38} km/h
                  </span>
                  <span className="text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                    🟢 Live GPS
                  </span>
                </div>
              </div>
            </Popup>
          </SmoothMarker>
        )}
      </MapContainer>
    </div>
  );
}
