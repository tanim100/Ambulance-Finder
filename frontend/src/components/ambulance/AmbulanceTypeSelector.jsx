'use client';
// src/components/ambulance/AmbulanceTypeSelector.jsx

import { CheckCircle } from 'lucide-react';

const types = [
  {
    id: 'Basic',
    label: 'Basic',
    emoji: '🚑',
    desc: 'Basic life support',
    generalPrice: 1000,
    emergencyPrice: 1500,
    generalEta: '12–18 min',
    emergencyEta: '3–5 min',
    features: ['First aid', 'Oxygen', 'Stretcher'],
    color: 'border-blue-200 bg-blue-50',
    selectedColor: 'border-blue-500 bg-blue-100 ring-2 ring-blue-300',
    textColor: 'text-blue-700',
  },
  {
    id: 'Advanced',
    label: 'Advanced',
    emoji: '🚨',
    desc: 'Advanced life support',
    generalPrice: 1500,
    emergencyPrice: 2250,
    generalEta: '10–15 min',
    emergencyEta: '3–5 min',
    features: ['ALS equipment', 'Paramedic', 'Cardiac monitor'],
    color: 'border-orange-200 bg-orange-50',
    selectedColor: 'border-orange-500 bg-orange-100 ring-2 ring-orange-300',
    textColor: 'text-orange-700',
  },
  {
    id: 'ICU',
    label: 'ICU',
    emoji: '🏥',
    desc: 'Mobile ICU unit',
    generalPrice: 4000,
    emergencyPrice: 6000,
    generalEta: '12–18 min',
    emergencyEta: '4–7 min',
    features: ['ICU equipment', 'Doctor onboard', 'Ventilator'],
    color: 'border-red-200 bg-red-50',
    selectedColor: 'border-red-500 bg-red-100 ring-2 ring-red-300',
    textColor: 'text-red-700',
  },
];

export function getEstimatedFare(ambulanceType = 'Basic', requestMode = 'emergency') {
  const found = types.find((t) => t.id.toLowerCase() === String(ambulanceType).toLowerCase()) || types[0];
  return requestMode === 'emergency' ? found.emergencyPrice : found.generalPrice;
}

export default function AmbulanceTypeSelector({
  selected,
  onSelect,
  onChange,
  error,
  requestMode = 'emergency',
  nearbyCounts = null,
}) {
  const isEmergency = requestMode === 'emergency';

  const handleSelect = (typeId) => {
    if (typeof onChange === 'function') {
      onChange(typeId);
    }
    if (typeof onSelect === 'function') {
      onSelect(typeId);
    }
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {types.map((type) => {
          const isSelected = selected === type.id;
          const fare = isEmergency ? type.emergencyPrice : type.generalPrice;
          const eta = isEmergency ? type.emergencyEta : type.generalEta;
          const availCount = nearbyCounts ? (nearbyCounts[type.id] ?? 1) : null;

          return (
            <button
              key={type.id}
              type="button"
              onClick={() => handleSelect(type.id)}
              className={[
                'relative flex flex-col items-start p-4 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer',
                isSelected ? type.selectedColor : type.color,
                'hover:shadow-md active:scale-98',
              ].join(' ')}
            >
              {isSelected && (
                <CheckCircle
                  size={18}
                  className={`absolute top-3 right-3 ${type.textColor}`}
                  fill="currentColor"
                />
              )}
              <div className="flex items-center justify-between w-full mb-2">
                <span className="text-3xl">{type.emoji}</span>
                {availCount !== null && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    🟢 {availCount} Nearby
                  </span>
                )}
              </div>
              <p className={`font-bold text-base ${type.textColor}`}>{type.label}</p>
              <p className="text-xs text-gray-500 mb-1.5">{type.desc}</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className={`font-extrabold text-sm ${type.textColor}`}>
                  BDT {fare.toLocaleString()}
                </p>
                {isEmergency && (
                  <span className="text-[9.5px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded">
                    SOS Priority
                  </span>
                )}
              </div>
              <p className={`text-[11px] font-semibold mt-0.5 ${isEmergency ? 'text-red-600' : 'text-blue-600'}`}>
                {isEmergency ? `⚡ Response: ${eta}` : `⏱️ ETA: ${eta}`}
              </p>
              <ul className="mt-2 space-y-1">
                {type.features.map((f) => (
                  <li key={f} className="text-xs text-gray-600 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-gray-400" />
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
      {error && (
        <p className="text-xs text-red-500 font-medium mt-1">⚠ {error}</p>
      )}
    </div>
  );
}
