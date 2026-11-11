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
  const center = pickupLat && pickupLng ? [pickupLat, pickupLng] : [23.8103, 90.4125];
  const userLocation = pickupLat && pickupLng ? { lat: pickupLat, lng: pickupLng } : null;
  const driverLocation = driverLat && driverLng ? { lat: driverLat, lng: driverLng } : null;
  const ambulances = driverLocation
    ? [{ _id: 'assigned', lat: driverLat, lng: driverLng, type: 'Basic', vehicleNumber: 'AMB-001', status: 'En Route' }]
    : [];

  return (
    <MapView
      center={center}
      userLocation={userLocation}
      driverLocation={driverLocation}
      ambulances={ambulances}
      height={height}
      zoom={14}
    />
  );
}
