'use client';
// src/components/ambulance/AmbulanceCard.jsx

import Badge from '@/components/ui/Badge';
import { MapPin, Phone, Star, Navigation } from 'lucide-react';

export default function AmbulanceCard({ ambulance, onSelect, selected = false }) {
  const {
    vehicleNumber,
    type,
    status,
    driver,
    hospital,
    distance,
    rating,
    estimatedTime,
  } = ambulance || {};

  const typeEmoji = { Basic: '🚑', Advanced: '🚨', ICU: '🏥' };
  const typeColor = {
    Basic: 'border-blue-200 bg-blue-50',
    Advanced: 'border-orange-200 bg-orange-50',
    ICU: 'border-red-200 bg-red-50',
  };

  return (
    <div
      onClick={() => onSelect?.(ambulance)}
      className={[
        'flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer',
        selected
          ? 'border-primary-500 bg-primary-50 shadow-md'
          : 'border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm',
      ].join(' ')}
    >
      {/* Icon */}
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${typeColor[type] || 'bg-gray-50 border-gray-200'}`}>
        {typeEmoji[type] || '🚑'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-semibold text-gray-900 text-sm">{vehicleNumber || 'AMB-001'}</p>
          <Badge status={type?.toLowerCase()} label={type} size="xs" />
        </div>

        {driver && (
          <p className="text-xs text-gray-500 truncate mb-1">Driver: {driver}</p>
        )}

        <div className="flex items-center gap-3 text-xs text-gray-500">
          {distance !== undefined && (
            <span className="flex items-center gap-1">
              <Navigation size={10} />
              {distance} km away
            </span>
          )}
          {estimatedTime && (
            <span className="flex items-center gap-1">
              ⏱ {estimatedTime} min
            </span>
          )}
          {rating && (
            <span className="flex items-center gap-1 text-yellow-600">
              <Star size={10} fill="currentColor" />
              {rating}
            </span>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="flex-shrink-0">
        <Badge status={status?.toLowerCase()} label={status} size="xs" />
      </div>
    </div>
  );
}
