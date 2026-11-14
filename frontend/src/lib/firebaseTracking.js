// src/lib/firebaseTracking.js — Real-time Ambulance Location Service via Firebase RTDB + Firestore
import { rtdb, db, isConfigured } from './firebase';
import { ref, set, onValue, off, serverTimestamp, get } from 'firebase/database';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

// In-browser BroadcastChannel for zero-latency local tab synchronization
const hasBroadcast = typeof window !== 'undefined' && 'BroadcastChannel' in window;
const localChannel = hasBroadcast ? new BroadcastChannel('ambulance_live_tracking') : null;

/**
 * Driver writes live GPS location to Firebase
 * @param {string} bookingId - The booking or trip ID (e.g. 'trip-001' or 'MOCK-001')
 * @param {object} coords - { lat, lng, speed, heading, status, driverName, vehicleNumber }
 */
export async function updateAmbulanceLocation(bookingId, coords) {
  if (!bookingId || !coords) return { success: false, reason: 'missing-params' };

  const lat = Number(coords.lat);
  const lng = Number(coords.lng);

  if (isNaN(lat) || isNaN(lng)) {
    return { success: false, reason: 'invalid-coordinates' };
  }

  const payload = {
    bookingId: String(bookingId),
    lat,
    lng,
    speed: Number(coords.speed) || 0,
    heading: Number(coords.heading) || 0,
    status: coords.status || 'En Route',
    driverName: coords.driverName || 'Ambulance Driver',
    vehicleNumber: coords.vehicleNumber || 'AMB-001',
    updatedAt: Date.now(),
  };

  // 1. Broadcast locally across browser tabs (for instant testing & cross-tab demo)
  if (localChannel) {
    try {
      localChannel.postMessage(payload);
    } catch (e) {
      // Ignore broadcast errors
    }
  }

  let rtdbSuccess = false;
  let firestoreSuccess = false;

  // 2. Realtime Database (fastest for live GPS streaming)
  if (rtdb) {
    try {
      // Write to the specific booking ID path
      const locRef = ref(rtdb, `live_tracking/${bookingId}`);
      await set(locRef, {
        ...payload,
        serverTime: serverTimestamp(),
      });

      // Also update latest active ambulance ping for global listeners
      const latestRef = ref(rtdb, 'live_tracking/latest');
      await set(latestRef, {
        ...payload,
        serverTime: serverTimestamp(),
      });

      rtdbSuccess = true;
    } catch (err) {
      console.warn('Firebase RTDB update error:', err.message);
    }
  }

  // 3. Firestore Fallback / Secondary Store
  if (db && (!rtdbSuccess || !rtdb)) {
    try {
      const docRef = doc(db, 'live_tracking', String(bookingId));
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
  if (!bookingId || typeof onLocationUpdate !== 'function') {
    return () => {};
  }

  let unsubRTDB = null;
  let unsubFirestore = null;

  // 1. Listen to Local BroadcastChannel (cross-tab)
  const handleLocalBroadcast = (event) => {
    const data = event.data;
    if (data && (String(data.bookingId) === String(bookingId) || bookingId === 'MOCK-001' || bookingId === 'trip-001')) {
      if (typeof data.lat === 'number' && typeof data.lng === 'number') {
        onLocationUpdate({
          lat: data.lat,
          lng: data.lng,
          speed: data.speed || 0,
          heading: data.heading || 0,
          status: data.status || 'En Route',
          updatedAt: data.updatedAt || Date.now(),
          source: 'local-broadcast',
        });
      }
    }
  };

  if (localChannel) {
    localChannel.addEventListener('message', handleLocalBroadcast);
  }

  // 2. Listen via Firebase Realtime Database
  if (rtdb) {
    try {
      const locRef = ref(rtdb, `live_tracking/${bookingId}`);
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
            source: 'firebase-rtdb',
          });
        }
      });

      unsubRTDB = () => off(locRef);
    } catch (err) {
      console.warn('Firebase RTDB subscribe error:', err.message);
    }
  }

  // 3. Listen via Firestore fallback
  if (db && !unsubRTDB) {
    try {
      const docRef = doc(db, 'live_tracking', String(bookingId));
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
              source: 'firebase-firestore',
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
