// src/app/(user)/tracking/[id]/page.jsx
'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import axios from 'axios';
import io from 'socket.io-client';
import { subscribeToAmbulanceLocation } from '@/lib/firebaseTracking';

// Leaflet map — no SSR
const MapComponent = dynamic(() => import('@/components/map/MapComponent'), { ssr: false });

const STATUS_STEPS = ['Pending', 'Accepted', 'En Route', 'Arrived', 'Completed'];

const MOCK_BOOKING = {
  id: 'MOCK-001',
  status: 'En Route',
  pickup_lat: 23.8103,
  pickup_lng: 90.4125,
  driver: {
    name: 'Rahim Ahmed',
    phone: '+880-1711-000111',
    rating: 4.8,
    vehicle_number: 'DHA-AMB-4421',
  },
  eta: '4 min',
};

export default function TrackingPage() {
  const { id } = useParams();
  const router = useRouter();

  const [booking, setBooking] = useState(null);
  const [driverPos, setDriverPos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [liveStreamStatus, setLiveStreamStatus] = useState({
    active: false,
    source: 'Connecting...',
    speed: null,
    lastUpdated: null,
  });

  const socketRef = useRef(null);
  const intervalRef = useRef(null);

  // ── Load booking ──
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const loadBooking = async () => {
      try {
        const { data } = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/bookings/${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const b = data?.data || data;
        setBooking(b);
        setDriverPos({ lat: b.pickup_lat - 0.012, lng: b.pickup_lng + 0.008 });
      } catch {
        // Fall back to mock data for demo
        setBooking(MOCK_BOOKING);
        setDriverPos({ lat: MOCK_BOOKING.pickup_lat - 0.012, lng: MOCK_BOOKING.pickup_lng + 0.008 });
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
    let hasLiveStream = false;

    // 1. Subscribe to Firebase Realtime / Local cross-tab stream
    const unsubscribeFirebase = subscribeToAmbulanceLocation(id, (liveData) => {
      if (liveData?.lat && liveData?.lng) {
        hasLiveStream = true;
        setDriverPos({ lat: liveData.lat, lng: liveData.lng });
        setLiveStreamStatus({
          active: true,
          source: liveData.source === 'firebase-rtdb' ? 'Firebase Realtime DB' :
                  liveData.source === 'firebase-firestore' ? 'Firebase Firestore' : 'Live GPS Stream',
          speed: liveData.speed,
          lastUpdated: new Date(liveData.updatedAt || Date.now()).toLocaleTimeString(),
        });

        if (liveData.status) {
          setBooking((prev) => (prev ? { ...prev, status: liveData.status } : prev));
        }
      }
    });

    // 2. Socket.io fallback
    try {
      socketRef.current = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
        auth: { token },
        transports: ['websocket'],
      });

      socketRef.current.emit('join_booking', id);

      socketRef.current.on('location_update', ({ lat, lng, speed }) => {
        hasLiveStream = true;
        setDriverPos({ lat, lng });
        setLiveStreamStatus({
          active: true,
          source: 'Socket.io Server',
          speed: speed || 0,
          lastUpdated: new Date().toLocaleTimeString(),
        });
      });

      socketRef.current.on('booking_status_update', ({ status }) => {
        setBooking((prev) => ({ ...prev, status }));
      });
    } catch {
      // Socket not available
    }

    // 3. Fallback gentle movement only when no live driver is actively transmitting
    intervalRef.current = setInterval(() => {
      if (!hasLiveStream) {
        setDriverPos((prev) => {
          if (!prev) return prev;
          return {
            lat: prev.lat + (Math.random() - 0.3) * 0.0006,
            lng: prev.lng + (Math.random() + 0.1) * 0.0005,
          };
        });
      }
    }, 3000);

    return () => {
      unsubscribeFirebase();
      socketRef.current?.disconnect();
      clearInterval(intervalRef.current);
    };
  }, [booking, id]);

  // ── Cancel booking ──
  const handleCancel = async () => {
    if (!confirm('Cancel this ambulance request?')) return;
    setCancelling(true);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bookings/${id}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      router.push('/user/dashboard');
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
          <p style={{ color: 'var(--on-surface-muted)' }}>Loading tracking info…</p>
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
        <Link href="/user/dashboard" style={{ textDecoration: 'none', color: 'var(--on-surface-muted)', fontSize: '0.9rem' }}>
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
          {booking?.status || 'Unknown'}
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
              {liveStreamStatus.active ? `Live Driver Stream Connected (${liveStreamStatus.source})` : 'Waiting for Driver Live Location…'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-gray-500">
            {driverPos && (
              <span>
                Coordinates: <strong className="font-mono text-gray-800">{driverPos.lat.toFixed(4)}, {driverPos.lng.toFixed(4)}</strong>
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
            pickupLat={booking?.pickup_lat ?? MOCK_BOOKING.pickup_lat}
            pickupLng={booking?.pickup_lng ?? MOCK_BOOKING.pickup_lng}
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
            {booking?.driver ? (
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
                    <div className="font-bold" style={{ fontSize: '1rem' }}>{booking.driver.name}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--on-surface-muted)' }}>
                      ⭐ {booking.driver.rating} · {booking.driver.vehicle_number}
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
                  📞 {booking.driver.phone}
                </div>

                {/* ETA */}
                <div
                  style={{
                    padding: '12px 14px', borderRadius: '10px', textAlign: 'center',
                    background: 'var(--primary-light)', color: 'var(--primary)',
                    fontWeight: 700, fontSize: '1.1rem',
                  }}
                >
                  ETA: {booking.eta || '~5 min'}
                </div>

                {/* Call button */}
                <a
                  href={`tel:${booking.driver.phone}`}
                  className="btn-primary"
                  style={{ textDecoration: 'none', justifyContent: 'center' }}
                >
                  📞 Call Driver
                </a>
              </div>
            ) : (
              <p style={{ color: 'var(--on-surface-muted)', fontSize: '0.9rem' }}>
                Waiting for a driver to accept…
              </p>
            )}
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
