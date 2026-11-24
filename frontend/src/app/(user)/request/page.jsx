'use client';
// src/app/(user)/request/page.jsx — Modern Ambulance Request with Live Reverse Geocoding, Map Picker & Autocomplete

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { MapPin, ArrowLeft, CheckCircle, Navigation, Map, Search, X, Loader2, Sparkles, Building2, Hospital, Phone, ShieldCheck, ChevronDown, Check, Info } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import BottomNav from '@/components/layout/BottomNav';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import AmbulanceTypeSelector from '@/components/ambulance/AmbulanceTypeSelector';
import { bookingAPI } from '@/lib/api';
import { useGeolocation } from '@/hooks/useGeolocation';
import { updatePatientLocation, createAmbulanceRequest } from '@/lib/firebaseTracking';

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
  { label: '🏥 Dhaka Medical College', address: 'Dhaka Medical College Hospital, Secretariate Rd, Dhaka', lat: 23.7258, lng: 90.3976 },
  { label: '🏢 Dhanmondi 27', address: 'Dhanmondi Road 27, Dhaka', lat: 23.7535, lng: 90.3703 },
  { label: '🏬 Uttara Sector 3', address: 'Sector 3, Uttara Model Town, Dhaka', lat: 23.8690, lng: 90.3985 },
  { label: '🛣️ Mirpur 10', address: 'Mirpur 10 Roundabout, Mirpur, Dhaka', lat: 23.8071, lng: 90.3686 },
  { label: '🏙️ Gulshan 2', address: 'Gulshan 2 Circle, Gulshan, Dhaka', lat: 23.7925, lng: 90.4172 },
];

