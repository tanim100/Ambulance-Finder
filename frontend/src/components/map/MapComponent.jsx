'use client';
// src/components/map/MapComponent.jsx
import React from 'react';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-400 text-xs font-medium">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        <span>Initializing Emergency Navigation Map...</span>
      </div>
    </div>
  ),
});

export default function MapComponent({
  pickupLat,
  pickupLng,
  driverLat,
  driverLng,
  hospitalLocation = null,
  hospitals = [],
  onHospitalClick = null,
  route: customRoute = null,
  phaseKey = '',
  height = '100%',
}) {
  const isHospitalPhase = phaseKey?.toLowerCase().includes('hospital');

  // Only create locations when coordinates are valid non-null numbers
  const userLocation =
    pickupLat != null && pickupLng != null && !isNaN(Number(pickupLat)) && !isNaN(Number(pickupLng))
      ? { lat: Number(pickupLat), lng: Number(pickupLng), label: 'Patient Pickup Point' }
      : null;

  const driverLocation =
    driverLat != null && driverLng != null && !isNaN(Number(driverLat)) && !isNaN(Number(driverLng))
      ? { lat: Number(driverLat), lng: Number(driverLng) }
      : null;

  // Smart camera initial center:
  // In hospital phase: midpoint of driver and hospital
  // In pickup phase: midpoint of driver and user
  const center = isHospitalPhase && hospitalLocation && driverLocation
    ? [(hospitalLocation.lat + driverLocation.lat) / 2, (hospitalLocation.lng + driverLocation.lng) / 2]
    : driverLocation && userLocation
    ? [(driverLocation.lat + userLocation.lat) / 2, (driverLocation.lng + userLocation.lng) / 2]
    : driverLocation
    ? [driverLocation.lat, driverLocation.lng]
    : userLocation
    ? [userLocation.lat, userLocation.lng]
    : hospitalLocation
    ? [hospitalLocation.lat, hospitalLocation.lng]
    : [23.8103, 90.4125];

  // Route Fallback:
  // In hospital phase: connect driver to hospital
  // In pickup phase: connect driver to user
  const route =
    customRoute && customRoute.length > 1
      ? customRoute
      : isHospitalPhase && hospitalLocation && driverLocation
      ? [[driverLocation.lat, driverLocation.lng], [hospitalLocation.lat, hospitalLocation.lng]]
      : userLocation && driverLocation
      ? [[driverLocation.lat, driverLocation.lng], [userLocation.lat, userLocation.lng]]
      : null;

  return (
    <MapView
      center={center}
      userLocation={userLocation}
      driverLocation={driverLocation}
      hospitalLocation={hospitalLocation}
      hospitals={hospitals}
      onHospitalClick={onHospitalClick}
      ambulances={[]}
      route={route}
      phaseKey={phaseKey}
      height={height}
      zoom={14}
    />
  );
}
