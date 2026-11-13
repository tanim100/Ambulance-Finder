// src/lib/firebaseTracking.js — Real-time Ambulance Location Service via Firebase + Local Sync Fallback
import { rtdb, db, isConfigured } from './firebase';
import { ref, set, onValue, off, serverTimestamp } from 'firebase/database';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

// In-browser BroadcastChannel for instant cross-tab local synchronization (test mode)
const hasBroadcast = typeof window !== 'undefined' && 'BroadcastChannel' in window;
const localChannel = hasBroadcast ? new BroadcastChannel('ambulance_live_tracking') : null;

/**
 * Driver writes live GPS location
 * @param {string} bookingId - The booking or trip ID
 * @param {object} coords - { lat, lng, speed, heading, status }
 */
export async function updateAmbulanceLocation(bookingId, coords) {
  if (!bookingId || !coords) return false;

  const payload = {
    lat: Number(coords.lat),
    lng: Number(coords.lng),
    speed: coords.speed ?? 0,
    heading: coords.heading ?? 0,
    status: coords.status || 'En Route',
    updatedAt: Date.now(),
  };

  // 1. Broadcast locally across browser tabs (for instant testing & offline resilience)
  if (localChannel) {
    try {
      localChannel.postMessage({ bookingId: String(bookingId), ...payload });
    } catch (e) {
      // Ignore broadcast errors
    }
  }

  // 2. Real-time Firebase Database (best for live streaming coordinates)
  if (rtdb && isConfigured) {
    try {
      const locRef = ref(rtdb, `live_tracking/${bookingId}`);
      await set(locRef, {
        ...payload,
        serverTime: serverTimestamp(),
      });
      return true;
    } catch (err) {
      console.warn('Firebase RTDB update error, attempting Firestore fallback:', err.message);
    }
  }

  // 3. Firestore Fallback
  if (db && isConfigured) {
    try {
      const docRef = doc(db, 'live_tracking', String(bookingId));
      await setDoc(docRef, payload, { merge: true });
      return true;
    } catch (err) {
      console.warn('Firebase Firestore update error:', err.message);
    }
  }

  return true;
}

/**
 * User / Patient listens to live ambulance location on Map
 * @param {string} bookingId - The booking ID to track
 * @param {function} onLocationUpdate - Callback receiving ({ lat, lng, speed, status, updatedAt, source })
 * @returns {function} unsubscribe function to clean up listener
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
    if (data && String(data.bookingId) === String(bookingId)) {
      if (typeof data.lat === 'number' && typeof data.lng === 'number') {
        onLocationUpdate({
          lat: data.lat,
          lng: data.lng,
          speed: data.speed || 0,
          status: data.status || 'En Route',
          updatedAt: data.updatedAt || Date.now(),
          source: isConfigured ? 'firebase-local' : 'local-sync',
        });
      }
    }
  };

  if (localChannel) {
    localChannel.addEventListener('message', handleLocalBroadcast);
  }

  // 2. Listen via Firebase Realtime Database
  if (rtdb && isConfigured) {
    try {
      const locRef = ref(rtdb, `live_tracking/${bookingId}`);
      onValue(locRef, (snapshot) => {
        const val = snapshot.val();
        if (val && typeof val.lat === 'number' && typeof val.lng === 'number') {
          onLocationUpdate({
            lat: val.lat,
            lng: val.lng,
            speed: val.speed || 0,
            status: val.status || 'En Route',
            updatedAt: val.updatedAt || Date.now(),
            source: 'firebase-rtdb',
          });
        }
      });

      unsubRTDB = () => off(locRef);
    } catch (err) {
      console.warn('Firebase RTDB subscribe notice:', err.message);
    }
  }

  // 3. Listen via Firestore fallback
  if (db && isConfigured && !unsubRTDB) {
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
              status: val.status || 'En Route',
              updatedAt: val.updatedAt || Date.now(),
              source: 'firebase-firestore',
            });
          }
        }
      });
    } catch (err) {
      console.warn('Firebase Firestore subscribe notice:', err.message);
    }
  }

  // Return comprehensive unmount cleanup
  return () => {
    if (localChannel) {
      localChannel.removeEventListener('message', handleLocalBroadcast);
    }
    if (unsubRTDB) unsubRTDB();
    if (unsubFirestore) unsubFirestore();
  };
}
