'use client';
// src/app/(auth)/register/page.jsx — Professional Split-Screen Design

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { authAPI } from '@/lib/api';
import { setToken, setUser } from '@/lib/auth';

const highlights = [
  { icon: '⚡', text: 'Sub-5 minute emergency dispatch' },
  { icon: '📍', text: 'Real-time GPS ambulance tracking' },
  { icon: '🛡️', text: 'Verified paramedics & hospital triage' },
  { icon: '💳', text: 'No upfront payment needed in crisis' },
];

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
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email address';
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
    <div className="min-h-screen flex" style={{ background: 'var(--bg)', fontFamily: 'var(--font-sans)' }}>

      {/* ── LEFT PANEL — Brand / Info (Matching Login) ── */}
      <div
        className="hidden lg:flex flex-col justify-between relative overflow-hidden"
        style={{
          width: '45%',
          flexShrink: 0,
          background: 'linear-gradient(145deg, #be123c 0%, #e11d48 40%, #f43f5e 100%)',
          padding: '48px',
        }}
      >
        {/* Subtle dot pattern */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.07,
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '28px 28px',
          }}
        />

        {/* Decorative ambient blur rings */}
        <div
          style={{
            position: 'absolute',
            bottom: '-80px',
            right: '-80px',
            width: '320px',
            height: '320px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '20%',
            left: '-60px',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
          }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
            }}
          >
            🚑
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#fff', letterSpacing: '-0.02em' }}>
            AmbulanceFinder
          </span>
        </div>

        {/* Headline & Value Proposition */}
        <div className="relative z-10">
          <h2
            style={{
              color: '#fff',
              fontWeight: 800,
              fontSize: '2.4rem',
              lineHeight: 1.2,
              letterSpacing: '-0.03em',
              marginBottom: '20px',
            }}
          >
            Create Account,<br />
            <span style={{ opacity: 0.85 }}>Save Lives Fast.</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1rem', lineHeight: 1.65, marginBottom: '36px' }}>
            Bangladesh’s fastest emergency dispatch platform.<br />
            One tap. Verified medics. Real-time GPS tracking.
          </p>

          {/* Highlights */}
          <div className="flex flex-col gap-3">
            {highlights.map((h) => (
              <div key={h.text} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                    flexShrink: 0,
                  }}
                >
                  {h.icon}
                </div>
                <span style={{ color: 'rgba(255,255,255,0.92)', fontSize: '0.9rem', fontWeight: 500 }}>
                  {h.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10">
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem' }}>
            🔒 256-bit Encrypted · 24/7 National Emergency Connected
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL — Form ── */}
      <div
        className="flex-1 flex flex-col items-center justify-center relative overflow-y-auto"
        style={{ padding: '40px 32px', minHeight: '100vh' }}
      >
        {/* Theme toggle */}
        <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
          <ThemeToggle />
        </div>

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <span style={{ fontSize: '1.6rem' }}>🚑</span>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)' }}>
            AmbulanceFinder
          </span>
        </div>

        <div style={{ width: '100%', maxWidth: '420px' }}>

          {/* Back link */}
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.84rem',
              color: 'var(--on-surface-muted)',
              textDecoration: 'none',
              marginBottom: '28px',
              transition: 'color 0.2s',
            }}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to home
          </Link>

          {/* Heading */}
          <div style={{ marginBottom: '28px' }}>
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: 'var(--on-surface)',
                marginBottom: '6px',
              }}
            >
              Create your account
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--on-surface-muted)' }}>
              Join AmbulanceFinder — stay safe, stay prepared
            </p>
          </div>

          {/* Error Banner */}
          {apiError && (
            <div
              style={{
                marginBottom: '20px',
                padding: '12px 14px',
                borderRadius: '10px',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: '#dc2626',
                fontSize: '0.875rem',
              }}
            >
              ⚠️ {apiError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Name */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  color: 'var(--on-surface)',
                  marginBottom: '6px',
                }}
              >
                Full Name <span style={{ color: 'var(--primary)' }}>*</span>
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Amio Das"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: `1.5px solid ${errors.name ? 'var(--primary)' : 'var(--border)'}`,
                  background: 'var(--surface)',
                  color: 'var(--on-surface)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
              />
              {errors.name && (
                <p style={{ fontSize: '0.78rem', color: 'var(--primary)', marginTop: '4px' }}>
                  {errors.name}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  color: 'var(--on-surface)',
                  marginBottom: '6px',
                }}
              >
                Email Address <span style={{ color: 'var(--primary)' }}>*</span>
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: `1.5px solid ${errors.email ? 'var(--primary)' : 'var(--border)'}`,
                  background: 'var(--surface)',
                  color: 'var(--on-surface)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
              />
              {errors.email && (
                <p style={{ fontSize: '0.78rem', color: 'var(--primary)', marginTop: '4px' }}>
                  {errors.email}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  color: 'var(--on-surface)',
                  marginBottom: '6px',
                }}
              >
                Phone Number <span style={{ color: 'var(--primary)' }}>*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+880 1700-000000"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: `1.5px solid ${errors.phone ? 'var(--primary)' : 'var(--border)'}`,
                  background: 'var(--surface)',
                  color: 'var(--on-surface)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
              />
              {errors.phone && (
                <p style={{ fontSize: '0.78rem', color: 'var(--primary)', marginTop: '4px' }}>
                  {errors.phone}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  color: 'var(--on-surface)',
                  marginBottom: '6px',
                }}
              >
                Password <span style={{ color: 'var(--primary)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="At least 6 characters"
                  style={{
                    width: '100%',
                    padding: '12px 42px 12px 14px',
                    borderRadius: '10px',
                    border: `1.5px solid ${errors.password ? 'var(--primary)' : 'var(--border)'}`,
                    background: 'var(--surface)',
                    color: 'var(--on-surface)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--on-surface-subtle)',
                    fontSize: '0.9rem',
                  }}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {errors.password && (
                <p style={{ fontSize: '0.78rem', color: 'var(--primary)', marginTop: '4px' }}>
                  {errors.password}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  color: 'var(--on-surface)',
                  marginBottom: '6px',
                }}
              >
                Confirm Password <span style={{ color: 'var(--primary)' }}>*</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter your password"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: `1.5px solid ${errors.confirmPassword ? 'var(--primary)' : 'var(--border)'}`,
                  background: 'var(--surface)',
                  color: 'var(--on-surface)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
              />
              {errors.confirmPassword && (
                <p style={{ fontSize: '0.78rem', color: 'var(--primary)', marginTop: '4px' }}>
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Terms notice */}
            <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-subtle)', lineHeight: 1.5, marginTop: '2px' }}>
              By registering, you agree to our{' '}
              <a href="#" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Terms of Service</a>
              {' '}and{' '}
              <a href="#" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Privacy Policy</a>.
            </p>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--primary) 0%, #be123c 100%)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.95rem',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                boxShadow: '0 4px 14px rgba(225,29,72,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'opacity 0.2s, transform 0.15s',
              }}
            >
              {loading ? 'Creating Account...' : 'Create Account →'}
            </button>
          </form>

          {/* Switch to login */}
          <p
            style={{
              textAlign: 'center',
              fontSize: '0.88rem',
              color: 'var(--on-surface-muted)',
              marginTop: '24px',
            }}
          >
            Already have an account?{' '}
            <Link
              href="/login"
              style={{
                color: 'var(--primary)',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Sign in
            </Link>
          </p>

        </div>
      </div>

    </div>
  );
}
