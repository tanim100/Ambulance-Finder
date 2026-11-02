'use client';
// src/app/(auth)/register/page.jsx — Theme-Aware

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowRight } from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { authAPI } from '@/lib/api';
import { setToken, setUser } from '@/lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState('');

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.phone) e.phone = 'Phone number is required';
    else if (!/^[0-9+\-\s()]{7,15}$/.test(form.phone)) e.phone = 'Enter a valid phone number';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (!form.confirmPassword) e.confirmPassword = 'Please confirm your password';
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
      setApiError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-12 relative overflow-hidden bg-grid"
         style={{ background: 'var(--bg)' }}>

      {/* Orbs */}
      <div className="orb w-[500px] h-[500px] bg-primary-500 -top-32 -right-32" />
      <div className="orb w-[400px] h-[400px] bg-indigo-500 -bottom-20 -left-20" style={{ animationDelay: '-4s' }} />

      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle variant="pill" />
      </div>

      <div className="relative w-full max-w-md z-10">
        {/* Back */}
        <div className="mb-6">
          <Link href="/"
            className="inline-flex items-center gap-1.5 text-sm transition-colors group"
            style={{ color: 'var(--on-surface-subtle)' }}>
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
          <h1 className="text-2xl font-extrabold mb-1" style={{ color: 'var(--on-surface)' }}>Create your account</h1>
          <p className="text-sm" style={{ color: 'var(--on-surface-muted)' }}>
            Join <Link href="/" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-medium underline underline-offset-2">AmbulanceFinder</Link> — stay safe, stay prepared
          </p>
        </div>

        {/* Card */}
        <div className="card-glass p-7">
          {apiError && (
            <div className="mb-5 p-3.5 rounded-xl text-sm flex items-center gap-2.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400">
              <span className="text-base shrink-0">⚠️</span>
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input id="name" name="name" type="text" label="Full Name"
              placeholder="John Doe" value={form.name}
              onChange={handleChange} error={errors.name} required
              leftIcon={<User size={15} />} />

            <Input id="email" name="email" type="email" label="Email Address"
              placeholder="you@example.com" value={form.email}
              onChange={handleChange} error={errors.email} required
              leftIcon={<Mail size={15} />} />

            <Input id="phone" name="phone" type="tel" label="Phone Number"
              placeholder="+880 1700-000000" value={form.phone}
              onChange={handleChange} error={errors.phone} required
              leftIcon={<Phone size={15} />} />

            <Input id="password" name="password"
              type={showPassword ? 'text' : 'password'}
              label="Password" placeholder="At least 6 characters"
              value={form.password} onChange={handleChange}
              error={errors.password} required
              leftIcon={<Lock size={15} />}
              rightIcon={
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  className="transition-colors" style={{ color: 'var(--on-surface-subtle)' }}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
            />

            <Input id="confirmPassword" name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              label="Confirm Password" placeholder="Re-enter your password"
              value={form.confirmPassword} onChange={handleChange}
              error={errors.confirmPassword} required
              leftIcon={<Lock size={15} />} />

            <div className="pt-2">
              <p className="text-xs mb-4" style={{ color: 'var(--on-surface-subtle)' }}>
                By registering, you agree to our{' '}
                <a href="#" className="text-primary-600 dark:text-primary-400 hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-primary-600 dark:text-primary-400 hover:underline">Privacy Policy</a>.
              </p>
              <Button type="submit" fullWidth loading={loading} size="lg">
                <span>Create Account</span>
                <ArrowRight size={16} />
              </Button>
            </div>
          </form>

          <p className="text-center text-sm mt-5" style={{ color: 'var(--on-surface-muted)' }}>
            Already have an account?{' '}
            <Link href="/login" className="text-primary-600 dark:text-primary-400 font-semibold hover:underline">
              Sign in
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
