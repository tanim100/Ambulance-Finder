'use client';
// src/components/ui/ThemeToggle.jsx

import { useTheme } from '@/lib/ThemeContext';
import { Sun, Moon } from 'lucide-react';

/**
 * Theme toggle button.
 * @param {'icon' | 'pill'} variant
 * @param {string} className
 */
export default function ThemeToggle({ variant = 'icon', className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  if (variant === 'pill') {
    return (
      <button
        onClick={toggleTheme}
        aria-label="Toggle theme"
        className={[
          'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200',
          'border border-[var(--border-strong)] bg-[var(--surface-2)]',
          'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)]',
          'hover:bg-[var(--surface-3)]',
          className,
        ].join(' ')}
      >
        <span className={[
          'flex items-center justify-center w-5 h-5 rounded-lg transition-all duration-300',
          isDark ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0 absolute',
        ].join(' ')}>
          <Moon size={14} />
        </span>
        <span className={[
          'flex items-center justify-center w-5 h-5 rounded-lg transition-all duration-300',
          !isDark ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0 absolute',
        ].join(' ')}>
          <Sun size={14} />
        </span>
        {isDark ? 'Dark' : 'Light'}
      </button>
    );
  }

  // Default: icon button
  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={[
        'relative p-2.5 rounded-xl transition-all duration-200 focus:outline-none',
        'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)]',
        'bg-transparent hover:bg-[var(--surface-2)]',
        'border border-transparent hover:border-[var(--border)]',
        className,
      ].join(' ')}
    >
      {/* Sun icon (light mode indicator) */}
      <span
        className={[
          'absolute inset-0 flex items-center justify-center transition-all duration-300',
          isDark ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100',
        ].join(' ')}
      >
        <Sun size={17} />
      </span>
      {/* Moon icon (dark mode indicator) */}
      <span
        className={[
          'absolute inset-0 flex items-center justify-center transition-all duration-300',
          isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50',
        ].join(' ')}
      >
        <Moon size={17} />
      </span>
      {/* Invisible spacer */}
      <span className="invisible"><Sun size={17} /></span>
    </button>
  );
}
