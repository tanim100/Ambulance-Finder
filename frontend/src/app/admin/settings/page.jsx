'use client';
// src/app/admin/settings/page.jsx — Modern Admin Settings Panel

import { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import {
  Settings,
  Shield,
  Bell,
  Sliders,
  DollarSign,
  Save,
  CheckCircle,
  RotateCcw,
  PhoneCall,
  MapPin,
  Clock,
  Radio,
  Lock,
  User,
  Mail,
} from 'lucide-react';
import { getUser } from '@/lib/auth';

const DEFAULT_SETTINGS = {
  // General
  platformName: 'Ambulance Finder Enterprise',
  hotline: '999',
  supportPhone: '+880 1711 000 999',
  supportEmail: 'support@ambulancefinder.com',
  currency: 'BDT (৳)',
  timezone: 'Asia/Dhaka (GMT+6)',
  
  // Dispatch & Geofencing
  dispatchRadiusKm: 12,
  driverResponseTimeoutSec: 45,
  autoAssignNearest: true,
  priorityICUOverride: true,

  // Pricing
  baseFareBasic: 500,
  baseFareAdvanced: 1000,
  baseFareICU: 2000,
  ratePerKm: 35,
  nightSurgeMultiplier: 1.25,

  // Notifications
  soundAlerts: true,
  smsNotifications: true,
  gpsRefreshRateSec: 5,
  emailAdminAlerts: false,
};

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [adminProfile, setAdminProfile] = useState({
    name: 'System Admin',
    email: 'admin@ambulance.com',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [savedBanner, setSavedBanner] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    // Load persisted settings if available
    const saved = localStorage.getItem('ambulance_admin_settings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (err) {
        console.error('Failed to parse saved settings', err);
      }
    }
    const user = getUser();
    if (user) {
      setAdminProfile((prev) => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
      }));
    }
  }, []);

  const handleChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleProfileChange = (e) => {
    setAdminProfile((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setPasswordError('');
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (adminProfile.newPassword) {
      if (adminProfile.newPassword.length < 6) {
        setPasswordError('New password must be at least 6 characters.');
        return;
      }
      if (adminProfile.newPassword !== adminProfile.confirmPassword) {
        setPasswordError('New passwords do not match.');
        return;
      }
    }

    localStorage.setItem('ambulance_admin_settings', JSON.stringify(settings));
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 3500);
  };

  const handleReset = () => {
    if (confirm('Reset all settings to default values?')) {
      setSettings(DEFAULT_SETTINGS);
      localStorage.removeItem('ambulance_admin_settings');
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 3500);
    }
  };

  const tabs = [
    { id: 'general',  label: 'General & Support', icon: Settings },
    { id: 'dispatch', label: 'Dispatch & Pricing', icon: Sliders },
    { id: 'alerts',   label: 'Alerts & Real-time', icon: Bell },
    { id: 'security', label: 'Admin Security',     icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors">
      <Sidebar />

      <main className="lg:ml-64 min-h-screen pb-16">
        {/* Top Header */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 sticky top-0 z-20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Settings size={22} className="text-primary-600 dark:text-primary-400" />
                System Settings
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Configure dispatch parameters, pricing rules, alert mechanisms, and admin controls
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-xl transition"
              >
                <RotateCcw size={14} />
                Reset Defaults
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-md transition"
              >
                <Save size={15} />
                Save Changes
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 mt-4 border-t border-gray-100 dark:border-slate-700/60 pt-3 overflow-x-auto">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === id
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700/50'
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Success Toast */}
        {savedBanner && (
          <div className="max-w-5xl mx-auto px-6 mt-4">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-4 py-3 rounded-2xl flex items-center justify-between text-sm shadow-sm animate-fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-semibold">Configuration saved successfully! Changes are now active across the platform.</span>
              </div>
            </div>
          </div>
        )}

        {/* Main Settings Form Body */}
        <div className="max-w-5xl mx-auto px-6 py-6">
          <form onSubmit={handleSave} className="space-y-6">

            {/* TAB 1: GENERAL & SUPPORT */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 shadow-sm">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                    Platform Branding & Identity
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
                    Basic information visible on dispatch cards, receipts, and user portals
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Platform Name
                      </label>
                      <input
                        type="text"
                        value={settings.platformName}
                        onChange={(e) => handleChange('platformName', e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-primary-500 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Default Currency
                      </label>
                      <input
                        type="text"
                        value={settings.currency}
                        onChange={(e) => handleChange('currency', e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-primary-500 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        System Timezone
                      </label>
                      <input
                        type="text"
                        value={settings.timezone}
                        onChange={(e) => handleChange('timezone', e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-primary-500 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        National Emergency Number
                      </label>
                      <div className="relative">
                        <PhoneCall size={16} className="absolute left-3 top-3 text-red-500" />
                        <input
                          type="text"
                          value={settings.hotline}
                          onChange={(e) => handleChange('hotline', e.target.value)}
                          className="w-full pl-9 pr-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold text-red-600 dark:text-red-400 outline-none focus:border-red-500 transition"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 shadow-sm">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                    Emergency Support Desk Contacts
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
                    Direct helpline provided to users during active rides
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Help Desk Phone Number
                      </label>
                      <input
                        type="text"
                        value={settings.supportPhone}
                        onChange={(e) => handleChange('supportPhone', e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-primary-500 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Support / Dispatch Email
                      </label>
                      <input
                        type="email"
                        value={settings.supportEmail}
                        onChange={(e) => handleChange('supportEmail', e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-primary-500 transition"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: DISPATCH & PRICING */}
            {activeTab === 'dispatch' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 shadow-sm">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                    <MapPin size={18} className="text-primary-500" />
                    Automated Dispatch Parameters
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
                    Controls algorithmic matching between patient requests and nearest ambulances
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Dispatch Search Radius (km)
                      </label>
                      <p className="text-xs text-gray-400 mb-2">Maximum distance to ping available drivers</p>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={settings.dispatchRadiusKm}
                        onChange={(e) => handleChange('dispatchRadiusKm', Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-primary-500 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Driver Acceptance Timeout (Seconds)
                      </label>
                      <p className="text-xs text-gray-400 mb-2">Seconds before re-routing to next nearest driver</p>
                      <input
                        type="number"
                        min="15"
                        max="180"
                        value={settings.driverResponseTimeoutSec}
                        onChange={(e) => handleChange('driverResponseTimeoutSec', Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-primary-500 transition"
                      />
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-gray-100 dark:border-slate-700 space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.autoAssignNearest}
                        onChange={(e) => handleChange('autoAssignNearest', e.target.checked)}
                        className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
                      />
                      <div>
                        <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                          Auto-Assign Nearest Available Ambulance
                        </span>
                        <p className="text-xs text-gray-400">
                          Prioritize shortest ETA rather than waiting for manual driver confirmation
                        </p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.priorityICUOverride}
                        onChange={(e) => handleChange('priorityICUOverride', e.target.checked)}
                        className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
                      />
                      <div>
                        <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                          High Priority Cardiac & Trauma Emergency Override
                        </span>
                        <p className="text-xs text-gray-400">
                          Instantly broadcast critical emergency requests to all surrounding units
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Pricing Rules */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 shadow-sm">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                    <DollarSign size={18} className="text-emerald-500" />
                    Standard Fare & Pricing Matrix (BDT ৳)
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
                    Define baseline fares by vehicle category and distance calculation rates
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700/60">
                      <span className="text-xs font-bold text-emerald-600 uppercase">Basic Ambulance</span>
                      <p className="text-xs text-gray-400 mb-2">Non-critical transport</p>
                      <input
                        type="number"
                        value={settings.baseFareBasic}
                        onChange={(e) => handleChange('baseFareBasic', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-bold text-gray-900 dark:text-white"
                      />
                    </div>

                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700/60">
                      <span className="text-xs font-bold text-blue-600 uppercase">Advanced Life Support</span>
                      <p className="text-xs text-gray-400 mb-2">Oxygen & Paramedic crew</p>
                      <input
                        type="number"
                        value={settings.baseFareAdvanced}
                        onChange={(e) => handleChange('baseFareAdvanced', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-bold text-gray-900 dark:text-white"
                      />
                    </div>

                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700/60">
                      <span className="text-xs font-bold text-purple-600 uppercase">ICU Ambulance</span>
                      <p className="text-xs text-gray-400 mb-2">Ventilator & critical care</p>
                      <input
                        type="number"
                        value={settings.baseFareICU}
                        onChange={(e) => handleChange('baseFareICU', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-bold text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Distance Rate (৳ per KM)
                      </label>
                      <input
                        type="number"
                        value={settings.ratePerKm}
                        onChange={(e) => handleChange('ratePerKm', Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-primary-500 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Night Shift Surge Multiplier (11 PM – 6 AM)
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        value={settings.nightSurgeMultiplier}
                        onChange={(e) => handleChange('nightSurgeMultiplier', Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-primary-500 transition"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: ALERTS & REAL-TIME */}
            {activeTab === 'alerts' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 shadow-sm">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                    <Radio size={18} className="text-rose-500" />
                    Live Tracking & Audio Notifications
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
                    Real-time WebSocket sync parameters for live map and dispatch sound effects
                  </p>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700/60">
                      <div>
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                          Emergency Sound Siren on New Booking
                        </p>
                        <p className="text-xs text-gray-400">
                          Play loud audio alert chime whenever a new booking arrives in admin/driver consoles
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.soundAlerts}
                        onChange={(e) => handleChange('soundAlerts', e.target.checked)}
                        className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700/60">
                      <div>
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                          Automated SMS to Emergency Contacts
                        </p>
                        <p className="text-xs text-gray-400">
                          Send live tracking URL via SMS when ambulance is assigned
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.smsNotifications}
                        onChange={(e) => handleChange('smsNotifications', e.target.checked)}
                        className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700/60">
                      <div>
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                          Admin Email Digest for Cancelled Bookings
                        </p>
                        <p className="text-xs text-gray-400">
                          Receive notification if emergency booking is cancelled without fulfillment
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.emailAdminAlerts}
                        onChange={(e) => handleChange('emailAdminAlerts', e.target.checked)}
                        className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500"
                      />
                    </div>

                    <div className="pt-2">
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                        <Clock size={15} />
                        GPS Telemetry Beacon Interval (Seconds)
                      </label>
                      <input
                        type="number"
                        min="2"
                        max="30"
                        value={settings.gpsRefreshRateSec}
                        onChange={(e) => handleChange('gpsRefreshRateSec', Number(e.target.value))}
                        className="w-full max-w-xs px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-primary-500 transition"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: SECURITY & ADMIN PROFILE */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 shadow-sm">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                    <User size={18} className="text-indigo-500" />
                    Administrator Profile Credentials
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
                    Manage administrative access and authentication parameters
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Admin Display Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={adminProfile.name}
                        onChange={handleProfileChange}
                        className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-primary-500 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Admin Email Address
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={adminProfile.email}
                        onChange={handleProfileChange}
                        className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-primary-500 transition"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 shadow-sm">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                    <Lock size={18} className="text-amber-500" />
                    Change Admin Password
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
                    Leave blank if you do not wish to modify the administrative password
                  </p>

                  {passwordError && (
                    <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 font-semibold">
                      ⚠️ {passwordError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Current Password
                      </label>
                      <input
                        type="password"
                        name="currentPassword"
                        placeholder="••••••••"
                        value={adminProfile.currentPassword}
                        onChange={handleProfileChange}
                        className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-primary-500 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        New Password
                      </label>
                      <input
                        type="password"
                        name="newPassword"
                        placeholder="••••••••"
                        value={adminProfile.newPassword}
                        onChange={handleProfileChange}
                        className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-primary-500 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        placeholder="••••••••"
                        value={adminProfile.confirmPassword}
                        onChange={handleProfileChange}
                        className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-primary-500 transition"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Floating Save Button */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2.5 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition"
              >
                Reset Defaults
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-md transition"
              >
                <Save size={15} />
                Save Settings
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

