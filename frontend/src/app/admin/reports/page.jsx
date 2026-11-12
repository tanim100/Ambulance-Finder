'use client';
// src/app/admin/reports/page.jsx — Admin Reports Dashboard

import { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { BarChart3, TrendingUp, CheckCircle2, XCircle, Clock, DollarSign, Users, Download } from 'lucide-react';
import { adminAPI } from '@/lib/api';

// ─── Mock fallback data ───────────────────────────────────────────────────────
const MOCK_TOTALS = {
  totalBookings: 342,
  completed: 218,
  cancelled: 47,
  pending: 77,
  totalRevenue: 187400,
};

const MOCK_MONTHLY = [
  { month: '2024-01', completed: 28, cancelled: 5,  pending: 10, revenue: 24500 },
  { month: '2024-02', completed: 32, cancelled: 6,  pending: 8,  revenue: 28200 },
  { month: '2024-03', completed: 41, cancelled: 9,  pending: 12, revenue: 35100 },
  { month: '2024-04', completed: 38, cancelled: 7,  pending: 11, revenue: 32600 },
  { month: '2024-05', completed: 44, cancelled: 8,  pending: 14, revenue: 38800 },
  { month: '2024-06', completed: 35, cancelled: 12, pending: 22, revenue: 28200 },
];

const MOCK_TYPES = [
  { emergencyType: 'Cardiac',     count: 89 },
  { emergencyType: 'Accident',    count: 74 },
  { emergencyType: 'Respiratory', count: 58 },
  { emergencyType: 'Trauma',      count: 63 },
  { emergencyType: 'General',     count: 58 },
];

const MOCK_DRIVERS = [
  { name: 'Rahim Ahmed',   phone: '01711-000001', completed: 54, earned: 48600 },
  { name: 'Karim Hossain', phone: '01711-000002', completed: 47, earned: 42300 },
  { name: 'Jamal Uddin',   phone: '01711-000003', completed: 39, earned: 35100 },
  { name: 'Sajid Mia',     phone: '01711-000004', completed: 31, earned: 27900 },
  { name: 'Faruk Islam',   phone: '01711-000005', completed: 27, earned: 24300 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtMonth(ym) {
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
}

function KpiCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-black text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// Simple bar using CSS — no chart library needed
function BarRow({ label, value, max, color = 'bg-primary-500' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-24 text-gray-600 shrink-0 truncate">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right font-semibold text-gray-800">{value}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [totals, setTotals]   = useState(MOCK_TOTALS);
  const [monthly, setMonthly] = useState(MOCK_MONTHLY);
  const [types, setTypes]     = useState(MOCK_TYPES);
  const [drivers, setDrivers] = useState(MOCK_DRIVERS);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await adminAPI.getReports();
        const d = res.data?.data;

        if (d?.totals) setTotals(d.totals);

        if (d?.monthlyBookings?.length) {
          // Aggregate flat rows (month + status) into monthly objects
          const map = {};
          d.monthlyBookings.forEach(({ month, status, count, revenue }) => {
            if (!map[month]) map[month] = { month, completed: 0, cancelled: 0, pending: 0, revenue: 0 };
            const c = Number(count);
            const r = Number(revenue);
            if (status === 'completed')  { map[month].completed  += c; map[month].revenue += r; }
            if (status === 'cancelled')  { map[month].cancelled  += c; }
            if (['pending','accepted','enroute','arrived'].includes(status)) map[month].pending += c;
          });
          setMonthly(Object.values(map).sort((a, b) => a.month.localeCompare(b.month)));
        }

        if (d?.typeBreakdown?.length)   setTypes(d.typeBreakdown);
        if (d?.topDrivers?.length)      setDrivers(d.topDrivers);
      } catch (e) {
        setError('Live data unavailable — showing sample data');
      }
      setLoading(false);
    };
    load();
  }, []);

  const completionRate = totals.totalBookings > 0
    ? Math.round((totals.completed / totals.totalBookings) * 100)
    : 0;

  const maxMonthly = Math.max(...monthly.map((m) => m.completed + m.cancelled + m.pending), 1);
  const maxType    = Math.max(...types.map((t) => Number(t.count)), 1);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      <main className="lg:ml-64 min-h-screen">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 size={22} className="text-primary-600" /> Reports &amp; Analytics
              </h1>
              <p className="text-sm text-gray-500">Booking trends, revenue, and performance overview</p>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              <Download size={15} /> Export
            </button>
          </div>
          {error && (
            <p className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 inline-block">
              ⚠️ {error}
            </p>
          )}
        </div>

        <div className="p-6 max-w-7xl space-y-6">

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={BarChart3}    label="Total Bookings"  value={totals.totalBookings?.toLocaleString()} sub={`${completionRate}% completion rate`} color="bg-blue-500" />
            <KpiCard icon={CheckCircle2} label="Completed"       value={totals.completed?.toLocaleString()}     sub="Successfully delivered"  color="bg-green-500" />
            <KpiCard icon={XCircle}      label="Cancelled"       value={totals.cancelled?.toLocaleString()}     sub="Booking cancelled"       color="bg-red-500" />
            <KpiCard icon={DollarSign}   label="Total Revenue"   value={`৳${Number(totals.totalRevenue || 0).toLocaleString()}`} sub="From completed trips" color="bg-purple-500" />
          </div>

          {/* Monthly Trend Table + Bars */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Monthly bar chart (CSS) */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-900 mb-1">Monthly Booking Trend</h2>
              <p className="text-xs text-gray-400 mb-5">Total bookings per month</p>
              <div className="space-y-3">
                {monthly.map((m) => (
                  <BarRow
                    key={m.month}
                    label={fmtMonth(m.month)}
                    value={m.completed + m.cancelled + m.pending}
                    max={maxMonthly}
                    color="bg-primary-500"
                  />
                ))}
              </div>
            </div>

            {/* Emergency type breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-900 mb-1">Emergency Type Breakdown</h2>
              <p className="text-xs text-gray-400 mb-5">Requests by emergency category</p>
              <div className="space-y-3">
                {types.map((t) => (
                  <BarRow
                    key={t.emergencyType}
                    label={t.emergencyType}
                    value={Number(t.count)}
                    max={maxType}
                    color="bg-blue-500"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Monthly breakdown table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Monthly Status Breakdown</h2>
              <p className="text-xs text-gray-400">Completed / Cancelled / Pending per month with revenue</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {['Month', 'Completed', 'Cancelled', 'Pending', 'Revenue (৳)'].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 px-5 py-3 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {monthly.map((m) => (
                    <tr key={m.month} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4 font-medium text-gray-900 text-sm">{fmtMonth(m.month)}</td>
                      <td className="px-5 py-4">
                        <span className="text-green-700 font-semibold text-sm">{m.completed}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-red-600 font-semibold text-sm">{m.cancelled}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-amber-600 font-semibold text-sm">{m.pending}</span>
                      </td>
                      <td className="px-5 py-4 font-semibold text-gray-900 text-sm">
                        ৳{Number(m.revenue || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="bg-gray-50 font-bold">
                    <td className="px-5 py-4 text-sm text-gray-700">Total</td>
                    <td className="px-5 py-4 text-sm text-green-700">{monthly.reduce((s, m) => s + m.completed, 0)}</td>
                    <td className="px-5 py-4 text-sm text-red-600">{monthly.reduce((s, m) => s + m.cancelled, 0)}</td>
                    <td className="px-5 py-4 text-sm text-amber-600">{monthly.reduce((s, m) => s + m.pending, 0)}</td>
                    <td className="px-5 py-4 text-sm text-gray-900">৳{monthly.reduce((s, m) => s + Number(m.revenue || 0), 0).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Drivers */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center gap-2">
              <Users size={18} className="text-primary-600" />
              <div>
                <h2 className="font-bold text-gray-900">Top Performing Drivers</h2>
                <p className="text-xs text-gray-400">Ranked by completed trips</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {['Rank', 'Driver', 'Phone', 'Completed Trips', 'Total Earned (৳)'].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 px-5 py-3 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {drivers.map((d, i) => (
                    <tr key={d.name + i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white inline-flex ${
                          i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-600' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-medium text-gray-900 text-sm">{d.name}</td>
                      <td className="px-5 py-4 text-sm text-gray-500">{d.phone}</td>
                      <td className="px-5 py-4">
                        <span className="text-green-700 font-bold text-sm">{d.completed}</span>
                      </td>
                      <td className="px-5 py-4 font-semibold text-gray-900 text-sm">
                        ৳{Number(d.earned || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Completion rate visual */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 mb-4">Overall Booking Health</h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Completion Rate', value: `${completionRate}%`, color: 'text-green-600', bar: 'bg-green-500', pct: completionRate },
                { label: 'Cancellation Rate', value: `${totals.totalBookings > 0 ? Math.round((totals.cancelled / totals.totalBookings) * 100) : 0}%`, color: 'text-red-600', bar: 'bg-red-500', pct: totals.totalBookings > 0 ? Math.round((totals.cancelled / totals.totalBookings) * 100) : 0 },
                { label: 'Pending Rate', value: `${totals.totalBookings > 0 ? Math.round((totals.pending / totals.totalBookings) * 100) : 0}%`, color: 'text-amber-600', bar: 'bg-amber-400', pct: totals.totalBookings > 0 ? Math.round((totals.pending / totals.totalBookings) * 100) : 0 },
              ].map(({ label, value, color, bar, pct }) => (
                <div key={label} className="text-center">
                  <p className={`text-3xl font-black ${color}`}>{value}</p>
                  <p className="text-sm text-gray-500 mb-2">{label}</p>
                  <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className={`h-full rounded-full ${bar} transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

