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

  // Demo: show incoming request when online
  useEffect(() => {
    if (isOnline && !incomingRequest && !activeTrip) {
      const timer = setTimeout(() => setIncomingRequest(MOCK_INCOMING), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, incomingRequest, activeTrip]);

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
    try {
      await driverAPI.updateBookingStatus(incomingRequest._id, 'Accepted');
    } catch {}
    setActiveTrip(incomingRequest);
    setIncomingRequest(null);
    setAccepting(false);
    // FIX: Next.js route group (driver) এ active page আছে,
    // কিন্তু URL /active হিসেবে accessible (route group folder name URL এ আসে না)
    router.push('/active');
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
              <p className="text-xl font-black text-blue-700">৳3,200</p>
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
          <div className="bg-white rounded-2xl border-2 border-primary-500 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom">
            {/* Urgent banner */}
            <div className="bg-primary-600 text-white px-4 py-2 flex items-center gap-2">
              <AlertCircle size={16} className="animate-pulse" />
              <p className="font-bold text-sm">🚨 Incoming Emergency Request!</p>
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

              <div className="bg-gray-50 rounded-xl p-3 space-y-2 text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="text-primary-500 mt-0.5 flex-shrink-0" />
                  <span>{incomingRequest.pickupLocation}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Navigation size={14} className="text-blue-500" />
                  <span>{incomingRequest.estimatedDistance} km from you</span>
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
