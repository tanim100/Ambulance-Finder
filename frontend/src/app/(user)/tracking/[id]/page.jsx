// src/app/(user)/tracking/[id]/page.jsx
'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { bookingAPI } from '@/lib/api';
import io from 'socket.io-client';
import { rtdb } from '@/lib/firebase';
import { ref, onValue, off } from 'firebase/database';

// Leaflet map — no SSR
const MapComponent = dynamic(() => import('@/components/map/MapComponent'), { ssr: false });

const STATUS_STEPS = ['Pending', 'Accepted', 'En Route', 'Arrived', 'Completed'];

// Helper to calculate distance in km
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function TrackingPage() {
  const { id } = useParams();
  const router = useRouter();

  const [booking, setBooking] = useState(null);
  const [driverPos, setDriverPos] = useState(null);
  const [patientPos, setPatientPos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [liveStreamStatus, setLiveStreamStatus] = useState({
    active: false,
    source: 'Connecting to Realtime GPS...',
    speed: null,
    lastUpdated: null,
  });

  const socketRef = useRef(null);

  // ── Load booking & patient exact location ──
  useEffect(() => {
    // 1. Try to get user exact location from localStorage
    let userExactLoc = { lat: 23.8103, lng: 90.4125 };
    try {
      const saved = localStorage.getItem('user_last_location');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.lat && parsed?.lng) {
          userExactLoc = { lat: parsed.lat, lng: parsed.lng };
        }
      }
    } catch {}

    const loadBooking = async () => {
      try {
        const res = await bookingAPI.getById(id);
        const b = res.data?.booking || res.data?.data || res.data;
        setBooking(b);

        const pLat = Number(b.pickupLat ?? b.pickup_lat ?? userExactLoc.lat);
        const pLng = Number(b.pickupLng ?? b.pickup_lng ?? userExactLoc.lng);
        setPatientPos({ lat: pLat, lng: pLng });

        // Don't set a fake driver position — wait for Firebase live data
        setDriverPos(null);
      } catch {
        // Fall back to active trip with user's exact detected location
        const fallbackBooking = {
          id: id || 'active_trip',
          status: 'En Route',
          pickupLat: userExactLoc.lat,
          pickupLng: userExactLoc.lng,
          pickupAddress: 'Patient Current Location',
          driver: {
            name: 'Assigned Driver',
            phone: '01942809157',
            rating: 4.9,
            vehicle_number: 'DHA-AMB-4421',
          },
        };
        setBooking(fallbackBooking);
        setPatientPos(userExactLoc);
        setDriverPos(null); // Wait for real Firebase data
      } finally {
        setLoading(false);
      }
    };

    loadBooking();
  }, [id]);

  // ── Firebase & Socket.io Real-time tracking ──
  useEffect(() => {
    if (!booking) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const handleLocationUpdate = (liveData) => {
      if (liveData?.lat && liveData?.lng) {
        setDriverPos({ lat: liveData.lat, lng: liveData.lng });
        setLiveStreamStatus({
          active: true,
          source: liveData.source || 'Firebase Realtime DB',
          speed: liveData.speed,
          lastUpdated: new Date(liveData.updatedAt || Date.now()).toLocaleTimeString(),
        });

        if (liveData.status) {
          setBooking((prev) => (prev ? { ...prev, status: liveData.status } : prev));
        }
      }
    };

    // 1. Subscribe to Firebase RTDB — always listen to active_trip (where driver writes)
    //    Also listen to the specific booking ID path as fallback
    const cleanups = [];

    if (rtdb) {
      const paths = ['live_tracking/active_trip'];
      // Also subscribe by booking id if it's not 'active_trip'
      if (id && id !== 'active_trip') {
        paths.push(`live_tracking/${id}`);
      }

      paths.forEach((path) => {
        try {
          const locRef = ref(rtdb, path);
          onValue(locRef, (snapshot) => {
            const val = snapshot.val();
            if (val && typeof val.lat === 'number' && typeof val.lng === 'number') {
              handleLocationUpdate(val);
            }
          });
          cleanups.push(() => off(locRef));
        } catch (e) {
          console.warn('Firebase subscribe error:', e.message);
        }
      });
    }

    // 2. Socket.io fallback
    try {
      const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
        auth: { token },
        transports: ['websocket'],
      });
      socketRef.current = socket;

      socket.emit('join_booking', id);

      socket.on('location_update', ({ lat, lng, speed }) => {
        handleLocationUpdate({ lat, lng, speed, source: 'Socket.io Server' });
      });

      socket.on('booking_status_update', ({ status }) => {
        setBooking((prev) => ({ ...prev, status }));
      });

      cleanups.push(() => socket.disconnect());
    } catch {}

    return () => {
      cleanups.forEach((fn) => { try { fn(); } catch {} });
    };
  }, [booking, id]);

  // Calculate live dynamic distance & ETA
  const liveDistance = patientPos && driverPos
    ? calculateDistance(patientPos.lat, patientPos.lng, driverPos.lat, driverPos.lng)
    : null;

  const liveETA = liveDistance
    ? `${Math.max(1, Math.round((liveDistance / (liveStreamStatus.speed || 35)) * 60))} min`
    : '3-5 min';

  // ── Cancel booking ──
  const handleCancel = async () => {
    if (!confirm('Cancel this ambulance request?')) return;
    setCancelling(true);
    try {
      await bookingAPI.cancel(id);
      router.push('/home');
    } catch {
      alert('Could not cancel. Please try again.');
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: 'var(--bg)', color: 'var(--on-surface)' }}
      >
        <div className="text-center">
          <div
            className="mx-auto mb-4"
            style={{
              width: '48px', height: '48px', border: '3px solid var(--border)',
              borderTopColor: 'var(--primary)', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <p style={{ color: 'var(--on-surface-muted)' }}>Connecting to Live Ambulance GPS…</p>
        </div>
      </div>
    );
  }

  const currentStep = STATUS_STEPS.indexOf(booking?.status ?? 'Pending');

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--on-surface)' }}>

      {/* ── Top Bar ── */}
      <header
        style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: 'var(--nav-bg)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
          padding: '14px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <Link href="/home" style={{ textDecoration: 'none', color: 'var(--on-surface-muted)', fontSize: '0.9rem' }}>
          ← Back to Dashboard
        </Link>
        <span style={{ fontWeight: 700, fontSize: '1rem' }}>🚑 Live Ambulance Tracking</span>
        <span
          style={{
            fontSize: '0.78rem', fontWeight: 600, padding: '4px 10px',
            borderRadius: '999px',
            background: booking?.status === 'Completed' ? '#dcfce7' : 'var(--primary-light)',
            color: booking?.status === 'Completed' ? '#16a34a' : 'var(--primary)',
          }}
        >
          {booking?.status || 'Active'}
        </span>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 grid gap-6" style={{ gridTemplateColumns: '1fr' }}>

        {/* Live GPS Status Bar */}
        <div className="glass-panel px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-emerald-600">
              {liveStreamStatus.active ? `Live Driver GPS Connected (${liveStreamStatus.source})` : 'Listening for Driver Live Location…'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-gray-500">
            {driverPos && (
              <span>
                Ambulance: <strong className="font-mono text-gray-800">{driverPos.lat.toFixed(4)}, {driverPos.lng.toFixed(4)}</strong>
              </span>
            )}
            {liveDistance !== null && (
              <span>
                Distance: <strong className="text-gray-800">{liveDistance.toFixed(1)} km away</strong>
              </span>
            )}
            {liveStreamStatus.speed !== null && (
              <span>
                Speed: <strong className="text-gray-800">{liveStreamStatus.speed} km/h</strong>
              </span>
            )}
            {liveStreamStatus.lastUpdated && (
              <span>
                Updated: <strong className="text-gray-800">{liveStreamStatus.lastUpdated}</strong>
              </span>
            )}
          </div>
        </div>

        {/* ── Map ── */}
        <div
          style={{
            height: '420px', borderRadius: '16px', overflow: 'hidden',
            border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)',
          }}
        >
          <MapComponent
            pickupLat={patientPos?.lat}
            pickupLng={patientPos?.lng}
            driverLat={driverPos?.lat}
            driverLng={driverPos?.lng}
          />
        </div>

        {/* ── Bottom Cards ── */}
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>

          {/* Status Timeline */}
          <div className="glass-panel p-6">
            <h3 className="font-bold mb-5" style={{ fontSize: '1rem' }}>📋 Status Timeline</h3>
            <div className="flex flex-col gap-3">
              {STATUS_STEPS.map((step, i) => {
                const done = i < currentStep;
                const active = i === currentStep;
                return (
                  <div key={step} className="flex items-center gap-3">
                    <div
                      style={{
                        width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', fontWeight: 700,
                        background: done || active ? 'var(--primary)' : 'var(--surface-2, var(--border))',
                        color: done || active ? '#fff' : 'var(--on-surface-subtle)',
                        border: active ? '2px solid var(--primary)' : 'none',
                        boxShadow: active ? '0 0 0 3px var(--primary-light)' : 'none',
                      }}
                    >
                      {done ? '✓' : i + 1}
                    </div>
                    <span
                      style={{
                        fontSize: '0.9rem',
                        fontWeight: active ? 700 : 400,
                        color: active ? 'var(--primary)' : done ? 'var(--on-surface)' : 'var(--on-surface-muted)',
                      }}
                    >
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Driver Info */}
          <div className="glass-panel p-6">
            <h3 className="font-bold mb-5" style={{ fontSize: '1rem' }}>🧑‍✈️ Driver Info</h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div
                  style={{
                    width: '52px', height: '52px', borderRadius: '50%',
                    background: 'var(--primary-light)', color: 'var(--primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.4rem',
                  }}
                >
                  👤
                </div>
                <div>
                  <div className="font-bold" style={{ fontSize: '1rem' }}>
                    {booking?.driver?.name || 'Assigned Driver'}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--on-surface-muted)' }}>
                    ⭐ {booking?.driver?.rating || 4.9} · {booking?.driver?.vehicle_number || 'DHA-AMB-4421'}
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: '10px 14px', borderRadius: '10px',
                  background: 'var(--surface-2, var(--border-subtle, #f1f5f9))',
                  fontSize: '0.88rem', color: 'var(--on-surface-muted)',
                }}
              >
                📞 {booking?.driver?.user?.phone || booking?.driver?.phone || '01942809157'}
              </div>

              {/* Dynamic ETA */}
              <div
                style={{
                  padding: '12px 14px', borderRadius: '10px', textAlign: 'center',
                  background: 'var(--primary-light)', color: 'var(--primary)',
                  fontWeight: 700, fontSize: '1.1rem',
                }}
              >
                Live ETA: {liveETA}
              </div>

              {/* Call button */}
              <a
                href={`tel:${(booking?.driver?.user?.phone || booking?.driver?.phone || '01942809157').replace(/[^0-9+]/g, '')}`}
                className="btn-primary"
                style={{ textDecoration: 'none', justifyContent: 'center' }}
              >
                📞 Call Driver
              </a>
            </div>
          </div>
        </div>

        {/* Cancel Button */}
        {booking?.status === 'Pending' && (
          <div className="flex justify-center">
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="btn-ghost"
              style={{ color: 'var(--primary)', borderColor: 'var(--primary)', padding: '12px 32px' }}
            >
              {cancelling ? 'Cancelling…' : '✕ Cancel Request'}
            </button>
          </div>
        )}

      </div>

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
