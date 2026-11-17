'use client';
// src/app/(user)/home/page.jsx
// Theme-Aware Live Map & Ambulance Finder with Real-time GPS & Firebase Streaming

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Search, MapPin, Filter, ChevronUp, ChevronDown, Radio, Navigation, RefreshCw } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import BottomNav from '@/components/layout/BottomNav';
import AmbulanceCard from '@/components/ambulance/AmbulanceCard';
import { useGeolocation } from '@/hooks/useGeolocation';
import { ambulanceAPI } from '@/lib/api';
import { subscribeToAmbulanceLocation } from '@/lib/firebaseTracking';

const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-500">
      <span className="text-3xl mb-2 animate-bounce">🗺️</span>
      <p className="text-xs font-semibold">Loading Map Grid...</p>
    </div>
  ),
});

const FILTER_TYPES = [
  { id: 'All', label: 'All', icon: '⚡' },
  { id: 'Basic', label: 'Basic', icon: '🚑' },
  { id: 'Advanced', label: 'Advanced', icon: '🚨' },
  { id: 'ICU', label: 'ICU', icon: '🏥' },
];

// Mock ambulances for instant demo data
const MOCK_AMBULANCES = [
  { _id: '1', vehicleNumber: 'AMB-001', type: 'Basic',    status: 'Available', driver: 'Rahim Ahmed',  distance: 1.2, estimatedTime: 6,  rating: 4.8, lat: 23.8203, lng: 90.4225 },
  { _id: '2', vehicleNumber: 'AMB-002', type: 'Advanced', status: 'Available', driver: 'Karim Hossain', distance: 2.4, estimatedTime: 10, rating: 4.6, lat: 23.8003, lng: 90.4025 },
  { _id: '3', vehicleNumber: 'AMB-003', type: 'ICU',      status: 'Busy',      driver: 'Jamal Uddin',  distance: 3.1, estimatedTime: 14, rating: 4.9, lat: 23.8150, lng: 90.4300 },
  { _id: '4', vehicleNumber: 'AMB-004', type: 'Basic',    status: 'Available', driver: 'Sajid Mia',    distance: 0.8, estimatedTime: 4,  rating: 4.7, lat: 23.8250, lng: 90.4050 },
];

