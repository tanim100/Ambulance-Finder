'use client';
// src/app/(user)/request/page.jsx

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, ArrowLeft, CheckCircle } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import BottomNav from '@/components/layout/BottomNav';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import AmbulanceTypeSelector from '@/components/ambulance/AmbulanceTypeSelector';
import { bookingAPI } from '@/lib/api';

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
  const [form, setForm] = useState({
    patientName: '',
    emergencyType: '',
    pickupLocation: '',
    destination: '',
    notes: '',
    ambulanceType: 'Basic',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [bookingId, setBookingId] = useState(null);

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
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((p) => ({
          ...p,
          pickupLocation: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
        }));
      },
      () => {}
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await bookingAPI.create(form);
      const id = res.data?.booking?._id || res.data?._id || 'demo-' + Date.now();
      setBookingId(id);
      setSubmitted(true);
    } catch {
      // Demo fallback
      const id = 'demo-' + Date.now();
      setBookingId(id);
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
              Your ambulance request has been received. A driver will confirm shortly.
            </p>
            <div className="bg-primary-50 border border-primary-200 rounded-2xl p-4 mb-6 text-left">
              <p className="text-xs text-gray-500 mb-1">Booking Reference</p>
              <p className="font-bold text-primary-700 text-sm break-all">{bookingId}</p>
            </div>
            <div className="space-y-3">
              <Button
                fullWidth
                onClick={() => router.push(`/tracking/${bookingId}`)}
              >
                🚑 Track Your Ambulance
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
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="font-bold text-gray-900 text-lg">Request Ambulance</h1>
            <p className="text-xs text-gray-500">Fill in emergency details below</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* Emergency banner */}
          <div className="bg-primary-600 text-white rounded-2xl p-4 flex items-center gap-3">
            <span className="text-3xl">🚨</span>
            <div>
              <p className="font-bold">Emergency Request</p>
              <p className="text-xs text-primary-200">Fill all required fields accurately for faster response</p>
            </div>
          </div>

          {/* Patient Info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <span>👤</span> Patient Information
            </h2>
            <Input
              id="patientName"
              name="patientName"
              label="Patient Name"
              placeholder="Full name of the patient"
              value={form.patientName}
              onChange={handleChange}
              error={errors.patientName}
              required
            />
            <Select
              id="emergencyType"
              name="emergencyType"
              label="Emergency Type"
              placeholder="Select emergency type"
              options={EMERGENCY_TYPES}
              value={form.emergencyType}
              onChange={handleChange}
              error={errors.emergencyType}
              required
            />
          </div>

          {/* Location */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <span>📍</span> Location Details
            </h2>
            <div>
              <Input
                id="pickupLocation"
                name="pickupLocation"
                label="Pickup Location"
                placeholder="Enter pickup address"
                value={form.pickupLocation}
                onChange={handleChange}
                error={errors.pickupLocation}
                required
                leftIcon={<MapPin size={16} />}
              />
              <button
                type="button"
                onClick={handleUseMyLocation}
                className="mt-2 text-xs text-primary-600 font-medium hover:underline flex items-center gap-1"
              >
                📍 Use my current location
              </button>
            </div>
            <Input
              id="destination"
              name="destination"
              label="Destination Hospital (optional)"
              placeholder="e.g. Dhaka Medical College"
              value={form.destination}
              onChange={handleChange}
              leftIcon={<span className="text-sm">🏥</span>}
            />
            <Textarea
              id="notes"
              name="notes"
              label="Additional Notes"
              placeholder="Describe the emergency, patient condition, floor number, etc."
              value={form.notes}
              onChange={handleChange}
              rows={3}
            />
          </div>

          {/* Ambulance Type */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>🚑</span> Select Ambulance Type
            </h2>
            {errors.ambulanceType && (
              <p className="text-xs text-red-600 mb-3">{errors.ambulanceType}</p>
            )}
            <AmbulanceTypeSelector
              selected={form.ambulanceType}
              onSelect={(type) => setForm((p) => ({ ...p, ambulanceType: type }))}
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            fullWidth
            size="xl"
            loading={loading}
            className="shadow-xl shadow-primary-200"
          >
            {loading ? 'Sending Request...' : '🚑 Request Ambulance Now'}
          </Button>

          <p className="text-center text-xs text-gray-400 pb-2">
            For immediate life-threatening emergencies, call{' '}
            <a href="tel:999" className="text-primary-600 font-bold">999</a>
          </p>
        </form>
      </div>

      <BottomNav />
    </div>
  );
}
