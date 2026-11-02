'use client';
// src/components/ambulance/AmbulanceTypeSelector.jsx

import { CheckCircle } from 'lucide-react';

const types = [
  {
    id: 'Basic',
    label: 'Basic',
    emoji: '🚑',
    desc: 'Basic life support',
    price: '৳500',
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
    price: '৳1,000',
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
    price: '৳2,000',
    features: ['ICU equipment', 'Doctor onboard', 'Ventilator'],
    color: 'border-red-200 bg-red-50',
    selectedColor: 'border-red-500 bg-red-100 ring-2 ring-red-300',
    textColor: 'text-red-700',
  },
];

export default function AmbulanceTypeSelector({ selected, onSelect }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {types.map((type) => {
        const isSelected = selected === type.id;
        return (
          <button
            key={type.id}
            type="button"
            onClick={() => onSelect(type.id)}
            className={[
              'relative flex flex-col items-start p-4 rounded-2xl border-2 transition-all duration-200 text-left',
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
            <span className="text-3xl mb-2">{type.emoji}</span>
            <p className={`font-bold text-base ${type.textColor}`}>{type.label}</p>
            <p className="text-xs text-gray-500 mb-2">{type.desc}</p>
            <p className={`font-bold text-sm ${type.textColor}`}>{type.price}</p>
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
  );
}
