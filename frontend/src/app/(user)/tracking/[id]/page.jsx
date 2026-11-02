'use client';
// src/app/(user)/tracking/[id]/page.jsx

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Phone, Star, XCircle, ChevronLeft, RefreshCw } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import BottomNav from '@/components/layout/BottomNav';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { bookingAPI } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';

const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 rounded-2xl flex items-center justify-center">
      <p className="text-sm text-gray-500">Loading map...</p>
    </div>
  ),
});

const STATUSES = ['Pending', 'Accepted', 'En Route', 'Arrived', 'Completed'];

const MOCK_BOOKING = {
  _id: 'demo-001',
  status: 'En Route',
  patientName: 'John Doe',
  emergencyType: 'Cardiac',
  pickupLocation: 'House 12, Road 5, Dhanmondi, Dhaka',
  destination: 'Dhaka Medical College',
  ambulanceType: 'Advanced',
  driver: { name: 'Rahim Ahmed', phone: '+880 1700-000000', rating: 4.8, vehicleNumber: 'AMB-002' },
  eta: '8 min',
  userLocation: { lat: 23.8103, lng: 90.4125 },
  driverLocation: { lat: 23.8203, lng: 90.4225 },
};

export default function TrackingPage() {
  const { id } = useParams();
  const router = useRouter();
  const { on, off } = useSocket();
  const [booking, setBooking] = useState(MOCK_BOOKING);
  const [driverLoc, setDriverLoc] = useState(MOCK_BOOKING.driverLocation);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const res = await bookingAPI.getById(id);
        setBooking(res.data);
        if (res.data.driverLocation) setDriverLoc(res.data.driverLocation);
      } catch {
        // keep mock data
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
  }, [id]);

  // Socket listeners
  useEffect(() => {
    const handleLocation = (data) => setDriverLoc(data);
    const handleStatus = (data) => setBooking((b) => ({ ...b, status: data.status }));

    on(`booking:${id}:location`, handleLocation);
    on(`booking:${id}:status`, handleStatus);

    // Simulate driver moving for demo
    const interval = setInterval(() => {
      setDriverLoc((prev) => prev ? ({
        lat: prev.lat + (Math.random() - 0.5) * 0.001,
        lng: prev.lng + (Math.random() - 0.5) * 0.001,
      }) : prev);
    }, 3000);

    return () => {
      off(`booking:${id}:location`, handleLocation);
      off(`booking:${id}:status`, handleStatus);
      clearInterval(interval);
    };
  }, [id, on, off]);

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    setCancelling(true);
    try {
      await bookingAPI.cancel(id);
      setBooking((b) => ({ ...b, status: 'Cancelled' }));
    } catch {
      setBooking((b) => ({ ...b, status: 'Cancelled' }));
    } finally {
      setCancelling(false);
    }
  };

  const currentStatusIndex = STATUSES.findIndex(
    (s) => s.toLowerCase() === booking?.status?.toLowerCase().replace('_', ' ')
  );

  const route = driverLoc && booking?.userLocation
    ? [[driverLoc.lat, driverLoc.lng], [booking.userLocation.lat, booking.userLocation.lng]]
    : null;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar />

      {/* Back button */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-gray-100">
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="font-bold text-gray-900">Live Tracking</h1>
          <p className="text-xs text-gray-500">#{id?.slice(0, 12)}...</p>
        </div>
        <div className="ml-auto">
          <Badge status={booking?.status?.toLowerCase()} label={booking?.status} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {/* Map */}
        <div className="h-64 mx-4 mt-4 rounded-2xl overflow-hidden shadow-sm">
          <MapView
            center={booking?.userLocation ? [booking.userLocation.lat, booking.userLocation.lng] : [23.8103, 90.4125]}
            userLocation={booking?.userLocation}
            driverLocation={driverLoc}
            route={route}
            height="100%"
          />
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* ETA */}
          <Card className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Estimated Arrival</p>
              <p className="text-3xl font-black text-primary-600">{booking?.eta || '—'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Emergency Type</p>
              <Badge status={booking?.emergencyType?.toLowerCase()} label={booking?.emergencyType} />
            </div>
          </Card>

          {/* Status Timeline */}
          <Card>
            <h3 className="font-bold text-gray-900 mb-4">Status Updates</h3>
            <div className="space-y-0">
              {STATUSES.filter(s => s !== 'Completed').concat(['Completed']).map((status, idx) => {
                const stepIdx = ['Pending','Accepted','En Route','Arrived','Completed'].indexOf(status);
                const isDone = stepIdx < currentStatusIndex;
                const isCurrent = stepIdx === currentStatusIndex;
                const isPending = stepIdx > currentStatusIndex;

                const icons = { Pending: '⏳', Accepted: '✅', 'En Route': '🚑', Arrived: '📍', Completed: '🎉' };

                return (
                  <div key={status} className="flex gap-3">
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center">
                      <div className={[
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-1',
                        isDone ? 'bg-green-500 text-white' : isCurrent ? 'bg-primary-600 text-white ring-4 ring-primary-100' : 'bg-gray-100 text-gray-400',
                      ].join(' ')}>
                        {isDone ? '✓' : icons[status]}
                      </div>
                      {idx < STATUSES.length - 1 && (
                        <div className={`w-0.5 h-6 mt-1 ${isDone ? 'bg-green-400' : 'bg-gray-200'}`} />
                      )}
                    </div>
                    {/* Label */}
                    <div className="pb-4 pt-1">
                      <p className={`text-sm font-semibold ${isCurrent ? 'text-primary-700' : isDone ? 'text-green-700' : 'text-gray-400'}`}>
                        {status}
                      </p>
                      {isCurrent && (
                        <p className="text-xs text-gray-500 mt-0.5">Current status</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Driver Info */}
          {booking?.driver && (
            <Card>
              <h3 className="font-bold text-gray-900 mb-3">Your Driver</h3>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center text-2xl font-bold text-primary-700 flex-shrink-0">
                  {booking.driver.name?.charAt(0) || 'D'}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{booking.driver.name}</p>
                  <p className="text-sm text-gray-500">{booking.driver.vehicleNumber}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star size={12} className="text-yellow-500 fill-yellow-500" />
                    <span className="text-xs text-gray-600 font-medium">{booking.driver.rating}</span>
                  </div>
                </div>
                <a
                  href={`tel:${booking.driver.phone}`}
                  className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center text-white hover:bg-green-600 transition-colors"
                >
                  <Phone size={18} />
                </a>
              </div>
            </Card>
          )}

          {/* Cancel button */}
          {booking?.status === 'Pending' && (
            <Button
              variant="outline"
              fullWidth
              loading={cancelling}
              onClick={handleCancel}
              className="border-red-200 text-red-600 hover:bg-red-50"
              leftIcon={<XCircle size={16} />}
            >
              Cancel Booking
            </Button>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
