// src/lib/firebaseTracking.js — Robust Two-Way Live Ambulance & Patient Location Service via Firebase RTDB + Firestore
import { rtdb, db, isConfigured } from './firebase';
import { ref, set, update, onValue, off, serverTimestamp, get } from 'firebase/database';
import { doc, setDoc } from 'firebase/firestore';

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

  // 2. Realtime Database — Write with update() so patient child is NOT wiped out!
  if (rtdb) {
    try {
      const dbPayload = { ...payload, serverTime: serverTimestamp() };

      // Update active_trip without deleting patient node
      await update(ref(rtdb, 'live_tracking/active_trip'), dbPayload);

      // Dedicated driver node for direct visibility in Firebase Console
      await set(ref(rtdb, 'live_tracking/driver'), dbPayload);

      // Latest pointer
      await update(ref(rtdb, 'live_tracking/latest'), dbPayload);

      // Specific booking node if different
      if (bookingId && bookingId !== 'active_trip') {
        await update(ref(rtdb, `live_tracking/${bookingId}`), dbPayload);
      }

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
    provider: rtdbSuccess ? 'Firebase RTDB' : 'Local Fallback',
  };
}

/**
 * Patient / User writes exact location to Firebase
 * @param {string} bookingId - The booking ID
 * @param {object} coords - { lat, lng, address }
 */
export async function updatePatientLocation(bookingId, coords) {
  if (!coords) return { success: false, reason: 'missing-coords' };

  const lat = Number(coords.lat);
  const lng = Number(coords.lng);

  if (isNaN(lat) || isNaN(lng)) return { success: false, reason: 'invalid-coords' };

  const payload = {
    patientLat: lat,
    patientLng: lng,
    lat,
    lng,
    pickupAddress: coords.address || 'Patient Current Location',
    bookingId: String(bookingId || 'active_trip'),
    updatedAt: Date.now(),
  };

  if (localChannel) {
    try {
      localChannel.postMessage({ type: 'patient_location', ...payload });
    } catch {}
  }

  if (rtdb) {
    try {
      // 1. Write under active_trip/patient
      await set(ref(rtdb, 'live_tracking/active_trip/patient'), payload);

      // 2. Direct top-level user & patient nodes for crystal-clear Firebase Console visibility
      await set(ref(rtdb, 'live_tracking/user'), payload);
      await set(ref(rtdb, 'live_tracking/patient'), payload);

      // 3. Write under specific booking id
      if (bookingId && bookingId !== 'active_trip') {
        await set(ref(rtdb, `live_tracking/${bookingId}/patient`), payload);
      }
      return { success: true, payload };
    } catch (e) {
      console.warn('Firebase updatePatientLocation error:', e.message);
      return { success: false, error: e.message };
    }
  }

  return { success: true, payload, note: 'local-only' };
}

/**
 * User / Patient listens to live ambulance/driver location on Map
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

    // Listen to driver node
    attachListener('live_tracking/driver');

    // Listen to active_trip
    attachListener('live_tracking/active_trip');

    // Listen to specific ID path if different
    if (effectiveId !== 'active_trip') {
      attachListener(`live_tracking/${effectiveId}`);
    }
  }

  return () => {
    cleanups.forEach((fn) => {
      try { fn(); } catch {}
    });
  };
}

/**
 * Driver listens to live patient / user location
 */
export function subscribeToPatientLocation(bookingId, onPatientUpdate) {
  if (typeof onPatientUpdate !== 'function' || !rtdb) return () => {};

  const cleanups = [];

  const attachListener = (path) => {
    try {
      const patientRef = ref(rtdb, path);
      onValue(patientRef, (snap) => {
        const val = snap.val();
        if (val) {
          const pLat = val.patientLat ?? val.lat;
          const pLng = val.patientLng ?? val.lng;
          if (typeof pLat === 'number' && typeof pLng === 'number') {
            onPatientUpdate({
              lat: pLat,
              lng: pLng,
              patientLat: pLat,
              patientLng: pLng,
              pickupAddress: val.pickupAddress || val.address,
              updatedAt: val.updatedAt,
            });
          }
        }
      });
      cleanups.push(() => off(patientRef));
    } catch {}
  };

  attachListener('live_tracking/active_trip/patient');
  attachListener('live_tracking/user');

  return () => {
    cleanups.forEach((fn) => {
      try { fn(); } catch {}
    });
  };
}

/**
 * Update Destination Hospital in Firebase Realtime Database
 */
export async function updateDestinationHospital(bookingId, hospital) {
  if (!hospital) return { success: false };
  const payload = {
    id: hospital.id || 'general',
    name: hospital.name,
    shortName: hospital.shortName || hospital.name,
    lat: Number(hospital.lat),
    lng: Number(hospital.lng),
    hotline: hospital.hotline || '',
    emergency: hospital.emergency || '',
    area: hospital.area || '',
    updatedAt: Date.now(),
  };

  if (localChannel) {
    try {
      localChannel.postMessage({ type: 'destination_hospital', ...payload });
    } catch {}
  }

  if (rtdb) {
    try {
      await update(ref(rtdb, 'live_tracking/active_trip/destination'), payload);
      await set(ref(rtdb, 'live_tracking/destination'), payload);
      if (bookingId && bookingId !== 'active_trip') {
        await update(ref(rtdb, `live_tracking/${bookingId}/destination`), payload);
      }
    } catch (e) {
      console.warn('updateDestinationHospital error:', e.message);
    }
  }
  return { success: true, payload };
}

/**
 * Driver or User listens to selected destination hospital
 */
export function subscribeToDestinationHospital(bookingId, onHospitalUpdate) {
  if (typeof onHospitalUpdate !== 'function') return () => {};
  const cleanups = [];

  if (localChannel) {
    const handleLocal = (event) => {
      if (event.data?.type === 'destination_hospital') {
        onHospitalUpdate(event.data);
      }
    };
    localChannel.addEventListener('message', handleLocal);
    cleanups.push(() => localChannel.removeEventListener('message', handleLocal));
  }

  if (rtdb) {
    const attach = (path) => {
      try {
        const destRef = ref(rtdb, path);
        onValue(destRef, (snap) => {
          const val = snap.val();
          if (val && typeof val.lat === 'number' && typeof val.lng === 'number') {
            onHospitalUpdate(val);
          }
        });
        cleanups.push(() => off(destRef));
      } catch {}
    };
    attach('live_tracking/active_trip/destination');
    attach('live_tracking/destination');
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
