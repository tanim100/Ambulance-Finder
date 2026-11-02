'use client';
// src/components/ui/Textarea.jsx

import { forwardRef } from 'react';

const Textarea = forwardRef(({
  label,
  id,
  error,
  hint,
  rows = 4,
  className = '',
  containerClassName = '',
  required = false,
  ...props
}, ref) => {
  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-primary-600 ml-1">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        className={[
          'w-full border rounded-xl px-4 py-3 text-sm bg-white resize-none',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
          'placeholder:text-gray-400',
          error ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:border-gray-400',
          className,
        ].join(' ')}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
});

Textarea.displayName = 'Textarea';

export default Textarea;
