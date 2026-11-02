'use client';
// src/components/layout/BottomNav.jsx — Theme-Aware

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PlusCircle, Clock, User } from 'lucide-react';

const navItems = [
  { href: '/home',    label: 'Home',    icon: Home },
  { href: '/request', label: 'Request', icon: PlusCircle },
  { href: '/history', label: 'History', icon: Clock },
  { href: '/profile', label: 'Profile', icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl safe-bottom lg:hidden"
      style={{
        background: 'var(--nav-bg)',
        borderTop: '1px solid var(--border)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
      }}
    >
      <div className="flex items-stretch px-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          const isRequest = href === '/request';
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs font-medium transition-all duration-200"
              style={{ color: isActive ? 'var(--primary)' : 'var(--on-surface-subtle)' }}
            >
              <div className={[
                'relative p-2 rounded-xl transition-all duration-200',
                isActive ? 'bg-[var(--primary-muted)]' : '',
                isRequest && !isActive ? 'bg-primary-600 shadow-md shadow-primary-300/40 dark:shadow-primary-900/50' : '',
              ].join(' ')}>
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 1.75}
                  color={isRequest && !isActive ? '#fff' : undefined}
                />
                {isRequest && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary-400 rounded-full ring-2 ring-[var(--nav-bg)]" />
                )}
              </div>
              <span style={{ color: isRequest && !isActive ? 'var(--primary)' : undefined }}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
