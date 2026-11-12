'use client';
// src/app/admin/page.jsx — Admin Dashboard

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import Badge from '@/components/ui/Badge';
import { TrendingUp, Users, Ambulance, BookOpen, DollarSign, Plus, ArrowRight } from 'lucide-react';
import { adminAPI } from '@/lib/api';

const MOCK_STATS = {
  totalUsers: 1240,
  activeAmbulances: 38,
  todayBookings: 87,
  revenue: 42500,
};

const MOCK_BOOKINGS = [
  { _id: 'b001', user: 'John Doe',      driver: 'Rahim Ahmed',  emergencyType: 'Cardiac',     status: 'Completed', fare: 1200, createdAt: '2024-06-10T08:30:00Z' },
  { _id: 'b002', user: 'Sara Khan',     driver: 'Karim Hossain',emergencyType: 'Accident',    status: 'En Route',  fare: 600,  createdAt: '2024-06-10T09:00:00Z' },
  { _id: 'b003', user: 'Ali Hossain',   driver: 'Jamal Uddin',  emergencyType: 'Respiratory', status: 'Pending',   fare: 0,    createdAt: '2024-06-10T09:15:00Z' },
  { _id: 'b004', user: 'Nadia Rahman',  driver: '',             emergencyType: 'Trauma',      status: 'Cancelled', fare: 0,    createdAt: '2024-06-10T07:00:00Z' },
  { _id: 'b005', user: 'Rashed Mia',    driver: 'Sajid Mia',    emergencyType: 'General',     status: 'Completed', fare: 500,  createdAt: '2024-06-10T06:30:00Z' },
];

function StatCard({ icon: Icon, label, value, change, color }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
        {change && (
          <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
            +{change}%
          </span>
        )}
      </div>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(MOCK_STATS);
  const [bookings, setBookings] = useState(MOCK_BOOKINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, bookRes] = await Promise.all([
          adminAPI.getStats(),
          adminAPI.getBookings({ limit: 5 }),
        ]);
        // Backend wraps stats inside data.stats
        const s = statsRes.data?.data?.stats || statsRes.data?.data || statsRes.data;
        if (s) {
          setStats({
            totalUsers: s.totalUsers ?? MOCK_STATS.totalUsers,
            activeAmbulances: s.availableAmbulances ?? s.activeAmbulances ?? MOCK_STATS.activeAmbulances,
            todayBookings: s.activeBookings ?? s.totalBookings ?? MOCK_STATS.todayBookings,
            revenue: s.totalRevenue ?? MOCK_STATS.revenue,
          });
        }
        // Backend wraps bookings inside data.bookings
        const bks = bookRes.data?.data?.bookings || bookRes.data?.bookings;
        if (bks?.length) {
          setBookings(
            bks.map((b) => ({
              _id: b.id ?? b._id,
              user: b.user?.name ?? b.user ?? '—',
              driver: b.driver?.name ?? b.driver ?? '',
              emergencyType: b.emergencyType ?? '—',
              status: b.status ?? 'Pending',
              fare: b.fare ?? 0,
              createdAt: b.createdAt,
            }))
          );
        }
      } catch {}
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      <main className="lg:ml-64 min-h-screen">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-500">Welcome back, Admin</p>
            </div>
            <div className="flex gap-3">
              <Link href="/admin/ambulances" className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors">
                <Plus size={16} /> Add Ambulance
              </Link>
              <Link href="/admin/drivers" className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
                <Plus size={16} /> Add Driver
              </Link>
            </div>
          </div>
        </div>

        <div className="p-6 max-w-7xl">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard icon={Users}      label="Total Users"       value={stats.totalUsers?.toLocaleString()}      change={12} color="bg-blue-500" />
            <StatCard icon={Ambulance}  label="Active Ambulances" value={stats.activeAmbulances}                  change={4}  color="bg-primary-600" />
            <StatCard icon={BookOpen}   label="Today's Bookings"  value={stats.todayBookings}                     change={8}  color="bg-green-500" />
            <StatCard icon={DollarSign} label="Today's Revenue"   value={`৳${stats.revenue?.toLocaleString()}`}  change={15} color="bg-purple-500" />
          </div>

          {/* Recent Bookings Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Recent Bookings</h2>
              <Link href="/admin/bookings" className="text-sm text-primary-600 font-semibold hover:underline flex items-center gap-1">
                View All <ArrowRight size={14} />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {['Patient', 'Emergency', 'Driver', 'Status', 'Fare', 'Time'].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 px-5 py-3 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {bookings.map((b) => (
                    <tr key={b._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900 text-sm">{b.user}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-600">{b.emergencyType}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-600">{b.driver || '—'}</span>
                      </td>
                      <td className="px-5 py-4">
                        <Badge status={b.status.toLowerCase().replace(' ', '-')} label={b.status} size="xs" />
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold text-gray-900">
                          {b.fare > 0 ? `৳${b.fare}` : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs text-gray-400">
                          {new Date(b.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick action cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
            {[
              { icon: '🚑', label: 'Manage Ambulances', href: '/admin/ambulances', color: 'bg-primary-50 border-primary-100' },
              { icon: '👤', label: 'Manage Drivers',    href: '/admin/drivers',    color: 'bg-blue-50 border-blue-100' },
              { icon: '📋', label: 'All Bookings',      href: '/admin/bookings',   color: 'bg-green-50 border-green-100' },
              { icon: '📊', label: 'Reports',           href: '/admin/reports',    color: 'bg-purple-50 border-purple-100' },
            ].map(({ icon, label, href, color }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-4 p-5 rounded-2xl border-2 ${color} hover:shadow-md transition-all duration-200`}
              >
                <span className="text-3xl">{icon}</span>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{label}</p>
                  <p className="text-xs text-gray-500">Click to manage</p>
                </div>
                <ArrowRight size={16} className="ml-auto text-gray-400" />
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
