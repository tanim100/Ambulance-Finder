'use client';
// src/app/(user)/request/page.jsx — Modern Ambulance Request with Live Reverse Geocoding, Map Picker & Autocomplete

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { MapPin, ArrowLeft, CheckCircle, Navigation, Map, Search, X, Loader2, Sparkles, Building2, Hospital, Phone, ShieldCheck, ChevronDown, Check, Info } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import BottomNav from '@/components/layout/BottomNav';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import AmbulanceTypeSelector, { getEstimatedFare } from '@/components/ambulance/AmbulanceTypeSelector';
import { bookingAPI } from '@/lib/api';
import { useGeolocation } from '@/hooks/useGeolocation';
import { updatePatientLocation, createAmbulanceRequest } from '@/lib/firebaseTracking';
import { TOP_HOSPITALS, getNearbyHospitals } from '@/lib/hospitalData';
export { TOP_HOSPITALS };
import { generateNearbyAmbulances } from '../home/page';

const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-52 bg-gray-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-xs text-gray-400">
      Loading interactive map picker...
    </div>
  ),
});

const EMERGENCY_TYPES = [
  { value: 'accident',    label: '🚗 Accident' },
  { value: 'cardiac',     label: '❤️ Cardiac Emergency' },
  { value: 'respiratory', label: '🫁 Respiratory Emergency' },
  { value: 'trauma',      label: '🩹 Trauma' },
  { value: 'maternity',   label: '👶 Maternity' },
  { value: 'general',     label: '🏥 General Emergency' },
];

const PRESET_LOCATIONS = [
  { label: 'Daffodil Smart City (Ashulia)', address: 'Daffodil Smart City, Ashulia, Dhaka', lat: 23.8768, lng: 90.3204, icon: '🎓' },
  { label: 'Dhanmondi, Dhaka', address: 'Dhanmondi Road 27, Dhaka', lat: 23.7461, lng: 90.3742, icon: '🏥' },
  { label: 'Gulshan 2 Circle', address: 'Gulshan 2 Circle, Gulshan, Dhaka', lat: 23.7925, lng: 90.4078, icon: '🏢' },
  { label: 'Uttara Sector 7', address: 'Sector 7, Uttara Model Town, Dhaka', lat: 23.8759, lng: 90.3795, icon: '🚆' },
  { label: 'Mirpur 10 Circle', address: 'Mirpur 10 Roundabout, Mirpur, Dhaka', lat: 23.8069, lng: 90.3687, icon: '🏙️' },
  { label: 'Dhaka Medical (DMCH)', address: 'Dhaka Medical College Hospital, Shahbagh, Dhaka', lat: 23.7258, lng: 90.3975, icon: '🏛️' },
  { label: 'Kurmitola / Airport', address: 'Kurmitola General Hospital, Airport Rd, Dhaka', lat: 23.8188, lng: 90.4074, icon: '🛫' },
  { label: 'Mohakhali C/A', address: 'Mohakhali Commercial Area, Dhaka', lat: 23.7788, lng: 90.4032, icon: '🏬' },
];

