'use client';
// src/app/(driver)/active/page.jsx — Driver Active Console with Real Device GPS Streaming to Firebase

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Phone, MapPin, ChevronLeft, ChevronUp, ChevronDown, Radio, Play, Pause, RefreshCw, Send, CheckCircle2, Navigation, Maximize2, Minimize2 } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { driverAPI } from '@/lib/api';
import { useGeolocation } from '@/hooks/useGeolocation';
import { emitDriverLocation } from '@/lib/socket';
import { updateAmbulanceLocation, testFirebaseConnection } from '@/lib/firebaseTracking';
import { rtdb } from '@/lib/firebase';
import { ref, onValue, off } from 'firebase/database';

const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 rounded-2xl flex items-center justify-center">
      <p className="text-sm text-gray-500">Loading map...</p>
    </div>
  ),
});

const TRIP_STATUSES = ['Accepted', 'En Route', 'Arrived', 'Completed'];

const ACTIVE_TRIP = {
  _id: 'active_trip',
  status: 'En Route',
  patientName: 'Jane Smith',
  emergencyType: 'Cardiac',
  ambulanceType: 'Advanced Life Support',
  vehicleNumber: 'DHA-AMB-4421',
  pickupLocation: 'House 12, Dhanmondi, Dhaka',
  destination: 'Dhaka Medical College Hospital',
  userPhone: '+880 1700-111111',
  userLocation: { lat: 23.8103, lng: 90.4125 },
};

