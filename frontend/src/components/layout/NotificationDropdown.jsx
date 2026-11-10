'use client';
// src/components/layout/NotificationDropdown.jsx

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, Trash2, X, AlertTriangle, CheckCircle, MapPin, Info } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';

const DEFAULT_NOTIFICATIONS = {
  admin: [
    {
      id: 1,
      type: 'emergency',
      title: 'Active Emergency Alert',
      message: 'Ambulance AMB-001 is en route to pickup location.',
      time: '2m ago',
      read: false,
      link: '/admin/bookings',
    },
    {
      id: 2,
      type: 'status',
      title: 'Fleet Status',
      message: '3 ambulances are currently active and ready for dispatch.',
      time: '15m ago',
      read: false,
      link: '/admin/ambulances',
    },
    {
      id: 3,
      type: 'info',
      title: 'Driver On-Duty',
      message: 'Driver Rafiqul Islam has clocked in.',
      time: '1h ago',
      read: true,
      link: '/admin/drivers',
    },
  ],
  driver: [
    {
      id: 1,
      type: 'emergency',
      title: 'Emergency Request Assigned',
      message: 'Immediate pickup required at Dhanmondi 27.',
      time: 'Just now',
      read: false,
      link: '/active',
    },
    {
      id: 2,
      type: 'status',
      title: 'Route Optimized',
      message: 'Fastest route calculated via Mirpur Road to Hospital.',
      time: '10m ago',
      read: false,
      link: '/active',
    },
    {
      id: 3,
      type: 'info',
      title: 'System Notice',
      message: 'GPS tracking active and transmitting coordinates.',
      time: '35m ago',
      read: true,
      link: '/dashboard',
    },
  ],
  user: [
    {
      id: 1,
      type: 'emergency',
      title: 'Ambulance Assigned',
      message: 'Ambulance AMB-001 has been dispatched to your location.',
      time: '1m ago',
      read: false,
      link: '/home',
    },
    {
      id: 2,
      type: 'status',
      title: 'Live Tracking Ready',
      message: 'Track your assigned ambulance in real-time on the map.',
      time: '10m ago',
      read: false,
      link: '/home',
    },
    {
      id: 3,
      type: 'info',
      title: 'Support Available 24/7',
      message: 'Emergency hotline is active and ready to assist.',
      time: '2h ago',
      read: true,
      link: '/profile',
    },
  ],
};

export default function NotificationDropdown({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const dropdownRef = useRef(null);
  const { socket } = useSocket();

  const role = user?.role || 'user';
  const storageKey = `ambulance_finder_notifications_${user?.id || 'guest'}`;

  // Load notifications from localStorage or defaults
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setNotifications(JSON.parse(stored));
      } else {
        const defaults = DEFAULT_NOTIFICATIONS[role] || DEFAULT_NOTIFICATIONS.user;
        setNotifications(defaults);
        localStorage.setItem(storageKey, JSON.stringify(defaults));
      }
    } catch {
      setNotifications(DEFAULT_NOTIFICATIONS.user);
    }
  }, [role, storageKey]);

  // Save to localStorage whenever notifications change
  const updateNotifications = (newList) => {
    setNotifications(newList);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newList));
    } catch (e) {
      console.error('Failed to save notifications', e);
    }
  };

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Listen for real-time socket booking updates
  useEffect(() => {
    if (!socket) return;

    const handleStatusChange = (data) => {
      const newNotif = {
        id: Date.now(),
        type: 'emergency',
        title: 'Booking Status Updated',
        message: `Booking #${data.bookingId} status is now: ${data.status}`,
        time: 'Just now',
        read: false,
        link: `/tracking/${data.bookingId}`,
      };
      setNotifications((prev) => {
        const updated = [newNotif, ...prev];
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    };

    socket.on('booking:status-change', handleStatusChange);
    return () => {
      socket.off('booking:status-change', handleStatusChange);
    };
  }, [socket, storageKey]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    updateNotifications(updated);
  };

  const markAsRead = (id) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    updateNotifications(updated);
  };

  const clearAll = () => {
    updateNotifications([]);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'emergency':
        return <AlertTriangle size={16} className="text-red-500" />;
      case 'status':
        return <MapPin size={16} className="text-blue-500" />;
      case 'success':
        return <CheckCircle size={16} className="text-emerald-500" />;
      default:
        return <Info size={16} className="text-primary-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2.5 rounded-xl transition-all duration-200 hover:bg-[var(--surface-2)] active:scale-95 focus:outline-none"
        style={{ color: 'var(--on-surface-muted)' }}
        title="Notifications"
        aria-label="View notifications"
        aria-expanded={isOpen}
      >
        <Bell size={18} className={unreadCount > 0 ? 'text-primary-600 dark:text-primary-400' : ''} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-[var(--nav-bg)] animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl shadow-2xl border overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm" style={{ color: 'var(--on-surface)' }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="p-1.5 rounded-lg text-xs font-medium text-primary-600 dark:text-primary-400 hover:bg-[var(--surface)] transition-colors flex items-center gap-1"
                  title="Mark all as read"
                >
                  <CheckCheck size={14} />
                  <span className="hidden sm:inline">Mark read</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-[var(--on-surface-subtle)] hover:bg-[var(--surface)] hover:text-[var(--on-surface)] transition-colors"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[var(--border)]">
            {notifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-primary-50 dark:bg-primary-950/30 flex items-center justify-center text-primary-500 text-xl">
                  🔔
                </div>
                <p className="text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
                  No notifications yet
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--on-surface-subtle)' }}>
                  You are all caught up! Updates will appear here.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={`p-3.5 transition-colors cursor-pointer hover:bg-[var(--surface-2)] flex items-start gap-3 ${
                    !n.read ? 'bg-primary-50/40 dark:bg-primary-950/20' : ''
                  }`}
                >
                  <div className="p-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] shrink-0 mt-0.5 shadow-sm">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold truncate" style={{ color: 'var(--on-surface)' }}>
                        {n.title}
                      </p>
                      <span className="text-[10px] shrink-0" style={{ color: 'var(--on-surface-subtle)' }}>
                        {n.time}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5 leading-snug line-clamp-2" style={{ color: 'var(--on-surface-muted)' }}>
                      {n.message}
                    </p>
                    {n.link && (
                      <Link
                        href={n.link}
                        onClick={() => setIsOpen(false)}
                        className="inline-block mt-1.5 text-[11px] font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        View details →
                      </Link>
                    )}
                  </div>
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-primary-600 shrink-0 mt-2" title="Unread" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div
              className="px-4 py-2.5 border-t flex items-center justify-between text-xs"
              style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
            >
              <button
                onClick={clearAll}
                className="text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 font-medium"
              >
                <Trash2 size={13} />
                Clear all
              </button>
              <span className="text-[11px]" style={{ color: 'var(--on-surface-subtle)' }}>
                {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
