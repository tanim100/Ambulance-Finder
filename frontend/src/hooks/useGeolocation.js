'use client';
// src/hooks/useGeolocation.js — Resilient Real-Time Geolocation with GPS, Real IP Geolocation & Map Picker

import { useState, useEffect, useCallback } from 'react';

// Default central fallback if everything else fails
const DEFAULT_LOCATION = {
  lat: 23.8311,
  lng: 90.4243,
  accuracy: 100,
  source: 'network',
  label: 'Dhaka (Khilkhet), Bangladesh',
};

export function useGeolocation() {
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [permissionState, setPermissionState] = useState('prompt');

  // Fetch real physical location via Free IP Geolocation API (HTTPS)
  const fetchRealIPLocation = useCallback(async () => {
    try {
      const res = await fetch('https://freeipapi.com/api/json');
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          const detectedLoc = {
            lat: data.latitude,
            lng: data.longitude,
            accuracy: 1000,
            source: 'network-ip',
            label: `${data.cityName || 'Dhaka'}, ${data.countryName || 'Bangladesh'}`,
            city: data.cityName,
            ip: data.ipAddress,
          };
          setLocation(detectedLoc);
          return detectedLoc;
        }
      }
    } catch (e) {
      console.warn('IP geolocation notice:', e?.message || e);
    }
    return DEFAULT_LOCATION;
  }, []);

  const getLocation = useCallback(() => {
    if (typeof window === 'undefined') return;

    setLoading(true);
    setError(null);

    // Try hardware device GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const gpsLoc = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            speed: pos.coords.speed,
            heading: pos.coords.heading,
            source: 'hardware-gps',
            label: 'Live Device GPS (High Accuracy)',
          };
          setLocation(gpsLoc);
          setLoading(false);
          setPermissionState('granted');
        },
        (err) => {
          // If browser GPS is denied or unavailable on desktop PC, use real network IP location
          fetchRealIPLocation().then(() => {
            setLoading(false);
          });
          if (err.code === err.PERMISSION_DENIED) {
            setPermissionState('denied');
            setError('Browser GPS denied. Using real network location.');
          } else {
            setError('Using real network location.');
          }
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 10000 }
      );
    } else {
      fetchRealIPLocation().then(() => {
        setLoading(false);
      });
    }
  }, [fetchRealIPLocation]);

  const watchLocation = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) return null;

    try {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            speed: pos.coords.speed,
            heading: pos.coords.heading,
            source: 'hardware-gps',
            label: 'Live Device GPS',
          });
          setPermissionState('granted');
        },
        () => {
          // Keep current real location
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
      );
      return watchId;
    } catch {
      return null;
    }
  }, []);

  const clearWatch = useCallback((watchId) => {
    if (watchId && typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const setManualLocation = useCallback((coords, label = 'Custom Pinned Location') => {
    if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
      setLocation({
        lat: coords.lat,
        lng: coords.lng,
        accuracy: 10,
        source: 'manual-pin',
        label,
      });
    }
  }, []);

  useEffect(() => {
    // Immediately attempt GPS + real IP detection on mount
    fetchRealIPLocation();
    getLocation();
  }, [fetchRealIPLocation, getLocation]);

  return {
    location,
    error,
    loading,
    permissionState,
    getLocation,
    watchLocation,
    clearWatch,
    setManualLocation,
  };
}
