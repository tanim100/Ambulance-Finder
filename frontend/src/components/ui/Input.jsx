'use client';
// src/components/ui/Input.jsx — Theme-Aware

import { forwardRef } from 'react';

const Input = forwardRef(({
  label,
  id,
  error,
  hint,
  leftIcon,
  rightIcon,
  className = '',
  containerClassName = '',
  required = false,
  ...props
}, ref) => {
  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium"
          style={{ color: 'var(--on-surface-muted)' }}
        >
          {label}
          {required && <span className="text-primary-600 dark:text-primary-400 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--on-surface-subtle)' }}>
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          id={id}
          className={[
            'w-full rounded-xl px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-2',
            error
              ? 'ring-1 ring-red-400 dark:ring-red-500/60 bg-red-50 dark:bg-red-500/5 focus:ring-red-400'
              : 'focus:ring-primary-500/50 dark:focus:ring-primary-400/40',
            leftIcon  ? 'pl-10' : '',
            rightIcon ? 'pr-10' : '',
            className,
          ].join(' ')}
          style={{
            background: error ? undefined : 'var(--surface)',
            border: `1px solid ${error ? 'transparent' : 'var(--border-strong)'}`,
            color: 'var(--on-surface)',
          }}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--on-surface-subtle)' }}>
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
          <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs" style={{ color: 'var(--on-surface-subtle)' }}>{hint}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