export default function HomePage() {
  const { location, getLocation, setManualLocation, loading: geoLoading, error: geoError } = useGeolocation();
  const [ambulances, setAmbulances] = useState(MOCK_AMBULANCES);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAmbulance, setSelectedAmbulance] = useState(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState([23.8103, 90.4125]);
  const [liveDriverPos, setLiveDriverPos] = useState(null);
  const [showAreaPicker, setShowAreaPicker] = useState(false);
  const [locationSuccessMsg, setLocationSuccessMsg] = useState('');

  // Preset landmarks in Bangladesh
  const PRESET_AREAS = [
    { name: 'Daffodil Smart City (Ashulia)', lat: 23.8768, lng: 90.3204, icon: '🎓' },
    { name: 'Dhanmondi, Dhaka', lat: 23.7461, lng: 90.3742, icon: '🏥' },
    { name: 'Gulshan 2, Dhaka', lat: 23.7925, lng: 90.4078, icon: '🏢' },
    { name: 'Uttara Sector 7, Dhaka', lat: 23.8759, lng: 90.3795, icon: '🚆' },
    { name: 'Mirpur 10 Circle, Dhaka', lat: 23.8069, lng: 90.3687, icon: '🏙️' },
    { name: 'Dhaka Central (DMCH)', lat: 23.7258, lng: 90.3975, icon: '🏛️' },
  ];

  // Auto-center map on user location
  useEffect(() => {
    if (location && typeof location.lat === 'number' && typeof location.lng === 'number') {
      setMapCenter([location.lat, location.lng]);
    }
  }, [location]);

  // Listen to live Firebase stream for any active driver
  useEffect(() => {
    const unsub = subscribeToAmbulanceLocation('MOCK-001', (liveData) => {
      if (liveData?.lat && liveData?.lng) {
        setLiveDriverPos({
          _id: 'live-driver-stream',
          vehicleNumber: 'LIVE-AMB',
          type: 'Advanced',
          status: liveData.status || 'En Route',
          driver: 'Live Active Driver',
          lat: liveData.lat,
          lng: liveData.lng,
          speed: liveData.speed,
          isLiveFirebase: true,
        });
      }
    });

    return () => unsub();
  }, []);

  // Fetch from API with graceful fallback to mock data
  const fetchNearby = useCallback(async () => {
    if (!location) return;
    setLoading(true);
    try {
      const res = await ambulanceAPI.getNearby(location.lat, location.lng);
      const list = res.data?.ambulances || res.data?.data || res.data;
      if (Array.isArray(list) && list.length > 0) {
        setAmbulances(list);
      }
    } catch {
      // Retain mock ambulances
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    fetchNearby();
  }, [fetchNearby]);

  // Merge live Firebase driver into the list if active
  const allAmbulances = useMemo(() => {
    if (liveDriverPos) {
      const filtered = ambulances.filter((a) => a._id !== 'live-driver-stream');
      return [liveDriverPos, ...filtered];
    }
    return ambulances;
  }, [ambulances, liveDriverPos]);

  // Synchronous filter calculation
  const filteredAmbulances = useMemo(() => {
    let result = [...allAmbulances];
    if (selectedFilter !== 'All') {
      result = result.filter((a) => a.type?.toLowerCase() === selectedFilter.toLowerCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.vehicleNumber?.toLowerCase().includes(q) ||
          a.driver?.toLowerCase().includes(q) ||
          a.type?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [allAmbulances, selectedFilter, searchQuery]);

  const availableCount = allAmbulances.filter((a) => a.status === 'Available' || a.status === 'En Route').length;

  const countForType = (typeId) => {
    if (typeId === 'All') return allAmbulances.length;
    return allAmbulances.filter((a) => a.type?.toLowerCase() === typeId.toLowerCase()).length;
  };

  const handleMapClick = async (coords) => {
    const loc = await setManualLocation(coords);
    if (loc) {
      setMapCenter([coords.lat, coords.lng]);
      setLocationSuccessMsg(`📍 Location pinned: ${loc.label || 'Selected on Map'}`);
      setTimeout(() => setLocationSuccessMsg(''), 4000);
    }
  };

  const handleLocateMe = async () => {
    const loc = await getLocation({ forceFresh: true });
    if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
      setMapCenter([loc.lat, loc.lng]);
      setLocationSuccessMsg(`📍 Live GPS detected: ${loc.label || 'Your Location'}`);
      setTimeout(() => setLocationSuccessMsg(''), 4000);
    }
  };

  const handleSelectPresetArea = async (area) => {
    const loc = await setManualLocation({ lat: area.lat, lng: area.lng }, area.name);
    if (loc) {
      setMapCenter([area.lat, area.lng]);
      setShowAreaPicker(false);
      setLocationSuccessMsg(`📍 Selected Area: ${area.name}`);
      setTimeout(() => setLocationSuccessMsg(''), 4000);
    }
  };

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--bg)', color: 'var(--on-surface)' }}>
      <Navbar title="Live Ambulance Radar" />

      {/* Map Container */}
      <div className="flex-1 relative overflow-hidden">
        
        {/* Leaflet Map */}
        <div className="absolute inset-0 z-0">
          <MapView
            center={mapCenter}
            userLocation={location}
            ambulances={filteredAmbulances}
            driverLocation={liveDriverPos ? { lat: liveDriverPos.lat, lng: liveDriverPos.lng, speed: liveDriverPos.speed } : null}
            onAmbulanceClick={setSelectedAmbulance}
            onLocationSelect={handleMapClick}
            height="100%"
          />
        </div>

        {/* ── High-Priority Floating Controls (Over Leaflet Map z-[1000]) ── */}
        <div
          className="absolute top-4 left-4 right-4 z-30 pointer-events-none flex flex-col gap-2 max-w-xl mx-auto"
          style={{ zIndex: 1000 }}
        >
          {/* Top Bar: Search Input + Status Pill */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--on-surface-subtle)' }}
              />
              <input
                type="text"
                placeholder="Search ambulance, driver, or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs sm:text-sm font-medium transition-all shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                style={{
                  background: 'var(--surface)',
                  color: 'var(--on-surface)',
                  border: '1px solid var(--border)',
                  backdropFilter: 'blur(12px)',
                }}
              />
            </div>

            <div
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-bold shrink-0 shadow-lg"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: '#16a34a',
              }}
            >
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>{availableCount} Available</span>
            </div>
          </div>

          {/* Current Location Quick Info Bar */}
          <div
            className="flex items-center justify-between px-3.5 py-2 rounded-2xl text-xs shadow-md pointer-events-auto backdrop-blur-md"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="flex items-center gap-2 truncate">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
              </span>
              <span className="font-semibold text-blue-600 truncate">
                📍 {location?.label || 'Current Location'}:
              </span>
              <span className="font-mono text-gray-500 truncate text-[11px]">
                {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Detecting...'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowAreaPicker((v) => !v)}
                className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 transition"
                title="Select from popular areas"
              >
                Areas ▾
              </button>

              <button
                type="button"
                onClick={handleLocateMe}
                disabled={geoLoading}
                className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 px-2.5 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 transition shadow-xs active:scale-95 disabled:opacity-60"
              >
                <Navigation size={12} className={geoLoading ? 'animate-spin' : ''} />
                <span>{geoLoading ? 'Locating...' : 'Locate Me'}</span>
              </button>
            </div>
          </div>

          {/* Quick Area Picker Dropdown */}
          {showAreaPicker && (
            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl pointer-events-auto backdrop-blur-md animate-fade-in">
              <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Select Quick Location:
                </span>
                <span className="text-[10px] text-slate-400">
                  Or click directly on map to pin
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {PRESET_AREAS.map((area) => (
                  <button
                    key={area.name}
                    type="button"
                    onClick={() => handleSelectPresetArea(area)}
                    className="flex items-center gap-1.5 p-2 rounded-xl text-left text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                  >
                    <span>{area.icon}</span>
                    <span className="truncate">{area.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Location Success Toast */}
          {locationSuccessMsg && (
            <div className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 pointer-events-auto shadow-md animate-fade-in">
              {locationSuccessMsg}
            </div>
          )}

          {/* Location Error / Guidance */}
          {geoError && (
            <div className="px-3.5 py-2 rounded-xl text-[11px] font-medium bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 pointer-events-auto shadow-md flex items-center justify-between">
              <span>⚠️ {geoError}</span>
              <button
                type="button"
                onClick={() => setShowAreaPicker(true)}
                className="text-amber-700 dark:text-amber-400 font-bold underline ml-2 shrink-0"
              >
                Choose Area
              </button>
            </div>
          )}

          {/* ── Category Filter Chips: ALL, BASIC, ADVANCED, ICU ── */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pointer-events-auto scrollbar-hide">
            {FILTER_TYPES.map(({ id, label, icon }) => {
              const count = countForType(id);
              const isSelected = selectedFilter === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedFilter(id)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 shrink-0 shadow-md active:scale-95"
                  style={{
                    background: isSelected ? 'var(--primary)' : 'var(--surface)',
                    color: isSelected ? '#ffffff' : 'var(--on-surface)',
                    border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                    boxShadow: isSelected ? '0 4px 14px rgba(225,29,72,0.35)' : 'var(--shadow-sm)',
                  }}
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                  <span
                    className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono"
                    style={{
                      background: isSelected ? 'rgba(255,255,255,0.25)' : 'var(--surface-2)',
                      color: isSelected ? '#ffffff' : 'var(--on-surface-muted)',
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── Bottom Sheet for Nearby Ambulance Cards ── */}
      <div
        className={`rounded-t-3xl shadow-2xl z-20 transition-all duration-300 ${
          sheetExpanded ? 'h-2/3' : 'h-52'
        } flex flex-col`}
        style={{
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
        }}
      >
        {/* Handle */}
        <div
          className="flex flex-col items-center pt-3 pb-2 cursor-pointer select-none"
          onClick={() => setSheetExpanded((v) => !v)}
        >
          <div className="w-10 h-1 rounded-full mb-2" style={{ background: 'var(--border-strong)' }} />
          <div className="flex items-center justify-between w-full px-5">
            <div>
              <p className="font-bold text-sm sm:text-base" style={{ color: 'var(--on-surface)' }}>
                Nearby Ambulances
              </p>
              <p className="text-xs" style={{ color: 'var(--on-surface-muted)' }}>
                {filteredAmbulances.length} units matching <strong style={{ color: 'var(--primary)' }}>{selectedFilter}</strong>
              </p>
            </div>
            <button className="p-1 rounded-lg" style={{ background: 'var(--surface-2)' }}>
              {sheetExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </button>
          </div>
        </div>

        {/* Ambulance horizontal scroll cards */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden px-4 pb-3 flex gap-3.5 items-center scrollbar-hide">
          {filteredAmbulances.map((amb) => (
            <div key={amb._id} className="min-w-[280px] max-w-[310px] shrink-0">
              <AmbulanceCard
                ambulance={amb}
                onSelect={(a) => {
                  setSelectedAmbulance(a);
                  setMapCenter([a.location?.lat || a.lat, a.location?.lng || a.lng]);
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
