// src/lib/firebaseTracking.js — Real-time Ambulance Location Service via Firebase RTDB + Firestore
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
    driverName: coords.driverName || 'Ambulance Driver',
    vehicleNumber: coords.vehicleNumber || 'DHA-AMB-4421',
    source: coords.source || 'Realtime Device GPS',
    updatedAt: Date.now(),
  };

  // 1. Broadcast locally across browser tabs
  if (localChannel) {
    try {
      localChannel.postMessage(payload);
    } catch (e) {
      // Ignore broadcast errors
    }
  }

  let rtdbSuccess = false;
  let firestoreSuccess = false;

  // 2. Realtime Database
  if (rtdb) {
    try {
      // Write to specific booking path
      if (bookingId) {
        const locRef = ref(rtdb, `live_tracking/${bookingId}`);
        await set(locRef, { ...payload, serverTime: serverTimestamp() });
      }

      // Always write to active_trip for real-time central view
      const activeRef = ref(rtdb, 'live_tracking/active_trip');
      await set(activeRef, { ...payload, serverTime: serverTimestamp() });

      // Write to ambulances list
      const ambRef = ref(rtdb, `live_tracking/ambulances/${payload.vehicleNumber}`);
      await set(ambRef, { ...payload, serverTime: serverTimestamp() });

      rtdbSuccess = true;
    } catch (err) {
      console.warn('Firebase RTDB update error:', err.message);
    }
  }

  // 3. Firestore Fallback
  if (db && (!rtdbSuccess || !rtdb)) {
    try {
      const docRef = doc(db, 'live_tracking', String(bookingId || 'active_trip'));
      await setDoc(docRef, payload, { merge: true });
      firestoreSuccess = true;
    } catch (err) {
      console.warn('Firebase Firestore update error:', err.message);
    }
  }

  return {
    success: rtdbSuccess || firestoreSuccess || Boolean(localChannel),
    provider: rtdbSuccess ? 'RTDB' : firestoreSuccess ? 'Firestore' : 'LocalBroadcast',
    payload,
  };
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
  let unsubRTDB = null;
  let unsubActive = null;
  let unsubFirestore = null;

  // 1. Listen to Local BroadcastChannel (cross-tab)
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
        source: data.source || 'Realtime Device GPS',
      });
    }
  };

  if (localChannel) {
    localChannel.addEventListener('message', handleLocalBroadcast);
  }

  // 2. Listen via Firebase Realtime Database
  if (rtdb) {
    try {
      const locRef = ref(rtdb, `live_tracking/${effectiveId}`);
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
            source: val.source || 'Firebase RTDB Live Stream',
          });
        }
      });
      unsubRTDB = () => off(locRef);

      // Also listen to active_trip as fallback
      if (effectiveId !== 'active_trip') {
        const activeRef = ref(rtdb, 'live_tracking/active_trip');
        onValue(activeRef, (snapshot) => {
          const val = snapshot.val();
          if (val && typeof val.lat === 'number' && typeof val.lng === 'number') {
            onLocationUpdate({
              lat: val.lat,
              lng: val.lng,
              speed: val.speed || 0,
              heading: val.heading || 0,
              status: val.status || 'En Route',
              updatedAt: val.updatedAt || Date.now(),
              source: val.source || 'Firebase RTDB Live Stream',
            });
          }
        });
        unsubActive = () => off(activeRef);
      }
    } catch (err) {
      console.warn('Firebase RTDB subscribe error:', err.message);
    }
  }

  // 3. Listen via Firestore fallback
  if (db && !unsubRTDB) {
    try {
      const docRef = doc(db, 'live_tracking', String(effectiveId));
      unsubFirestore = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const val = docSnap.data();
          if (val && typeof val.lat === 'number' && typeof val.lng === 'number') {
            onLocationUpdate({
              lat: val.lat,
              lng: val.lng,
              speed: val.speed || 0,
              heading: val.heading || 0,
              status: val.status || 'En Route',
              updatedAt: val.updatedAt || Date.now(),
              source: val.source || 'Firebase Firestore Live Stream',
            });
          }
        }
      });
    } catch (err) {
      console.warn('Firebase Firestore subscribe error:', err.message);
    }
  }

  return () => {
    if (localChannel) {
      localChannel.removeEventListener('message', handleLocalBroadcast);
    }
    if (unsubRTDB) unsubRTDB();
    if (unsubActive) unsubActive();
    if (unsubFirestore) unsubFirestore();
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
