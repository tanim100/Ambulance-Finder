'use client';
// src/components/layout/Navbar.jsx — Theme-Aware

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, User } from 'lucide-react';
import { getUser, removeToken } from '@/lib/auth';
import ThemeToggle from '@/components/ui/ThemeToggle';
import NotificationDropdown from './NotificationDropdown';

export default function Navbar({ title = 'AmbulanceFinder' }) {
  const router = useRouter();
  const user = typeof window !== 'undefined' ? getUser() : null;

  const handleLogout = () => {
    removeToken();
    router.push('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const roleStyles = {
    admin:  'bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20',
    driver: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20',
    user:   'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20',
  };

  return (
    <nav
      className="sticky top-0 z-40 backdrop-blur-xl"
      style={{
        background: 'var(--nav-bg)',
        borderBottom: '1px solid var(--nav-border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href={user ? '/home' : '/'} className="flex items-center gap-2.5 group shrink-0 cursor-pointer" title="Home">
          <div className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center text-base shadow-md group-hover:bg-primary-500 group-hover:scale-105 transition-all">
            🚑
          </div>
          <span className="font-bold text-base tracking-tight hidden sm:block group-hover:opacity-85 transition-opacity" style={{ color: 'var(--on-surface)' }}>
            Ambulance<span className="text-primary-600 dark:text-primary-400">Finder</span>
          </span>
        </Link>

        {/* Mobile title */}
        {title !== 'AmbulanceFinder' && (
          <span className="sm:hidden text-sm font-semibold truncate" style={{ color: 'var(--on-surface)' }}>
            {title}
          </span>
        )}

        {/* Right side */}
        <div className="flex items-center gap-1 ml-auto">
          {/* Theme toggle */}
          <ThemeToggle />

          {/* Notification Dropdown */}
          <NotificationDropdown user={user} />

          {/* User info */}
          {user ? (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-[var(--surface-2)] transition-colors">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                {initials}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--on-surface)' }}>{user.name}</p>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md capitalize ${roleStyles[user.role] || roleStyles.user}`}>
                  {user.role}
                </span>
              </div>
            </div>
          ) : (
            <Link href="/profile">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[var(--surface-2)] transition-colors border"
                style={{ borderColor: 'var(--border)' }}
              >
                <User size={16} style={{ color: 'var(--on-surface-muted)' }} />
              </div>
            </Link>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="p-2.5 rounded-xl transition-colors hover:bg-red-50 dark:hover:bg-red-500/10 text-[var(--on-surface-subtle)] hover:text-red-600 dark:hover:text-red-400"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </nav>
  );
}
