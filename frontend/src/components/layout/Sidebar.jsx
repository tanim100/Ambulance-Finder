'use client';
// src/components/layout/Sidebar.jsx — Theme-Aware

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Ambulance, Users, BookOpen, BarChart3, Settings, LogOut, ChevronRight,
} from 'lucide-react';
import { removeToken, getUser } from '@/lib/auth';
import ThemeToggle from '@/components/ui/ThemeToggle';

const navItems = [
  { href: '/admin',            label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/admin/bookings',   label: 'Bookings',   icon: BookOpen },
  { href: '/admin/ambulances', label: 'Ambulances', icon: Ambulance },
  { href: '/admin/drivers',    label: 'Drivers',    icon: Users },
  { href: '/admin/reports',    label: 'Reports',    icon: BarChart3 },
  { href: '/admin/settings',   label: 'Settings',   icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = typeof window !== 'undefined' ? getUser() : null;

  const handleLogout = () => {
    removeToken();
    router.push('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'A';

  return (
    <aside
      className="hidden lg:flex flex-col w-64 min-h-screen fixed left-0 top-0 z-30"
      style={{
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <Link href="/" className="flex items-center gap-3 group transition-opacity hover:opacity-85 cursor-pointer" title="Go to Home">
          <div className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center text-base shadow-md shrink-0 group-hover:scale-105 transition-transform">
            🚑
          </div>
          <div>
            <p className="font-bold text-sm leading-tight group-hover:text-primary-600 transition-colors" style={{ color: 'var(--on-surface)' }}>
              Ambulance<span className="text-primary-600 dark:text-primary-400">Finder</span>
            </p>
            <p className="text-xs" style={{ color: 'var(--on-surface-subtle)' }}>Admin Panel</p>
          </div>
        </Link>
        <ThemeToggle />
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto scrollbar-hide">
        <p className="text-xs font-semibold uppercase tracking-widest px-3 mb-3" style={{ color: 'var(--on-surface-subtle)' }}>
          Management
        </p>
        <ul className="space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== '/admin' && pathname.startsWith(href));
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={[
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 border border-primary-200 dark:border-primary-500/20'
                      : 'border border-transparent hover:bg-[var(--surface-2)]',
                  ].join(' ')}
                  style={!isActive ? { color: 'var(--on-surface-muted)' } : undefined}
                >
                  <Icon size={17} strokeWidth={isActive ? 2.5 : 1.75} />
                  <span>{label}</span>
                  {isActive && <ChevronRight size={13} className="ml-auto text-primary-500 dark:text-primary-500/60" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom user section */}
      <div className="p-4" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl mb-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center text-sm font-bold shadow-sm shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--on-surface)' }}>
              {user?.name || 'Admin'}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--on-surface-subtle)' }}>
              {user?.email || 'admin@example.com'}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border border-transparent hover:border-red-200 dark:hover:border-red-500/20 hover:bg-red-50 dark:hover:bg-red-500/10 text-[var(--on-surface-muted)] hover:text-red-600 dark:hover:text-red-400"
        >
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
