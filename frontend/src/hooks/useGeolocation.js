'use client';
// src/hooks/useGeolocation.js — Precision Geolocation with High-Accuracy GPS, WiFi Triangulation & IP Fallback

import { useState, useEffect, useCallback, useRef } from 'react';

// Default fallback location (Dhaka Central)
const DEFAULT_FALLBACK = {
  lat: 23.8103,
  lng: 90.4125,
  accuracy: 500,
  source: 'default',
  label: 'Dhaka Central, Bangladesh',
};

export function useGeolocation() {
  const [location, setLocation] = useState(DEFAULT_FALLBACK);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [permissionState, setPermissionState] = useState('prompt');
  const hasDetectedRef = useRef(false);

  // 1. Fetch real physical location via IP (HTTPS)
  const fetchIPLocation = useCallback(async () => {
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
          // Only use IP if GPS has not already provided exact coordinates
          if (!hasDetectedRef.current) {
            setLocation(detectedLoc);
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem('user_last_location', JSON.stringify(detectedLoc));
              } catch {}
            }
          }
          return detectedLoc;
        }
      }
    } catch (e) {
      console.warn('IP geolocation notice:', e?.message || e);
    }
    return DEFAULT_FALLBACK;
  }, []);

  // 2. High-precision browser geolocation with double-fallback strategy
  const getLocation = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Check if user previously saved a location
    try {
      const saved = localStorage.getItem('user_last_location');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.lat && parsed?.lng) {
          setLocation(parsed);
        }
      }
    } catch {}

    if (!navigator.geolocation) {
      setError('Geolocation not supported by browser.');
      fetchIPLocation();
      return;
    }

    setLoading(true);
    setError(null);

    // Try Strategy A: High accuracy GPS
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        hasDetectedRef.current = true;
        const gpsLoc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
          source: 'device-gps',
          label: 'Exact Live Device Location (GPS)',
        };
        setLocation(gpsLoc);
        setLoading(false);
        setPermissionState('granted');
        try {
          localStorage.setItem('user_last_location', JSON.stringify(gpsLoc));
        } catch {}
      },
      (err) => {
        // Strategy B: Fallback to low-accuracy / WiFi triangulation (works fast on Windows/desktops)
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            hasDetectedRef.current = true;
            const wifiLoc = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              source: 'device-wifi',
              label: 'Exact Device Location (WiFi / Network)',
            };
            setLocation(wifiLoc);
            setLoading(false);
            setPermissionState('granted');
            try {
              localStorage.setItem('user_last_location', JSON.stringify(wifiLoc));
            } catch {}
          },
          () => {
            // Strategy C: Fall back to IP-based location
            fetchIPLocation().then(() => {
              setLoading(false);
            });
            if (err.code === err.PERMISSION_DENIED) {
              setPermissionState('denied');
              setError('Location permission denied. Click map to pick exact location.');
            } else {
              setError('GPS unavailable on this device. Using network location.');
            }
          },
          { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 }
        );
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 10000 }
    );
  }, [fetchIPLocation]);

  // 3. Continuous device GPS watcher
  const watchLocation = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) return null;

    try {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          hasDetectedRef.current = true;
          const liveLoc = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            speed: pos.coords.speed,
            heading: pos.coords.heading,
            source: 'device-gps-live',
            label: 'Exact Live GPS',
          };
          setLocation(liveLoc);
          setPermissionState('granted');
          try {
            localStorage.setItem('user_last_location', JSON.stringify(liveLoc));
          } catch {}
        },
        () => {},
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 5000 }
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

  // 4. Manually set exact location (via map click or search)
  const setManualLocation = useCallback((coords, label = 'Exact Pinned Location') => {
    if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
      const manualLoc = {
        lat: coords.lat,
        lng: coords.lng,
        accuracy: 5,
        source: 'manual-pin',
        label,
      };
      hasDetectedRef.current = true;
      setLocation(manualLoc);
      try {
        localStorage.setItem('user_last_location', JSON.stringify(manualLoc));
      } catch {}
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
