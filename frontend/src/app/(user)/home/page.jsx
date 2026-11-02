'use client';
// src/app/(user)/home/page.jsx

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Search, MapPin, Filter, ChevronUp, ChevronDown } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import BottomNav from '@/components/layout/BottomNav';
import AmbulanceCard from '@/components/ambulance/AmbulanceCard';
import { FullPageLoader } from '@/components/ui/LoadingSpinner';
import { useGeolocation } from '@/hooks/useGeolocation';
import { ambulanceAPI } from '@/lib/api';

const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 rounded-2xl flex items-center justify-center">
      <div className="text-center">
        <span className="text-4xl mb-2 block">🗺️</span>
        <p className="text-sm text-gray-500">Loading map...</p>
      </div>
    </div>
  ),
});

const FILTER_TYPES = ['All', 'Basic', 'Advanced', 'ICU'];

// Mock ambulances for demo
const MOCK_AMBULANCES = [
  { _id: '1', vehicleNumber: 'AMB-001', type: 'Basic',    status: 'Available', driver: 'Rahim Ahmed',  distance: 1.2, estimatedTime: 6,  rating: 4.8, lat: 23.8203, lng: 90.4225 },
  { _id: '2', vehicleNumber: 'AMB-002', type: 'Advanced', status: 'Available', driver: 'Karim Hossain', distance: 2.4, estimatedTime: 10, rating: 4.6, lat: 23.8003, lng: 90.4025 },
  { _id: '3', vehicleNumber: 'AMB-003', type: 'ICU',      status: 'Busy',      driver: 'Jamal Uddin',  distance: 3.1, estimatedTime: 14, rating: 4.9, lat: 23.8150, lng: 90.4300 },
  { _id: '4', vehicleNumber: 'AMB-004', type: 'Basic',    status: 'Available', driver: 'Sajid Mia',    distance: 0.8, estimatedTime: 4,  rating: 4.7, lat: 23.8250, lng: 90.4050 },
];

export default function HomePage() {
  const { location, loading: locationLoading } = useGeolocation();
  const [ambulances, setAmbulances] = useState(MOCK_AMBULANCES);
  const [filteredAmbulances, setFilteredAmbulances] = useState(MOCK_AMBULANCES);
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

  const fetchNearby = useCallback(async () => {
    if (!location) return;
    setLoading(true);
    try {
      const res = await ambulanceAPI.getNearby(location.lat, location.lng);
      if (res.data?.ambulances?.length > 0) {
        setAmbulances(res.data.ambulances);
      }
    } catch {
      // fallback to mock data
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    fetchNearby();
  }, [fetchNearby]);

  useEffect(() => {
    let result = [...ambulances];
    if (selectedFilter !== 'All') {
      result = result.filter((a) => a.type === selectedFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.vehicleNumber.toLowerCase().includes(q) ||
          a.driver?.toLowerCase().includes(q) ||
          a.type?.toLowerCase().includes(q)
      );
    }
    setFilteredAmbulances(result);
  }, [ambulances, selectedFilter, searchQuery]);

  const availableCount = ambulances.filter((a) => a.status === 'Available').length;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar />

      {/* Map */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0">
          <MapView
            center={mapCenter}
            userLocation={location}
            ambulances={filteredAmbulances}
            onAmbulanceClick={setSelectedAmbulance}
            height="100%"
          />
        </div>

        {/* Search Bar (floating) */}
        <div className="absolute top-4 left-4 right-4 z-10">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
            <input
              type="text"
              placeholder="Search ambulances, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-3 rounded-2xl border border-gray-200 bg-white/95 backdrop-blur text-sm shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Filter chips */}
        <div className="absolute top-20 left-4 right-4 z-10 flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {FILTER_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedFilter(type)}
              className={[
                'flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200',
                selectedFilter === type
                  ? 'bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-200'
                  : 'bg-white/90 text-gray-700 border-gray-200 hover:border-gray-400',
              ].join(' ')}
            >
              {type === 'All' ? `All (${ambulances.length})` : type}
            </button>
          ))}
        </div>

        {/* Status indicator */}
        <div className="absolute top-4 right-20 z-10">
          <div className="bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            {availableCount} Available
          </div>
        </div>
      </div>

      {/* Bottom Sheet */}
      <div className={`bg-white rounded-t-3xl shadow-2xl z-20 transition-all duration-300 ${sheetExpanded ? 'h-2/3' : 'h-48'} overflow-hidden`}>
        {/* Handle */}
        <div className="flex flex-col items-center pt-3 pb-2 cursor-pointer" onClick={() => setSheetExpanded((v) => !v)}>
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
          <div className="flex items-center justify-between w-full px-4 mt-2">
            <div>
              <p className="font-bold text-gray-900">Nearby Ambulances</p>
              <p className="text-xs text-gray-500">{filteredAmbulances.length} found in your area</p>
            </div>
            {sheetExpanded ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronUp size={20} className="text-gray-400" />}
          </div>
        </div>

        {/* Request button */}
        <div className="px-4 mb-3">
          <Link
            href="/request"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-2xl shadow-lg shadow-primary-200 transition-all active:scale-95"
          >
            🚑 Request Ambulance Now
          </Link>
        </div>

        {/* Ambulance list (visible when expanded) */}
        <div className="px-4 pb-24 overflow-y-auto space-y-3">
          {loading ? (
            <div className="text-center py-4">
              <span className="text-2xl">🚑</span>
              <p className="text-sm text-gray-500 mt-1">Finding ambulances...</p>
            </div>
          ) : filteredAmbulances.length === 0 ? (
            <div className="text-center py-6">
              <span className="text-3xl">🔍</span>
              <p className="text-sm text-gray-500 mt-2">No ambulances found</p>
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
