'use client';
// src/app/(user)/history/page.jsx

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, ChevronRight, Search } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import BottomNav from '@/components/layout/BottomNav';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import { userAPI } from '@/lib/api';

const MOCK_HISTORY = [
  {
    _id: 'b001', createdAt: '2024-06-10T08:30:00Z', status: 'Completed',
    ambulanceType: 'Advanced', emergencyType: 'Cardiac',
    pickupLocation: 'Dhanmondi, Dhaka', destination: 'DMCH',
    fare: 1200, driver: 'Rahim Ahmed',
  },
  {
    _id: 'b002', createdAt: '2024-06-05T14:15:00Z', status: 'Completed',
    ambulanceType: 'Basic', emergencyType: 'Accident',
    pickupLocation: 'Gulshan, Dhaka', destination: 'Square Hospital',
    fare: 600, driver: 'Karim Hossain',
  },
  {
    _id: 'b003', createdAt: '2024-05-28T19:00:00Z', status: 'Cancelled',
    ambulanceType: 'ICU', emergencyType: 'Respiratory',
    pickupLocation: 'Uttara, Dhaka', destination: '',
    fare: 0, driver: '',
  },
  {
    _id: 'b004', createdAt: '2024-05-15T11:00:00Z', status: 'Completed',
    ambulanceType: 'Basic', emergencyType: 'General',
    pickupLocation: 'Mirpur, Dhaka', destination: 'Apollo Hospital',
    fare: 500, driver: 'Sajid Mia',
  },
];

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function HistoryPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState(MOCK_HISTORY);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await userAPI.getHistory();
        if (res.data?.bookings?.length > 0) setBookings(res.data.bookings);
      } catch {
        // use mock data
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const filtered = bookings.filter((b) =>
    !search ||
    b.pickupLocation?.toLowerCase().includes(search.toLowerCase()) ||
    b.emergencyType?.toLowerCase().includes(search.toLowerCase()) ||
    b.ambulanceType?.toLowerCase().includes(search.toLowerCase())
  );

  const totalCompleted = bookings.filter((b) => b.status === 'Completed').length;
  const totalSpent = bookings.filter((b) => b.status === 'Completed').reduce((sum, b) => sum + (b.fare || 0), 0);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar />

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-5">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Booking History</h1>
          <p className="text-sm text-gray-500">{bookings.length} total bookings</p>

          {/* Summary cards */}
          <div className="flex gap-4 mt-4">
            <div className="flex-1 bg-green-50 border border-green-100 rounded-2xl p-3 text-center">
              <p className="text-xl font-black text-green-700">{totalCompleted}</p>
              <p className="text-xs text-green-600">Completed</p>
            </div>
            <div className="flex-1 bg-primary-50 border border-primary-100 rounded-2xl p-3 text-center">
              <p className="text-xl font-black text-primary-700">৳{totalSpent.toLocaleString()}</p>
              <p className="text-xs text-primary-600">Total Spent</p>
            </div>
            <div className="flex-1 bg-red-50 border border-red-100 rounded-2xl p-3 text-center">
              <p className="text-xl font-black text-red-600">
                {bookings.filter((b) => b.status === 'Cancelled').length}
              </p>
              <p className="text-xs text-red-600">Cancelled</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-2xl mx-auto px-4 py-4">
          {/* Search */}
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search bookings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* List */}
          {loading ? (
            <div className="text-center py-12">
              <span className="text-4xl">🚑</span>
              <p className="text-sm text-gray-500 mt-2">Loading history...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl">📋</span>
              <p className="text-gray-500 mt-2 font-medium">No bookings found</p>
              <p className="text-sm text-gray-400 mt-1">Your booking history will appear here</p>
              <Link href="/request" className="inline-block mt-4 px-6 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700">
                Request Ambulance
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((booking) => (
                <Card
                  key={booking._id}
                  hover
                  padding={false}
                  onClick={() => router.push(`/tracking/${booking._id}`)}
                  className="overflow-hidden"
                >
                  {/* Top strip */}
                  <div className={`h-1 ${booking.status === 'Completed' ? 'bg-green-400' : booking.status === 'Cancelled' ? 'bg-red-400' : 'bg-primary-400'}`} />
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-xl">
                          {booking.ambulanceType === 'ICU' ? '🏥' : booking.ambulanceType === 'Advanced' ? '🚨' : '🚑'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{booking.emergencyType}</p>
                          <p className="text-xs text-gray-500">{booking.ambulanceType} Ambulance</p>
                        </div>
                      </div>
                      <Badge status={booking.status.toLowerCase()} label={booking.status} size="xs" />
                    </div>

                    <div className="text-xs text-gray-500 space-y-1 mb-3">
                      <p>📍 {booking.pickupLocation}</p>
                      {booking.destination && <p>🏥 {booking.destination}</p>}
                      {booking.driver && <p>👤 {booking.driver}</p>}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock size={12} />
                        {formatDate(booking.createdAt)} · {formatTime(booking.createdAt)}
                      </div>
                      <div className="flex items-center gap-2">
                        {booking.fare > 0 && (
                          <span className="text-sm font-bold text-gray-900">৳{booking.fare}</span>
                        )}
                        <ChevronRight size={14} className="text-gray-300" />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
