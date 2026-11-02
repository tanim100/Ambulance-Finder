'use client';
// src/app/(driver)/active/page.jsx

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Phone, MapPin, ChevronLeft, CheckCircle } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { driverAPI } from '@/lib/api';
import { useGeolocation } from '@/hooks/useGeolocation';
import { emitDriverLocation } from '@/lib/socket';

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
  _id: 'trip-001',
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
  const { location, watchLocation, clearWatch } = useGeolocation();
  const [trip, setTrip] = useState(MOCK_TRIP);
  const [updating, setUpdating] = useState(false);
  const [completed, setCompleted] = useState(false);

  const currentIdx = TRIP_STATUSES.indexOf(trip.status);

  // Watch location and emit to socket
  useEffect(() => {
    const watchId = watchLocation();
    return () => clearWatch(watchId);
  }, [watchLocation, clearWatch]);

  useEffect(() => {
    if (location) {
      emitDriverLocation(location.lat, location.lng);
    }
  }, [location]);

  const handleNextStatus = async () => {
    if (currentIdx >= TRIP_STATUSES.length - 1) return;
    const nextStatus = TRIP_STATUSES[currentIdx + 1];
    setUpdating(true);
    try {
      await driverAPI.updateBookingStatus(trip._id, nextStatus);
    } catch {}
    setTrip((t) => ({ ...t, status: nextStatus }));
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
          <h1 className="font-bold text-gray-900">Active Trip</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-green-600 font-medium">{trip.status}</span>
          </div>
        </div>
        <Badge status={trip.emergencyType.toLowerCase()} label={trip.emergencyType} />
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Map */}
        <div className="h-56 mx-4 mt-4 rounded-2xl overflow-hidden shadow-sm">
          <MapView
            center={trip.userLocation ? [trip.userLocation.lat, trip.userLocation.lng] : [23.8103, 90.4125]}
            userLocation={trip.userLocation}
            driverLocation={location}
            route={location && trip.userLocation
              ? [[location.lat, location.lng], [trip.userLocation.lat, trip.userLocation.lng]]
              : null
            }
            height="100%"
          />
        </div>

        <div className="px-4 py-4 pb-8 space-y-4">
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