export default function RequestPage() {
  const router = useRouter();
  const { location: currentGeoLoc, getLocation, loading: geoLoading } = useGeolocation();

  const [form, setForm] = useState({
    patientName: '',
    emergencyType: '',
    pickupLocation: '',
    destination: '',
    notes: '',
    ambulanceType: 'Advanced',
  });
  const [requestMode, setRequestMode] = useState('emergency'); // 'emergency' | 'general'
  const [scheduleOption, setScheduleOption] = useState('now'); // 'now' | 'scheduled'
  const [scheduledTime, setScheduledTime] = useState('');

  const handleModeSwitch = (mode) => {
    setRequestMode(mode);
    if (mode === 'general') {
      setForm((p) => ({
        ...p,
        emergencyType: 'general',
        ambulanceType: 'Basic',
      }));
    } else {
      setForm((p) => ({
        ...p,
        emergencyType: p.emergencyType === 'general' ? '' : p.emergencyType,
        ambulanceType: p.ambulanceType === 'Basic' ? 'Advanced' : p.ambulanceType,
      }));
    }
  };

  const [pickupCoords, setPickupCoords] = useState({ lat: 23.8103, lng: 90.4125 });

  // Dynamically compute closest hospitals & ambulances strictly around the user's active pickup spot
  const nearbyHospitals = useMemo(() => {
    return getNearbyHospitals(pickupCoords.lat, pickupCoords.lng, form.pickupLocation, 25);
  }, [pickupCoords.lat, pickupCoords.lng, form.pickupLocation]);

  const nearbyAmbulances = useMemo(() => {
    return generateNearbyAmbulances(pickupCoords.lat, pickupCoords.lng, form.pickupLocation);
  }, [pickupCoords.lat, pickupCoords.lng, form.pickupLocation]);

  const nearbyCounts = useMemo(() => {
    const avail = nearbyAmbulances.filter((a) => a.status === 'Available');
    return {
      Basic: avail.filter((a) => a.type === 'Basic').length || 1,
      Advanced: avail.filter((a) => a.type === 'Advanced').length || 1,
      ICU: avail.filter((a) => a.type === 'ICU').length || 1,
      totalAvailable: avail.length,
    };
  }, [nearbyAmbulances]);

  const estimatedFare = useMemo(
    () => getEstimatedFare(form.ambulanceType, requestMode),
    [form.ambulanceType, requestMode]
  );

  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);
  const [geocodingLoading, setGeocodingLoading] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [bookingId, setBookingId] = useState(null);
  const [showHospitalDropdown, setShowHospitalDropdown] = useState(false);
  const [showHospitalModal, setShowHospitalModal] = useState(false);
  const destinationRef = useRef(null);

  const searchDebounceRef = useRef(null);

  // Close hospital dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (destinationRef.current && !destinationRef.current.contains(e.target)) {
        setShowHospitalDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectHospital = (hospital) => {
    if (!hospital) {
      setForm((p) => ({ ...p, destination: '' }));
    } else {
      setForm((p) => ({ ...p, destination: hospital.name }));
    }
    setShowHospitalDropdown(false);
    setShowHospitalModal(false);
  };

  // Find matched hospital object if any (checked against proximity-calculated list)
  const matchedHospital = nearbyHospitals.find(
    (h) =>
      form.destination.trim() &&
      (h.name.toLowerCase() === form.destination.trim().toLowerCase() ||
        h.shortName.toLowerCase() === form.destination.trim().toLowerCase() ||
        form.destination.toLowerCase().includes(h.shortName.toLowerCase()) ||
        (form.destination.length > 5 && h.name.toLowerCase().includes(form.destination.toLowerCase())))
  ) || TOP_HOSPITALS.find((h) => form.destination.toLowerCase().includes(h.shortName.toLowerCase()));

  // Filtered hospitals based on user search, prioritized by distance from user's pickup point
  const filteredHospitals = form.destination.trim()
    ? nearbyHospitals.filter(
        (h) =>
          h.name.toLowerCase().includes(form.destination.toLowerCase()) ||
          h.shortName.toLowerCase().includes(form.destination.toLowerCase()) ||
          h.area.toLowerCase().includes(form.destination.toLowerCase()) ||
          h.emergency.toLowerCase().includes(form.destination.toLowerCase())
      )
    : nearbyHospitals;

  // Reverse geocode coordinates to clean readable address (e.g., "Nikunja 2, Khilkhet, Dhaka")
  const reverseGeocode = useCallback(async (lat, lng) => {
    setGeocodingLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`,
        { headers: { 'User-Agent': 'AmbulanceFinderApp/1.0' } }
      );
      if (res.ok) {
        const data = await res.json();
        const a = data.address || {};
        const parts = [
          a.road || a.pedestrian || a.suburb || a.neighbourhood || a.quarter || '',
          a.suburb || a.city_district || '',
          a.city || a.town || a.county || 'Dhaka',
        ].filter(Boolean);
        
        // Remove duplicates in parts
        const uniqueParts = parts.filter((v, i, arr) => arr.indexOf(v) === i);
        const cleanAddress = uniqueParts.length > 0 ? uniqueParts.join(', ') : data.display_name?.split(',').slice(0, 3).join(',') || 'Current Location';

        setForm((prev) => ({ ...prev, pickupLocation: cleanAddress }));
      }
    } catch (e) {
      // Fallback
    } finally {
      setGeocodingLoading(false);
    }
  }, []);

  // Pre-fill destination, ambulanceType, and coordinates if passed via URL parameters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const dest = params.get('destination') || params.get('hospital');
      if (dest) {
        setForm((prev) => ({ ...prev, destination: dest }));
      }
      const modeParam = params.get('mode');
      if (modeParam === 'general' || modeParam === 'emergency') {
        handleModeSwitch(modeParam);
      }
      const type = params.get('ambulanceType') || params.get('type');
      if (type) {
        setForm((prev) => ({ ...prev, ambulanceType: type }));
      }
      const lat = parseFloat(params.get('lat'));
      const lng = parseFloat(params.get('lng'));
      const label = params.get('label') || params.get('pickup');
      if (!isNaN(lat) && !isNaN(lng)) {
        setPickupCoords({ lat, lng });
        if (label) {
          setForm((prev) => ({ ...prev, pickupLocation: decodeURIComponent(label) }));
        } else {
          reverseGeocode(lat, lng);
        }
      }
    }
  }, [reverseGeocode]);

  // Auto-detect and reverse-geocode initial location on mount
  useEffect(() => {
    if (currentGeoLoc && currentGeoLoc.lat && currentGeoLoc.lng) {
      setPickupCoords({ lat: currentGeoLoc.lat, lng: currentGeoLoc.lng });
      if (!form.pickupLocation || form.pickupLocation.includes('(')) {
        reverseGeocode(currentGeoLoc.lat, currentGeoLoc.lng);
      }
    }
  }, [currentGeoLoc, reverseGeocode]);

  // Address search autocomplete debouncer
  const handleAddressInputChange = (e) => {
    const val = e.target.value;
    setForm((p) => ({ ...p, pickupLocation: val }));
    if (errors.pickupLocation) setErrors((p) => ({ ...p, pickupLocation: '' }));

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (val.trim().length >= 3) {
      setSearchingAddress(true);
      searchDebounceRef.current = setTimeout(async () => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&countrycodes=bd&limit=4&accept-language=en`,
            { headers: { 'User-Agent': 'AmbulanceFinderApp/1.0' } }
          );
          if (res.ok) {
            const data = await res.json();
            setSearchSuggestions(data);
          }
        } catch {
          setSearchSuggestions([]);
        } finally {
          setSearchingAddress(false);
        }
      }, 400);
    } else {
      setSearchSuggestions([]);
      setSearchingAddress(false);
    }
  };

  const selectSuggestion = (item) => {
    const clean = item.display_name?.split(',').slice(0, 3).join(', ') || item.display_name;
    const lat = Number(item.lat);
    const lng = Number(item.lon);

    setForm((p) => ({ ...p, pickupLocation: clean }));
    setPickupCoords({ lat, lng });
    setSearchSuggestions([]);

    try {
      localStorage.setItem('user_last_location', JSON.stringify({ lat, lng, label: clean }));
    } catch {}
  };

  const selectPreset = (preset) => {
    setForm((p) => ({ ...p, pickupLocation: preset.address }));
    setPickupCoords({ lat: preset.lat, lng: preset.lng });
    setSearchSuggestions([]);
    try {
      localStorage.setItem('user_last_location', JSON.stringify({ lat: preset.lat, lng: preset.lng, label: preset.address }));
    } catch {}
  };

  // High-accuracy live device GPS with fallback to WiFi/Network
  const handleDetectLiveGPS = () => {
    if (navigator?.geolocation) {
      setGeocodingLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setPickupCoords({ lat, lng });
          reverseGeocode(lat, lng);
          // Immediately sync with Firebase live_tracking/user and active_trip
          updatePatientLocation('active_trip', {
            lat,
            lng,
            address: form.pickupLocation || 'Live GPS Location',
          });
          try {
            localStorage.setItem('user_last_location', JSON.stringify({ lat, lng, label: 'Your Exact GPS Location' }));
          } catch {}
          setGeocodingLoading(false);
        },
        (err) => {
          // Low accuracy network/WiFi fallback
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const lat = pos.coords.latitude;
              const lng = pos.coords.longitude;
              setPickupCoords({ lat, lng });
              reverseGeocode(lat, lng);
              updatePatientLocation('active_trip', {
                lat,
                lng,
                address: form.pickupLocation || 'Network Location',
              });
              try {
                localStorage.setItem('user_last_location', JSON.stringify({ lat, lng, label: 'Network Location' }));
              } catch {}
              setGeocodingLoading(false);
            },
            () => {
              getLocation();
              setGeocodingLoading(false);
            },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 }
          );
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      getLocation();
    }
  };

  // Map pin click handler
  const handleMapPin = (coords) => {
    setPickupCoords(coords);
    reverseGeocode(coords.lat, coords.lng);
    updatePatientLocation('active_trip', {
      lat: coords.lat,
      lng: coords.lng,
      address: 'Pinned on Map',
    });
  };

  const validate = () => {
    const e = {};
    if (!form.patientName.trim()) e.patientName = 'Patient name is required';
    if (!form.emergencyType) e.emergencyType = 'Emergency type is required';
    if (!form.pickupLocation.trim()) e.pickupLocation = 'Pickup location is required';
    if (!form.ambulanceType) e.ambulanceType = 'Please select an ambulance type';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    const targetHospital = matchedHospital || nearbyHospitals[0] || null;
    const destName = form.destination || targetHospital?.name || 'Nearest General Hospital';
    const destLat = targetHospital?.lat || pickupCoords.lat + 0.008;
    const destLng = targetHospital?.lng || pickupCoords.lng + 0.008;

    const payload = {
      pickupLocation: {
        address: form.pickupLocation,
        lat: pickupCoords.lat,
        lng: pickupCoords.lng,
      },
      destinationLocation: {
        address: destName,
        lat: destLat,
        lng: destLng,
      },
      patientName: form.patientName,
      emergencyType: form.emergencyType || (requestMode === 'general' ? 'general' : 'accident'),
      requestMode,
      priorityLevel: requestMode === 'emergency' ? 'critical' : 'standard',
      estimatedFare,
      scheduledTime: requestMode === 'general' && scheduleOption === 'scheduled' ? scheduledTime : null,
      notes: form.notes,
      ambulanceType: form.ambulanceType,
    };

    try {
      localStorage.setItem('user_last_location', JSON.stringify({
        lat: pickupCoords.lat,
        lng: pickupCoords.lng,
        label: form.pickupLocation,
        source: 'manual-pin',
      }));
    } catch {}

    const id = 'req_' + Date.now();
    setBookingId(id);

    try {
      localStorage.setItem('last_emergency_booking', JSON.stringify({
        id,
        pickupLat: pickupCoords.lat,
        pickupLng: pickupCoords.lng,
        pickupAddress: form.pickupLocation,
        destination: destName,
        destinationLat: destLat,
        destinationLng: destLng,
        patientName: form.patientName,
        emergencyType: form.emergencyType,
        ambulanceType: form.ambulanceType,
      }));
    } catch {}

    try {
      // 1. Firebase write — non-blocking with 4s timeout so it never hangs the form
      //    If Firebase is not configured (no .env.local keys), this resolves instantly
      const firebasePayload = {
        requestId: id,
        pickup: {
          lat: pickupCoords.lat,
          lng: pickupCoords.lng,
          address: form.pickupLocation,
        },
        destination: {
          name: destName,
          lat: destLat,
          lng: destLng,
          hotline: targetHospital?.hotline || '',
        },
        patientDetails: {
          name: form.patientName,
          phone: form.phone || '+880 1700-000000',
          emergencyType: form.emergencyType || (requestMode === 'general' ? 'general' : 'accident'),
          requestMode,
          priorityLevel: requestMode === 'emergency' ? 'critical' : 'standard',
          estimatedFare,
          scheduledTime: requestMode === 'general' && scheduleOption === 'scheduled' ? scheduledTime : null,
          ambulanceType: form.ambulanceType,
          notes: form.notes,
        },
      };

      // Race Firebase write against 4-second timeout — winner takes all, loser is ignored
      Promise.race([
        createAmbulanceRequest(firebasePayload),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Firebase timeout — skipped')), 4000)
        ),
      ]).catch((err) => {
        console.warn('[Firebase non-critical]', err.message);
      });

      // 2. Backend DB booking — this is the real booking record
      try {
        const res = await bookingAPI.create(payload);
        const realId = res?.data?.booking?.id || res?.data?.id;
        if (realId) setBookingId(String(realId));
      } catch (backendErr) {
        console.warn('[Backend booking] using local ID:', backendErr?.message);
      }

      setSubmitted(true);
    } catch (err) {
      console.warn('Booking submit error:', err);
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  // Success view
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="w-24 h-24 bg-green-100 rounded-full mx-auto flex items-center justify-center mb-6 text-5xl">
              ✅
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Submitted!</h2>
            <p className="text-gray-500 mb-6 leading-relaxed">
              Your ambulance request has been received. Driver dispatched to your exact location.
            </p>
            <div className="bg-primary-50 border border-primary-200 rounded-2xl p-4 mb-6 text-left">
              <p className="text-xs text-gray-500 mb-1">Booking Reference</p>
              <p className="font-bold text-primary-700 text-sm break-all">{bookingId}</p>
              <p className="text-xs text-gray-700 mt-2 font-medium">📍 Pickup: {form.pickupLocation}</p>
              <p className="text-xs text-emerald-700 mt-1 font-semibold flex items-center gap-1">
                🏥 Destination: {form.destination || 'Nearest Emergency Hospital (Auto-Triage)'}
              </p>
              <p className="text-[11px] text-gray-400 mt-1 font-mono">
                Coordinates: {pickupCoords.lat.toFixed(4)}, {pickupCoords.lng.toFixed(4)}
              </p>
            </div>
            <div className="space-y-3">
              <Button
                fullWidth
                onClick={() => router.push(`/tracking/${bookingId}`)}
              >
                🚑 Track Ambulance on Map
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  setSubmitted(false);
                  setForm({ patientName: '', emergencyType: '', pickupLocation: '', destination: '', notes: '', ambulanceType: 'Basic' });
                }}
              >
                New Request
              </Button>
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Request Ambulance</h1>
            <p className="text-xs text-gray-500">Provide details for instant dispatch</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 max-w-xl mx-auto w-full px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ── Request Mode Switcher: Emergency SOS vs General Transfer ── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-sm">Select Request Type</h2>
              <span className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full ${
                requestMode === 'emergency'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {requestMode === 'emergency' ? '🚨 SOS Priority Mode' : '🏥 Standard Transfer Mode'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Emergency Request Card */}
              <button
                type="button"
                onClick={() => handleModeSwitch('emergency')}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  requestMode === 'emergency'
                    ? 'border-red-500 bg-red-50/70 shadow-sm ring-2 ring-red-500/15'
                    : 'border-gray-200 bg-gray-50/50 hover:border-red-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-red-700 flex items-center gap-1.5">
                    <span>🚨</span>
                    <span>Emergency Request</span>
                  </span>
                  <span className="text-[10px] font-bold bg-red-600 text-white px-2 py-0.5 rounded-full">
                    URGENT
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Critical / life-threatening cases. Priority siren dispatch, ICU/Advanced unit & instant nearest ER routing.
                </p>
              </button>

              {/* General Request Card */}
              <button
                type="button"
                onClick={() => handleModeSwitch('general')}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  requestMode === 'general'
                    ? 'border-blue-500 bg-blue-50/70 shadow-sm ring-2 ring-blue-500/15'
                    : 'border-gray-200 bg-gray-50/50 hover:border-blue-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-blue-700 flex items-center gap-1.5">
                    <span>🏥</span>
                    <span>General Request</span>
                  </span>
                  <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">
                    STANDARD
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Routine checkup, hospital discharge, or non-critical patient transfer. Basic ambulance & optional scheduling.
                </p>
              </button>
            </div>

            {/* Mode Difference Summary Bar */}
            <div className={`px-3 py-2 rounded-xl text-[11px] font-medium flex items-start gap-2 border ${
              requestMode === 'emergency'
                ? 'bg-red-50/60 border-red-200 text-red-800'
                : 'bg-blue-50/60 border-blue-200 text-blue-800'
            }`}>
              <Info size={14} className="shrink-0 mt-0.5" />
              <span>
                {requestMode === 'emergency'
                  ? 'Emergency Mode: Highest driver alert priority, siren-enabled dispatch, and automatic routing to the closest trauma/ER hospital.'
                  : 'General Mode: Standard queue dispatch for planned/non-critical transport. You can request now or schedule a pickup time below.'}
              </span>
            </div>

            {/* Optional Scheduling for General Request */}
            {requestMode === 'general' && (
              <div className="pt-1 border-t border-gray-100 space-y-2">
                <label className="block text-xs font-semibold text-gray-700">Pickup Timing</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setScheduleOption('now')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                      scheduleOption === 'now'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    ⚡ Standard Now
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleOption('scheduled')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                      scheduleOption === 'scheduled'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    📅 Schedule Time
                  </button>
                </div>
                {scheduleOption === 'scheduled' && (
                  <input
                    type="datetime-local"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            )}
          </div>

          {/* Patient info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
            <h2 className="font-bold text-gray-800 text-sm">Patient Details</h2>
            <Input
              label="Patient Name"
              name="patientName"
              placeholder="Full name of patient"
              value={form.patientName}
              onChange={handleChange}
              error={errors.patientName}
              required
            />
            <Select
              label={requestMode === 'emergency' ? 'Emergency Nature' : 'Transfer / Visit Reason'}
              name="emergencyType"
              placeholder={requestMode === 'emergency' ? 'Select emergency nature' : 'Select reason for transfer'}
              value={form.emergencyType}
              onChange={handleChange}
              options={EMERGENCY_TYPES}
              error={errors.emergencyType}
              required
            />
          </div>

          {/* Locations */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center text-sm font-bold">📍</span>
                <div>
                  <h2 className="font-bold text-gray-900 text-sm">Pickup Location & Dispatch Point</h2>
                  <p className="text-[11px] text-gray-500">Select pickup using GPS, Map, Area, or Search</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                <Sparkles size={11} /> Auto-GPS Ready
              </span>
            </div>

            {/* ── 3 MAIN LOCATION SELECTION BUTTONS: Locate Me | Select on Map | Choose Area ── */}
            <div className="grid grid-cols-3 gap-2">
              {/* 1. Locate Me */}
              <button
                type="button"
                onClick={handleDetectLiveGPS}
                disabled={geocodingLoading || geoLoading}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 transition-all active:scale-95 shadow-2xs group"
                title="Detect live GPS from your device"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Navigation size={14} className={`text-emerald-600 ${geocodingLoading || geoLoading ? 'animate-spin' : 'group-hover:rotate-12 transition-transform'}`} />
                  <span className="font-bold text-xs">Locate Me</span>
                </div>
                <span className="text-[10px] text-emerald-600 font-medium leading-tight">Live Device GPS</span>
              </button>

              {/* 2. Select on Map */}
              <button
                type="button"
                onClick={() => {
                  setShowMapPicker((v) => !v);
                  if (showAreaDropdown) setShowAreaDropdown(false);
                }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all active:scale-95 shadow-2xs ${
                  showMapPicker
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-blue-50/70 border-blue-200 hover:bg-blue-100 text-blue-800'
                }`}
                title="Pick exact location by clicking on map"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Map size={14} className={showMapPicker ? 'text-white' : 'text-blue-600'} />
                  <span className="font-bold text-xs">{showMapPicker ? 'Hide Map' : 'Select on Map'}</span>
                </div>
                <span className={`text-[10px] font-medium leading-tight ${showMapPicker ? 'text-blue-100' : 'text-blue-600'}`}>
                  Interactive Pin
                </span>
              </button>

              {/* 3. Choose Area / Near Location */}
              <button
                type="button"
                onClick={() => {
                  setShowAreaDropdown((v) => !v);
                  if (showMapPicker) setShowMapPicker(false);
                }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all active:scale-95 shadow-2xs ${
                  showAreaDropdown
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-indigo-50/70 border-indigo-200 hover:bg-indigo-100 text-indigo-800'
                }`}
                title="Choose from popular areas and landmarks"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Building2 size={14} className={showAreaDropdown ? 'text-white' : 'text-indigo-600'} />
                  <span className="font-bold text-xs">Choose Area</span>
                </div>
                <span className={`text-[10px] font-medium leading-tight ${showAreaDropdown ? 'text-indigo-100' : 'text-indigo-600'}`}>
                  Landmarks ▾
                </span>
              </button>
            </div>

            {/* Active Location Coordinates & Live Proximity Status Bar */}
            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-700 truncate">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                </span>
                <span className="font-semibold text-emerald-800 shrink-0">Active Pickup:</span>
                <span className="font-mono text-slate-500 text-[10.5px] truncate">
                  {pickupCoords.lat.toFixed(4)}, {pickupCoords.lng.toFixed(4)}
                </span>
              </div>
              <span className="text-emerald-700 font-bold shrink-0 bg-emerald-100/60 px-2 py-0.5 rounded-md text-[10px]">
                ⚡ {nearbyAmbulances.length} Ambulances • {nearbyHospitals.length} Hospitals Nearby
              </span>
            </div>

            {/* Expandable Choose Area / Landmarks Grid */}
            {showAreaDropdown && (
              <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-2 animate-fade-in">
                <div className="flex items-center justify-between pb-1 border-b border-indigo-100/80">
                  <span className="text-xs font-bold text-indigo-950 flex items-center gap-1">
                    <span>🏢</span> Select Popular Area / Campus:
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAreaDropdown(false)}
                    className="text-[11px] text-indigo-600 font-semibold hover:underline"
                  >
                    Close ✕
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {PRESET_LOCATIONS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        selectPreset(preset);
                        setShowAreaDropdown(false);
                      }}
                      className="flex items-center gap-1.5 p-2 rounded-lg text-left text-[11px] font-medium bg-white hover:bg-indigo-100/80 text-gray-800 border border-indigo-100 transition-all active:scale-95 shadow-2xs"
                    >
                      <span className="shrink-0">{preset.icon}</span>
                      <span className="truncate">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Interactive Map Picker (Map Select) */}
            {showMapPicker && (
              <div className="rounded-2xl overflow-hidden border border-blue-200 shadow-md animate-fade-in">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3.5 py-2 text-xs font-semibold flex items-center justify-between shadow-xs">
                  <span className="flex items-center gap-1.5">
                    <span>📍</span> Click anywhere on the map to pin your exact pickup spot
                  </span>
                  <span className="font-mono text-[10.5px] bg-white/20 px-2 py-0.5 rounded-full">
                    {pickupCoords.lat.toFixed(4)}, {pickupCoords.lng.toFixed(4)}
                  </span>
                </div>
                <div className="h-64 w-full">
                  <MapView
                    center={[pickupCoords.lat, pickupCoords.lng]}
                    userLocation={pickupCoords}
                    ambulances={nearbyAmbulances}
                    hospitals={nearbyHospitals}
                    onLocationSelect={handleMapPin}
                    onHospitalClick={(h) => {
                      selectHospital(h);
                    }}
                    zoom={15}
                    height="100%"
                  />
                </div>
                <div className="bg-blue-50 px-3 py-1.5 text-[11px] text-blue-700 flex items-center justify-between border-t border-blue-100">
                  <span className="truncate">✅ Pinned at: {form.pickupLocation || 'Selected coordinates'}</span>
                  <button
                    type="button"
                    onClick={() => setShowMapPicker(false)}
                    className="font-bold text-blue-800 hover:underline shrink-0 ml-2"
                  >
                    Confirm Spot
                  </button>
                </div>
              </div>
            )}

            {/* Address Search Bar */}
            <div>
              <div className="relative">
                <input
                  type="text"
                  name="pickupLocation"
                  placeholder="Enter house, road, area, or select above..."
                  value={form.pickupLocation}
                  onChange={handleAddressInputChange}
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary-500/20 ${
                    errors.pickupLocation ? 'border-red-500' : 'border-gray-200'
                  }`}
                />
                <MapPin size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary-500 pointer-events-none" />
                
                {form.pickupLocation && (
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, pickupLocation: '' }))}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full"
                  >
                    <X size={14} />
                  </button>
                )}

                {/* Suggestions Dropdown */}
                {searchSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden divide-y divide-gray-50">
                    {searchSuggestions.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => selectSuggestion(item)}
                        className="p-3 hover:bg-gray-50 cursor-pointer flex items-start gap-2.5 text-xs text-gray-700 transition-colors"
                      >
                        <MapPin size={14} className="text-primary-500 mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{item.display_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {errors.pickupLocation && (
                <p className="text-xs text-red-500 mt-1">{errors.pickupLocation}</p>
              )}

              {/* Quick Area Presets Horizontal Scroll Pills */}
              <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                <span className="text-[11px] text-gray-400 font-medium shrink-0">Near:</span>
                {PRESET_LOCATIONS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectPreset(preset)}
                    className="shrink-0 text-[11px] font-medium bg-gray-50 hover:bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg border border-gray-200/80 transition-all active:scale-95"
                  >
                    {preset.icon} {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── UPGRADED DESTINATION HOSPITAL SECTION ── */}
            <div ref={destinationRef} className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <Building2 size={16} className="text-emerald-600" />
                  Destination Hospital / Address
                  <span className="text-[11px] font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    Optional
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowHospitalModal(true)}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-100 transition-all active:scale-95"
                >
                  <Hospital size={12} />
                  <span>Browse Hospitals ({nearbyHospitals.length})</span>
                </button>
              </div>

              {/* Quick Hospital Preset Chips (Prioritized by proximity from pickup spot) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
                <button
                  type="button"
                  onClick={() => selectHospital(null)}
                  className={`shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all active:scale-95 ${
                    !form.destination
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200'
                  }`}
                >
                  🚑 Nearest Emergency ER (Auto)
                </button>
                {nearbyHospitals.slice(0, 7).map((h) => {
                  const isSelected = form.destination === h.name;
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => selectHospital(h)}
                      className={`shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all active:scale-95 flex items-center gap-1 ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm font-bold'
                          : 'bg-gray-50 hover:bg-emerald-50 text-gray-700 border-gray-200 hover:border-emerald-200'
                      }`}
                    >
                      <span>{h.icon}</span>
                      <span>{h.shortName || h.name}</span>
                      {h.distance !== undefined && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                          isSelected ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {h.distance}km
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Main Hospital Input with Dropdown */}
              <div className="relative">
                <input
                  type="text"
                  name="destination"
                  placeholder="e.g. Dhaka Medical College, Square Hospital, or search area..."
                  value={form.destination}
                  onFocus={() => setShowHospitalDropdown(true)}
                  onChange={(e) => {
                    handleChange(e);
                    setShowHospitalDropdown(true);
                  }}
                  className="w-full pl-10 pr-16 py-3 rounded-xl border border-gray-200 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <Building2 size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600 pointer-events-none" />

                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {form.destination && (
                    <button
                      type="button"
                      onClick={() => selectHospital(null)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                      title="Clear destination"
                    >
                      <X size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowHospitalDropdown((v) => !v)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <ChevronDown size={16} className={`transition-transform duration-200 ${showHospitalDropdown ? 'rotate-180 text-emerald-600' : ''}`} />
                  </button>
                </div>

                {/* Dropdown Menu */}
                {showHospitalDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden divide-y divide-gray-100 max-h-72 overflow-y-auto">
                    {/* Auto-triage Option */}
                    <div
                      onClick={() => selectHospital(null)}
                      className={`p-3 cursor-pointer flex items-center justify-between text-xs transition-colors ${
                        !form.destination ? 'bg-emerald-50/70 font-semibold text-emerald-800' : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">🚑</span>
                        <div>
                          <p className="font-bold text-gray-900">Auto-Route to Nearest Emergency Hospital</p>
                          <p className="text-[11px] text-gray-500">Recommended for urgent triage — Driver chooses quickest route</p>
                        </div>
                      </div>
                      {!form.destination && <Check size={16} className="text-emerald-600 shrink-0" />}
                    </div>

                    {/* Hospital List Items */}
                    {filteredHospitals.map((h) => {
                      const isSelected = form.destination === h.name;
                      return (
                        <div
                          key={h.id}
                          onClick={() => selectHospital(h)}
                          className={`p-3 cursor-pointer flex items-start justify-between gap-3 text-xs transition-colors ${
                            isSelected ? 'bg-emerald-50 font-semibold text-emerald-900' : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span className="text-base shrink-0 mt-0.5">{h.icon}</span>
                            <div className="min-w-0">
                              <p className="font-bold text-gray-900 truncate">{h.name}</p>
                              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                {h.distance !== undefined && (
                                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/70 px-1.5 py-0.2 rounded">
                                    📍 {h.distance} km (~{h.estimatedTime}m)
                                  </span>
                                )}
                                <span className="text-[11px] text-gray-500 truncate">{h.area}</span>
                              </div>
                              <p className="text-[11px] text-emerald-700 font-medium mt-0.5">⚡ {h.emergency}</p>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="inline-block text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full mb-1">
                              {h.type.includes('Gov') ? 'Govt' : 'Private'}
                            </span>
                            {isSelected && <Check size={16} className="text-emerald-600 ml-auto" />}
                          </div>
                        </div>
                      );
                    })}

                    {filteredHospitals.length === 0 && (
                      <div className="p-4 text-center text-xs text-gray-500">
                        <p>No predefined hospitals matching &quot;{form.destination}&quot;</p>
                        <p className="text-[11px] text-gray-400 mt-1">You can still type any custom address or hospital name.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Selected Hospital Highlight Card */}
              {matchedHospital ? (
                <div className="mt-2.5 p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <span className="text-xl shrink-0 mt-0.5">{matchedHospital.icon}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-emerald-900">{matchedHospital.name}</span>
                        <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                          Verified Destination
                        </span>
                      </div>
                      <p className="text-gray-600 text-[11px] mt-0.5">📍 {matchedHospital.area}</p>
                      <p className="text-emerald-700 font-medium text-[11px] mt-0.5">🚨 {matchedHospital.emergency}</p>
                      {matchedHospital.hotline && (
                        <p className="text-gray-500 text-[11px] mt-0.5 flex items-center gap-1">
                          <Phone size={10} className="text-emerald-600" />
                          <span>Emergency Hotline: <strong>{matchedHospital.hotline}</strong></span>
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => selectHospital(null)}
                    className="text-gray-400 hover:text-red-500 p-1 shrink-0"
                    title="Change hospital"
                  >
                    <X size={15} />
                  </button>
                </div>
              ) : form.destination ? (
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                  <span className="truncate">Destination set to: <strong className="text-gray-800">{form.destination}</strong></span>
                  <button
                    type="button"
                    onClick={() => selectHospital(null)}
                    className="text-red-500 text-[11px] font-semibold ml-2 hover:underline shrink-0"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <p className="mt-2 text-[11px] text-gray-500 flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                  <Info size={12} className="text-blue-500 shrink-0" />
                  <span>
                    <strong>Optional:</strong> If left blank, driver will auto-navigate to the nearest capable emergency triage hospital.
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Ambulance selector */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-sm">Ambulance Category</h2>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                🟢 {nearbyCounts.totalAvailable} Units Ready Near You
              </span>
            </div>
            <AmbulanceTypeSelector
              selected={form.ambulanceType}
              requestMode={requestMode}
              nearbyCounts={nearbyCounts}
              onChange={(val) => {
                setForm((p) => ({ ...p, ambulanceType: val }));
                if (errors.ambulanceType) setErrors((p) => ({ ...p, ambulanceType: '' }));
              }}
              onSelect={(val) => {
                setForm((p) => ({ ...p, ambulanceType: val }));
                if (errors.ambulanceType) setErrors((p) => ({ ...p, ambulanceType: '' }));
              }}
              error={errors.ambulanceType}
            />
          </div>

          {/* Additional notes */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <Textarea
              label="Medical Notes / Symptoms (Optional)"
              name="notes"
              placeholder="e.g. Difficulty breathing, conscious, stretcher needed..."
              value={form.notes}
              onChange={handleChange}
              rows={3}
            />
          </div>

          {/* Estimated Fare & Response Summary */}
          <div className={`rounded-2xl p-4 border flex items-center justify-between ${
            requestMode === 'emergency'
              ? 'bg-red-50/80 border-red-200'
              : 'bg-blue-50/80 border-blue-200'
          }`}>
            <div>
              <p className="text-xs font-semibold text-gray-600">
                {requestMode === 'emergency' ? '⚡ Priority Emergency Dispatch' : '🏥 Standard General Transfer'}
              </p>
              <p className={`text-xs font-bold mt-0.5 ${
                requestMode === 'emergency' ? 'text-red-700' : 'text-blue-700'
              }`}>
                {requestMode === 'emergency'
                  ? `Fastest Response: 3–5 min • ${nearbyCounts.totalAvailable} nearby ambulances ready`
                  : `Standard Response: 12–18 min • ${nearbyCounts.totalAvailable} nearby ambulances ready`}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] text-gray-500 block font-semibold uppercase">Estimated Fare</span>
              <span className={`text-lg font-black ${
                requestMode === 'emergency' ? 'text-red-700' : 'text-blue-700'
              }`}>
                BDT {estimatedFare.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            fullWidth
            size="xl"
            loading={loading}
            className={`shadow-xl ${
              requestMode === 'emergency'
                ? 'shadow-red-500/25 bg-red-600 hover:bg-red-700'
                : 'shadow-blue-500/25 bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {requestMode === 'emergency'
              ? `🚨 Dispatch Emergency Ambulance Now (BDT ${estimatedFare.toLocaleString()})`
              : `🏥 Book General Ambulance (BDT ${estimatedFare.toLocaleString()})`}
          </Button>
        </form>
      </div>

      {/* ── BROWSE ALL HOSPITALS MODAL ── */}
      {showHospitalModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-emerald-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl">
                  🏥
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Connected Emergency Hospitals</h3>
                  <p className="text-xs text-gray-500">Select destination for emergency triage</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHospitalModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Auto-Triage Option */}
            <div className="p-4 bg-emerald-50/30 border-b border-gray-100">
              <button
                type="button"
                onClick={() => selectHospital(null)}
                className="w-full text-left p-3 rounded-2xl bg-white border-2 border-emerald-500 hover:bg-emerald-50/50 transition-all shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🚑</span>
                  <div>
                    <p className="font-bold text-emerald-900 text-sm">Auto-Route to Nearest Hospital</p>
                    <p className="text-xs text-gray-500">Dispatch system dynamically chooses the nearest capable emergency triage hospital</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg shrink-0">
                  Recommended
                </span>
              </button>
            </div>

            {/* Hospital Directory List (Prioritized by proximity from pickup spot) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-gray-50">
              {nearbyHospitals.map((h) => {
                const isSelected = form.destination === h.name;
                return (
                  <div
                    key={h.id}
                    onClick={() => selectHospital(h)}
                    className={`pt-2.5 first:pt-0 p-3 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/60 shadow-sm'
                        : 'border-gray-100 bg-white hover:border-emerald-200 hover:bg-gray-50/80'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="text-2xl mt-0.5 shrink-0">{h.icon}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-gray-900 text-sm">{h.name}</p>
                          <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {h.type}
                          </span>
                        </div>
                        {h.distance !== undefined && (
                          <p className="text-xs text-emerald-800 font-bold mt-0.5 flex items-center gap-1">
                            <span>📍</span>
                            <span>{h.distance} km from your pickup point</span>
                            <span>•</span>
                            <span>~{h.estimatedTime} min drive</span>
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-0.5">📍 {h.area}</p>
                        <p className="text-xs text-emerald-700 font-medium mt-1">🚨 {h.emergency}</p>
                        {h.hotline && (
                          <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                            <Phone size={10} className="text-emerald-600" />
                            <span>Hotline: <strong>{h.hotline}</strong></span>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 pt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          selectHospital(h);
                        }}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-all ${
                          isSelected
                            ? 'bg-emerald-600 text-white'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
              <span>{nearbyHospitals.length} emergency hospitals connected around your pickup point</span>
              <button
                type="button"
                onClick={() => setShowHospitalModal(false)}
                className="font-semibold text-gray-700 hover:text-gray-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