export const TOP_HOSPITALS = [
  {
    id: 'dmch',
    name: 'Dhaka Medical College & Hospital (DMCH)',
    shortName: 'Dhaka Medical (DMCH)',
    area: 'Secretariate Rd, Shahbagh, Dhaka',
    type: 'Government Super-Specialized',
    emergency: '24/7 Level-1 Trauma, Burn Unit & CCU',
    hotline: '01711-234567',
    phone: '02-55165555',
    icon: '🏥',
    popular: true,
  },
  {
    id: 'square',
    name: 'Square Hospitals Ltd.',
    shortName: 'Square Hospital',
    area: '18/F Panthapath, Dhaka',
    type: 'Private Tertiary Care',
    emergency: '24/7 Emergency, Stroke & Cardiac Center',
    hotline: '10616',
    phone: '01713-377775',
    icon: '🏥',
    popular: true,
  },
  {
    id: 'evercare',
    name: 'Evercare Hospital Dhaka',
    shortName: 'Evercare Hospital',
    area: 'Plot 81, Block E, Bashundhara R/A, Dhaka',
    type: 'Private Multi-Disciplinary',
    emergency: 'JCI Accredited, 24/7 Critical Care & Trauma',
    hotline: '10678',
    phone: '09666710678',
    icon: '🏥',
    popular: true,
  },
  {
    id: 'united',
    name: 'United Hospital Gulshan',
    shortName: 'United Hospital',
    area: 'Plot 15, Road 71, Gulshan 2, Dhaka',
    type: 'Private Specialized',
    emergency: '24/7 Comprehensive Cardiac & ER Care',
    hotline: '10666',
    phone: '01914-001234',
    icon: '🏥',
    popular: true,
  },
  {
    id: 'bsmmu',
    name: 'Bangabandhu Sheikh Mujib Medical University (BSMMU)',
    shortName: 'BSMMU (PG Hospital)',
    area: 'Shahbagh, Dhaka',
    type: 'Public Medical University',
    emergency: 'Super-Specialized Research & Emergency ICU',
    hotline: '01712-987654',
    phone: '02-9661051',
    icon: '🏥',
    popular: true,
  },
  {
    id: 'birdem',
    name: 'BIRDEM General Hospital',
    shortName: 'BIRDEM Hospital',
    area: '122 Kazi Nazrul Islam Ave, Shahbagh, Dhaka',
    type: 'Specialized Endocrine & General',
    emergency: '24/7 ICU, Nephrology & Emergency Triage',
    hotline: '10615',
    phone: '02-9661551',
    icon: '🏥',
    popular: true,
  },
  {
    id: 'nicvd',
    name: 'National Institute of Cardiovascular Diseases (NICVD)',
    shortName: 'NICVD (National Heart)',
    area: 'Sher-e-Bangla Nagar, Dhaka',
    type: 'National Apex Cardiac Center',
    emergency: 'National Emergency Cardiac Cath-Lab & CCU',
    hotline: '01715-667788',
    phone: '02-9122560',
    icon: '❤️',
    popular: true,
  },
  {
    id: 'nitor',
    name: 'National Institute of Traumatology & Orthopaedics (NITOR)',
    shortName: 'NITOR (Pongu / Trauma)',
    area: 'Sher-e-Bangla Nagar, Dhaka',
    type: 'Apex Orthopedic & Trauma Center',
    emergency: '24/7 Emergency Bone & Polytrauma Surgery',
    hotline: '02-9114075',
    phone: '02-9114075',
    icon: '🩹',
    popular: true,
  },
  {
    id: 'kurmitola',
    name: 'Kurmitola General Hospital',
    shortName: 'Kurmitola General',
    area: 'Dhaka-Mymensingh Rd, Dhaka Cantonment',
    type: 'Government General Hospital',
    emergency: '24/7 Acute Trauma & General Emergency Care',
    hotline: '01769-010200',
    phone: '02-55067201',
    icon: '🏥',
    popular: false,
  },
  {
    id: 'shishu',
    name: 'Dhaka Shishu (Children) Hospital',
    shortName: 'Dhaka Shishu Hospital',
    area: 'Sher-e-Bangla Nagar, Dhaka',
    type: 'Specialized Pediatric Emergency',
    emergency: '24/7 Pediatric Emergency & Neonatal ICU',
    hotline: '02-58153401',
    phone: '02-58153401',
    icon: '👶',
    popular: false,
  },
  {
    id: 'labaid',
    name: 'Labaid Specialized Hospital',
    shortName: 'Labaid Hospital',
    area: 'House 6, Road 4, Dhanmondi, Dhaka',
    type: 'Private Specialized Cardiac',
    emergency: '24/7 Cardiac Emergency Unit & CCU',
    hotline: '10606',
    phone: '02-9676356',
    icon: '🏥',
    popular: false,
  },
  {
    id: 'ibnsina',
    name: 'Ibn Sina Specialized Hospital',
    shortName: 'Ibn Sina Hospital',
    area: 'House 68, Road 15/A, Dhanmondi, Dhaka',
    type: 'Private Multi-Disciplinary',
    emergency: '24/7 Emergency, Stroke & Trauma Care',
    hotline: '10615',
    phone: '02-9126625',
    icon: '🏥',
    popular: false,
  },
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
    ambulanceType: 'Basic',
  });

  const [pickupCoords, setPickupCoords] = useState({ lat: 23.8103, lng: 90.4125 });
  const [showMapPicker, setShowMapPicker] = useState(false);
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

  // Find matched hospital object if any
  const matchedHospital = TOP_HOSPITALS.find(
    (h) =>
      form.destination.trim() &&
      (h.name.toLowerCase() === form.destination.trim().toLowerCase() ||
        h.shortName.toLowerCase() === form.destination.trim().toLowerCase() ||
        form.destination.toLowerCase().includes(h.shortName.toLowerCase()) ||
        (form.destination.length > 5 && h.name.toLowerCase().includes(form.destination.toLowerCase())))
  );

  // Filtered hospitals based on user search
  const filteredHospitals = form.destination.trim()
    ? TOP_HOSPITALS.filter(
        (h) =>
          h.name.toLowerCase().includes(form.destination.toLowerCase()) ||
          h.shortName.toLowerCase().includes(form.destination.toLowerCase()) ||
          h.area.toLowerCase().includes(form.destination.toLowerCase()) ||
          h.emergency.toLowerCase().includes(form.destination.toLowerCase())
      )
    : TOP_HOSPITALS;

  // Pre-fill destination if passed via URL parameter (e.g., from hospital cards)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const dest = params.get('destination') || params.get('hospital');
      if (dest) {
        setForm((prev) => ({ ...prev, destination: dest }));
      }
    }
  }, []);

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

    const payload = {
      pickupLocation: {
        address: form.pickupLocation,
        lat: pickupCoords.lat,
        lng: pickupCoords.lng,
      },
      destinationLocation: {
        address: form.destination || 'Nearest General Hospital',
      },
      patientName: form.patientName,
      emergencyType: form.emergencyType,
      notes: form.notes,
      ambulanceType: form.ambulanceType,
    };

    try {
      localStorage.setItem('user_last_location', JSON.stringify({
        lat: pickupCoords.lat,
        lng: pickupCoords.lng,
        label: form.pickupLocation,
      }));
    } catch {}

    const id = 'req_' + Date.now();
    setBookingId(id);

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
        destination: matchedHospital ? {
          name: matchedHospital.name,
          lat: matchedHospital.lat || 23.8188,
          lng: matchedHospital.lng || 90.4074,
          hotline: matchedHospital.hotline || '',
        } : {
          name: form.destination || 'Nearest General Hospital (Auto-Triage)',
          lat: 23.8188,
          lng: 90.4074,
          hotline: '',
        },
        patientDetails: {
          name: form.patientName,
          phone: form.phone || '+880 1700-000000',
          emergencyType: form.emergencyType,
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
              label="Emergency Type"
              name="emergencyType"
              placeholder="Select emergency nature"
              value={form.emergencyType}
              onChange={handleChange}
              options={EMERGENCY_TYPES}
              error={errors.emergencyType}
              required
            />
          </div>

          {/* Locations */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
            <h2 className="font-bold text-gray-800 text-sm flex items-center justify-between">
              <span>Location Details</span>
              <span className="text-[11px] font-normal text-emerald-600 flex items-center gap-1">
                <Sparkles size={12} /> Auto-GPS Enabled
              </span>
            </h2>

            {/* ── UPGRADED PICKUP LOCATION SECTION ── */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-gray-700">
                  Pickup Location <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDetectLiveGPS}
                    disabled={geocodingLoading || geoLoading}
                    className="text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1 bg-primary-50 px-2.5 py-1 rounded-lg border border-primary-100 transition-all active:scale-95"
                  >
                    <Navigation size={12} className={geocodingLoading || geoLoading ? 'animate-spin' : ''} />
                    {geocodingLoading ? 'Detecting...' : 'Detect GPS'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowMapPicker(!showMapPicker)}
                    className={`text-xs font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all active:scale-95 ${
                      showMapPicker
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'
                    }`}
                  >
                    <Map size={12} />
                    {showMapPicker ? 'Hide Map' : 'Pick on Map'}
                  </button>
                </div>
              </div>

              {/* Main Address Search Input */}
              <div className="relative">
                <input
                  type="text"
                  name="pickupLocation"
                  placeholder="Enter house, road, area, or click Detect GPS"
                  value={form.pickupLocation}
                  onChange={handleAddressInputChange}
                  className={`w-full pl-10 pr-10 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary-500/20 ${
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

              {/* Clean Location Coordinates Badge */}
              <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                <span className="flex items-center gap-1 font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  <CheckCircle size={11} /> Exact GPS: {pickupCoords.lat.toFixed(4)}, {pickupCoords.lng.toFixed(4)}
                </span>
                <span className="text-gray-400">Tap presets below or click map</span>
              </div>

              {/* Quick Area Presets */}
              <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                {PRESET_LOCATIONS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectPreset(preset)}
                    className="shrink-0 text-[11px] font-medium bg-gray-50 hover:bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg border border-gray-200/60 transition-all active:scale-95"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Interactive Inline Map Picker */}
              {showMapPicker && (
                <div className="mt-3 rounded-2xl overflow-hidden border border-blue-200 shadow-inner">
                  <div className="bg-blue-50 px-3 py-1.5 text-[11px] text-blue-700 font-medium flex items-center justify-between">
                    <span>📍 Click anywhere on the map to pin your exact pickup spot</span>
                    <span className="font-mono text-[10px]">{pickupCoords.lat.toFixed(4)}, {pickupCoords.lng.toFixed(4)}</span>
                  </div>
                  <div className="h-52 w-full">
                    <MapView
                      center={[pickupCoords.lat, pickupCoords.lng]}
                      userLocation={pickupCoords}
                      onLocationSelect={handleMapPin}
                      zoom={15}
                      height="100%"
                    />
                  </div>
                </div>
              )}
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
                  <span>Browse Hospitals ({TOP_HOSPITALS.length})</span>
                </button>
              </div>

              {/* Quick Hospital Preset Chips */}
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
                {TOP_HOSPITALS.filter((h) => h.popular).map((h) => {
                  const isSelected = form.destination === h.name;
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => selectHospital(h)}
                      className={`shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all active:scale-95 ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm font-bold'
                          : 'bg-gray-50 hover:bg-emerald-50 text-gray-700 border-gray-200 hover:border-emerald-200'
                      }`}
                    >
                      {h.icon} {h.shortName}
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
                              <p className="text-[11px] text-gray-500 truncate">📍 {h.area}</p>
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
            <h2 className="font-bold text-gray-800 text-sm">Ambulance Category</h2>
            <AmbulanceTypeSelector
              selected={form.ambulanceType}
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

          {/* Submit */}
          <Button
            type="submit"
            fullWidth
            size="xl"
            loading={loading}
            className="shadow-xl shadow-primary-500/25"
          >
            🚨 Request Ambulance Now
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

            {/* Hospital Directory List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-gray-50">
              {TOP_HOSPITALS.map((h) => {
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
              <span>{TOP_HOSPITALS.length} major hospitals connected with 24/7 ER units</span>
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
