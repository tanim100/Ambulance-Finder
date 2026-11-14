'use client';
// src/hooks/useGeolocation.js — Resilient Geolocation with GPS, IP fallback & Manual Pin

import { useState, useEffect, useCallback } from 'react';

// Default central location (Dhaka, Bangladesh)
const DEFAULT_LOCATION = {
  lat: 23.8103,
  lng: 90.4125,
  accuracy: 1000,
  source: 'default',
  label: 'Dhaka, Bangladesh (Default)',
};

export function useGeolocation() {
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [permissionState, setPermissionState] = useState('prompt');

  // Fetch approximate location by IP fallback if browser GPS is unavailable on desktop
  const fetchIPLocation = useCallback(async () => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (res.ok) {
        const data = await res.json();
        if (data.latitude && data.longitude) {
          const ipLoc = {
            lat: Number(data.latitude),
            lng: Number(data.longitude),
            accuracy: 5000,
            source: 'ip',
            label: `${data.city || 'Dhaka'}, ${data.country_name || 'Bangladesh'} (Network)`,
          };
          setLocation(ipLoc);
          return ipLoc;
        }
      }
    } catch {
      // Keep default
    }
    return DEFAULT_LOCATION;
  }, []);

  const getLocation = useCallback(() => {
    if (typeof window === 'undefined') return;

    if (!navigator.geolocation) {
      setError('Geolocation not supported by browser.');
      fetchIPLocation();
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const gpsLoc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
          source: 'gps',
          label: 'Live GPS Location',
        };
        setLocation(gpsLoc);
        setLoading(false);
        setPermissionState('granted');
      },
      (err) => {
        let msg = 'Could not get device GPS.';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            msg = 'GPS permission denied. Using network location.';
            setPermissionState('denied');
            break;
          case err.POSITION_UNAVAILABLE:
            msg = 'GPS unavailable on this device. Using network location.';
            break;
          case err.TIMEOUT:
            msg = 'GPS timed out. Using network location.';
            break;
          default:
            msg = 'Unable to fetch GPS. Using network location.';
        }
        setError(msg);
        setLoading(false);
        // Fall back to IP-based location so user is never left without a map location
        fetchIPLocation();
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 30000 }
    );
  }, [fetchIPLocation]);

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
            source: 'gps',
            label: 'Live GPS Location',
          });
          setPermissionState('granted');
        },
        () => {
          // Keep current location on watch failure
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
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

  const setManualLocation = useCallback((coords, label = 'Custom Selected Location') => {
    if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
      setLocation({
        lat: coords.lat,
        lng: coords.lng,
        accuracy: 10,
        source: 'manual',
        label,
      });
    }
  }, []);

  useEffect(() => {
    getLocation();
  }, [getLocation]);

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
