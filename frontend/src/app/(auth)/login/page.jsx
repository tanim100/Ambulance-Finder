'use client';
// src/app/(auth)/login/page.jsx — Theme-Aware

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { authAPI } from '@/lib/api';
import { setToken, setUser } from '@/lib/auth';

const demoAccounts = [
  {
    label: 'Admin', icon: '👑',
    email: 'admin@ambulance.com', password: 'password123',
    cls: 'bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-500/20',
  },
  {
    label: 'User', icon: '👤',
    email: 'user@ambulance.com', password: 'password123',
    cls: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/20',
  },
  {
    label: 'Driver', icon: '🚑',
    email: 'driver1@ambulance.com', password: 'password123',
    cls: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState('');

  const validate = () => {
    const e = {};
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    setApiError('');
  };

  const executeLogin = async (loginData) => {
    setLoading(true);
    setApiError('');
    try {
      const res = await authAPI.login(loginData);
      const data = res.data?.data || res.data;
      const token = data?.token || data?.accessToken || res.data?.token || res.data?.accessToken;
      const user = data?.user || res.data?.user;
      if (token && user) {
        setToken(token);
        setUser(user);
        if (user.role === 'admin') router.push('/admin');
        else if (user.role === 'driver') router.push('/driver/dashboard');
        else router.push('/home');
      } else {
        throw new Error('Invalid authentication response from server.');
      }
    } catch (err) {
      setApiError(err.response?.data?.message || err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    await executeLogin(form);
  };

  const handleQuickLogin = (email, password) => {
    setForm({ email, password });
    executeLogin({ email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-grid"
         style={{ background: 'var(--bg)' }}>

      {/* Ambient orbs */}
      <div className="orb w-[500px] h-[500px] bg-primary-500 -top-32 -left-32" />
      <div className="orb w-[400px] h-[400px] bg-rose-500 -bottom-20 -right-20" style={{ animationDelay: '-6s' }} />

      {/* Theme toggle — top right */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle variant="pill" />
      </div>

      <div className="relative w-full max-w-md z-10">
        {/* Back */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm transition-colors group"
            style={{ color: 'var(--on-surface-subtle)' }}
          >
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to home
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block group" title="Go to home page">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl mx-auto flex items-center justify-center text-3xl mb-5 shadow-xl shadow-primary-200/60 dark:shadow-primary-900/60 emergency-pulse group-hover:scale-105 transition-transform cursor-pointer">
              🚑
            </div>
          </Link>
          <h1 className="text-2xl font-extrabold mb-1" style={{ color: 'var(--on-surface)' }}>Welcome back</h1>
          <p className="text-sm" style={{ color: 'var(--on-surface-muted)' }}>
            Sign in to your <Link href="/" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-medium underline underline-offset-2">AmbulanceFinder</Link> account
          </p>
        </div>

        {/* Card */}
        <div className="card-glass p-7">
          {/* Error */}
          {apiError && (
            <div className="mb-5 p-3.5 rounded-xl text-sm flex items-center gap-2.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400">
              <span className="text-base shrink-0">⚠️</span>
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input id="email" name="email" type="email" label="Email Address"
              placeholder="you@example.com" value={form.email}
              onChange={handleChange} error={errors.email} required
              leftIcon={<Mail size={15} />} />

            <Input id="password" name="password"
              type={showPassword ? 'text' : 'password'}
              label="Password" placeholder="Enter your password"
              value={form.password} onChange={handleChange}
              error={errors.password} required
              leftIcon={<Lock size={15} />}
              rightIcon={
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  className="transition-colors hover:text-[var(--on-surface)]"
                  style={{ color: 'var(--on-surface-subtle)' }}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
            />

            <div className="pt-1">
              <Button type="submit" fullWidth loading={loading} size="lg">
                <span>Sign In</span>
                <ArrowRight size={16} />
              </Button>
            </div>
          </form>

          {/* Demo logins */}
          <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest text-center mb-3" style={{ color: 'var(--on-surface-subtle)' }}>
              Quick Demo Access
            </p>
            <div className="grid grid-cols-3 gap-2">
              {demoAccounts.map(({ label, icon, email, password, cls }) => (
                <button key={label} type="button"
                  onClick={() => handleQuickLogin(email, password)}
                  className={`py-2.5 px-2 text-xs font-semibold rounded-xl transition-all duration-200 text-center border hover:scale-[1.02] active:scale-95 ${cls}`}>
                  <span className="block text-base mb-0.5">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <p className="text-center text-sm mt-5" style={{ color: 'var(--on-surface-muted)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary-600 dark:text-primary-400 font-semibold hover:underline">
              Register now
            </Link>
          </p>
        </div>

        <div className="mt-5 text-center">
          <p className="text-xs" style={{ color: 'var(--on-surface-subtle)' }}>
            Life-threatening emergency? Call{' '}
            <a href="tel:999" className="text-primary-600 dark:text-primary-400 font-bold">999</a>{' '}
            immediately
          </p>
        </div>
      </div>
    </div>
  );
}
