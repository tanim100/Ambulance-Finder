'use client';
// src/components/map/MapComponent.jsx
import React from 'react';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-slate-800 text-gray-400 text-xs">
      Loading Map...
    </div>
  ),
});

export default function MapComponent({ pickupLat, pickupLng, driverLat, driverLng, height = '100%' }) {
  // Only create locations when coordinates are valid non-null numbers
  const userLocation =
    pickupLat != null && pickupLng != null && !isNaN(Number(pickupLat)) && !isNaN(Number(pickupLng))
      ? { lat: Number(pickupLat), lng: Number(pickupLng), label: 'Patient Pickup Point' }
      : null;

  const driverLocation =
    driverLat != null && driverLng != null && !isNaN(Number(driverLat)) && !isNaN(Number(driverLng))
      ? { lat: Number(driverLat), lng: Number(driverLng) }
      : null;

  // Smart center: midpoint if both present, else whichever is available, else Dhaka
  const center = driverLocation && userLocation
    ? [(driverLocation.lat + userLocation.lat) / 2, (driverLocation.lng + userLocation.lng) / 2]
    : driverLocation
    ? [driverLocation.lat, driverLocation.lng]
    : userLocation
    ? [userLocation.lat, userLocation.lng]
    : [23.8103, 90.4125];

  const route =
    userLocation && driverLocation
      ? [[driverLocation.lat, driverLocation.lng], [userLocation.lat, userLocation.lng]]
      : null;

  return (
    <MapView
      center={center}
      userLocation={userLocation}
      driverLocation={driverLocation}
      ambulances={[]}
      route={route}
      height={height}
      zoom={14}
    />
  );
}
