'use client';
// src/hooks/useGeolocation.js — Precision Geolocation with High-Accuracy GPS, Nominatim Reverse Geocoding & Smart Fallback

import { useState, useEffect, useCallback, useRef } from 'react';

// Default fallback location (Dhaka Central)
const DEFAULT_FALLBACK = {
  lat: 23.8103,
  lng: 90.4125,
  accuracy: 100,
  source: 'default',
  label: 'Dhaka Central, Bangladesh',
};

/**
 * Reverse geocode coordinates to human-readable street/area name using OpenStreetMap Nominatim
 */
export async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en,bn',
        },
      }
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const primary =
        addr.amenity ||
        addr.building ||
        addr.neighbourhood ||
        addr.suburb ||
        addr.residential ||
        addr.road ||
        '';
      const secondary =
        addr.town ||
        addr.city ||
        addr.county ||
        addr.state_district ||
        addr.state ||
        '';
      const formatted = [primary, secondary].filter(Boolean).join(', ');
      return formatted || data.display_name?.split(',').slice(0, 3).join(',') || 'Exact Device Location';
    }
  } catch (err) {
    console.warn('Reverse geocoding notice:', err.message);
  }
  return null;
}

export function useGeolocation() {
  const [location, setLocation] = useState(DEFAULT_FALLBACK);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [permissionState, setPermissionState] = useState('prompt');
  const hasDetectedRef = useRef(false);

  // 1. Fetch approximate location via IP only as initial seed if nothing else is available
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
            label: `${data.cityName || 'Dhaka'}, ${data.countryName || 'Bangladesh'} (Network IP)`,
            city: data.cityName,
            ip: data.ipAddress,
          };
          if (!hasDetectedRef.current) {
            setLocation(detectedLoc);
          }
          return detectedLoc;
        }
      }
    } catch (e) {
      console.warn('IP geolocation notice:', e?.message || e);
    }
    return DEFAULT_FALLBACK;
  }, []);

  // 2. High-precision browser geolocation with forceFresh option
  const getLocation = useCallback(
    async ({ forceFresh = false } = {}) => {
      if (typeof window === 'undefined') return null;

      // Check saved location: if user explicitly pinned/selected a location, use it;
      // otherwise use cached location as instant placeholder while fetching fresh GPS.
      let savedFallback = null;
      if (!forceFresh) {
        try {
          const saved = localStorage.getItem('user_last_location');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed?.lat && parsed?.lng) {
              setLocation(parsed);
              savedFallback = parsed;
              if (parsed.source === 'manual-pin') {
                return parsed;
              }
            }
          }
        } catch {}
      }

      if (!navigator.geolocation) {
        setError('Geolocation is not supported by your browser.');
        const ipLoc = await fetchIPLocation();
        return ipLoc;
      }

      setLoading(true);
      setError(null);

      return new Promise((resolve) => {
        // Strategy A: High-accuracy GPS with 12s timeout and fresh reading (maximumAge: 0)
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            hasDetectedRef.current = true;
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            // Reverse geocode to get real neighborhood/area name
            const areaName = await reverseGeocode(lat, lng);

            const gpsLoc = {
              lat,
              lng,
              accuracy: pos.coords.accuracy,
              speed: pos.coords.speed,
              heading: pos.coords.heading,
              source: 'device-gps',
              label: areaName || 'Exact Live Device Location (GPS)',
            };

            setLocation(gpsLoc);
            setLoading(false);
            setError(null);
            setPermissionState('granted');
            try {
              localStorage.setItem('user_last_location', JSON.stringify(gpsLoc));
            } catch {}
            resolve(gpsLoc);
          },
          (err) => {
            console.warn('High accuracy GPS error/timeout, trying WiFi/network fallback:', err.message);

            // Strategy B: Fallback to low-accuracy / WiFi / network triangulation
            navigator.geolocation.getCurrentPosition(
              async (pos) => {
                hasDetectedRef.current = true;
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;

                const areaName = await reverseGeocode(lat, lng);

                const wifiLoc = {
                  lat,
                  lng,
                  accuracy: pos.coords.accuracy,
                  source: 'device-wifi',
                  label: areaName || 'Exact Device Location (WiFi / Network)',
                };

                setLocation(wifiLoc);
                setLoading(false);
                setError(null);
                setPermissionState('granted');
                try {
                  localStorage.setItem('user_last_location', JSON.stringify(wifiLoc));
                } catch {}
                resolve(wifiLoc);
              },
              async (fallbackErr) => {
                setLoading(false);
                if (err.code === 1 || fallbackErr.code === 1) {
                  setPermissionState('denied');
                  setError('Location permission denied in browser. Click anywhere on map to set your location.');
                } else {
                  setError('GPS unavailable on this device. Using network location or select an area.');
                }
                if (!savedFallback) {
                  const ipLoc = await fetchIPLocation();
                  resolve(ipLoc);
                } else {
                  resolve(savedFallback);
                }
              },
              { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 }
            );
          },
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
        );
      });
    },
    [fetchIPLocation]
  );

  // 3. Continuous device GPS watcher
  const watchLocation = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) return null;

    try {
      const watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          hasDetectedRef.current = true;
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const liveLoc = {
            lat,
            lng,
            accuracy: pos.coords.accuracy,
            speed: pos.coords.speed,
            heading: pos.coords.heading,
            source: 'device-gps-live',
            label: 'Exact Live GPS',
          };
          setLocation(liveLoc);
          setPermissionState('granted');
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

  // 4. Manually set exact location (via map click or quick preset) with automatic reverse geocode
  const setManualLocation = useCallback(async (coords, customLabel = null) => {
    if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
      let finalLabel = customLabel;

      if (!finalLabel || finalLabel === 'Pinned by You') {
        finalLabel = (await reverseGeocode(coords.lat, coords.lng)) || 'Pinned Location';
      }

      const manualLoc = {
        lat: coords.lat,
        lng: coords.lng,
        accuracy: 5,
        source: 'manual-pin',
        label: finalLabel,
      };

      hasDetectedRef.current = true;
      setLocation(manualLoc);
      setError(null);
      try {
        localStorage.setItem('user_last_location', JSON.stringify(manualLoc));
      } catch {}
      return manualLoc;
    }
    return null;
  }, []);

  useEffect(() => {
    getLocation({ forceFresh: false });
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
