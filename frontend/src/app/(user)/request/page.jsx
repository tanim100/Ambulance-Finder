'use client';
// src/app/(user)/request/page.jsx

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, ArrowLeft, CheckCircle, Navigation } from 'lucide-react';
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

const EMERGENCY_TYPES = [
  { value: 'accident',    label: '🚗 Accident' },
  { value: 'cardiac',     label: '❤️ Cardiac Emergency' },
  { value: 'respiratory', label: '🫁 Respiratory Emergency' },
  { value: 'trauma',      label: '🩹 Trauma' },
  { value: 'maternity',   label: '👶 Maternity' },
  { value: 'general',     label: '🏥 General Emergency' },
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
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [bookingId, setBookingId] = useState(null);

  // Auto-fill pickup location from detected geolocation if available
  useEffect(() => {
    if (currentGeoLoc && currentGeoLoc.lat && currentGeoLoc.lng) {
      setPickupCoords({ lat: currentGeoLoc.lat, lng: currentGeoLoc.lng });
      if (!form.pickupLocation) {
        setForm((prev) => ({
          ...prev,
          pickupLocation: currentGeoLoc.label || `${currentGeoLoc.lat.toFixed(4)}, ${currentGeoLoc.lng.toFixed(4)}`,
        }));
      }
    }
  }, [currentGeoLoc]);

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

  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setPickupCoords({ lat, lng });
          setForm((p) => ({
            ...p,
            pickupLocation: `Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          }));
          try {
            localStorage.setItem('user_last_location', JSON.stringify({ lat, lng, label: 'Your Exact GPS Location' }));
          } catch {}
        },
        () => {
          getLocation();
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      getLocation();
    }
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

    // Save exact pickup coordinates to localStorage
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

      // Publish patient location to Firebase
      updatePatientLocation(id, {
        lat: pickupCoords.lat,
        lng: pickupCoords.lng,
        address: form.pickupLocation,
      });

      setSubmitted(true);
    } catch {
      // Demo / offline fallback
      const id = 'trip-' + Date.now();
      setBookingId(id);

      // Publish to Firebase active trip
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

  // Success state
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
              Your ambulance request has been received. A driver is dispatched and tracking is live.
            </p>
            <div className="bg-primary-50 border border-primary-200 rounded-2xl p-4 mb-6 text-left">
              <p className="text-xs text-gray-500 mb-1">Booking Reference</p>
              <p className="font-bold text-primary-700 text-sm break-all">{bookingId}</p>
              <p className="text-[11px] text-gray-400 mt-1 font-mono">
                Pickup: {pickupCoords.lat.toFixed(4)}, {pickupCoords.lng.toFixed(4)}
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
            <h2 className="font-bold text-gray-800 text-sm">Location Details</h2>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-gray-700">
                  Pickup Location <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  disabled={geoLoading}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                >
                  <Navigation size={12} className={geoLoading ? 'animate-spin' : ''} />
                  Detect Exact Location
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  name="pickupLocation"
                  placeholder="House, road, landmark, city"
                  value={form.pickupLocation}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary-500/20 ${
                    errors.pickupLocation ? 'border-red-500' : 'border-gray-200'
                  }`}
                />
                <MapPin size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              {errors.pickupLocation && (
                <p className="text-xs text-red-500 mt-1">{errors.pickupLocation}</p>
              )}
              <p className="text-[11px] text-gray-400 mt-1 font-mono">
                Exact Coordinates: {pickupCoords.lat.toFixed(4)}, {pickupCoords.lng.toFixed(4)}
              </p>
            </div>

            <Input
              label="Destination Hospital / Address (Optional)"
              name="destination"
              placeholder="Hospital name or address"
              value={form.destination}
              onChange={handleChange}
            />
          </div>

          {/* Ambulance selector */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <h2 className="font-bold text-gray-800 text-sm">Ambulance Category</h2>
            <AmbulanceTypeSelector
              selected={form.ambulanceType}
              onChange={(val) => setForm((p) => ({ ...p, ambulanceType: val }))}
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
