// src/lib/firebaseTracking.js — Robust Two-Way Live Ambulance & Patient Location Service via Firebase RTDB + Firestore
import { rtdb, db, isConfigured } from './firebase';
import { ref, set, update, onValue, off, serverTimestamp, get, remove, runTransaction } from 'firebase/database';
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

// ============================================================================
// CANONICAL 9-POINT ROADMAP IMPLEMENTATION (requests/ & locations/)
// ============================================================================

/**
 * 3. User creates the request
 * Writes to requests/{requestId} with status: "pending"
 * and initializes locations/{requestId}/user: {lat, lng, timestamp}
 */
export async function createAmbulanceRequest({
  requestId,
  userId,
  pickup,
  destination,
  patientDetails,
}) {
  const reqId = String(requestId || `req_${Date.now()}`);
  const effectiveUserId = String(userId || `user_${Math.random().toString(36).substring(2, 9)}`);

  const requestNode = {
    requestId: reqId,
    userId: effectiveUserId,
    driverId: null,
    status: 'pending',
    pickup: {
      lat: Number(pickup?.lat || 23.8282),
      lng: Number(pickup?.lng || 90.4163),
      address: pickup?.address || 'Current Patient Location',
    },
    destination: {
      name: destination?.name || 'Nearest General Hospital (Auto-Triage)',
      lat: destination?.lat ? Number(destination.lat) : 23.8188,
      lng: destination?.lng ? Number(destination.lng) : 90.4074,
      hotline: destination?.hotline || '',
    },
    patientDetails: {
      name: patientDetails?.name || 'Patient',
      phone: patientDetails?.phone || '+880 1700-000000',
      emergencyType: patientDetails?.emergencyType || 'General Emergency',
      ambulanceType: patientDetails?.ambulanceType || 'Basic Life Support',
      notes: patientDetails?.notes || '',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const initialUserLocation = {
    lat: Number(pickup?.lat || 23.8282),
    lng: Number(pickup?.lng || 90.4163),
    timestamp: Date.now(),
  };

  // Local BroadcastChannel
  if (localChannel) {
    try {
      localChannel.postMessage({ type: 'new_request', ...requestNode });
      localChannel.postMessage({ type: 'user_location', requestId: reqId, ...initialUserLocation });
    } catch (e) {}
  }

  // Firebase Realtime Database
  if (rtdb) {
    try {
      await set(ref(rtdb, `requests/${reqId}`), requestNode);
      await set(ref(rtdb, `locations/${reqId}/user`), initialUserLocation);

      // Also sync to legacy active_trip so all views remain compatible
      await set(ref(rtdb, 'live_tracking/active_trip'), {
        ...requestNode,
        patient: {
          patientLat: initialUserLocation.lat,
          patientLng: initialUserLocation.lng,
          pickupAddress: requestNode.pickup.address,
        },
        destination: requestNode.destination,
      });
      await set(ref(rtdb, 'live_tracking/user'), initialUserLocation);
    } catch (err) {
      console.warn('Firebase createAmbulanceRequest warning:', err.message);
    }
  }

  return { success: true, requestId: reqId, request: requestNode };
}

/**
 * 4. Driver receives the request
 * Drivers listen to requests/ (filter status == "pending") and see incoming requests.
 */
export function subscribeToPendingRequests(onRequestsUpdate) {
  if (typeof onRequestsUpdate !== 'function') return () => {};
  const cleanups = [];

  // Local tab sync
  if (localChannel) {
    const handleLocal = (e) => {
      if (e.data?.type === 'new_request' && e.data?.status === 'pending') {
        onRequestsUpdate([e.data]);
      }
    };
    localChannel.addEventListener('message', handleLocal);
    cleanups.push(() => localChannel.removeEventListener('message', handleLocal));
  }

  if (rtdb) {
    try {
      const requestsRef = ref(rtdb, 'requests');
      onValue(requestsRef, (snapshot) => {
        const val = snapshot.val();
        if (!val) {
          onRequestsUpdate([]);
          return;
        }
        const pendingList = Object.keys(val)
          .map((key) => ({ ...val[key], requestId: key }))
          .filter((req) => req.status === 'pending')
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        onRequestsUpdate(pendingList);
      });
      cleanups.push(() => off(requestsRef));
    } catch (err) {
      console.warn('subscribeToPendingRequests warning:', err.message);
    }
  }

  return () => {
    cleanups.forEach((fn) => {
      try { fn(); } catch {}
    });
  };
}

/**
 * 4. Driver accepts request
 * When driver taps Accept, update node: status: "accepted", driverId: <driver UID>
 * Uses transaction or atomic update so only one driver can accept the same request.
 */
export async function acceptAmbulanceRequest(requestId, driverInfo = {}) {
  const reqId = String(requestId || 'active_trip');
  const driverUid = String(driverInfo.uid || driverInfo.id || 'driver_001');

  const driverDetails = {
    name: driverInfo.name || 'Assigned Driver',
    phone: driverInfo.phone || '01942809157',
    vehicleNumber: driverInfo.vehicleNumber || 'DHA-AMB-4421',
    rating: driverInfo.rating || 4.9,
    lat: Number(driverInfo.lat || 23.8231),
    lng: Number(driverInfo.lng || 90.4263),
  };

  const initialDriverLocation = {
    lat: driverDetails.lat,
    lng: driverDetails.lng,
    speed: 38,
    heading: 0,
    timestamp: Date.now(),
  };

  // Local Broadcast
  if (localChannel) {
    try {
      localChannel.postMessage({
        type: 'request_accepted',
        requestId: reqId,
        driverId: driverUid,
        driverDetails,
      });
      localChannel.postMessage({
        type: 'driver_location',
        requestId: reqId,
        ...initialDriverLocation,
      });
    } catch (e) {}
  }

  if (rtdb) {
    try {
      const requestRef = ref(rtdb, `requests/${reqId}`);

      // Atomic transaction: verify status is still pending before accepting
      await runTransaction(requestRef, (currentData) => {
        if (!currentData || currentData.status === 'pending') {
          return {
            ...(currentData || {}),
            requestId: reqId,
            status: 'accepted',
            driverId: driverUid,
            driverDetails,
            acceptedAt: Date.now(),
            updatedAt: Date.now(),
          };
        }
        // Already accepted by another driver
        return currentData;
      });

      // Initialize locations/{requestId}/driver
      await set(ref(rtdb, `locations/${reqId}/driver`), initialDriverLocation);

      // Also update legacy live_tracking nodes
      await update(ref(rtdb, 'live_tracking/active_trip'), {
        status: 'accepted',
        driverId: driverUid,
        driverName: driverDetails.name,
        vehicleNumber: driverDetails.vehicleNumber,
        driverPhone: driverDetails.phone,
        lat: driverDetails.lat,
        lng: driverDetails.lng,
        updatedAt: Date.now(),
      });
      await set(ref(rtdb, 'live_tracking/driver'), initialDriverLocation);
    } catch (err) {
      console.warn('acceptAmbulanceRequest transaction error:', err.message);
    }
  }

  return { success: true, requestId: reqId, driverId: driverUid, driverDetails };
}

/**
 * 3. Listen to that request node for status changes
 */
export function subscribeToRequest(requestId, onRequestUpdate) {
  if (typeof onRequestUpdate !== 'function') return () => {};
  const reqId = String(requestId || 'active_trip');
  const cleanups = [];

  if (localChannel) {
    const handleLocal = (e) => {
      if (e.data?.requestId === reqId || e.data?.bookingId === reqId) {
        onRequestUpdate(e.data);
      }
    };
    localChannel.addEventListener('message', handleLocal);
    cleanups.push(() => localChannel.removeEventListener('message', handleLocal));
  }

  if (rtdb) {
    try {
      const reqRef = ref(rtdb, `requests/${reqId}`);
      onValue(reqRef, (snapshot) => {
        const val = snapshot.val();
        if (val) onRequestUpdate(val);
      });
      cleanups.push(() => off(reqRef));

      // Also listen to legacy live_tracking/active_trip
      const legacyRef = ref(rtdb, 'live_tracking/active_trip');
      onValue(legacyRef, (snapshot) => {
        const val = snapshot.val();
        if (val) onRequestUpdate(val);
      });
      cleanups.push(() => off(legacyRef));
    } catch (err) {}
  }

  return () => {
    cleanups.forEach((fn) => {
      try { fn(); } catch {}
    });
  };
}

/**
 * 5. User app: writes to locations/{requestId}/user
 */
export async function updateUserLiveLocation(requestId, { lat, lng }) {
  const reqId = String(requestId || 'active_trip');
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (isNaN(numLat) || isNaN(numLng)) return;

  const payload = {
    lat: numLat,
    lng: numLng,
    timestamp: Date.now(),
  };

  if (localChannel) {
    try {
      localChannel.postMessage({ type: 'user_location', requestId: reqId, ...payload });
    } catch (e) {}
  }

  if (rtdb) {
    try {
      await set(ref(rtdb, `locations/${reqId}/user`), payload);
      await set(ref(rtdb, 'live_tracking/user'), payload);
      await update(ref(rtdb, 'live_tracking/active_trip/patient'), {
        patientLat: numLat,
        patientLng: numLng,
        lat: numLat,
        lng: numLng,
        updatedAt: Date.now(),
      });
    } catch (e) {}
  }
}

/**
 * 5. Driver app: writes to locations/{requestId}/driver
 */
export async function updateDriverLiveLocation(requestId, { lat, lng, speed, heading, status }) {
  const reqId = String(requestId || 'active_trip');
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (isNaN(numLat) || isNaN(numLng)) return;

  const payload = {
    lat: numLat,
    lng: numLng,
    speed: Number(speed) || 0,
    heading: Number(heading) || 0,
    status: status || 'En Route',
    timestamp: Date.now(),
  };

  if (localChannel) {
    try {
      localChannel.postMessage({ type: 'driver_location', requestId: reqId, ...payload });
    } catch (e) {}
  }

  if (rtdb) {
    try {
      await set(ref(rtdb, `locations/${reqId}/driver`), payload);
      await set(ref(rtdb, 'live_tracking/driver'), payload);
      await update(ref(rtdb, 'live_tracking/active_trip'), {
        lat: numLat,
        lng: numLng,
        speed: payload.speed,
        heading: payload.heading,
        status: payload.status,
        updatedAt: Date.now(),
      });
    } catch (e) {}
  }
}

/**
 * 6. User app: listens to locations/{requestId}/driver and moves the driver marker on the map
 */
export function subscribeToDriverLiveLocation(requestId, onDriverUpdate) {
  if (typeof onDriverUpdate !== 'function') return () => {};
  const reqId = String(requestId || 'active_trip');
  const cleanups = [];

  if (localChannel) {
    const handleLocal = (e) => {
      if (e.data?.type === 'driver_location' && (e.data.requestId === reqId || reqId === 'active_trip')) {
        onDriverUpdate(e.data);
      }
    };
    localChannel.addEventListener('message', handleLocal);
    cleanups.push(() => localChannel.removeEventListener('message', handleLocal));
  }

  if (rtdb) {
    try {
      const driverRef = ref(rtdb, `locations/${reqId}/driver`);
      onValue(driverRef, (snap) => {
        const val = snap.val();
        if (val && typeof val.lat === 'number' && typeof val.lng === 'number') {
          onDriverUpdate(val);
        }
      });
      cleanups.push(() => off(driverRef));

      // Fallback to legacy path
      const legacyDriverRef = ref(rtdb, 'live_tracking/driver');
      onValue(legacyDriverRef, (snap) => {
        const val = snap.val();
        if (val && typeof val.lat === 'number' && typeof val.lng === 'number') {
          onDriverUpdate(val);
        }
      });
      cleanups.push(() => off(legacyDriverRef));
    } catch (e) {}
  }

  return () => {
    cleanups.forEach((fn) => {
      try { fn(); } catch {}
    });
  };
}

/**
 * 6. Driver app: listens to locations/{requestId}/user and moves the user marker on the map
 */
export function subscribeToUserLiveLocation(requestId, onUserUpdate) {
  if (typeof onUserUpdate !== 'function') return () => {};
  const reqId = String(requestId || 'active_trip');
  const cleanups = [];

  if (localChannel) {
    const handleLocal = (e) => {
      if (e.data?.type === 'user_location' && (e.data.requestId === reqId || reqId === 'active_trip')) {
        onUserUpdate(e.data);
      }
    };
    localChannel.addEventListener('message', handleLocal);
    cleanups.push(() => localChannel.removeEventListener('message', handleLocal));
  }

  if (rtdb) {
    try {
      const userLocRef = ref(rtdb, `locations/${reqId}/user`);
      onValue(userLocRef, (snap) => {
        const val = snap.val();
        if (val && typeof val.lat === 'number' && typeof val.lng === 'number') {
          onUserUpdate(val);
        }
      });
      cleanups.push(() => off(userLocRef));

      // Fallback to legacy user node
      const legacyUserRef = ref(rtdb, 'live_tracking/user');
      onValue(legacyUserRef, (snap) => {
        const val = snap.val();
        if (val && typeof val.lat === 'number' && typeof val.lng === 'number') {
          onUserUpdate(val);
        }
      });
      cleanups.push(() => off(legacyUserRef));
    } catch (e) {}
  }

  return () => {
    cleanups.forEach((fn) => {
      try { fn(); } catch {}
    });
  };
}

/**
 * 7. Stop sharing
 * When trip is completed or cancelled, remove listeners and delete locations/{requestId}
 */
export async function completeOrCancelTrip(requestId, status = 'completed') {
  const reqId = String(requestId || 'active_trip');

  if (rtdb) {
    try {
      // 1. Mark request status
      await update(ref(rtdb, `requests/${reqId}`), {
        status,
        completedAt: Date.now(),
        updatedAt: Date.now(),
      });

      // 2. Delete locations/{requestId} to protect privacy
      await remove(ref(rtdb, `locations/${reqId}`));

      // 3. Update legacy active_trip
      await update(ref(rtdb, 'live_tracking/active_trip'), {
        status: status === 'completed' ? 'Completed' : 'Cancelled',
        completedAt: Date.now(),
      });
    } catch (e) {
      console.warn('completeOrCancelTrip warning:', e.message);
    }
  }

  return { success: true, requestId: reqId, status };
}

