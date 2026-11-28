'use client';
// src/app/(driver)/dashboard/page.jsx

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Phone, AlertCircle, Navigation, Power, CheckCircle, XCircle } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { driverAPI } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { subscribeToPendingRequests, acceptAmbulanceRequest } from '@/lib/firebaseTracking';

const MOCK_INCOMING = {
  _id: 'req-001',
  patientName: 'Jane Smith',
  emergencyType: 'Cardiac',
  pickupLocation: 'House 12, Dhanmondi, Dhaka',
  estimatedDistance: 2.3,
  ambulanceType: 'Advanced',
  user: { phone: '+880 1700-111111' },
};

export default function DriverDashboard() {
  const router = useRouter();
  const { on, off, emit } = useSocket();
  const [isOnline, setIsOnline] = useState(false);
  const [incomingRequest, setIncomingRequest] = useState(null);
  const [activeTrip, setActiveTrip] = useState(null);
  const [toggling, setToggling] = useState(false);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    const handleIncoming = (data) => setIncomingRequest(data);
    const handleCancelled = () => setIncomingRequest(null);
    on('booking:incoming', handleIncoming);
    on('booking:cancelled', handleCancelled);
    return () => {
      off('booking:incoming', handleIncoming);
      off('booking:cancelled', handleCancelled);
    };
  }, [on, off]);

  // Real Firebase Realtime Database listener for incoming requests
  useEffect(() => {
    if (!isOnline) {
      setIncomingRequest(null);
      return;
    }

    const unsubFirebase = subscribeToPendingRequests((requests) => {
      if (requests && requests.length > 0 && !activeTrip) {
        const topReq = requests[0];
        setIncomingRequest({
          _id: topReq.requestId,
          requestId: topReq.requestId,
          patientName: topReq.patientDetails?.name || 'Emergency Patient',
          emergencyType: topReq.patientDetails?.emergencyType || 'General Emergency',
          requestMode: topReq.patientDetails?.requestMode || (topReq.patientDetails?.emergencyType === 'general' ? 'general' : 'emergency'),
          estimatedFare: topReq.patientDetails?.estimatedFare || null,
          scheduledTime: topReq.patientDetails?.scheduledTime || null,
          pickupLocation: topReq.pickup?.address || 'Current Patient Location',
          pickupCoords: { lat: topReq.pickup?.lat || 23.8282, lng: topReq.pickup?.lng || 90.4163 },
          destination: topReq.destination?.name || 'Nearest General Hospital',
          estimatedDistance: 1.8,
          ambulanceType: topReq.patientDetails?.ambulanceType || 'Basic Life Support',
          user: { phone: topReq.patientDetails?.phone || '+880 1700-000000' },
          notes: topReq.patientDetails?.notes || '',
        });
      }
    });

    return () => unsubFirebase();
  }, [isOnline, activeTrip]);

  const handleToggleOnline = async () => {
    setToggling(true);
    try {
      await driverAPI.toggleOnline(!isOnline);
    } catch {}
    emit('driver:status', { isOnline: !isOnline });
    setIsOnline((v) => !v);
    if (isOnline) setIncomingRequest(null);
    setToggling(false);
  };

  const handleAccept = async () => {
    if (!incomingRequest) return;
    setAccepting(true);
    const reqId = incomingRequest.requestId || incomingRequest._id || 'active_trip';

    const pLat = incomingRequest.pickupCoords?.lat;
    const pLng = incomingRequest.pickupCoords?.lng;
    const driverStartLat = typeof pLat === 'number' ? Number((pLat - 0.0075).toFixed(6)) : 23.8231;
    const driverStartLng = typeof pLng === 'number' ? Number((pLng + 0.0085).toFixed(6)) : 90.4263;

    try {
      // Roadmap Step 4: Driver accepts request via transaction using local coordinates near patient
      await acceptAmbulanceRequest(reqId, {
        uid: 'driver_dha_4421',
        name: 'Assigned Driver (Md. Rahim)',
        phone: '01942809157',
        vehicleNumber: 'DHA-AMB-4421',
        rating: 4.9,
        lat: driverStartLat,
        lng: driverStartLng,
      });

      await driverAPI.updateBookingStatus(reqId, 'Accepted');
    } catch (e) {
      console.warn('Accept booking error:', e);
      if (e?.response?.status === 409) {
        alert(e.response?.data?.message || 'This trip has already been accepted by another driver.');
        setIncomingRequest(null);
        setAccepting(false);
        return;
      }
    }

    setActiveTrip(incomingRequest);
    setIncomingRequest(null);
    setAccepting(false);
    router.push(`/active?id=${reqId}`);
  };

  const handleReject = () => {
    setIncomingRequest(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Driver Status Card */}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-900 text-lg">Driver Dashboard</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Status:{' '}
                <span className={`font-semibold ${isOnline ? 'text-green-600' : 'text-gray-400'}`}>
                  {isOnline ? 'Online — Accepting Rides' : 'Offline'}
                </span>
              </p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={handleToggleOnline}
                disabled={toggling}
                className={[
                  'relative w-16 h-8 rounded-full transition-all duration-300 focus:outline-none',
                  isOnline ? 'bg-green-500' : 'bg-gray-300',
                  toggling ? 'opacity-60' : '',
                ].join(' ')}
              >
                <span
                  className={[
                    'absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all duration-300',
                    isOnline ? 'left-9' : 'left-1',
                  ].join(' ')}
                />
              </button>
              <span className="text-xs text-gray-500">{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-green-700">12</p>
              <p className="text-xs text-green-600">Today's Trips</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-blue-700">BDT 3,200</p>
              <p className="text-xs text-blue-600">Today's Earning</p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-yellow-700">4.9⭐</p>
              <p className="text-xs text-yellow-600">Rating</p>
            </div>
          </div>
        </Card>

        {/* Offline notice */}
        {!isOnline && !activeTrip && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto flex items-center justify-center text-4xl mb-4">
              <Power size={36} className="text-gray-400" />
            </div>
            <h3 className="font-bold text-gray-700 mb-2">You are Offline</h3>
            <p className="text-sm text-gray-500">Toggle online to start receiving booking requests</p>
            <button
              onClick={handleToggleOnline}
              className="mt-5 px-6 py-3 bg-primary-600 text-white font-bold rounded-2xl hover:bg-primary-700 transition-colors"
            >
              Go Online
            </button>
          </div>
        )}

        {/* Waiting state */}
        {isOnline && !incomingRequest && !activeTrip && (
          <div className="text-center py-10">
            <div className="w-16 h-16 bg-green-100 rounded-full mx-auto flex items-center justify-center text-3xl mb-4 animate-pulse">
              🚑
            </div>
            <h3 className="font-bold text-gray-800 mb-1">Waiting for Requests</h3>
            <p className="text-sm text-gray-500">You will be notified when a booking comes in</p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
              <span className="text-xs text-green-600 font-medium">Looking for requests...</span>
            </div>
          </div>
        )}

        {/* Incoming Request */}
        {incomingRequest && (
          <div className={`bg-white rounded-2xl border-2 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom ${
            incomingRequest.requestMode === 'general' ? 'border-blue-500' : 'border-primary-500'
          }`}>
            {/* Urgent / Standard banner */}
            <div className={`text-white px-4 py-2 flex items-center justify-between ${
              incomingRequest.requestMode === 'general' ? 'bg-blue-600' : 'bg-primary-600'
            }`}>
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className={incomingRequest.requestMode === 'general' ? '' : 'animate-pulse'} />
                <p className="font-bold text-sm">
                  {incomingRequest.requestMode === 'general'
                    ? '🏥 Incoming General Transfer Request'
                    : '🚨 Incoming Emergency SOS Request!'}
                </p>
              </div>
              {incomingRequest.scheduledTime && (
                <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full font-semibold">
                  📅 {new Date(incomingRequest.scheduledTime).toLocaleString()}
                </span>
              )}
            </div>

            <div className="p-5 space-y-3">
              {/* Patient info */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900">{incomingRequest.patientName}</p>
                  <Badge status={incomingRequest.emergencyType.toLowerCase()} label={incomingRequest.emergencyType} />
                </div>
                <Badge status={incomingRequest.ambulanceType.toLowerCase()} label={incomingRequest.ambulanceType} />
              </div>

              <div className="bg-gray-50 rounded-xl p-3.5 space-y-2.5 text-sm text-gray-700 border border-gray-100">
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="text-rose-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-[10px] text-gray-400 block font-semibold uppercase">Pickup Location</span>
                    <span className="font-medium">{incomingRequest.pickupLocation}</span>
                  </div>
                </div>

                {incomingRequest.destination && (
                  <div className="flex items-start gap-2 pt-1.5 border-t border-gray-200/60">
                    <span className="text-sm mt-0.5 shrink-0">🏥</span>
                    <div>
                      <span className="text-[10px] text-gray-400 block font-semibold uppercase">Destination Hospital</span>
                      <span className="font-medium text-emerald-700">{incomingRequest.destination}</span>
                    </div>
                  </div>
                )}

                {incomingRequest.user?.phone && (
                  <div className="flex items-center justify-between pt-1.5 border-t border-gray-200/60">
                    <span className="text-xs text-gray-500">📞 Patient Phone:</span>
                    <a
                      href={`tel:${incomingRequest.user.phone}`}
                      className="text-xs font-bold text-blue-600 hover:underline font-mono"
                    >
                      {incomingRequest.user.phone}
                    </a>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 text-xs text-gray-500">
                  <span>Estimated Distance:</span>
                  <span className="font-bold text-emerald-700">{incomingRequest.estimatedDistance} km away</span>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={handleReject}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                  leftIcon={<XCircle size={16} />}
                >
                  Decline
                </Button>
                <Button
                  fullWidth
                  onClick={handleAccept}
                  loading={accepting}
                  leftIcon={<CheckCircle size={16} />}
                >
                  Accept
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Active trip summary */}
        {activeTrip && (
          <Card className="border-2 border-green-400">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <p className="font-bold text-green-700 text-sm">Active Trip In Progress</p>
            </div>
            <p className="font-semibold text-gray-900">{activeTrip.patientName}</p>
            <p className="text-xs text-gray-500 mt-1">{activeTrip.pickupLocation}</p>
            <Link href="/active" className="block mt-4">
              <Button fullWidth>View Active Trip</Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
