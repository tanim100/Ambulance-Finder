'use client';
// src/components/ui/LoadingSpinner.jsx

export default function LoadingSpinner({ size = 'md', color = 'primary', className = '' }) {
  const sizes = {
    xs: 'w-3 h-3 border',
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-2',
    xl: 'w-12 h-12 border-4',
  };

  const colors = {
    primary: 'border-primary-600 border-t-transparent',
    white:   'border-white border-t-transparent',
    gray:    'border-gray-400 border-t-transparent',
  };

  return (
    <div
      className={[
        'inline-block rounded-full animate-spin',
        sizes[size] || sizes.md,
        colors[color] || colors.primary,
        className,
      ].join(' ')}
      role="status"
      aria-label="Loading"
    />
  );
}

export function FullPageLoader({ message = 'Loading...' }) {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-primary-100 border-t-primary-600 animate-spin" />
        <span className="absolute inset-0 flex items-center justify-center text-2xl">🚑</span>
      </div>
      <p className="text-sm text-gray-600 font-medium">{message}</p>
    </div>
  );
}
