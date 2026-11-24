// src/app/(user)/tracking/[id]/page.jsx
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { bookingAPI } from '@/lib/api';
import io from 'socket.io-client';
import {
  subscribeToAmbulanceLocation,
  updatePatientLocation,
  updateAmbulanceLocation,
  updateDestinationHospital,
  subscribeToRequest,
  subscribeToDriverLiveLocation,
  updateUserLiveLocation,
  completeOrCancelTrip,
} from '@/lib/firebaseTracking';
import { Play, Pause, RotateCcw, Navigation, CheckCircle2, Phone, Hospital, ChevronRight, AlertCircle } from 'lucide-react';

// Leaflet map — no SSR
const MapComponent = dynamic(() => import('@/components/map/MapComponent'), { ssr: false });

const STATUS_STEPS = ['Pending', 'Accepted', 'En Route', 'Arrived', 'Heading to Hospital', 'Completed'];

// Major Connected Emergency Hospitals with Exact Coordinates
const NEARBY_HOSPITALS = [
  {
    id: 'kurmitola',
    name: 'Kurmitola General Hospital',
    shortName: 'Kurmitola Hospital',
    area: 'Dhaka Cantonment / Airport Rd',
    lat: 23.8188,
    lng: 90.4074,
    hotline: '01769-010200',
    emergency: '24/7 Acute Trauma & General Emergency Unit',
    popular: true,
  },
  {
    id: 'evercare',
    name: 'Evercare Hospital Dhaka',
    shortName: 'Evercare Hospital',
    area: 'Plot 81, Block E, Bashundhara R/A',
    lat: 23.8105,
    lng: 90.4312,
    hotline: '10678',
    emergency: 'JCI Accredited, 24/7 Critical Care & Trauma',
    popular: true,
  },
  {
    id: 'united',
    name: 'United Hospital Gulshan',
    shortName: 'United Hospital',
    area: 'Plot 15, Road 71, Gulshan 2',
    lat: 23.7997,
    lng: 90.4137,
    hotline: '10666',
    emergency: '24/7 Comprehensive Cardiac & ER Center',
    popular: true,
  },
  {
    id: 'dmch',
    name: 'Dhaka Medical College Hospital (DMCH)',
    shortName: 'Dhaka Medical (DMCH)',
    area: 'Secretariate Rd, Shahbagh',
    lat: 23.7258,
    lng: 90.3975,
    hotline: '01711-234567',
    emergency: 'Level-1 Apex Emergency, Burn Unit & ICU',
    popular: true,
  },
  {
    id: 'square',
    name: 'Square Hospitals Ltd.',
    shortName: 'Square Hospital',
    area: '18/F Panthapath, Dhaka',
    lat: 23.7531,
    lng: 90.3817,
    hotline: '10616',
    emergency: '24/7 Stroke, Trauma & Cardiac Center',
    popular: false,
  },
];

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
  const [driverPos, setDriverPos] = useState(null);
  const [patientPos, setPatientPos] = useState(null);
  const [userCurrentPos, setUserCurrentPos] = useState(null);
  const [pickupAddress, setPickupAddress] = useState('Patient Pickup Location');

  // Trip Phase: 'pickup' (Driver -> Patient) or 'hospital' (Patient -> Hospital)
  const [tripPhase, setTripPhase] = useState('pickup');
  const [selectedHospital, setSelectedHospital] = useState(NEARBY_HOSPITALS[0]);
  const [roadRoute, setRoadRoute] = useState(null);
  const [roadStats, setRoadStats] = useState({ distanceKm: null, durationMin: null });

  // Live simulation states
  const [isSimulating, setIsSimulating] = useState(false);
  const simIntervalRef = useRef(null);
  const simRouteIndexRef = useRef(0);
  const simRoutePointsRef = useRef([]);
  const lastRouteTargetRef = useRef('');
  const hasInitializedDriverRef = useRef(false);

  // Initialize realistic starting driver position once patientPos is known (Runs ONCE safely)
  useEffect(() => {
    if (!hasInitializedDriverRef.current && patientPos) {
      hasInitializedDriverRef.current = true;
      setDriverPos((prev) => {
        if (prev) return prev;
        return { lat: patientPos.lat - 0.008, lng: patientPos.lng + 0.010 };
      });
    }
  }, [patientPos]);

  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [liveStreamStatus, setLiveStreamStatus] = useState({
    active: false,
    source: 'Connecting to Realtime GPS...',
    speed: null,
    lastUpdated: null,
  });

  const socketRef = useRef(null);

  // ── 1. Get user's current live GPS position ──
  useEffect(() => {
    let watchId = null;
    if (navigator?.geolocation) {
      getUserCurrentLocation().then((loc) => {
        if (loc) {
          setUserCurrentPos(loc);
          updatePatientLocation(id || 'active_trip', { lat: loc.lat, lng: loc.lng, address: 'Live User GPS' });
          try { localStorage.setItem('user_last_location', JSON.stringify(loc)); } catch {}
        }
      });

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserCurrentPos(loc);
          updatePatientLocation(id || 'active_trip', { lat: loc.lat, lng: loc.lng, address: 'Live User GPS' });
          try { localStorage.setItem('user_last_location', JSON.stringify(loc)); } catch {}
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    }

    return () => {
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
    };
  }, [id]);

  // ── 2. Reverse geocode pickup location for clean human-readable address ──
  const reverseGeocodePickup = useCallback(async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`,
        { headers: { 'User-Agent': 'AmbulanceFinderApp/1.0' } }
      );
      if (res.ok) {
        const data = await res.json();
        const a = data.address || {};
        const parts = [
          a.road || a.suburb || a.neighbourhood || '',
          a.city_district || a.suburb || '',
          a.city || a.town || 'Dhaka',
        ].filter(Boolean);
        const unique = parts.filter((v, i, arr) => arr.indexOf(v) === i);
        if (unique.length > 0) {
          setPickupAddress(unique.join(', '));
        }
      }
    } catch {}
  }, []);

  // ── 3. Load booking ──
  useEffect(() => {
    const loadBooking = async () => {
      try {
        const res = await bookingAPI.getById(id);
        const b = res.data?.booking || res.data?.data || res.data;
        setBooking(b);

        if (b.pickupAddress && !b.pickupAddress.includes('Patient Pickup')) {
          setPickupAddress(b.pickupAddress);
        }

        if (b.destination) {
          const matched = NEARBY_HOSPITALS.find((h) =>
            h.name.toLowerCase().includes(b.destination.toLowerCase()) ||
            b.destination.toLowerCase().includes(h.shortName.toLowerCase())
          );
          if (matched) setSelectedHospital(matched);
        }

        const pLat = b.pickupLat ?? b.pickup_lat ?? null;
        const pLng = b.pickupLng ?? b.pickup_lng ?? null;

        if (pLat != null && pLng != null && !isNaN(Number(pLat)) && !isNaN(Number(pLng))) {
          const pt = { lat: Number(pLat), lng: Number(pLng) };
          setPatientPos(pt);
          reverseGeocodePickup(pt.lat, pt.lng);
        } else {
          const userGPS = await getUserCurrentLocation();
          if (userGPS) {
            setPatientPos(userGPS);
            reverseGeocodePickup(userGPS.lat, userGPS.lng);
          }
        }
      } catch {
        const userGPS = await getUserCurrentLocation();
        const initialPt = userGPS || { lat: 23.8282, lng: 90.4163 };
        const fallbackBooking = {
          id: id || 'active_trip',
          status: 'En Route',
          pickupAddress: 'Nikunja 2, Khilkhet, Dhaka',
          destination: 'Kurmitola General Hospital',
          driver: {
            name: 'Assigned Driver',
            phone: '01942809157',
            rating: 4.9,
            vehicle_number: 'DHA-AMB-4421',
          },
        };
        setBooking(fallbackBooking);
        setPatientPos(initialPt);
        reverseGeocodePickup(initialPt.lat, initialPt.lng);
      } finally {
        setLoading(false);
      }
    };

    loadBooking();
  }, [id, reverseGeocodePickup]);

  // ── 4. Firebase Canonical Roadmap (requests/ & locations/) Real-time tracking ──
  useEffect(() => {
    // 1. Listen to requests/{id} for status changes & driver assigned info (Roadmap Step 3 & 4)
    const unsubRequest = subscribeToRequest(id, (reqData) => {
      if (reqData) {
        setBooking((prev) => ({
          ...prev,
          status: reqData.status === 'accepted' ? 'Accepted' : reqData.status || prev?.status,
          pickupAddress: reqData.pickup?.address || prev?.pickupAddress,
          driver: reqData.driverDetails ? {
            name: reqData.driverDetails.name,
            phone: reqData.driverDetails.phone,
            rating: reqData.driverDetails.rating || 4.9,
            vehicle_number: reqData.driverDetails.vehicleNumber || 'DHA-AMB-4421',
          } : prev?.driver,
        }));

        if (reqData.pickup?.lat && reqData.pickup?.lng) {
          setPatientPos({ lat: Number(reqData.pickup.lat), lng: Number(reqData.pickup.lng) });
        }

        if (reqData.destination) {
          const matched = NEARBY_HOSPITALS.find((h) =>
            h.name.toLowerCase().includes(reqData.destination.name?.toLowerCase() || '') ||
            (reqData.destination.name || '').toLowerCase().includes(h.shortName.toLowerCase())
          );
          if (matched) setSelectedHospital(matched);
        }

        if (reqData.status === 'Heading to Hospital' || reqData.status === 'heading_to_hospital') {
          setTripPhase('hospital');
        }
      }
    });

    // 2. Listen to locations/{id}/driver for driver live location (Roadmap Step 6)
    const unsubDriverLoc = subscribeToDriverLiveLocation(id, (driverData) => {
      if (driverData && typeof driverData.lat === 'number' && typeof driverData.lng === 'number') {
        setDriverPos({ lat: driverData.lat, lng: driverData.lng });
        setLiveStreamStatus({
          active: true,
          source: `Live Driver GPS (locations/${id}/driver)`,
          speed: driverData.speed || 38,
          lastUpdated: new Date(driverData.timestamp || Date.now()).toLocaleTimeString(),
        });
      }
    });

    // 3. Fallback to legacy live_tracking
    const unsubLegacy = subscribeToAmbulanceLocation(id, (liveData) => {
      if (liveData && liveData.lat != null && liveData.lng != null) {
        setDriverPos({ lat: Number(liveData.lat), lng: Number(liveData.lng) });
      }
    });

    // 4. Start user continuous location sharing to locations/{id}/user (Roadmap Step 5)
    let watchId = null;
    if (typeof window !== 'undefined' && navigator?.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const uLat = pos.coords.latitude;
          const uLng = pos.coords.longitude;
          setPatientPos({ lat: uLat, lng: uLng });
          updateUserLiveLocation(id, { lat: uLat, lng: uLng });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 4000 }
      );
    }

    return () => {
      unsubRequest?.();
      unsubDriverLoc?.();
      unsubLegacy?.();
      if (watchId != null && navigator?.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [id]);

  // ── 5. Fetch Turn-by-Turn Road Route from OSRM ──
  const fetchRoadRoute = useCallback(async (startPt, endPt) => {
    if (!startPt || !endPt) return null;
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${startPt.lng},${startPt.lat};${endPt.lng},${endPt.lat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const routes = data.routes || [];
        if (routes.length > 0) {
          const coords = routes[0].geometry?.coordinates || [];
          if (coords.length > 1) {
            const leafletPoints = coords.map((c) => [c[1], c[0]]);
            setRoadRoute(leafletPoints);
            simRoutePointsRef.current = leafletPoints;

            const distKm = (routes[0].distance / 1000).toFixed(1);
            const durMin = Math.max(1, Math.round(routes[0].duration / 60));
            setRoadStats({ distanceKm: distKm, durationMin: durMin });
            return leafletPoints;
          }
        }
      }
    } catch {}

    // Fallback: Generate an interpolated 15-point road curve so polyline is ALWAYS visible on map
    const steps = 15;
    const directLine = [];
    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      const curve = Math.sin(ratio * Math.PI) * 0.003;
      directLine.push([
        startPt.lat + (endPt.lat - startPt.lat) * ratio + curve,
        startPt.lng + (endPt.lng - startPt.lng) * ratio,
      ]);
    }
    setRoadRoute(directLine);
    simRoutePointsRef.current = directLine;
    const dist = calculateDistance(startPt.lat, startPt.lng, endPt.lat, endPt.lng);
    setRoadStats({
      distanceKm: dist.toFixed(1),
      durationMin: Math.max(1, Math.round((dist / 35) * 60)),
    });
    return directLine;
  }, []);

  // Update route ONLY when phase switches or hospital changes (NEVER on micro GPS ticks!)
  useEffect(() => {
    if (isSimulating) return;

    const targetKey = tripPhase === 'pickup'
      ? `pickup_${patientPos?.lat?.toFixed?.(3)}_${patientPos?.lng?.toFixed?.(3)}`
      : `hosp_${selectedHospital?.id}`;

    if (lastRouteTargetRef.current === targetKey) return;

    if (tripPhase === 'pickup') {
      if (patientPos) {
        // Dispatch location ~1.5 km away from patient
        const defaultDispatch = { lat: patientPos.lat - 0.008, lng: patientPos.lng + 0.010 };
        const dist = driverPos && patientPos ? calculateDistance(driverPos.lat, driverPos.lng, patientPos.lat, patientPos.lng) : null;
        const isTooClose = dist !== null && dist < 0.15;
        const startPt = (!driverPos || isTooClose) ? defaultDispatch : driverPos;

        fetchRoadRoute(startPt, patientPos);
        lastRouteTargetRef.current = targetKey;
      }
    } else {
      // Phase 2: Patient/Driver -> Destination Hospital
      if (selectedHospital) {
        const startPoint = driverPos || patientPos || { lat: 23.8282, lng: 90.4163 };
        fetchRoadRoute(startPoint, { lat: selectedHospital.lat, lng: selectedHospital.lng });
        lastRouteTargetRef.current = targetKey;
      }
    }
  }, [tripPhase, selectedHospital?.id, Boolean(patientPos), isSimulating, fetchRoadRoute]);

  // ── 6. Live Movement Simulation Engine (Drive along real road) ──
  const startLiveMovement = async () => {
    let startPt;
    let targetPt;

    if (tripPhase === 'pickup') {
      if (!patientPos) return;
      const dist = driverPos && patientPos ? calculateDistance(driverPos.lat, driverPos.lng, patientPos.lat, patientPos.lng) : null;
      const isTooClose = dist !== null && dist < 0.15;
      startPt = (!driverPos || isTooClose)
        ? { lat: patientPos.lat - 0.008, lng: patientPos.lng + 0.010 }
        : driverPos;
      targetPt = patientPos;
    } else {
      // Heading to Hospital
      startPt = driverPos || patientPos || { lat: 23.8282, lng: 90.4163 };
      targetPt = { lat: selectedHospital.lat, lng: selectedHospital.lng };
    }

    setDriverPos(startPt);
    const points = await fetchRoadRoute(startPt, targetPt);
    if (!points || points.length < 2) return;

    setIsSimulating(true);
    simRouteIndexRef.current = 0;

    if (simIntervalRef.current) clearInterval(simIntervalRef.current);

    simIntervalRef.current = setInterval(() => {
      const allPts = simRoutePointsRef.current;
      if (!allPts || simRouteIndexRef.current >= allPts.length - 1) {
        setIsSimulating(false);
        clearInterval(simIntervalRef.current);

        if (tripPhase === 'pickup') {
          // Arrived at pickup
          setBooking((prev) => ({ ...prev, status: 'Arrived' }));
          setRoadStats({ distanceKm: '0.0', durationMin: 0 });
          updateAmbulanceLocation('active_trip', {
            lat: patientPos.lat,
            lng: patientPos.lng,
            speed: 0,
            heading: 0,
            status: 'Arrived',
            source: 'Arrived at Patient Spot',
          });
        } else {
          // Arrived at Hospital!
          setBooking((prev) => ({ ...prev, status: 'Completed' }));
          setRoadStats({ distanceKm: '0.0', durationMin: 0 });
          updateAmbulanceLocation('active_trip', {
            lat: selectedHospital.lat,
            lng: selectedHospital.lng,
            speed: 0,
            heading: 0,
            status: 'Completed',
            source: `Arrived at ${selectedHospital.name} ER`,
          });
        }
        return;
      }

      // Progress along route smoothly 1 step at a time
      const nextIdx = Math.min(simRouteIndexRef.current + 1, allPts.length - 1);
      simRouteIndexRef.current = nextIdx;
      const nextPoint = allPts[nextIdx];

      const newDriverLoc = { lat: nextPoint[0], lng: nextPoint[1] };
      setDriverPos(newDriverLoc);

      // Dynamically calculate remaining distance & ETA to destination
      if (targetPt) {
        const remainingDist = calculateDistance(newDriverLoc.lat, newDriverLoc.lng, targetPt.lat, targetPt.lng);
        const remainingMin = Math.max(1, Math.round(((remainingDist || 0) / 38) * 60));
        setRoadStats({
          distanceKm: remainingDist != null && remainingDist < 0.05 ? '0.0' : remainingDist != null ? remainingDist.toFixed(1) : '0.0',
          durationMin: remainingDist != null && remainingDist < 0.05 ? 0 : remainingMin,
        });
      }

      const speed = Math.round(38 + Math.random() * 8);
      const currentStatus = tripPhase === 'pickup' ? 'En Route' : 'Heading to Hospital';

      setLiveStreamStatus({
        active: true,
        source: tripPhase === 'pickup' ? 'Ambulance En Route to Patient' : `Transporting to ${selectedHospital.shortName}`,
        speed,
        lastUpdated: new Date().toLocaleTimeString(),
      });

      // Stream to Firebase RTDB Canonical locations/{requestId}/driver + legacy
      updateDriverLiveLocation(id || 'active_trip', {
        lat: newDriverLoc.lat,
        lng: newDriverLoc.lng,
        speed,
        heading: 0,
        status: currentStatus,
      });
      updateAmbulanceLocation(id || 'active_trip', {
        lat: newDriverLoc.lat,
        lng: newDriverLoc.lng,
        speed,
        heading: 0,
        status: currentStatus,
        source: tripPhase === 'pickup' ? 'En Route to Pickup' : `En Route to ${selectedHospital.name}`,
      });
    }, 650);
  };

  const pauseLiveMovement = () => {
    setIsSimulating(false);
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);
  };

  const resetLiveMovement = () => {
    pauseLiveMovement();
    if (tripPhase === 'pickup') {
      if (patientPos) {
        const freshDriver = { lat: patientPos.lat - 0.008, lng: patientPos.lng + 0.010 };
        setDriverPos(freshDriver);
        setBooking((prev) => ({ ...prev, status: 'En Route' }));
        fetchRoadRoute(freshDriver, patientPos);
      }
    } else {
      if (patientPos) {
        setDriverPos(patientPos);
        setBooking((prev) => ({ ...prev, status: 'Heading to Hospital' }));
        fetchRoadRoute(patientPos, { lat: selectedHospital.lat, lng: selectedHospital.lng });
      }
    }
  };

  // Switch to Phase 2: Heading to Hospital
  const proceedToHospital = (hospital = selectedHospital) => {
    pauseLiveMovement();
    setTripPhase('hospital');
    setSelectedHospital(hospital);
    setBooking((prev) => ({ ...prev, status: 'Heading to Hospital', destination: hospital.name }));

    // Driver starts from patient position
    const startPt = driverPos || patientPos || { lat: 23.8282, lng: 90.4163 };
    setDriverPos(startPt);
    lastRouteTargetRef.current = `hosp_${hospital.id}`;
    fetchRoadRoute(startPt, { lat: hospital.lat, lng: hospital.lng });

    // Update Firebase RTDB destination and ambulance status
    updateDestinationHospital('active_trip', hospital);
    updateAmbulanceLocation('active_trip', {
      lat: startPt.lat,
      lng: startPt.lng,
      speed: 40,
      heading: 0,
      status: 'Heading to Hospital',
      source: `Patient Picked Up ➔ Heading to ${hospital.name}`,
    });
  };

  // Switch back to Phase 1: En Route to Pickup
  const returnToPickupPhase = () => {
    pauseLiveMovement();
    setTripPhase('pickup');
    lastRouteTargetRef.current = '';
    setBooking((prev) => ({ ...prev, status: 'En Route' }));
    if (patientPos) {
      const startDriver = { lat: patientPos.lat - 0.007, lng: patientPos.lng + 0.009 };
      setDriverPos(startDriver);
      fetchRoadRoute(startDriver, patientPos);
    }
  };

  useEffect(() => {
    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, []);

  // Distance & ETA
  const displayTarget = tripPhase === 'pickup' ? patientPos : selectedHospital;
  const directDist = driverPos && displayTarget ? calculateDistance(driverPos.lat, driverPos.lng, displayTarget.lat, displayTarget.lng) : null;
  const hasArrivedPickup = tripPhase === 'pickup' && (booking?.status === 'Arrived' || (roadStats.distanceKm === '0.0' && !isSimulating));
  const hasArrivedHospital = tripPhase === 'hospital' && (booking?.status === 'Completed' || (roadStats.distanceKm === '0.0' && !isSimulating));

  const displayDistance = hasArrivedPickup
    ? 'Arrived at Pickup'
    : hasArrivedHospital
    ? 'Arrived at Hospital ER'
    : roadStats.distanceKm
    ? `${roadStats.distanceKm} km away`
    : directDist
    ? `${directDist.toFixed(1)} km away`
    : '1.4 km away';

  const displayETA = hasArrivedPickup || hasArrivedHospital
    ? 'Now'
    : roadStats.durationMin
    ? `~${roadStats.durationMin} min`
    : directDist
    ? `~${Math.max(1, Math.round((directDist / 35) * 60))} min`
    : '~3 min';

  // Cancel booking (Roadmap Step 7: stop sharing and remove locations/{id})
  const handleCancel = async () => {
    if (!confirm('Cancel this ambulance request?')) return;
    setCancelling(true);
    try {
      await completeOrCancelTrip(id, 'cancelled');
      await bookingAPI.cancel(id);
      router.push('/home');
    } catch {
      router.push('/home');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-gray-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500 font-medium">Connecting to Live Ambulance GPS…</p>
        </div>
      </div>
    );
  }

  const currentStep = STATUS_STEPS.indexOf(booking?.status ?? (tripPhase === 'hospital' ? 'Heading to Hospital' : 'En Route'));

  const mapCenter = (() => {
    if (tripPhase === 'hospital') {
      return {
        pickupLat: patientPos ? patientPos.lat : null,
        pickupLng: patientPos ? patientPos.lng : null,
        driverLat: driverPos ? driverPos.lat : (patientPos ? patientPos.lat : null),
        driverLng: driverPos ? driverPos.lng : (patientPos ? patientPos.lng : null),
        hospitalLocation: selectedHospital,
      };
    }
    return {
      pickupLat: patientPos ? patientPos.lat : 23.8282,
      pickupLng: patientPos ? patientPos.lng : 90.4163,
      driverLat: driverPos ? driverPos.lat : 23.8231,
      driverLng: driverPos ? driverPos.lng : 90.4263,
      hospitalLocation: selectedHospital,
    };
  })();

  return (
    <div className="min-h-screen bg-gray-50/70 text-gray-900 flex flex-col">
      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200/80 px-6 py-3 flex items-center justify-between shadow-xs">
        <Link href="/home" className="text-xs font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1 transition-colors">
          ← Back to Dashboard
        </Link>
        <span className="font-bold text-sm sm:text-base flex items-center gap-1.5">
          🚑 Live Ambulance & Hospital Route
        </span>
        <span
          className={`text-xs font-bold px-3 py-1 rounded-full ${
            booking?.status === 'Completed'
              ? 'bg-emerald-100 text-emerald-700'
              : tripPhase === 'hospital'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-rose-100 text-rose-700'
          }`}
        >
          {booking?.status || (tripPhase === 'hospital' ? 'Heading to Hospital' : 'En Route')}
        </span>
      </header>

      <div className="max-w-5xl mx-auto w-full px-4 py-5 grid gap-4">
        {/* ── Trip Phase Switcher Tabs ── */}
        <div className="bg-white p-1.5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center gap-2">
          <button
            type="button"
            onClick={returnToPickupPhase}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              tripPhase === 'pickup'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span>Phase 1: 🚑 Ambulance ➔ Patient Pickup</span>
          </button>

          <button
            type="button"
            onClick={() => proceedToHospital(selectedHospital)}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              tripPhase === 'hospital'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span>Phase 2: 🏥 Patient ➔ Destination Hospital ER</span>
          </button>
        </div>

        {/* ── Route & Destination Hospital Card ── */}
        <div className="p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-gray-200/70 shadow-sm bg-white">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 text-lg shadow-xs">
              📍
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pickup Spot</p>
              <p className="text-sm font-bold text-gray-900 truncate">
                {pickupAddress}
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center text-gray-300 px-2 font-bold text-lg">
            ➔
          </div>

          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 text-lg shadow-xs">
              🏥
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Destination Hospital ER</p>
              <p className="text-sm font-bold text-emerald-800 truncate">
                {selectedHospital.name}
              </p>
              <p className="text-[11px] text-gray-400 truncate">{selectedHospital.area}</p>
            </div>
          </div>
        </div>

        {/* ── Nearby Hospital Quick Selector (1-Click Switch) ── */}
        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <Hospital size={14} className="text-emerald-600" />
              Choose Destination Hospital:
            </span>
            <span className="text-[11px] text-gray-400">Tap to instantly redirect ambulance</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {NEARBY_HOSPITALS.map((h) => {
              const isSelected = selectedHospital.id === h.id;
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => proceedToHospital(h)}
                  className={`p-2 rounded-xl text-left border transition-all text-xs flex flex-col justify-between ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900 ring-2 ring-emerald-200'
                      : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <div className="font-bold truncate text-[11px] leading-tight">{h.shortName}</div>
                  <div className="text-[10px] text-gray-400 truncate mt-1">{h.area.split(',')[0]}</div>
                  {isSelected && (
                    <span className="text-[9px] font-bold text-emerald-700 mt-1 inline-block">✓ Active Route</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Live Motion Controller Bar ── */}
        <div className={`text-white rounded-2xl p-3.5 shadow-md flex flex-wrap items-center justify-between gap-3 ${
          tripPhase === 'hospital'
            ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-700'
            : 'bg-gradient-to-r from-red-600 via-rose-600 to-indigo-700'
        }`}>
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
            </span>
            <div>
              <p className="text-xs font-bold leading-tight">
                {hasArrivedPickup
                  ? '✅ Ambulance Arrived at Patient Pickup!'
                  : hasArrivedHospital
                  ? `🏥 Patient Successfully Delivered to ${selectedHospital.name} ER!`
                  : isSimulating
                  ? (tripPhase === 'pickup' ? '🚑 Ambulance Moving to Patient Pickup' : `🚑 Speeding to ${selectedHospital.shortName} ER`)
                  : (tripPhase === 'pickup' ? '📍 Phase 1: Ambulance En Route to Pickup' : `🏥 Phase 2: Transporting Patient to ${selectedHospital.shortName}`)}
              </p>
              <p className="text-[11px] text-white/80">
                {hasArrivedPickup
                  ? 'Patient has boarded the ambulance. Tap the green button to start drive to Hospital ER.'
                  : hasArrivedHospital
                  ? 'Patient handed over to emergency doctors. Trip complete.'
                  : isSimulating
                  ? 'Streaming live turn-by-turn road coordinates to Firebase RTDB...'
                  : (tripPhase === 'pickup' ? 'Click below to watch ambulance drive to patient, or board to head to hospital.' : 'Watch the ambulance speed along the real road to the ER entrance.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasArrivedPickup ? (
              <button
                type="button"
                onClick={() => proceedToHospital(selectedHospital)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-white shadow-md flex items-center gap-1.5 transition-all active:scale-95 animate-pulse"
              >
                <span>🚑 Board Patient ➔ Head to Hospital ER</span>
                <span>➔</span>
              </button>
            ) : hasArrivedHospital ? (
              <button
                type="button"
                onClick={returnToPickupPhase}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-white text-emerald-800 hover:bg-emerald-50 shadow-md flex items-center gap-1.5 transition-all active:scale-95"
              >
                <RotateCcw size={14} />
                <span>Trip Completed (Restart)</span>
              </button>
            ) : !isSimulating ? (
              <button
                type="button"
                onClick={startLiveMovement}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white shadow-sm flex items-center gap-1.5 transition-all active:scale-95 ${
                  tripPhase === 'hospital' ? 'text-emerald-700 hover:bg-emerald-50' : 'text-rose-700 hover:bg-rose-50'
                }`}
              >
                <Play size={14} className={tripPhase === 'hospital' ? 'fill-emerald-700' : 'fill-rose-700'} />
                <span>{tripPhase === 'pickup' ? 'Start Drive to Pickup' : 'Start Drive to Hospital ER'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={pauseLiveMovement}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-400 text-gray-900 hover:bg-amber-300 shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Pause size={14} className="fill-gray-900" />
                <span>Pause Movement</span>
              </button>
            )}

            <button
              type="button"
              onClick={resetLiveMovement}
              className="p-1.5 rounded-xl text-xs font-medium bg-white/20 hover:bg-white/30 text-white transition-all"
              title="Reset Position"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>

        {/* Live GPS Status Bar */}
        <div className="bg-white rounded-xl px-4 py-2.5 border border-gray-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-emerald-600 flex items-center gap-1">
              🟢 {liveStreamStatus.active ? `Live Driver GPS: ${liveStreamStatus.source}` : 'Connected to Live Driver GPS'}
            </span>
          </div>

          <div className="flex items-center gap-3.5 text-gray-600 text-[11px]">
            {driverPos && (
              <span>
                Ambulance: <strong className="font-mono text-gray-900">{driverPos.lat.toFixed(4)}, {driverPos.lng.toFixed(4)}</strong>
              </span>
            )}
            <span>
              Target: <strong className="text-gray-900 font-bold">{tripPhase === 'pickup' ? 'Patient' : selectedHospital.shortName}</strong>
            </span>
            <span>
              Distance: <strong className="text-gray-900 font-bold">{displayDistance}</strong>
            </span>
            <span>
              ETA: <strong className="text-gray-900 font-bold">{displayETA}</strong>
            </span>
            <span>
              Speed: <strong className="text-gray-900 font-bold">{liveStreamStatus.speed || 38} km/h</strong>
            </span>
          </div>
        </div>

        {/* ── Leaflet Navigation Map ── */}
        <div className="h-[440px] rounded-2xl overflow-hidden border border-gray-200 shadow-sm relative">
          <MapComponent
            pickupLat={mapCenter.pickupLat}
            pickupLng={mapCenter.pickupLng}
            driverLat={mapCenter.driverLat}
            driverLng={mapCenter.driverLng}
            hospitalLocation={selectedHospital}
            route={roadRoute}
            phaseKey={`${tripPhase}-${selectedHospital.id}`}
            height="100%"
          />
        </div>

        {/* ── Hospital Emergency Action Bar ── */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-lg shrink-0">
              🏥
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-950">{selectedHospital.name} Emergency Reception</p>
              <p className="text-[11px] text-emerald-700">{selectedHospital.emergency}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <a
              href={`tel:${selectedHospital.hotline}`}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 shadow-sm transition-colors"
            >
              <Phone size={13} />
              <span>Call ER Hotline: {selectedHospital.hotline}</span>
            </a>

            {tripPhase === 'pickup' ? (
              <button
                type="button"
                onClick={() => proceedToHospital(selectedHospital)}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5 shadow-sm transition-colors"
              >
                <span>Proceed to Hospital ER ➔</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={returnToPickupPhase}
                className="flex-1 sm:flex-none px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span>Back to Pickup</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Bottom Details Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Status Timeline */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs">
            <h3 className="font-bold text-sm mb-4 text-gray-900 flex items-center gap-1.5">
              📋 Status Timeline
            </h3>
            <div className="flex flex-col gap-3">
              {STATUS_STEPS.map((step, i) => {
                const done = i < currentStep;
                const active = i === currentStep;
                return (
                  <div key={step} className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        done
                          ? 'bg-emerald-500 text-white'
                          : active
                          ? 'bg-rose-600 text-white ring-4 ring-rose-100'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {done ? '✓' : i + 1}
                    </div>
                    <span
                      className={`text-sm ${
                        active ? 'font-bold text-rose-600' : done ? 'font-medium text-gray-800' : 'text-gray-400'
                      }`}
                    >
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Driver & ER Info Card */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-sm mb-4 text-gray-900 flex items-center gap-1.5">
                🧑‍✈️ Driver & Emergency Coordination
              </h3>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-2xl font-bold shadow-xs">
                  🚑
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-base">
                    {booking?.driver?.name || 'Assigned Driver'}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <span>⭐ {booking?.driver?.rating || 4.9}</span>
                    <span>•</span>
                    <span className="font-mono font-semibold text-gray-700">{booking?.driver?.vehicle_number || 'DHA-AMB-4421'}</span>
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-gray-50 text-xs text-gray-600 font-mono mb-3">
                📞 Driver: {booking?.driver?.user?.phone || booking?.driver?.phone || '01942809157'}
              </div>

              {/* Dynamic ETA Box */}
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-center font-bold text-base mb-3 border border-rose-100">
                {tripPhase === 'pickup'
                  ? `Pickup ETA: ${displayETA} (${displayDistance})`
                  : `Hospital Arrival ETA: ${displayETA} (${displayDistance})`}
              </div>
            </div>

            <div className="flex gap-2">
              <a
                href={`tel:${(booking?.driver?.user?.phone || booking?.driver?.phone || '01942809157').replace(/[^0-9+]/g, '')}`}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors text-center"
              >
                📞 Call Driver
              </a>
              <a
                href={`tel:${selectedHospital.hotline}`}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors text-center"
              >
                🏥 Call Hospital ER
              </a>
            </div>
          </div>
        </div>

        {/* Cancel Button if pending */}
        {booking?.status === 'Pending' && (
          <div className="flex justify-center mt-2">
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 border border-rose-300 hover:bg-rose-50 py-2 px-6 rounded-xl transition-all"
            >
              {cancelling ? 'Cancelling…' : '✕ Cancel Request'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
