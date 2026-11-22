// src/app/(driver)/gps-test/page.jsx
// GPS Debug Page — Tests real browser GPS and writes to Firebase
'use client';
import { useState, useEffect, useRef } from 'react';
import { updateAmbulanceLocation, updatePatientLocation, testFirebaseConnection } from '@/lib/firebaseTracking';

export default function GPSTestPage() {
  const [gpsStatus, setGpsStatus] = useState('Idle');
  const [gpsError, setGpsError] = useState(null);
  const [currentLoc, setCurrentLoc] = useState(null);
  const [firebaseLog, setFirebaseLog] = useState([]);
  const [permission, setPermission] = useState('unknown');
  const watchRef = useRef(null);

  const addLog = (msg, type = 'info') => {
    const time = new Date().toLocaleTimeString();
    setFirebaseLog(prev => [{ time, msg, type }, ...prev].slice(0, 20));
  };

  // Check permission state
  useEffect(() => {
    if (navigator?.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        setPermission(result.state);
        result.onchange = () => setPermission(result.state);
      });
    }
  }, []);

  // Test Firebase connection
  useEffect(() => {
    testFirebaseConnection().then(res => {
      if (res.ok) addLog(`✅ Firebase connected: ${res.provider}`, 'success');
      else addLog(`❌ Firebase error: ${res.error}`, 'error');
    });
  }, []);

  const startGPS = () => {
    if (!navigator.geolocation) {
      setGpsError('❌ Geolocation not supported in this browser');
      return;
    }

    setGpsStatus('Requesting GPS permission...');
    setGpsError(null);
    addLog('📡 Requesting GPS permission...', 'info');

    // High accuracy GPS
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0,
          heading: pos.coords.heading || 0,
          accuracy: Math.round(pos.coords.accuracy),
          source: 'Real Device GPS (High Accuracy)',
        };
        setCurrentLoc(loc);
        setGpsStatus('✅ GPS Acquired! Sending to Firebase...');
        addLog(`📍 GPS: ${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)} (±${loc.accuracy}m)`, 'success');

        // Write to Firebase
        const result = await updateAmbulanceLocation('active_trip', {
          ...loc,
          status: 'En Route',
          driverName: 'Real Driver GPS Test',
          vehicleNumber: 'TEST-GPS-01',
        });

        if (result.success) {
          addLog(`🔥 Firebase write SUCCESS! lat=${loc.lat.toFixed(6)}, lng=${loc.lng.toFixed(6)}`, 'success');
          setGpsStatus('✅ Real GPS location sent to Firebase!');
        } else {
          addLog(`❌ Firebase write failed: ${result.reason}`, 'error');
        }
      },
      (err) => {
        const errors = {
          1: '❌ PERMISSION DENIED — Go to browser settings and allow location access',
          2: '⚠️ POSITION UNAVAILABLE — GPS signal not found',
          3: '⏱️ TIMEOUT — GPS took too long to respond',
        };
        const msg = errors[err.code] || `GPS error: ${err.message}`;
        setGpsError(msg);
        setGpsStatus('GPS Failed');
        addLog(msg, 'error');
        addLog('💡 Trying low-accuracy fallback...', 'info');

        // Low accuracy fallback
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const loc = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              speed: 0,
              heading: 0,
              accuracy: Math.round(pos.coords.accuracy),
              source: 'Device Location (Network/WiFi)',
            };
            setCurrentLoc(loc);
            setGpsStatus('✅ Network location acquired!');
            addLog(`📍 Network: ${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)} (±${loc.accuracy}m)`, 'success');

            const result = await updateAmbulanceLocation('active_trip', {
              ...loc,
              status: 'En Route',
              driverName: 'Network Location Test',
              vehicleNumber: 'TEST-NET-01',
            });
            if (result.success) {
              addLog(`🔥 Firebase write SUCCESS (network loc)!`, 'success');
            }
          },
          (err2) => {
            addLog(`❌ Network fallback also failed: ${err2.message}`, 'error');
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const startWatch = () => {
    if (!navigator.geolocation) return;
    if (watchRef.current != null) {
      navigator.geolocation.clearWatch(watchRef.current);
    }
    addLog('👁️ Starting continuous GPS watch...', 'info');
    setGpsStatus('Watching GPS...');

    watchRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const loc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0,
          heading: pos.coords.heading || 0,
          accuracy: Math.round(pos.coords.accuracy),
          source: 'Live GPS Watch',
        };
        setCurrentLoc(loc);
        addLog(`📍 Watch update: ${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}`, 'success');

        await updateAmbulanceLocation('active_trip', {
          ...loc,
          status: 'En Route',
          driverName: 'Live GPS Watch',
          vehicleNumber: 'WATCH-TEST-01',
        });
      },
      (err) => {
        addLog(`❌ Watch error: ${err.message}`, 'error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
    );
  };

  const sendPatientGPS = () => {
    if (!navigator.geolocation) {
      setGpsError('❌ Geolocation not supported in this browser');
      return;
    }
    setGpsStatus('Requesting User GPS...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          address: 'User Real GPS Live Spot',
        };
        setCurrentLoc({ ...loc, accuracy: Math.round(pos.coords.accuracy), source: 'Real User Device GPS' });
        addLog(`👤 User GPS: ${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}`, 'success');
        const res = await updatePatientLocation('active_trip', loc);
        if (res.success) {
          addLog(`🔥 Wrote to Firebase: live_tracking/user & active_trip/patient!`, 'success');
          setGpsStatus('✅ User live GPS written to Firebase!');
        } else {
          addLog(`❌ Firebase error: ${res.error}`, 'error');
        }
      },
      (err) => {
        addLog(`❌ User GPS Error: ${err.message}`, 'error');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const stopWatch = () => {
    if (watchRef.current != null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
      setGpsStatus('Watch stopped');
      addLog('⏹️ GPS watch stopped', 'info');
    }
  };

  const clearFirebase = async () => {
    const { rtdb } = await import('@/lib/firebase');
    const { ref, set } = await import('firebase/database');
    if (!rtdb) { addLog('❌ RTDB not available', 'error'); return; }
    try {
      await set(ref(rtdb, 'live_tracking/active_trip'), {
        lat: 0,
        lng: 0,
        source: 'cleared',
        updatedAt: Date.now(),
        status: 'cleared',
      });
      addLog('🧹 Firebase active_trip cleared (waiting for real GPS)', 'info');
    } catch (e) {
      addLog(`❌ Clear error: ${e.message}`, 'error');
    }
  };

  useEffect(() => {
    return () => {
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: 'monospace', padding: '20px' }}>
      <h1 style={{ color: '#f97316', fontSize: '1.5rem', marginBottom: '8px' }}>🛰️ GPS + Firebase Live Debug</h1>
      <p style={{ color: '#94a3b8', marginBottom: '24px', fontSize: '0.85rem' }}>
        This page tests your real device GPS and writes directly to Firebase RTDB
      </p>

      {/* Status */}
      <div style={{ background: '#1e293b', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid #334155' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <span style={{ background: '#0f172a', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem' }}>
            GPS Permission: <strong style={{ color: permission === 'granted' ? '#4ade80' : permission === 'denied' ? '#f87171' : '#fbbf24' }}>{permission}</strong>
          </span>
        </div>

        <div style={{ color: '#fbbf24', marginBottom: '8px', fontSize: '0.9rem' }}>
          Status: {gpsStatus}
        </div>
        {gpsError && (
          <div style={{ background: '#7f1d1d', borderRadius: '8px', padding: '10px', color: '#fca5a5', fontSize: '0.85rem', marginBottom: '10px' }}>
            {gpsError}
          </div>
        )}
        {currentLoc && (
          <div style={{ background: '#14532d', borderRadius: '8px', padding: '10px', fontSize: '0.85rem' }}>
            <div style={{ color: '#4ade80', fontWeight: 'bold', marginBottom: '4px' }}>✅ Real Location Acquired:</div>
            <div>Latitude:  <strong style={{ color: '#86efac' }}>{currentLoc.lat.toFixed(8)}</strong></div>
            <div>Longitude: <strong style={{ color: '#86efac' }}>{currentLoc.lng.toFixed(8)}</strong></div>
            <div>Accuracy:  <strong style={{ color: '#86efac' }}>±{currentLoc.accuracy}m</strong></div>
            <div>Source:    <strong style={{ color: '#86efac' }}>{currentLoc.source}</strong></div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <button onClick={startGPS} style={{ background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 18px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}>
          🚑 Send Driver GPS to Firebase
        </button>
        <button onClick={sendPatientGPS} style={{ background: '#0284c7', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 18px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}>
          👤 Send User / Patient GPS to Firebase
        </button>
        <button onClick={startWatch} style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 18px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}>
          👁️ Start Live GPS Watch
        </button>
        <button onClick={stopWatch} style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 18px', cursor: 'pointer', fontSize: '0.9rem' }}>
          ⏹️ Stop Watch
        </button>
        <button onClick={clearFirebase} style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 18px', cursor: 'pointer', fontSize: '0.9rem' }}>
          🧹 Clear Firebase
        </button>
      </div>

      {/* Instructions */}
      <div style={{ background: '#1c1917', border: '1px solid #78350f', borderRadius: '10px', padding: '14px', marginBottom: '16px', fontSize: '0.82rem' }}>
        <div style={{ color: '#fbbf24', fontWeight: 'bold', marginBottom: '8px' }}>⚠️ If GPS shows PERMISSION DENIED:</div>
        <ol style={{ color: '#d6d3d1', paddingLeft: '20px', lineHeight: '1.8' }}>
          <li>Click the 🔒 lock icon in browser address bar</li>
          <li>Find "Location" and set to "Allow"</li>
          <li>Refresh the page</li>
          <li>Click "Get GPS Now" button again</li>
        </ol>
        <div style={{ color: '#94a3b8', marginTop: '8px' }}>
          Chrome on Windows: Settings → Privacy → Site Settings → Location → Allow localhost
        </div>
      </div>

      {/* Log */}
      <div style={{ background: '#020617', borderRadius: '10px', padding: '12px', maxHeight: '300px', overflow: 'auto', fontSize: '0.78rem', border: '1px solid #1e293b' }}>
        <div style={{ color: '#475569', marginBottom: '6px', fontSize: '0.75rem' }}>— Live Log (newest first) —</div>
        {firebaseLog.length === 0 && <div style={{ color: '#475569' }}>No events yet. Click a button above.</div>}
        {firebaseLog.map((entry, i) => (
          <div key={i} style={{ marginBottom: '3px', color: entry.type === 'error' ? '#f87171' : entry.type === 'success' ? '#4ade80' : '#94a3b8' }}>
            <span style={{ color: '#475569', marginRight: '8px' }}>{entry.time}</span>
            {entry.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