export default function DriverActivePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tripIdParam = searchParams.get('id') || 'active_trip';

  const { location: geoLoc, watchLocation, clearWatch, getLocation, loading: geoLoading } = useGeolocation();
  const [trip, setTrip] = useState({ ...ACTIVE_TRIP, _id: tripIdParam });
  const [updating, setUpdating] = useState(false);
  const [completed, setCompleted] = useState(false);
  const watchIdRef = useRef(null);

  // Driver current coordinates — start with Dhaka center; updated by real GPS
  const [activeLoc, setActiveLoc] = useState({
    lat: 23.8103,
    lng: 90.4125,
    speed: 0,
    heading: 0,
    source: 'Default (GPS pending...)',
  });

  const [isSimulating, setIsSimulating] = useState(false);
  const [shutterState, setShutterState] = useState('half'); // 'collapsed' | 'half' | 'expanded'
  const touchStartY = useRef(0);
  const [firebaseStatus, setFirebaseStatus] = useState({
    connected: false,
    lastSyncTime: null,
    provider: 'Connecting...',
    error: null,
  });

  const simulationTimerRef = useRef(null);
  const autoUploadTimerRef = useRef(null);

  const currentIdx = TRIP_STATUSES.indexOf(trip.status);

  // Test Firebase on mount + start continuous GPS watch
  useEffect(() => {
    testFirebaseConnection().then((res) => {
      if (res.ok) {
        setFirebaseStatus((prev) => ({
          ...prev,
          connected: true,
          provider: res.provider || 'Firebase RTDB',
        }));
      }
    });

    // Start continuous GPS watch immediately on mount
    if (navigator?.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0,
            heading: pos.coords.heading || 0,
            source: 'Device GPS (High Accuracy)',
          };
          setActiveLoc(loc);
          try { localStorage.setItem('driver_last_location', JSON.stringify(loc)); } catch {}
        },
        () => {
          // Try low-accuracy fallback
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const loc = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                speed: 0,
                heading: 0,
                source: 'Device Location (Network)',
              };
              setActiveLoc(loc);
              try { localStorage.setItem('driver_last_location', JSON.stringify(loc)); } catch {}
            },
            () => {
              // Load last known location from storage
              try {
                const saved = localStorage.getItem('driver_last_location');
                if (saved) {
                  const p = JSON.parse(saved);
                  if (p?.lat && p?.lng) setActiveLoc({ ...p, source: 'Last Known GPS' });
                }
              } catch {}
            },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 30000 }
          );
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );

      // Continuous watch for live updates
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          if (!isSimulating) {
            const loc = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0,
              heading: pos.coords.heading || 0,
              source: 'Live Device GPS',
            };
            setActiveLoc(loc);
            try { localStorage.setItem('driver_last_location', JSON.stringify(loc)); } catch {}
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    }

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen to patient exact location from Firebase
  useEffect(() => {
    if (!rtdb) return;
    try {
      const patientRef = ref(rtdb, 'live_tracking/active_trip/patient');
      const unsub = onValue(patientRef, (snap) => {
        const val = snap.val();
        if (val && typeof val.patientLat === 'number' && typeof val.patientLng === 'number') {
          setTrip((prev) => ({
            ...prev,
            userLocation: { lat: val.patientLat, lng: val.patientLng },
            pickupLocation: val.pickupAddress || prev.pickupLocation,
          }));
        }
      });
      return () => off(patientRef);
    } catch {}
  }, []);

  // Update activeLoc whenever device hardware GPS or location arrives
  useEffect(() => {
    if (geoLoc && typeof geoLoc.lat === 'number' && typeof geoLoc.lng === 'number' && !isSimulating) {
      setActiveLoc((prev) => ({
        ...prev,
        lat: geoLoc.lat,
        lng: geoLoc.lng,
        speed: geoLoc.speed ? Math.round(geoLoc.speed * 3.6) : (prev.speed || 40),
        heading: geoLoc.heading || prev.heading || 0,
        source: geoLoc.label || 'Real Device Location',
      }));
    }
  }, [geoLoc, isSimulating]);

  // Core function to broadcast real location to Firebase & Socket
  const broadcastLocation = useCallback(async (coords = activeLoc, currentStatus = trip.status) => {
    if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') return;

    // 1. Socket emit
    emitDriverLocation(coords.lat, coords.lng);

    // 2. Real-time Firebase upload
    try {
      const res = await updateAmbulanceLocation(trip._id, {
        lat: coords.lat,
        lng: coords.lng,
        speed: coords.speed || 35,
        heading: coords.heading || 0,
        status: currentStatus,
        driverName: 'Assigned Driver',
        vehicleNumber: trip.vehicleNumber || 'DHA-AMB-4421',
        source: coords.source || 'Real Live Device Network/GPS',
      });

      setFirebaseStatus({
        connected: Boolean(res.success),
        lastSyncTime: new Date().toLocaleTimeString(),
        provider: res.provider || 'Firebase Realtime DB',
        error: null,
      });
    } catch (err) {
      console.error('Firebase upload error:', err);
      setFirebaseStatus((prev) => ({ ...prev, error: err.message }));
    }
  }, [activeLoc, trip._id, trip.status, trip.vehicleNumber]);

  // Push to Firebase on activeLoc or status change
  useEffect(() => {
    broadcastLocation(activeLoc, trip.status);
  }, [activeLoc, trip.status, broadcastLocation]);

  // Continuous background sync every 3 seconds
  useEffect(() => {
    autoUploadTimerRef.current = setInterval(() => {
      broadcastLocation(activeLoc, trip.status);
    }, 3000);

    return () => clearInterval(autoUploadTimerRef.current);
  }, [activeLoc, trip.status, broadcastLocation]);

  // Simulated GPS movement loop towards the patient
  useEffect(() => {
    if (isSimulating) {
      simulationTimerRef.current = setInterval(() => {
        setActiveLoc((prev) => {
          const target = trip.userLocation || { lat: 23.8103, lng: 90.4125 };
          const step = 0.0006;
          const dLat = target.lat - prev.lat;
          const dLng = target.lng - prev.lng;
          const dist = Math.sqrt(dLat * dLat + dLng * dLng);

          if (dist < 0.0004) {
            setIsSimulating(false);
            return prev;
          }

          return {
            lat: prev.lat + (dLat / dist) * step,
            lng: prev.lng + (dLng / dist) * step,
            speed: Math.round(35 + Math.random() * 10),
            heading: Math.round((Math.atan2(dLng, dLat) * 180) / Math.PI),
            source: 'Simulated Movement Demo',
          };
        });
      }, 2000);
    } else {
      clearInterval(simulationTimerRef.current);
    }

    return () => clearInterval(simulationTimerRef.current);
  }, [isSimulating, trip.userLocation]);

  const handleNextStatus = async () => {
    if (currentIdx >= TRIP_STATUSES.length - 1) return;
    const nextStatus = TRIP_STATUSES[currentIdx + 1];
    setUpdating(true);
    try {
      await driverAPI.updateBookingStatus(trip._id, nextStatus);
    } catch {}
    setTrip((t) => ({ ...t, status: nextStatus }));

    // Update Firebase immediately
    broadcastLocation(activeLoc, nextStatus);

    if (nextStatus === 'Completed') setCompleted(true);
    setUpdating(false);
  };

  const getActionLabel = () => {
    const next = TRIP_STATUSES[currentIdx + 1];
    const labels = {
      'En Route': '🚑 Mark as En Route',
      'Arrived': '📍 Mark as Arrived',
      'Completed': '✅ Complete Trip',
    };
    return labels[next] || 'Update Status';
  };

  // Force get live device GPS
  const handleGetRealDeviceGPS = () => {
    setIsSimulating(false);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newLoc = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0,
            heading: pos.coords.heading || 0,
            source: 'Device Hardware GPS (High Accuracy)',
          };
          setActiveLoc(newLoc);
          broadcastLocation(newLoc, trip.status);
          try { localStorage.setItem('driver_last_location', JSON.stringify(newLoc)); } catch {}
        },
        (err) => {
          // Fallback: low accuracy
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const newLoc = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                speed: 0,
                heading: 0,
                source: 'Device Location (Network/WiFi)',
              };
              setActiveLoc(newLoc);
              broadcastLocation(newLoc, trip.status);
              try { localStorage.setItem('driver_last_location', JSON.stringify(newLoc)); } catch {}
            },
            () => { getLocation(); },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 }
          );
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    } else {
      getLocation();
    }
  };

  // Map click handler to set ambulance location
  const handleMapClick = (coords) => {
    const newLoc = {
      lat: coords.lat,
      lng: coords.lng,
      speed: 38,
      heading: 0,
      source: 'Pinned Manually on Map',
    };
    setActiveLoc(newLoc);
    broadcastLocation(newLoc, trip.status);
  };

  const handleRestartTrip = () => {
    const initialStatus = 'Accepted';
    setCompleted(false);
    setTrip((t) => ({ ...t, status: initialStatus }));
    broadcastLocation(activeLoc, initialStatus);
  };

  if (completed) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />

        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8 text-center animate-in fade-in duration-200">
            {/* Celebration Icon */}
            <div className="relative inline-flex items-center justify-center mb-4">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-4xl shadow-inner">
                🎉
              </div>
              <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1.5 rounded-full shadow-md">
                <CheckCircle2 size={18} />
              </span>
            </div>

            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              Trip Completed!
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Patient has been transported safely.
            </p>

            {/* Trip Details Summary Card */}
            <div className="mt-6 bg-gray-50 rounded-2xl p-4 text-left border border-gray-100 space-y-2.5 text-xs sm:text-sm">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200/60">
                <span className="text-gray-500">Patient:</span>
                <span className="font-bold text-gray-900">{trip.patientName}</span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-gray-500 shrink-0">Pickup:</span>
                <span className="font-medium text-gray-800 text-right truncate">{trip.pickupLocation}</span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-gray-500 shrink-0">Hospital:</span>
                <span className="font-medium text-emerald-700 text-right truncate font-semibold">
                  {trip.destination || 'Dhaka Medical College Hospital'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-200/60">
                <span className="text-gray-500">Ambulance:</span>
                <span className="font-mono font-bold text-gray-800">{trip.vehicleNumber}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleRestartTrip}
                className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} />
                <span>Start New Trip (Reset Trip)</span>
              </button>

              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden relative">
      <Navbar />

      {/* Header with Driver Quick Controls and Shutter Toggle */}
      <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center justify-between gap-3 z-10 shrink-0">
        <div className="flex items-center gap-2.5">
          <button onClick={() => router.push('/dashboard')} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="font-bold text-gray-900 text-sm sm:text-base leading-tight">Driver Active Navigation</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-emerald-600 font-semibold">{trip.status}</span>
              <span className="text-gray-300">•</span>
              <span className="text-xs font-mono text-gray-500 font-semibold">{activeLoc ? `${activeLoc.speed} km/h` : '— km/h'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Shutter Toggle Button */}
          <button
            type="button"
            onClick={() => setShutterState((prev) => (prev === 'collapsed' ? 'half' : 'collapsed'))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm border ${
              shutterState === 'collapsed'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
            }`}
            title="Toggle Drawer"
          >
            {shutterState === 'collapsed' ? (
              <>
                <ChevronUp size={15} />
                <span>Expand Sheet</span>
              </>
            ) : (
              <>
                <ChevronDown size={15} />
                <span>Collapse Sheet (Full Map)</span>
              </>
            )}
          </button>
          <Badge status={trip.emergencyType.toLowerCase()} label={trip.emergencyType} />
        </div>
      </div>

      {/* Main Screen Container: Full Map Area */}
      <div className="flex-1 relative w-full h-full min-h-0 overflow-hidden">
        {/* Full-view Leaflet Map */}
        <div className="absolute inset-0 z-0">
          <MapView
            center={activeLoc ? [activeLoc.lat, activeLoc.lng] : (trip.userLocation ? [trip.userLocation.lat, trip.userLocation.lng] : [23.8103, 90.4125])}
            userLocation={trip.userLocation}
            driverLocation={activeLoc}
            onLocationSelect={handleMapClick}
            route={activeLoc && trip.userLocation
              ? [[activeLoc.lat, activeLoc.lng], [trip.userLocation.lat, trip.userLocation.lng]]
              : null
            }
            height="100%"
          />
        </div>

        {/* Floating Quick Action Overlay on Map (Top Right) */}
        <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-2 pointer-events-auto">
          {/* Shutter Toggle Floating Pill */}
          <button
            type="button"
            onClick={() => setShutterState((prev) => (prev === 'collapsed' ? 'half' : 'collapsed'))}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/95 backdrop-blur-md text-gray-800 shadow-xl border border-gray-200 hover:bg-white active:scale-95 transition-all"
          >
            {shutterState === 'collapsed' ? (
              <>
                <ChevronUp size={15} className="text-emerald-600" />
                <span>📋 Show Sheet</span>
              </>
            ) : (
              <>
                <Maximize2 size={14} className="text-blue-600" />
                <span>🗺️ Full Map (Collapse Sheet)</span>
              </>
            )}
          </button>

          {/* Quick Hardware GPS Detect */}
          <button
            type="button"
            onClick={handleGetRealDeviceGPS}
            disabled={geoLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/95 backdrop-blur-md text-emerald-700 shadow-lg border border-emerald-200 hover:bg-emerald-50 active:scale-95 transition-all"
            title="Detect Exact GPS"
          >
            <Navigation size={13} className={geoLoading ? 'animate-spin' : ''} />
            <span>GPS Locate</span>
          </button>
        </div>

        {/* ── Collapsible & Draggable Bottom Sheet / Drawer ── */}
        <div
          className={`absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-3xl shadow-[0_-12px_40px_rgba(0,0,0,0.22)] border-t border-gray-200 flex flex-col transition-all duration-300 ease-out ${
            shutterState === 'collapsed'
              ? 'h-24 sm:h-20'
              : shutterState === 'expanded'
              ? 'h-[85%]'
              : 'h-[50%]'
          }`}
        >
          {/* Shutter Grab Handle & Quick Row */}
          <div
            className="w-full pt-2.5 pb-2 px-4 cursor-pointer select-none shrink-0 flex flex-col border-b border-gray-100 bg-white hover:bg-gray-50/70 rounded-t-3xl transition-colors"
            onClick={() => {
              setShutterState((prev) => {
                if (prev === 'collapsed') return 'half';
                if (prev === 'half') return 'expanded';
                return 'collapsed';
              });
            }}
            onTouchStart={(e) => {
              touchStartY.current = e.touches[0].clientY;
            }}
            onTouchEnd={(e) => {
              const diff = e.changedTouches[0].clientY - touchStartY.current;
              if (diff > 35) {
                // Dragged down -> lower/collapse shutter
                setShutterState((prev) => (prev === 'expanded' ? 'half' : 'collapsed'));
              } else if (diff < -35) {
                // Dragged up -> raise/expand shutter
                setShutterState((prev) => (prev === 'collapsed' ? 'half' : 'expanded'));
              }
            }}
          >
            {/* Grab Pill */}
            <div className="w-12 h-1.5 rounded-full bg-gray-300 mx-auto mb-2" />

            {/* Top Bar Summary Row */}
            <div className="w-full flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                <span className="font-bold text-gray-900 text-sm truncate">
                  {trip.patientName}
                </span>
                <span className="hidden xs:inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                  {trip.status}
                </span>
                <span className="text-gray-400 text-xs truncate hidden sm:inline">
                  • {trip.pickupLocation}
                </span>
              </div>

              {/* Shutter Action & Toggle Controls */}
              <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                {/* Collapsed mode quick call button */}
                <a
                  href={`tel:${trip.userPhone}`}
                  className="w-8 h-8 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center transition-colors shadow-sm"
                  title="Call Patient"
                >
                  <Phone size={14} />
                </a>

                {/* Collapsed mode quick update status */}
                {shutterState === 'collapsed' && currentIdx < TRIP_STATUSES.length - 1 && (
                  <button
                    type="button"
                    onClick={handleNextStatus}
                    disabled={updating}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white shadow-sm flex items-center gap-1 transition-all"
                  >
                    <span>{trip.status === 'Accepted' ? 'En Route' : trip.status === 'En Route' ? 'Arrived' : 'Complete'}</span>
                  </button>
                )}

                {/* Multi-state Shutter Button */}
                <button
                  type="button"
                  onClick={() => setShutterState((prev) => (prev === 'collapsed' ? 'half' : 'collapsed'))}
                  className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                  title={shutterState === 'collapsed' ? 'Expand Sheet' : 'Collapse Sheet'}
                >
                  {shutterState === 'collapsed' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </div>
            </div>
          </div>

          {/* Shutter Scrollable Content (visible when half or expanded) */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-8">
            {/* Live Firebase Broadcast Console */}
            <div className="rounded-2xl p-3.5 bg-white border-2 border-emerald-500/40 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-bold text-emerald-800 tracking-wide uppercase">
                    Firebase Realtime GPS: {firebaseStatus.connected ? 'Streaming Live' : 'Connecting'}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-gray-500">
                  {firebaseStatus.lastSyncTime ? `Uploaded: ${firebaseStatus.lastSyncTime}` : 'Connecting...'}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-600 mb-2">
                <span>Firebase Path: <strong className="font-mono text-emerald-700">live_tracking/active_trip</strong></span>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                  {activeLoc.source || 'Real Location'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100">
                <div>
                  <span className="text-gray-400 block text-[10px]">LATITUDE</span>
                  <span className="font-bold text-emerald-900">{activeLoc ? activeLoc.lat.toFixed(5) : 'Detecting...'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">LONGITUDE</span>
                  <span className="font-bold text-emerald-900">{activeLoc ? activeLoc.lng.toFixed(5) : 'Detecting...'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">SPEED</span>
                  <span className="font-bold text-emerald-900">{activeLoc ? `${activeLoc.speed} km/h` : '— km/h'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">STATUS</span>
                  <span className="font-bold text-emerald-700">{trip.status}</span>
                </div>
              </div>

              {/* GPS Controls: Real Device vs Demo */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleGetRealDeviceGPS}
                    disabled={geoLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                  >
                    <Navigation size={13} className={geoLoading ? 'animate-spin' : ''} />
                    📍 Detect My Exact GPS
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsSimulating(!isSimulating)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isSimulating
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                    }`}
                  >
                    {isSimulating ? (
                      <>
                        <Pause size={12} /> Pause Test Drive
                      </>
                    ) : (
                      <>
                        <Play size={12} /> Test Drive Simulation
                      </>
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => broadcastLocation(activeLoc, trip.status)}
                  className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-800"
                >
                  <Send size={11} /> Push Now
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">
                Tip: You can also click anywhere directly on the map above to move the ambulance pin!
              </p>
            </div>

            {/* Status progress */}
            <Card>
              <div className="flex items-center justify-between mb-1">
                {TRIP_STATUSES.map((status, idx) => (
                  <div key={status} className="flex items-center">
                    <div className={[
                      'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                      idx < currentIdx ? 'bg-green-500 text-white' :
                      idx === currentIdx ? 'bg-primary-600 text-white ring-4 ring-primary-100' :
                      'bg-gray-100 text-gray-400',
                    ].join(' ')}>
                      {idx < currentIdx ? '✓' : idx + 1}
                    </div>
                    {idx < TRIP_STATUSES.length - 1 && (
                      <div className={`h-0.5 w-8 sm:w-12 ${idx < currentIdx ? 'bg-green-400' : 'bg-gray-200'}`} />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between">
                {TRIP_STATUSES.map((s) => (
                  <p key={s} className="text-xs text-gray-400 text-center">{s}</p>
                ))}
              </div>
            </Card>

            {/* Patient card */}
            <Card>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Patient</p>
                  <p className="font-bold text-gray-900 text-lg">{trip.patientName}</p>
                </div>
                <a
                  href={`tel:${trip.userPhone}`}
                  className="w-11 h-11 bg-green-500 rounded-xl flex items-center justify-center text-white hover:bg-green-600 transition-colors"
                >
                  <Phone size={20} />
                </a>
              </div>

              <div className="space-y-2 text-sm text-gray-600 bg-gray-50 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="text-primary-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Pickup</p>
                    <p>{trip.pickupLocation}</p>
                  </div>
                </div>
                {trip.destination && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm mt-0.5 flex-shrink-0">🏥</span>
                    <div>
                      <p className="text-xs text-gray-400">Destination</p>
                      <p>{trip.destination}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Action button */}
            {currentIdx < TRIP_STATUSES.length - 1 && (
              <Button
                fullWidth
                size="xl"
                loading={updating}
                onClick={handleNextStatus}
                className="shadow-lg shadow-primary-200"
              >
                {getActionLabel()}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
  
