'use client';
// src/app/admin/bookings/page.jsx

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import Badge from '@/components/ui/Badge';
import { Search, ChevronLeft, Filter, Eye } from 'lucide-react';
import { adminAPI } from '@/lib/api';

const MOCK_BOOKINGS = [
  { _id: 'b001', user: 'John Doe',      driver: 'Rahim Ahmed',   emergencyType: 'Cardiac',     ambulanceType: 'Advanced', pickupLocation: 'Dhanmondi',  destination: 'DMCH',          status: 'Completed', fare: 1200, createdAt: '2024-06-10T08:30:00Z' },
  { _id: 'b002', user: 'Sara Khan',     driver: 'Karim Hossain', emergencyType: 'Accident',    ambulanceType: 'Basic',    pickupLocation: 'Gulshan',    destination: 'Square Hospital', status: 'En Route',  fare: 600,  createdAt: '2024-06-10T09:00:00Z' },
  { _id: 'b003', user: 'Ali Hossain',   driver: 'Jamal Uddin',   emergencyType: 'Respiratory', ambulanceType: 'ICU',      pickupLocation: 'Uttara',     destination: 'Apollo Hospital', status: 'Pending',   fare: 0,    createdAt: '2024-06-10T09:15:00Z' },
  { _id: 'b004', user: 'Nadia Rahman',  driver: '',              emergencyType: 'Trauma',       ambulanceType: 'Advanced', pickupLocation: 'Mirpur',     destination: '',               status: 'Cancelled', fare: 0,    createdAt: '2024-06-10T07:00:00Z' },
  { _id: 'b005', user: 'Rashed Mia',    driver: 'Sajid Mia',     emergencyType: 'General',     ambulanceType: 'Basic',    pickupLocation: 'Motijheel',  destination: 'BIRDEM',         status: 'Completed', fare: 500,  createdAt: '2024-06-10T06:30:00Z' },
  { _id: 'b006', user: 'Faisal Ahmed',  driver: 'Hasan Ali',     emergencyType: 'Cardiac',     ambulanceType: 'ICU',      pickupLocation: 'Banani',     destination: 'United Hospital', status: 'Accepted',  fare: 2000, createdAt: '2024-06-10T10:00:00Z' },
  { _id: 'b007', user: 'Tasnim Sultana',driver: 'Rahim Ahmed',   emergencyType: 'Maternity',   ambulanceType: 'Advanced', pickupLocation: 'Wari',       destination: 'Medinova',       status: 'Completed', fare: 900,  createdAt: '2024-06-09T19:00:00Z' },
];

const ALL_STATUSES = ['All', 'Pending', 'Accepted', 'En Route', 'Arrived', 'Completed', 'Cancelled'];

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState(MOCK_BOOKINGS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await adminAPI.getBookings();
        if (res.data?.bookings?.length > 0) setBookings(res.data.bookings);
      } catch {}
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = bookings.filter((b) => {
    const matchStatus = statusFilter === 'All' || b.status.toLowerCase() === statusFilter.toLowerCase();
    const matchSearch = !search ||
      b.user?.toLowerCase().includes(search.toLowerCase()) ||
      b.driver?.toLowerCase().includes(search.toLowerCase()) ||
      b.emergencyType?.toLowerCase().includes(search.toLowerCase()) ||
      b.pickupLocation?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const totalRevenue = bookings.filter(b => b.status === 'Completed').reduce((s, b) => s + (b.fare || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="lg:ml-64 min-h-screen">
        <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="p-1.5 rounded-lg hover:bg-gray-100"><ChevronLeft size={20} /></Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">All Bookings</h1>
              <p className="text-sm text-gray-500">{bookings.length} total · ৳{totalRevenue.toLocaleString()} revenue</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Status filter chips */}
          <div className="flex gap-2 mb-5 flex-wrap">
            {ALL_STATUSES.map((s) => {
              const count = s === 'All' ? bookings.length : bookings.filter(b => b.status.toLowerCase() === s.toLowerCase()).length;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={[
                    'px-4 py-1.5 rounded-full text-sm font-semibold border transition-all duration-200',
                    statusFilter === s ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400',
                  ].join(' ')}
                >
                  {s} ({count})
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by patient, driver, emergency type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {['Patient', 'Emergency', 'Amb. Type', 'Driver', 'Pickup', 'Status', 'Fare', 'Time'].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 px-5 py-3 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((b) => (
                    <tr key={b._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-900 text-sm">{b.user}</p>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">{b.emergencyType}</td>
                      <td className="px-5 py-4">
                        <Badge status={b.ambulanceType?.toLowerCase()} label={b.ambulanceType} size="xs" />
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500">{b.driver || '—'}</td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-gray-600 max-w-32 truncate">{b.pickupLocation}</p>
                        {b.destination && (
                          <p className="text-xs text-gray-400 truncate">→ {b.destination}</p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <Badge status={b.status.toLowerCase().replace(' ', '-')} label={b.status} size="xs" />
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-bold text-gray-900">
                          {b.fare > 0 ? `৳${b.fare}` : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs text-gray-400">
                          {new Date(b.createdAt).toLocaleString('en-US', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filtered.length === 0 && (
                <div className="text-center py-12">
                  <span className="text-3xl">📋</span>
                  <p className="text-gray-500 mt-2">No bookings found</p>
                </div>
              )}
            </div>
          </div>

          {/* Summary footer */}
          <div className="mt-4 text-sm text-gray-500 text-right">
            Showing {filtered.length} of {bookings.length} bookings
          </div>
        </div>
      </main>
    </div>
  );
}
