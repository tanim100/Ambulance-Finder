'use client';
// src/components/ui/Button.jsx — Theme-Aware

import { forwardRef } from 'react';
import LoadingSpinner from './LoadingSpinner';

const variants = {
  primary:
    'bg-primary-600 hover:bg-primary-500 active:bg-primary-700 text-white shadow-md shadow-primary-200/60 dark:shadow-primary-900/40 focus:ring-primary-500/50 focus:ring-offset-[var(--surface)]',
  secondary:
    'bg-[var(--surface-2)] hover:bg-[var(--surface-3)] active:bg-[var(--surface-2)] text-[var(--on-surface)] border border-[var(--border-strong)] focus:ring-[var(--border-strong)] focus:ring-offset-[var(--surface)]',
  outline:
    'bg-transparent hover:bg-primary-50 dark:hover:bg-primary-500/10 active:bg-primary-100 dark:active:bg-primary-500/5 text-primary-600 dark:text-primary-400 border border-primary-300 dark:border-primary-500/40 hover:border-primary-400 dark:hover:border-primary-500/70 focus:ring-primary-400/40 focus:ring-offset-[var(--surface)]',
  danger:
    'bg-red-600 hover:bg-red-500 active:bg-red-700 text-white shadow-sm shadow-red-200 dark:shadow-red-900/40 focus:ring-red-400/50 focus:ring-offset-[var(--surface)]',
  ghost:
    'bg-transparent hover:bg-[var(--surface-2)] text-[var(--on-surface-muted)] hover:text-[var(--on-surface)] focus:ring-[var(--border)] focus:ring-offset-[var(--surface)]',
  success:
    'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-200 dark:shadow-emerald-900/40 focus:ring-emerald-400/50 focus:ring-offset-[var(--surface)]',
};

const sizes = {
  xs: 'text-xs py-1.5 px-3 rounded-lg',
  sm: 'text-sm py-2 px-4 rounded-xl',
  md: 'text-sm py-2.5 px-5 rounded-xl',
  lg: 'text-base py-3.5 px-7 rounded-xl',
  xl: 'text-lg py-4 px-10 rounded-2xl',
};

const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  leftIcon = null,
  rightIcon = null,
  className = '',
  ...props
}, ref) => {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-offset-2',
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        fullWidth ? 'w-full' : '',
        isDisabled ? 'opacity-50 cursor-not-allowed active:scale-100' : 'cursor-pointer',
        className,
      ].join(' ')}
      {...props}
    >
      {loading ? (
        <LoadingSpinner size="sm" color={variant === 'primary' ? 'white' : 'primary'} />
      ) : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
