// src/lib/firebaseTracking.js — Robust Two-Way Live Ambulance & Patient Location Service via Firebase RTDB + Firestore
import { rtdb, db, isConfigured } from './firebase';
import { ref, set, onValue, off, serverTimestamp, get } from 'firebase/database';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

// In-browser BroadcastChannel for zero-latency local tab synchronization
const hasBroadcast = typeof window !== 'undefined' && 'BroadcastChannel' in window;
const localChannel = hasBroadcast ? new BroadcastChannel('ambulance_live_tracking') : null;

/**
 * Driver writes live GPS location to Firebase
 * @param {string} bookingId - The booking or trip ID (e.g. 'active_trip', 'trip-001', or custom booking ID)
 * @param {object} coords - { lat, lng, speed, heading, status, driverName, vehicleNumber, source }
 */
export async function updateAmbulanceLocation(bookingId, coords) {
  if (!coords) return { success: false, reason: 'missing-params' };

  const lat = Number(coords.lat);
  const lng = Number(coords.lng);

  if (isNaN(lat) || isNaN(lng)) {
    return { success: false, reason: 'invalid-coordinates' };
  }

  const payload = {
    bookingId: String(bookingId || 'active_trip'),
    lat,
    lng,
    speed: Number(coords.speed) || 0,
    heading: Number(coords.heading) || 0,
    status: coords.status || 'En Route',
    driverName: coords.driverName || 'Assigned Driver',
    vehicleNumber: coords.vehicleNumber || 'DHA-AMB-4421',
    source: coords.source || 'Live Device GPS',
    updatedAt: Date.now(),
  };

  // 1. Broadcast locally across browser tabs
  if (localChannel) {
    try {
      localChannel.postMessage({ type: 'ambulance_location', ...payload });
    } catch (e) {}
  }

  let rtdbSuccess = false;

  // 2. Realtime Database — Write to specific booking, active_trip, and latest
  if (rtdb) {
    try {
      const updates = {};
      if (bookingId && bookingId !== 'active_trip') {
        updates[`live_tracking/${bookingId}`] = { ...payload, serverTime: serverTimestamp() };
      }
      updates['live_tracking/active_trip'] = { ...payload, serverTime: serverTimestamp() };
      updates['live_tracking/latest'] = { ...payload, serverTime: serverTimestamp() };

      await Promise.all(
        Object.entries(updates).map(([path, data]) => set(ref(rtdb, path), data))
      );
      rtdbSuccess = true;
    } catch (err) {
      console.warn('Firebase RTDB update error:', err.message);
    }
  }

  // 3. Firestore Fallback
  if (db && !rtdbSuccess) {
    try {
      const docRef = doc(db, 'live_tracking', String(bookingId || 'active_trip'));
      await setDoc(docRef, payload, { merge: true });
    } catch (err) {
      console.warn('Firebase Firestore update error:', err.message);
    }
  }

  return {
    success: true,
    payload,
  };
}

/**
 * Patient writes exact pickup location to Firebase
 * @param {string} bookingId - The booking ID
 * @param {object} coords - { lat, lng, address }
 */
export async function updatePatientLocation(bookingId, coords) {
  if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') return;

  const payload = {
    patientLat: coords.lat,
    patientLng: coords.lng,
    pickupAddress: coords.address || 'Patient Current Location',
    updatedAt: Date.now(),
  };

  if (rtdb) {
    try {
      if (bookingId && bookingId !== 'active_trip') {
        await set(ref(rtdb, `live_tracking/${bookingId}/patient`), payload);
      }
      await set(ref(rtdb, 'live_tracking/active_trip/patient'), payload);
    } catch {}
  }

  if (localChannel) {
    try {
      localChannel.postMessage({ type: 'patient_location', ...payload });
    } catch {}
  }
}

/**
 * User / Patient listens to live ambulance location on Map
 * @param {string} bookingId - The booking ID to track
 * @param {function} onLocationUpdate - Callback receiving ({ lat, lng, speed, status, updatedAt, source })
 * @returns {function} unsubscribe cleanup function
 */
export function subscribeToAmbulanceLocation(bookingId, onLocationUpdate) {
  if (typeof onLocationUpdate !== 'function') {
    return () => {};
  }

  const effectiveId = bookingId || 'active_trip';
  const cleanups = [];

  // 1. Listen to Local BroadcastChannel
  const handleLocalBroadcast = (event) => {
    const data = event.data;
    if (data && typeof data.lat === 'number' && typeof data.lng === 'number') {
      onLocationUpdate({
        lat: data.lat,
        lng: data.lng,
        speed: data.speed || 0,
        heading: data.heading || 0,
        status: data.status || 'En Route',
        updatedAt: data.updatedAt || Date.now(),
        source: data.source || 'Live Local Device GPS',
      });
    }
  };

  if (localChannel) {
    localChannel.addEventListener('message', handleLocalBroadcast);
    cleanups.push(() => localChannel.removeEventListener('message', handleLocalBroadcast));
  }

  // 2. Listen via Firebase Realtime Database
  if (rtdb) {
    const attachListener = (path) => {
      try {
        const locRef = ref(rtdb, path);
        onValue(locRef, (snapshot) => {
          const val = snapshot.val();
          if (val && typeof val.lat === 'number' && typeof val.lng === 'number') {
            onLocationUpdate({
              lat: val.lat,
              lng: val.lng,
              speed: val.speed || 0,
              heading: val.heading || 0,
              status: val.status || 'En Route',
              updatedAt: val.updatedAt || Date.now(),
              source: val.source || 'Firebase Live Stream',
            });
          }
        });
        cleanups.push(() => off(locRef));
      } catch (e) {}
    };

    // Listen to specific ID path
    attachListener(`live_tracking/${effectiveId}`);

    // If ID is not active_trip, also attach listener to active_trip so changes on /active are received
    if (effectiveId !== 'active_trip') {
      attachListener('live_tracking/active_trip');
    }
  }

  return () => {
    cleanups.forEach((fn) => {
      try { fn(); } catch {}
    });
  };
}

/**
 * Health check to verify Firebase connectivity directly
 */
export async function testFirebaseConnection() {
  if (!rtdb && !db) {
    return { ok: false, error: 'Firebase not initialized. Check .env.local' };
  }

  if (rtdb) {
    try {
      const pingRef = ref(rtdb, 'live_tracking/_ping');
      await set(pingRef, { ping: 'ok', timestamp: Date.now() });
      const snap = await get(pingRef);
      return { ok: true, provider: 'Firebase Realtime Database', data: snap.val() };
    } catch (e) {
      return { ok: false, provider: 'RTDB', error: e.message };
    }
  }

  return { ok: false, error: 'RTDB disabled' };
}
