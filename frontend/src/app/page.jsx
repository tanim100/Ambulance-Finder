// src/app/page.jsx — Clean Modern Landing Page
'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import ThemeToggle from '@/components/ui/ThemeToggle';

const features = [
  {
    icon: '⚡',
    title: 'Fast Response',
    desc: 'Average dispatch time under 5 minutes. Our system automatically finds the nearest available ambulance.',
  },
  {
    icon: '📍',
    title: 'GPS Tracking',
    desc: 'Track your ambulance in real-time on the map. See ETA updates as the driver navigates to you.',
  },
  {
    icon: '🕐',
    title: '24/7 Available',
    desc: 'Round-the-clock emergency coverage. Our fleet and dispatch team never sleep.',
  },
  {
    icon: '✅',
    title: 'Certified Drivers',
    desc: 'Every driver is fully licensed, background-checked, and trained in basic life support.',
  },
];

const stats = [
  { value: '500+', label: 'Ambulances', sub: 'in active fleet' },
  { value: '<5min', label: 'Avg Response', sub: 'from request to dispatch' },
  { value: '24/7', label: 'Always On', sub: 'emergency coverage' },
  { value: '10k+', label: 'Lives Helped', sub: 'and counting' },
];

const steps = [
  {
    num: '01',
    title: 'Share Your Location',
    desc: 'Allow location access or enter your address. We pinpoint the exact pickup point.',
  },
  {
    num: '02',
    title: 'Request Ambulance',
    desc: 'Tap "Request Now". Our system instantly finds the nearest available ambulance.',
  },
  {
    num: '03',
    title: 'Get Help Fast',
    desc: 'Track your ambulance live. Driver calls to confirm. Help arrives in minutes.',
  },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--on-surface)' }}>

      {/* ── Floating Navbar ── */}
      <nav className="nav-floating" style={scrolled ? { boxShadow: 'var(--shadow-lg)' } : {}}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🚑</span>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)' }}>
            AmbulanceFinder
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/login" className="btn-ghost" style={{ textDecoration: 'none', fontSize: '0.85rem' }}>
            Login
          </Link>
          <Link href="/request" className="btn-primary" style={{ textDecoration: 'none', fontSize: '0.85rem' }}>
            Request Now
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section
        className="relative flex flex-col items-center justify-center text-center px-6 overflow-hidden"
        style={{ minHeight: '100vh', paddingTop: '100px', paddingBottom: '80px' }}
      >
        {/* Background blobs */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '-10%', left: '50%', transform: 'translateX(-50%)',
            width: '800px', height: '600px', borderRadius: '50%',
            background: 'radial-gradient(ellipse at center, rgba(225,29,72,0.07) 0%, transparent 65%)',
            filter: 'blur(40px)',
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: '5%', right: '-5%',
            width: '400px', height: '400px', borderRadius: '50%',
            background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.06) 0%, transparent 65%)',
            filter: 'blur(40px)',
          }}
        />

        {/* Grid */}
        <div className="absolute inset-0 bg-grid-pattern" style={{ opacity: 0.6 }} />

        <div className="relative z-10 max-w-3xl mx-auto animate-fade-in">
          {/* Badge */}
          <div className="badge mb-6 mx-auto w-fit">
            🚑 Emergency Response Platform
          </div>

          <h1
            className="font-black leading-tight mb-6"
            style={{ fontSize: 'clamp(2.4rem, 6vw, 4rem)', letterSpacing: '-0.02em' }}
          >
            Emergency Help,{' '}
            <span style={{ color: 'var(--primary)' }}>Seconds Away</span>
          </h1>

          <p
            className="mb-10 max-w-xl mx-auto"
            style={{ fontSize: '1.15rem', color: 'var(--on-surface-muted)', lineHeight: 1.7 }}
          >
            Request a certified ambulance with one tap. Real-time GPS tracking,
            live driver updates, and sub-5-minute response times — 24 hours a day.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/request" className="btn-primary" style={{ textDecoration: 'none', fontSize: '1rem', padding: '14px 32px' }}>
              🚨 Request Ambulance
            </Link>
            <Link href="/login" className="btn-ghost" style={{ textDecoration: 'none', fontSize: '1rem', padding: '14px 28px' }}>
              Login to Dashboard →
            </Link>
          </div>

          {/* Trust note */}
          <p style={{ marginTop: '28px', fontSize: '0.82rem', color: 'var(--on-surface-subtle)' }}>
            Trusted by 10,000+ patients · Available across all major cities
          </p>
        </div>
      </section>

      {/* ── Stats Strip ── */}
      <section style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div
          className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-2 gap-6"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}
        >
          {stats.map((s) => (
            <div key={s.value} className="text-center">
              <div
                className="font-black"
                style={{ fontSize: '2.2rem', color: 'var(--primary)', letterSpacing: '-0.02em', lineHeight: 1 }}
              >
                {s.value}
              </div>
              <div className="font-semibold mt-1" style={{ fontSize: '0.95rem' }}>{s.label}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--on-surface-muted)', marginTop: '2px' }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="font-bold" style={{ fontSize: '2rem', letterSpacing: '-0.02em' }}>
            Why Choose AmbulanceFinder?
          </h2>
          <p style={{ color: 'var(--on-surface-muted)', marginTop: '12px', fontSize: '1.05rem' }}>
            Built for speed, reliability, and peace of mind when it matters most.
          </p>
        </div>

        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}>
          {features.map((f) => (
            <div key={f.title} className="glow-card p-6">
              <div
                style={{
                  width: '48px', height: '48px', borderRadius: '12px',
                  background: 'var(--primary-light)', fontSize: '1.5rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '16px',
                }}
              >
                {f.icon}
              </div>
              <h3 className="font-bold mb-2" style={{ fontSize: '1.05rem' }}>{f.title}</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--on-surface-muted)', lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section style={{ background: 'var(--surface-2, var(--surface))', borderTop: '1px solid var(--border)' }}>
        <div className="max-w-4xl mx-auto px-6 py-20">
          <div className="text-center mb-14">
            <h2 className="font-bold" style={{ fontSize: '2rem', letterSpacing: '-0.02em' }}>
              How It Works
            </h2>
            <p style={{ color: 'var(--on-surface-muted)', marginTop: '12px', fontSize: '1.05rem' }}>
              Three steps from crisis to care.
            </p>
          </div>

          <div className="grid gap-8" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {steps.map((s, i) => (
              <div key={s.num} className="relative text-center">
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div
                    className="hidden md:block absolute"
                    style={{
                      top: '28px', left: 'calc(50% + 36px)',
                      width: 'calc(100% - 36px)', height: '2px',
                      background: 'var(--border)',
                    }}
                  />
                )}
                <div
                  className="mx-auto mb-4 font-black"
                  style={{
                    width: '56px', height: '56px', borderRadius: '50%',
                    background: 'var(--primary)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1rem', letterSpacing: '-0.02em',
                    boxShadow: '0 4px 14px rgba(225,29,72,0.35)',
                    position: 'relative', zIndex: 1,
                  }}
                >
                  {s.num}
                </div>
                <h3 className="font-bold mb-2" style={{ fontSize: '1.05rem' }}>{s.title}</h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--on-surface-muted)', lineHeight: 1.65 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="px-6 py-16">
        <div
          className="max-w-3xl mx-auto text-center rounded-2xl p-12"
          style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, #be123c 100%)',
            boxShadow: '0 20px 40px rgba(225,29,72,0.3)',
          }}
        >
          <h2 className="font-black text-white mb-4" style={{ fontSize: '2rem', letterSpacing: '-0.02em' }}>
            In an Emergency? Act Now.
          </h2>
          <p className="text-white mb-8" style={{ opacity: 0.88, fontSize: '1.05rem' }}>
            Every second counts. Request an ambulance instantly — no account needed.
          </p>
          <Link
            href="/request"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: '#fff', color: 'var(--primary)',
              fontWeight: 700, fontSize: '1rem',
              padding: '14px 32px', borderRadius: '999px',
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
              transition: 'transform 0.15s ease',
            }}
          >
            🚨 Request Ambulance Now
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        style={{
          borderTop: '1px solid var(--border)',
          padding: '28px 24px',
          textAlign: 'center',
          fontSize: '0.82rem',
          color: 'var(--on-surface-muted)',
        }}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <span>🚑</span>
          <span style={{ fontWeight: 700, color: 'var(--on-surface)' }}>AmbulanceFinder</span>
        </div>
        <p>© {new Date().getFullYear()} AmbulanceFinder. Built for life-saving speed.</p>
      </footer>
    </div>
  );
}
