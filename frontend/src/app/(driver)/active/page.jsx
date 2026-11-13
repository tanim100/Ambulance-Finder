'use client';
// src/app/(driver)/active/page.jsx

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Phone, MapPin, ChevronLeft, Radio, Play, Pause, RefreshCw } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { driverAPI } from '@/lib/api';
import { useGeolocation } from '@/hooks/useGeolocation';
import { emitDriverLocation } from '@/lib/socket';
import { updateAmbulanceLocation } from '@/lib/firebaseTracking';
import { isConfigured } from '@/lib/firebase';

const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 rounded-2xl flex items-center justify-center">
      <p className="text-sm text-gray-500">Loading map...</p>
    </div>
  ),
});

const TRIP_STATUSES = ['Accepted', 'En Route', 'Arrived', 'Completed'];

const MOCK_TRIP = {
  _id: 'MOCK-001',
  status: 'Accepted',
  patientName: 'Jane Smith',
  emergencyType: 'Cardiac',
  ambulanceType: 'Advanced',
  pickupLocation: 'House 12, Dhanmondi, Dhaka',
  destination: 'Dhaka Medical College',
  userPhone: '+880 1700-111111',
  userLocation: { lat: 23.8103, lng: 90.4125 },
};

export default function DriverActivePage() {
  const router = useRouter();
  const { location: geoLoc, watchLocation, clearWatch } = useGeolocation();
  const [trip, setTrip] = useState(MOCK_TRIP);
  const [updating, setUpdating] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Driver current coordinates (GPS or simulated)
  const [activeLoc, setActiveLoc] = useState({
    lat: 23.7983,
    lng: 90.4045,
    speed: 38,
    heading: 45,
  });

  const [isSimulating, setIsSimulating] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const simulationTimerRef = useRef(null);

  const currentIdx = TRIP_STATUSES.indexOf(trip.status);

  // Watch real device GPS
  useEffect(() => {
    const watchId = watchLocation();
    return () => clearWatch(watchId);
  }, [watchLocation, clearWatch]);

  // Sync real GPS if available and not manually simulating
  useEffect(() => {
    if (geoLoc && !isSimulating) {
      setActiveLoc((prev) => ({
        ...prev,
        lat: geoLoc.lat,
        lng: geoLoc.lng,
      }));
    }
  }, [geoLoc, isSimulating]);

  // Broadcast to Firebase and Socket whenever activeLoc or trip.status changes
  useEffect(() => {
    if (!activeLoc) return;

    // 1. Socket emit
    emitDriverLocation(activeLoc.lat, activeLoc.lng);

    // 2. Firebase live location push
    updateAmbulanceLocation(trip._id, {
      lat: activeLoc.lat,
      lng: activeLoc.lng,
      speed: activeLoc.speed || 35,
      heading: activeLoc.heading || 0,
      status: trip.status,
    }).then(() => {
      setLastSyncTime(new Date().toLocaleTimeString());
    });
  }, [activeLoc, trip._id, trip.status]);

  // Simulation loop for testing without physical GPS movement
  useEffect(() => {
    if (isSimulating) {
      simulationTimerRef.current = setInterval(() => {
        setActiveLoc((prev) => {
          const target = trip.userLocation || { lat: 23.8103, lng: 90.4125 };
          const step = 0.0007; // ~70 meters per tick
          const dLat = target.lat - prev.lat;
          const dLng = target.lng - prev.lng;
          const dist = Math.sqrt(dLat * dLat + dLng * dLng);

          if (dist < 0.0005) {
            setIsSimulating(false);
            return prev;
          }

          return {
            lat: prev.lat + (dLat / dist) * step,
            lng: prev.lng + (dLng / dist) * step,
            speed: Math.round(30 + Math.random() * 15),
            heading: Math.round((Math.atan2(dLng, dLat) * 180) / Math.PI),
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

    // Update Firebase immediately with new status
    updateAmbulanceLocation(trip._id, {
      lat: activeLoc.lat,
      lng: activeLoc.lng,
      speed: activeLoc.speed,
      status: nextStatus,
    });

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

  if (completed) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Trip Completed!</h2>
        <p className="text-gray-500 mb-8">Great job! The patient has been delivered safely.</p>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 w-full max-w-sm mb-6">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-black text-green-600">৳1,000</p>
              <p className="text-xs text-gray-500">Trip Earning</p>
            </div>
            <div>
              <p className="text-2xl font-black text-primary-600">4.9⭐</p>
              <p className="text-xs text-gray-500">Your Rating</p>
            </div>
          </div>
        </div>
        <Button fullWidth onClick={() => router.push('/driver/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar />

      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.push('/driver/dashboard')} className="p-1.5 rounded-lg hover:bg-gray-100">
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-gray-900">Active Trip #{trip._id}</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-green-600 font-medium">{trip.status}</span>
          </div>
        </div>
        <Badge status={trip.emergencyType.toLowerCase()} label={trip.emergencyType} />
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Map */}
        <div className="h-56 mx-4 mt-4 rounded-2xl overflow-hidden shadow-sm border border-gray-200">
          <MapView
            center={trip.userLocation ? [trip.userLocation.lat, trip.userLocation.lng] : [23.8103, 90.4125]}
            userLocation={trip.userLocation}
            driverLocation={activeLoc}
            route={activeLoc && trip.userLocation
              ? [[activeLoc.lat, activeLoc.lng], [trip.userLocation.lat, trip.userLocation.lng]]
              : null
            }
            height="100%"
          />
        </div>

        <div className="px-4 py-4 pb-8 space-y-4">
          {/* Live Firebase Broadcast Console */}
          <div className="rounded-2xl p-4 bg-gradient-to-r from-red-500/10 via-emerald-500/10 to-blue-500/10 border border-emerald-500/20 backdrop-blur">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold text-emerald-800 tracking-wide uppercase">
                  {isConfigured ? 'Firebase Live Cloud Stream' : 'Live GPS Location Broadcasting'}
                </span>
              </div>
              <span className="text-[11px] font-mono text-gray-500">
                {lastSyncTime ? `Synced: ${lastSyncTime}` : 'Connecting...'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono bg-white/80 p-2.5 rounded-xl border border-gray-200/60 shadow-sm">
              <div>
                <span className="text-gray-400 block text-[10px]">LATITUDE</span>
                <span className="font-semibold text-gray-800">{activeLoc.lat.toFixed(5)}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">LONGITUDE</span>
                <span className="font-semibold text-gray-800">{activeLoc.lng.toFixed(5)}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">SPEED</span>
                <span className="font-semibold text-gray-800">{activeLoc.speed} km/h</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">STATUS</span>
                <span className="font-semibold text-emerald-600">{trip.status}</span>
              </div>
            </div>

            {/* Test Simulation Controls */}
            <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-gray-200/40">
              <span className="text-xs text-gray-600 flex items-center gap-1">
                <Radio size={14} className="text-primary-600" />
                Live Driver Movement Demo:
              </span>
              <button
                type="button"
                onClick={() => setIsSimulating(!isSimulating)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm ${
                  isSimulating
                    ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {isSimulating ? (
                  <>
                    <Pause size={13} /> Pause Simulation
                  </>
                ) : (
                  <>
                    <Play size={13} /> Simulate Driving
                  </>
                )}
              </button>
            </div>
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
  );
}
