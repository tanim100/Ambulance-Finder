'use client';
// src/app/(user)/home/page.jsx
// Theme-Aware Live Map & Ambulance Finder

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Search, MapPin, Filter, ChevronUp, ChevronDown, Radio } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import BottomNav from '@/components/layout/BottomNav';
import AmbulanceCard from '@/components/ambulance/AmbulanceCard';
import { useGeolocation } from '@/hooks/useGeolocation';
import { ambulanceAPI } from '@/lib/api';

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
  const { location } = useGeolocation();
  const [ambulances, setAmbulances] = useState(MOCK_AMBULANCES);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAmbulance, setSelectedAmbulance] = useState(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState([23.8103, 90.4125]);

  useEffect(() => {
    if (location) {
      setMapCenter([location.lat, location.lng]);
    }
  }, [location]);

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

  // Synchronous filter calculation
  const filteredAmbulances = useMemo(() => {
    let result = [...ambulances];
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
  }, [ambulances, selectedFilter, searchQuery]);

  const availableCount = ambulances.filter((a) => a.status === 'Available').length;

  const countForType = (typeId) => {
    if (typeId === 'All') return ambulances.length;
    return ambulances.filter((a) => a.type?.toLowerCase() === typeId.toLowerCase()).length;
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
            onAmbulanceClick={setSelectedAmbulance}
            height="100%"
          />
        </div>

        {/* ── High-Priority Floating Controls (Over Leaflet Map z-[1000]) ── */}
        <div
          className="absolute top-4 left-4 right-4 z-30 pointer-events-none flex flex-col gap-2.5 max-w-xl mx-auto"
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
            <div style={{ color: 'var(--on-surface-muted)' }}>
              {sheetExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
            </div>
          </div>
        </div>

        {/* Primary Request Action Button */}
        <div className="px-5 mb-2 shrink-0">
          <Link
            href="/request"
            className="btn-primary w-full justify-center"
            style={{ textDecoration: 'none', padding: '12px' }}
          >
            🚨 Request Ambulance Now
          </Link>
        </div>

        {/* Scrollable Ambulance Card List */}
        <div className="flex-1 px-5 pb-24 overflow-y-auto space-y-2.5 custom-scrollbar">
          {loading ? (
            <div className="text-center py-6">
              <span className="text-2xl animate-spin">🚑</span>
              <p className="text-xs mt-2" style={{ color: 'var(--on-surface-muted)' }}>
                Scanning emergency grid...
              </p>
            </div>
          ) : filteredAmbulances.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-3xl">🔍</span>
              <p className="text-xs mt-2 font-semibold" style={{ color: 'var(--on-surface-muted)' }}>
                No {selectedFilter !== 'All' ? selectedFilter : ''} ambulances found
              </p>
              <button
                onClick={() => setSelectedFilter('All')}
                className="mt-2 text-xs font-bold underline"
                style={{ color: 'var(--primary)' }}
              >
                Reset Filter to All
              </button>
            </div>
          ) : (
            filteredAmbulances.map((amb) => (
              <AmbulanceCard
                key={amb._id}
                ambulance={amb}
                selected={selectedAmbulance?._id === amb._id}
                onSelect={setSelectedAmbulance}
              />
            ))
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
