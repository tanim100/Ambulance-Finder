'use client';
// src/components/ui/Badge.jsx

const variants = {
  pending:   { bg: 'bg-yellow-100',  text: 'text-yellow-800',  dot: 'bg-yellow-500'  },
  accepted:  { bg: 'bg-blue-100',    text: 'text-blue-800',    dot: 'bg-blue-500'    },
  'en-route':{ bg: 'bg-indigo-100',  text: 'text-indigo-800',  dot: 'bg-indigo-500'  },
  arrived:   { bg: 'bg-purple-100',  text: 'text-purple-800',  dot: 'bg-purple-500'  },
  completed: { bg: 'bg-green-100',   text: 'text-green-800',   dot: 'bg-green-500'   },
  cancelled: { bg: 'bg-red-100',     text: 'text-red-800',     dot: 'bg-red-500'     },
  available: { bg: 'bg-green-100',   text: 'text-green-800',   dot: 'bg-green-500'   },
  busy:      { bg: 'bg-red-100',     text: 'text-red-800',     dot: 'bg-red-500'     },
  offline:   { bg: 'bg-gray-100',    text: 'text-gray-600',    dot: 'bg-gray-400'    },
  online:    { bg: 'bg-green-100',   text: 'text-green-800',   dot: 'bg-green-500'   },
  basic:     { bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-400'    },
  advanced:  { bg: 'bg-orange-100',  text: 'text-orange-700',  dot: 'bg-orange-500'  },
  icu:       { bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500'     },
  default:   { bg: 'bg-gray-100',    text: 'text-gray-700',    dot: 'bg-gray-400'    },
};

export default function Badge({ status, label, showDot = true, size = 'sm', className = '' }) {
  const key = (status || '').toLowerCase().replace(' ', '-');
  const v = variants[key] || variants.default;
  const displayLabel = label || (status ? status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ') : '');

  const sizeClasses = {
    xs: 'text-xs px-2 py-0.5 rounded-md',
    sm: 'text-xs px-2.5 py-1 rounded-lg',
    md: 'text-sm px-3 py-1.5 rounded-xl',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium ${v.bg} ${v.text} ${sizeClasses[size] || sizeClasses.sm} ${className}`}>
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${v.dot} flex-shrink-0`} />}
      {displayLabel}
    </span>
  );
}
