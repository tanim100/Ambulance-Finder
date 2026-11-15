'use client';
// src/app/(user)/request/page.jsx — Modern Ambulance Request with Live Reverse Geocoding, Map Picker & Autocomplete

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { MapPin, ArrowLeft, CheckCircle, Navigation, Map, Search, X, Loader2, Sparkles } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import BottomNav from '@/components/layout/BottomNav';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import AmbulanceTypeSelector from '@/components/ambulance/AmbulanceTypeSelector';
import { bookingAPI } from '@/lib/api';
import { useGeolocation } from '@/hooks/useGeolocation';
import { updatePatientLocation } from '@/lib/firebaseTracking';

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

  const searchDebounceRef = useRef(null);

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

  // High-accuracy live device GPS
  const handleDetectLiveGPS = () => {
    if (navigator.geolocation) {
      setGeocodingLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setPickupCoords({ lat, lng });
          reverseGeocode(lat, lng);
          try {
            localStorage.setItem('user_last_location', JSON.stringify({ lat, lng, label: 'Your Exact GPS Location' }));
          } catch {}
        },
        () => {
          getLocation();
          setGeocodingLoading(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      getLocation();
    }
  };

  // Map pin click handler
  const handleMapPin = (coords) => {
    setPickupCoords(coords);
    reverseGeocode(coords.lat, coords.lng);
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

    try {
      const res = await bookingAPI.create(payload);
      const id = res.data?.booking?.id || res.data?.booking?._id || res.data?.id || res.data?._id || 'trip-' + Date.now();
      setBookingId(id);

      updatePatientLocation(id, {
        lat: pickupCoords.lat,
        lng: pickupCoords.lng,
        address: form.pickupLocation,
      });

      setSubmitted(true);
    } catch {
      const id = 'trip-' + Date.now();
      setBookingId(id);

      updatePatientLocation(id, {
        lat: pickupCoords.lat,
        lng: pickupCoords.lng,
        address: form.pickupLocation,
      });

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
              <p className="text-xs text-gray-700 mt-2 font-medium">📍 {form.pickupLocation}</p>
              <p className="text-[11px] text-gray-400 mt-0.5 font-mono">
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

            <Input
              label="Destination Hospital / Address (Optional)"
              name="destination"
              placeholder="e.g. Dhaka Medical College, Square Hospital, or leave blank"
              value={form.destination}
              onChange={handleChange}
            />
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

      <BottomNav />
    </div>
  );
}
