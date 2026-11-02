'use client';
// src/app/(user)/profile/page.jsx

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Edit2, LogOut, Phone, Mail, ShieldCheck, ChevronRight, Ambulance } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import BottomNav from '@/components/layout/BottomNav';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { getUser, removeToken } from '@/lib/auth';
import { userAPI } from '@/lib/api';

const MOCK_USER = {
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+880 1700-000000',
  role: 'user',
  totalBookings: 4,
  lastTrip: '10 Jun 2024',
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(MOCK_USER);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const stored = getUser();
    if (stored) setUser({ ...MOCK_USER, ...stored });
    setEditForm({ name: stored?.name || MOCK_USER.name, phone: stored?.phone || MOCK_USER.phone });
  }, []);

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      removeToken();
      router.push('/login');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await userAPI.updateProfile(editForm);
      setUser((u) => ({ ...u, ...editForm }));
      setEditOpen(false);
    } catch {
      setUser((u) => ({ ...u, ...editForm }));
      setEditOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  const menuItems = [
    { icon: '📋', label: 'Booking History', href: '/history' },
    { icon: '🔔', label: 'Notifications', href: '#' },
    { icon: '🔒', label: 'Privacy & Security', href: '#' },
    { icon: '❓', label: 'Help & Support', href: '#' },
    { icon: '⭐', label: 'Rate the App', href: '#' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar />

      <div className="flex-1 overflow-y-auto pb-24">
        {/* Profile header */}
        <div className="bg-gradient-to-br from-primary-600 to-primary-800 px-4 pt-8 pb-16 text-white">
          <div className="max-w-2xl mx-auto flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center text-3xl font-black text-white border-4 border-white/30 mb-4">
              {initials}
            </div>
            <h2 className="text-2xl font-bold">{user.name}</h2>
            <p className="text-primary-200 text-sm capitalize">{user.role} Account</p>
            <button
              onClick={() => setEditOpen(true)}
              className="mt-3 flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
            >
              <Edit2 size={13} />
              Edit Profile
            </button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 -mt-10 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
              <p className="text-2xl font-black text-primary-600">{user.totalBookings || 4}</p>
              <p className="text-xs text-gray-500 mt-1">Total Trips</p>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
              <p className="text-2xl font-black text-green-600">4.8</p>
              <p className="text-xs text-gray-500 mt-1">Avg Rating</p>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
              <p className="text-xs font-bold text-gray-700 mt-1">{user.lastTrip || 'Jun 10'}</p>
              <p className="text-xs text-gray-500 mt-1">Last Trip</p>
            </div>
          </div>

          {/* User info */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
            <div className="flex items-center gap-3 p-4">
              <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                <Mail size={16} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Email</p>
                <p className="text-sm font-semibold text-gray-800">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4">
              <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
                <Phone size={16} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Phone</p>
                <p className="text-sm font-semibold text-gray-800">{user.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4">
              <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center">
                <ShieldCheck size={16} className="text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Account Type</p>
                <p className="text-sm font-semibold text-gray-800 capitalize">{user.role} — Verified</p>
              </div>
            </div>
          </div>

          {/* Menu */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {menuItems.map(({ icon, label, href }, idx) => (
              <button
                key={label}
                onClick={() => href !== '#' && router.push(href)}
                className={`w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors text-left ${idx > 0 ? 'border-t border-gray-50' : ''}`}
              >
                <span className="text-xl">{icon}</span>
                <span className="flex-1 text-sm font-medium text-gray-800">{label}</span>
                <ChevronRight size={16} className="text-gray-300" />
              </button>
            ))}
          </div>

          {/* Logout */}
          <Button
            variant="outline"
            fullWidth
            onClick={handleLogout}
            className="border-red-200 text-red-600 hover:bg-red-50"
            leftIcon={<LogOut size={16} />}
          >
            Sign Out
          </Button>

          <p className="text-center text-xs text-gray-300 pb-4">AmbulanceFinder v1.0.0</p>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Profile">
        <div className="space-y-4">
          <Input
            id="edit-name"
            label="Full Name"
            value={editForm.name}
            onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
          />
          <Input
            id="edit-phone"
            label="Phone Number"
            value={editForm.phone}
            onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
          />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button fullWidth loading={saving} onClick={handleSave}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      <BottomNav />
    </div>
  );
}
