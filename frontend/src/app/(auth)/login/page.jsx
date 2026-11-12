'use client';
// src/app/(auth)/login/page.jsx — Professional Split-Screen Design

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { authAPI } from '@/lib/api';
import { setToken, setUser } from '@/lib/auth';

const demoAccounts = [
  {
    label: 'Admin',
    icon: '👑',
    email: 'admin@ambulance.com',
    password: 'password123',
    color: '#7c3aed',
    bg: 'rgba(124,58,237,0.08)',
    border: 'rgba(124,58,237,0.25)',
  },
  {
    label: 'User',
    icon: '👤',
    email: 'user@ambulance.com',
    password: 'password123',
    color: '#2563eb',
    bg: 'rgba(37,99,235,0.08)',
    border: 'rgba(37,99,235,0.25)',
  },
  {
    label: 'Driver',
    icon: '🚑',
    email: 'driver1@ambulance.com',
    password: 'password123',
    color: '#059669',
    bg: 'rgba(5,150,105,0.08)',
    border: 'rgba(5,150,105,0.25)',
  },
];

const highlights = [
  { icon: '⚡', text: 'Sub-5 minute dispatch' },
  { icon: '📍', text: 'Real-time GPS tracking' },
  { icon: '🛡️', text: 'Certified medical crew' },
  { icon: '📞', text: '24/7 emergency support' },
];

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [apiError, setApiError] = useState('');

  const validate = () => {
    const e = {};
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'Must be at least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: '' }));
    setApiError('');
  };

  const executeLogin = async (data) => {
    setLoading(true);
    setApiError('');
    try {
      const res = await authAPI.login(data);
      const payload = res.data?.data || res.data;
      const token = payload?.token || payload?.accessToken || res.data?.token;
      const user = payload?.user || res.data?.user;
      if (token && user) {
        setToken(token);
        setUser(user);
        if (user.role === 'admin') router.push('/admin');
        else if (user.role === 'driver') router.push('/dashboard');
        else router.push('/home');
      } else {
        throw new Error('Authentication failed. Please try again.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      if (msg === 'Invalid credentials' && ['admin@ambulance.com', 'user@ambulance.com', 'driver1@ambulance.com'].includes(data.email)) {
        setApiError('Demo account not found in database. Run "npm run seed" in backend or check MySQL.');
      } else {
        setApiError(msg || 'Invalid email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => { e.preventDefault(); if (validate()) executeLogin(form); };
  const handleQuickLogin = (email, password) => { setForm({ email, password }); executeLogin({ email, password }); };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)', fontFamily: 'var(--font-sans)' }}>

      {/* ── LEFT PANEL — Brand / Info ── */}
      <div
        className="hidden lg:flex flex-col justify-between relative overflow-hidden"
        style={{
          width: '45%', flexShrink: 0,
          background: 'linear-gradient(145deg, #be123c 0%, #e11d48 40%, #f43f5e 100%)',
          padding: '48px',
        }}
      >
        {/* Background pattern */}
        <div
          style={{
            position: 'absolute', inset: 0, opacity: 0.07,
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '28px 28px',
          }}
        />
        {/* Decorative circles */}
        <div style={{
          position: 'absolute', bottom: '-80px', right: '-80px',
          width: '320px', height: '320px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
        }} />
        <div style={{
          position: 'absolute', top: '20%', left: '-60px',
          width: '200px', height: '200px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
        }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.4rem',
          }}>
            🚑
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#fff', letterSpacing: '-0.02em' }}>
            AmbulanceFinder
          </span>
        </div>

        {/* Headline */}
        <div className="relative z-10">
          <h2 style={{
            color: '#fff', fontWeight: 800, fontSize: '2.4rem',
            lineHeight: 1.2, letterSpacing: '-0.03em', marginBottom: '20px',
          }}>
            Emergency Help,<br />
            <span style={{ opacity: 0.85 }}>Seconds Away.</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1rem', lineHeight: 1.65, marginBottom: '36px' }}>
            Bangladesh's fastest ambulance dispatch platform.<br />
            One tap. Nearest unit. Real-time tracking.
          </p>

          {/* Feature highlights */}
          <div className="flex flex-col gap-3">
            {highlights.map((h) => (
              <div key={h.text} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '34px', height: '34px', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1rem', flexShrink: 0,
                }}>
                  {h.icon}
                </div>
                <span style={{ color: 'rgba(255,255,255,0.88)', fontSize: '0.9rem', fontWeight: 500 }}>
                  {h.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <div className="relative z-10">
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem' }}>
            🔒 Encrypted · HIPAA-compliant · Available 24/7
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL — Form ── */}
      <div
        className="flex-1 flex flex-col items-center justify-center relative"
        style={{ padding: '40px 32px', minHeight: '100vh' }}
      >
        {/* Theme toggle */}
        <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
          <ThemeToggle />
        </div>

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <span style={{ fontSize: '1.6rem' }}>🚑</span>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)' }}>AmbulanceFinder</span>
        </div>

        <div style={{ width: '100%', maxWidth: '400px' }}>

          {/* Back link */}
          <Link
            href="/"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              fontSize: '0.84rem', color: 'var(--on-surface-muted)',
              textDecoration: 'none', marginBottom: '32px',
              transition: 'color 0.2s',
            }}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to home
          </Link>

          {/* Heading */}
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{
              fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em',
              color: 'var(--on-surface)', marginBottom: '6px',
            }}>
              Welcome back
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--on-surface-muted)' }}>
              Sign in to your account to continue
            </p>
          </div>

          {/* Error */}
          {apiError && (
            <div style={{
              marginBottom: '20px', padding: '12px 14px', borderRadius: '10px',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
              color: '#dc2626', fontSize: '0.875rem',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <span>⚠️</span> {apiError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

            {/* Email */}
            <div>
              <label style={{
                display: 'block', fontSize: '0.84rem', fontWeight: 600,
                color: 'var(--on-surface)', marginBottom: '7px',
              }}>
                Email Address <span style={{ color: 'var(--primary)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--on-surface-subtle)', fontSize: '0.9rem',
                }}>✉️</span>
                <input
                  id="email" name="email" type="email"
                  placeholder="you@example.com"
                  value={form.email} onChange={handleChange} required
                  style={{
                    width: '100%', padding: '11px 14px 11px 38px',
                    background: 'var(--surface)', color: 'var(--on-surface)',
                    border: `1px solid ${errors.email ? '#ef4444' : 'var(--border)'}`,
                    borderRadius: '10px', fontSize: '0.9rem',
                    outline: 'none', fontFamily: 'var(--font-sans)',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    boxShadow: errors.email ? '0 0 0 3px rgba(239,68,68,0.12)' : 'none',
                  }}
                  onFocus={(e) => { if (!errors.email) e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px var(--primary-light)'; }}
                  onBlur={(e) => { e.target.style.borderColor = errors.email ? '#ef4444' : 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
              {errors.email && (
                <p style={{ marginTop: '5px', fontSize: '0.78rem', color: '#ef4444' }}>⚠ {errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                <label style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--on-surface)' }}>
                  Password <span style={{ color: 'var(--primary)' }}>*</span>
                </label>
                <Link href="/auth/forgot-password" style={{ fontSize: '0.78rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--on-surface-subtle)', fontSize: '0.9rem',
                }}>🔒</span>
                <input
                  id="password" name="password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={form.password} onChange={handleChange} required
                  style={{
                    width: '100%', padding: '11px 42px 11px 38px',
                    background: 'var(--surface)', color: 'var(--on-surface)',
                    border: `1px solid ${errors.password ? '#ef4444' : 'var(--border)'}`,
                    borderRadius: '10px', fontSize: '0.9rem',
                    outline: 'none', fontFamily: 'var(--font-sans)',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px var(--primary-light)'; }}
                  onBlur={(e) => { e.target.style.borderColor = errors.password ? '#ef4444' : 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                />
                <button
                  type="button" onClick={() => setShowPw((v) => !v)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--on-surface-subtle)', fontSize: '0.95rem', padding: '2px',
                  }}
                >
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.password && (
                <p style={{ marginTop: '5px', fontSize: '0.78rem', color: '#ef4444' }}>⚠ {errors.password}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', padding: '13px',
                background: loading ? 'var(--on-surface-subtle)' : 'var(--primary)',
                color: '#fff', fontWeight: 700, fontSize: '0.95rem',
                border: 'none', borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'background 0.2s, transform 0.15s, box-shadow 0.2s',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(225,29,72,0.35)',
                fontFamily: 'var(--font-sans)',
                marginTop: '4px',
              }}
              onMouseEnter={(e) => { if (!loading) { e.target.style.background = 'var(--primary-hover)'; e.target.style.transform = 'translateY(-1px)'; }}}
              onMouseLeave={(e) => { e.target.style.background = loading ? 'var(--on-surface-subtle)' : 'var(--primary)'; e.target.style.transform = 'translateY(0)'; }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff', borderRadius: '50%',
                    display: 'inline-block', animation: 'spin 0.7s linear infinite',
                  }} />
                  Signing in…
                </>
              ) : (
                <>Sign In →</>
              )}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-subtle)', fontWeight: 500, letterSpacing: '0.08em' }}>
              QUICK DEMO ACCESS
            </span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>

          {/* Demo buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '24px' }}>
            {demoAccounts.map(({ label, icon, email, password, color, bg, border }) => (
              <button
                key={label} type="button"
                onClick={() => handleQuickLogin(email, password)}
                disabled={loading}
                style={{
                  padding: '10px 8px', borderRadius: '10px',
                  background: bg, border: `1px solid ${border}`,
                  color, fontWeight: 600, fontSize: '0.8rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  fontFamily: 'var(--font-sans)',
                }}
                onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 4px 12px ${bg}`; }}}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <span style={{ fontSize: '1.1rem' }}>{icon}</span>
                {label}
              </button>
            ))}
          </div>

          {/* Register */}
          <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--on-surface-muted)' }}>
            Don't have an account?{' '}
            <Link href="/register" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
              Register now
            </Link>
          </p>

          {/* Emergency note */}
          <div style={{
            marginTop: '28px', padding: '12px 16px', borderRadius: '10px',
            background: 'rgba(225,29,72,0.06)', border: '1px solid rgba(225,29,72,0.15)',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--on-surface-muted)' }}>
              🚨 Life-threatening emergency?{' '}
              <a href="tel:999" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
                Call 999
              </a>
              {' '}immediately
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
