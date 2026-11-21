'use client';
// src/hooks/useGeolocation.js — Precision Geolocation with High-Accuracy GPS, Nominatim Reverse Geocoding & Smart Fallback

import { useState, useEffect, useCallback, useRef } from 'react';

// Default fallback location (Dhaka Central)
const DEFAULT_FALLBACK = {
  lat: 23.8103,
  lng: 90.4125,
  accuracy: 9999,
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
          'Accept-Language': 'en',
          'User-Agent': 'AmbulanceFinderApp/1.0',
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

  // High-precision browser geolocation — ALWAYS fresh reading (maximumAge: 0)
  const getLocation = useCallback(
    async ({ forceFresh = true } = {}) => {
      if (typeof window === 'undefined') return null;

      if (!navigator.geolocation) {
        setError('Geolocation is not supported by your browser.');
        return DEFAULT_FALLBACK;
      }

      setLoading(true);
      setError(null);

      return new Promise((resolve) => {
        // Strategy A: High-accuracy GPS with 15s timeout, no cached reading
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            hasDetectedRef.current = true;
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            const gpsLoc = {
              lat,
              lng,
              accuracy: pos.coords.accuracy,
              speed: pos.coords.speed,
              heading: pos.coords.heading,
              source: 'device-gps',
              label: 'Live Device GPS',
            };

            setLocation(gpsLoc);
            setLoading(false);
            setError(null);
            setPermissionState('granted');

            // Reverse geocode in background (non-blocking)
            reverseGeocode(lat, lng).then((areaName) => {
              if (areaName) {
                setLocation((prev) => ({ ...prev, label: areaName }));
              }
            });

            resolve(gpsLoc);
          },
          (err) => {
            console.warn('High accuracy GPS error/timeout, trying WiFi/network fallback:', err.message);

            // Strategy B: Fallback to low-accuracy / WiFi / network triangulation
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                hasDetectedRef.current = true;
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;

                const wifiLoc = {
                  lat,
                  lng,
                  accuracy: pos.coords.accuracy,
                  source: 'device-wifi',
                  label: 'Device Location (WiFi/Network)',
                };

                setLocation(wifiLoc);
                setLoading(false);
                setError(null);
                setPermissionState('granted');

                reverseGeocode(lat, lng).then((areaName) => {
                  if (areaName) {
                    setLocation((prev) => ({ ...prev, label: areaName }));
                  }
                });

                resolve(wifiLoc);
              },
              (fallbackErr) => {
                setLoading(false);
                if (err.code === 1 || fallbackErr.code === 1) {
                  setPermissionState('denied');
                  setError('Location permission denied. Click on the map to set your location manually.');
                } else {
                  setError('GPS unavailable. Click on the map to set your location.');
                }
                resolve(null);
              },
              { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
            );
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      });
    },
    []
  );

  // Continuous device GPS watcher — high accuracy, no cached readings
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
            label: 'Live GPS',
          };
          setLocation(liveLoc);
          setPermissionState('granted');
        },
        (err) => {
          console.warn('watchPosition error:', err.message);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
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

  // Manually set exact location (via map click or quick preset) with automatic reverse geocode
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
      return manualLoc;
    }
    return null;
  }, []);

  // Auto-detect on mount — always get fresh GPS
  useEffect(() => {
    getLocation({ forceFresh: true });
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
