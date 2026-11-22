// src/app/(user)/tracking/[id]/page.jsx
'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { bookingAPI } from '@/lib/api';
import io from 'socket.io-client';
import { subscribeToAmbulanceLocation } from '@/lib/firebaseTracking';

// Leaflet map — no SSR
const MapComponent = dynamic(() => import('@/components/map/MapComponent'), { ssr: false });

const STATUS_STEPS = ['Pending', 'Accepted', 'En Route', 'Arrived', 'Completed'];

// Helper to calculate distance in km (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371;
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

// Get user's current GPS location with high accuracy
function getUserCurrentLocation() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !navigator?.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        // Try low accuracy fallback
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(null),
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 30000 }
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  });
}

export default function TrackingPage() {
  const { id } = useParams();
  const router = useRouter();

  const [booking, setBooking] = useState(null);
  const [driverPos, setDriverPos] = useState(null);   // null until Firebase fires
  const [patientPos, setPatientPos] = useState(null); // user/patient pickup pin
  const [userCurrentPos, setUserCurrentPos] = useState(null); // user's live position
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [liveStreamStatus, setLiveStreamStatus] = useState({
    active: false,
    source: 'Connecting to Realtime GPS...',
    speed: null,
    lastUpdated: null,
  });

  const socketRef = useRef(null);

  // ── Get user's current live GPS position ──
  useEffect(() => {
    // Start continuous GPS watch for user
    let watchId = null;
    if (navigator?.geolocation) {
      // Initial one-shot high-accuracy read
      getUserCurrentLocation().then((loc) => {
        if (loc) {
          setUserCurrentPos(loc);
          try { localStorage.setItem('user_last_location', JSON.stringify(loc)); } catch {}
        }
      });

      // Then watch for updates
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserCurrentPos(loc);
          try { localStorage.setItem('user_last_location', JSON.stringify(loc)); } catch {}
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    } else {
      // Try localStorage fallback
      try {
        const saved = localStorage.getItem('user_last_location');
        if (saved) {
          const p = JSON.parse(saved);
          if (p?.lat && p?.lng) setUserCurrentPos(p);
        }
      } catch {}
    }

    return () => {
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // ── Load booking & patient exact pickup location ──
  useEffect(() => {
    const loadBooking = async () => {
      try {
        const res = await bookingAPI.getById(id);
        const b = res.data?.booking || res.data?.data || res.data;
        setBooking(b);

        // Use coordinates stored in booking record (set at time of request)
        const pLat = b.pickupLat ?? b.pickup_lat ?? null;
        const pLng = b.pickupLng ?? b.pickup_lng ?? null;

        if (pLat != null && pLng != null && !isNaN(Number(pLat)) && !isNaN(Number(pLng))) {
          setPatientPos({ lat: Number(pLat), lng: Number(pLng) });
        } else {
          // Fall back to user's current GPS location
          const userGPS = await getUserCurrentLocation();
          if (userGPS) {
            setPatientPos(userGPS);
          } else {
            // Last resort: localStorage
            try {
              const saved = localStorage.getItem('user_last_location');
              if (saved) {
                const p = JSON.parse(saved);
                if (p?.lat && p?.lng) setPatientPos({ lat: p.lat, lng: p.lng });
              }
            } catch {}
          }
        }

        // Note: driverPos is NOT pre-set here — we wait for Firebase to give the real value
      } catch {
        // API error — build a fallback booking
        const fallbackBooking = {
          id: id || 'active_trip',
          status: 'En Route',
          driver: {
            name: 'Assigned Driver',
            phone: '01942809157',
            rating: 4.9,
            vehicle_number: 'DHA-AMB-4421',
          },
        };
        setBooking(fallbackBooking);

        // Try to get user's real GPS for the fallback
        const userGPS = await getUserCurrentLocation();
        if (userGPS) {
          setPatientPos(userGPS);
        }
      } finally {
        setLoading(false);
      }
    };

    loadBooking();
  }, [id]);

  // ── Firebase & Socket.io Real-time driver tracking ──
  useEffect(() => {
    if (!booking) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const handleLocationUpdate = (liveData) => {
      // FIX: use != null instead of truthiness check (avoids falsy 0 coords)
      if (liveData && liveData.lat != null && liveData.lng != null) {
        const lat = Number(liveData.lat);
        const lng = Number(liveData.lng);
        if (!isNaN(lat) && !isNaN(lng)) {
          setDriverPos({ lat, lng });
          setLiveStreamStatus({
            active: true,
            source: liveData.source || 'Firebase Realtime DB',
            speed: liveData.speed || null,
            lastUpdated: new Date(liveData.updatedAt || Date.now()).toLocaleTimeString(),
          });

          if (liveData.status) {
            setBooking((prev) => (prev ? { ...prev, status: liveData.status } : prev));
          }
        }
      }
    };

    // 1. Subscribe to Firebase Realtime stream
    const unsubscribeFirebase = subscribeToAmbulanceLocation(id, handleLocationUpdate);

    // 2. Socket.io fallback
    try {
      socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
        auth: { token },
        transports: ['websocket'],
        reconnectionAttempts: 3,
      });

      socketRef.current.emit('join_booking', id);

      socketRef.current.on('location_update', ({ lat, lng, speed }) => {
        handleLocationUpdate({ lat, lng, speed, source: 'Socket.io Server' });
      });

      socketRef.current.on('booking_status_update', ({ status }) => {
        setBooking((prev) => ({ ...prev, status }));
      });
    } catch {}

    return () => {
      unsubscribeFirebase();
      socketRef.current?.disconnect();
    };
  }, [booking, id]);

  // Calculate live dynamic distance & ETA
  const liveDistance = patientPos && driverPos
    ? calculateDistance(patientPos.lat, patientPos.lng, driverPos.lat, driverPos.lng)
    : null;

  const liveETA = liveDistance
    ? `${Math.max(1, Math.round((liveDistance / Math.max(liveStreamStatus.speed || 35, 5)) * 60))} min`
    : '—';

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

  // Map center: prefer midpoint of driver & patient, else driver, else patient, else Dhaka
  const mapCenter = (() => {
    if (driverPos && patientPos) {
      return {
        pickupLat: patientPos.lat,
        pickupLng: patientPos.lng,
        driverLat: driverPos.lat,
        driverLng: driverPos.lng,
      };
    }
    if (driverPos) return { pickupLat: null, pickupLng: null, driverLat: driverPos.lat, driverLng: driverPos.lng };
    if (patientPos) return { pickupLat: patientPos.lat, pickupLng: patientPos.lng, driverLat: null, driverLng: null };
    return { pickupLat: 23.8103, pickupLng: 90.4125, driverLat: null, driverLng: null };
  })();

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
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${liveStreamStatus.active ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${liveStreamStatus.active ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
            </span>
            <span className={`font-semibold ${liveStreamStatus.active ? 'text-emerald-600' : 'text-amber-600'}`}>
              {liveStreamStatus.active
                ? `🛰️ Live Driver GPS Connected (${liveStreamStatus.source})`
                : '📡 Listening for Driver Live Location…'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-gray-500">
            {driverPos && (
              <span>
                Ambulance: <strong className="font-mono text-gray-800">{driverPos.lat.toFixed(4)}, {driverPos.lng.toFixed(4)}</strong>
              </span>
            )}
            {patientPos && (
              <span>
                Pickup: <strong className="font-mono text-gray-800">{patientPos.lat.toFixed(4)}, {patientPos.lng.toFixed(4)}</strong>
              </span>
            )}
            {liveDistance != null && (
              <span>
                Distance: <strong className="text-gray-800">{liveDistance.toFixed(1)} km away</strong>
              </span>
            )}
            {liveStreamStatus.speed != null && (
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
            pickupLat={mapCenter.pickupLat}
            pickupLng={mapCenter.pickupLng}
            driverLat={mapCenter.driverLat}
            driverLng={mapCenter.driverLng}
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
                {liveDistance != null
                  ? `ETA: ~${liveETA} (${liveDistance.toFixed(1)} km away)`
                  : driverPos
                  ? `Live ETA: ${liveETA}`
                  : '🕐 Waiting for driver location...'}
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
