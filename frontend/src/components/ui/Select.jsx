'use client';
// src/components/ui/Select.jsx — Theme-Aware

import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

const Select = forwardRef(({
  label,
  id,
  error,
  hint,
  options = [],
  placeholder = 'Select an option',
  className = '',
  containerClassName = '',
  required = false,
  ...props
}, ref) => {
  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium" style={{ color: 'var(--on-surface-muted)' }}>
          {label}
          {required && <span className="text-primary-600 dark:text-primary-400 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={id}
          className={[
            'w-full appearance-none rounded-xl px-4 py-3 pr-10 text-sm',
            'transition-all duration-200 cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-primary-500/50',
            error ? 'ring-1 ring-red-400 dark:ring-red-500/60' : '',
            className,
          ].join(' ')}
          style={{
            background: 'var(--surface)',
            border: `1px solid ${error ? 'transparent' : 'var(--border-strong)'}`,
            color: 'var(--on-surface)',
          }}
          {...props}
        >
          <option value="" style={{ background: 'var(--surface)', color: 'var(--on-surface-muted)' }}>
            {placeholder}
          </option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}
              style={{ background: 'var(--surface)', color: 'var(--on-surface)' }}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown size={16}
          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--on-surface-subtle)' }} />
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs" style={{ color: 'var(--on-surface-subtle)' }}>{hint}</p>}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
