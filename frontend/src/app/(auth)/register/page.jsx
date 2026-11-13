'use client';
// src/app/(auth)/register/page.jsx — Modern Centered Healthcare Card Design

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Siren,
  Sparkles,
} from 'lucide-react';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { authAPI } from '@/lib/api';
import { setToken, setUser } from '@/lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [apiError, setApiError] = useState('');

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email address';
    if (!form.phone) e.phone = 'Phone number is required';
    else if (!/^[0-9+\-\s()]{7,15}$/.test(form.phone)) e.phone = 'Enter a valid phone number';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'Must be at least 6 characters';
    if (!form.confirmPassword) e.confirmPassword = 'Confirm your password';
    else if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    setApiError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setApiError('');
    try {
      const { confirmPassword, ...payload } = form;
      const res = await authAPI.register(payload);
      const data = res.data?.data || res.data;
      const token = data?.token || data?.accessToken || res.data?.token || res.data?.accessToken;
      const user = data?.user || res.data?.user;
      if (token && user) {
        setToken(token);
        setUser(user);
        router.push('/home');
      } else {
        throw new Error('Invalid registration response from server');
      }
    } catch (err) {
      if (err.code === 'ERR_NETWORK' || err.code === 'ECONNREFUSED' || err.message?.includes('Network Error')) {
        setApiError('Network Error: Cannot connect to server. Ensure backend is running on port 5000 and MySQL is active.');
      } else {
        setApiError(err.response?.data?.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between py-8 px-4 sm:px-6">

      {/* ── Soft Pink/Rose Radial Ambient Glow (matching landing) ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '900px',
          height: '650px',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(244, 63, 94, 0.18) 0%, rgba(254, 205, 211, 0.12) 40%, transparent 70%)',
          filter: 'blur(35px)',
        }}
      />

      {/* ── Razor-sharp Grid Pattern ── */}
      <div className="absolute inset-0 bg-grid-pattern pointer-events-none opacity-90 dark:opacity-40" />

      {/* ── Top Bar: Back Link + Theme Toggle ── */}
      <div className="relative z-10 max-w-5xl mx-auto w-full flex items-center justify-between mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to home</span>
        </Link>

        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </div>

      {/* ── Main Registration Card Container ── */}
      <div className="relative z-10 max-w-xl mx-auto w-full my-auto">
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-9 space-y-6">

          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-rose-500 text-white shadow-lg shadow-rose-500/25">
              <Siren size={28} className="animate-pulse" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold mb-2">
                <Sparkles size={12} className="text-rose-500" />
                <span>Patient &amp; Family Account</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight">
                Create your account
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Join Bangladesh’s fastest emergency medical response network
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {apiError && (
            <div className="p-3.5 rounded-xl text-xs sm:text-sm font-semibold bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <span>⚠️</span>
              <span>{apiError}</span>
            </div>
          )}

          {/* Form with 2-Column Responsive Grid */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Full Name (Full Width) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Full Name <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Amio Das"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium bg-white dark:bg-slate-950 text-slate-900 dark:text-white border transition-colors outline-none focus:ring-2 focus:ring-rose-500/20 ${
                    errors.name ? 'border-rose-500 dark:border-rose-500' : 'border-slate-200 dark:border-slate-800 focus:border-rose-500'
                  }`}
                />
              </div>
              {errors.name && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.name}</p>}
            </div>

            {/* Email & Phone (2 Columns on SM+) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium bg-white dark:bg-slate-950 text-slate-900 dark:text-white border transition-colors outline-none focus:ring-2 focus:ring-rose-500/20 ${
                      errors.email ? 'border-rose-500 dark:border-rose-500' : 'border-slate-200 dark:border-slate-800 focus:border-rose-500'
                    }`}
                  />
                </div>
                {errors.email && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.email}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Phone Number <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone size={16} />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+880 1700-000000"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium bg-white dark:bg-slate-950 text-slate-900 dark:text-white border transition-colors outline-none focus:ring-2 focus:ring-rose-500/20 ${
                      errors.phone ? 'border-rose-500 dark:border-rose-500' : 'border-slate-200 dark:border-slate-800 focus:border-rose-500'
                    }`}
                  />
                </div>
                {errors.phone && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.phone}</p>}
              </div>
            </div>

            {/* Password & Confirm Password (2 Columns on SM+) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Password <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="At least 6 chars"
                    className={`w-full pl-10 pr-10 py-3 rounded-xl text-sm font-medium bg-white dark:bg-slate-950 text-slate-900 dark:text-white border transition-colors outline-none focus:ring-2 focus:ring-rose-500/20 ${
                      errors.password ? 'border-rose-500 dark:border-rose-500' : 'border-slate-200 dark:border-slate-800 focus:border-rose-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.password}</p>}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirm Password <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter password"
                    className={`w-full pl-10 pr-10 py-3 rounded-xl text-sm font-medium bg-white dark:bg-slate-950 text-slate-900 dark:text-white border transition-colors outline-none focus:ring-2 focus:ring-rose-500/20 ${
                      errors.confirmPassword ? 'border-rose-500 dark:border-rose-500' : 'border-slate-200 dark:border-slate-800 focus:border-rose-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.confirmPassword}</p>}
              </div>
            </div>

            {/* Terms notice */}
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
              By creating an account, you agree to AmbulanceFinder’s{' '}
              <a href="#" className="text-rose-600 dark:text-rose-400 font-semibold hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-rose-600 dark:text-rose-400 font-semibold hover:underline">Privacy Policy</a>.
            </p>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-rose-600 via-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-extrabold text-sm py-3.5 rounded-2xl shadow-lg shadow-rose-600/30 hover:shadow-xl hover:shadow-rose-600/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <span>{loading ? 'Creating Your Account...' : 'Create Account'}</span>
              <ArrowRight size={17} />
            </button>
          </form>

          {/* Switch to login */}
          <div className="pt-2 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
            <span>Already registered? </span>
            <Link
              href="/login"
              className="text-rose-600 dark:text-rose-400 font-bold hover:underline ml-1"
            >
              Sign in to your account
            </Link>
          </div>

        </div>

        {/* ── Trust Indicators Strip ── */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 size={14} className="text-emerald-500" /> 100% Free Sign Up
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <ShieldCheck size={14} className="text-emerald-500" /> DGHS &amp; Medical Certified
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <Lock size={14} className="text-emerald-500" /> 256-bit Encrypted
          </span>
        </div>
      </div>

      {/* ── Footer note ── */}
      <div className="relative z-10 text-center text-[11px] text-slate-400 mt-6">
        <p>In life-threatening situations, dial national emergency <strong className="text-rose-600">999</strong> directly.</p>
      </div>

    </div>
  );
}
