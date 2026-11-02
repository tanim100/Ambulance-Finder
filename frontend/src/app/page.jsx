// src/app/page.jsx — Landing Page (Theme-Aware)
import Link from 'next/link';
import ThemeToggle from '@/components/ui/ThemeToggle';

const features = [
  {
    icon: '⚡',
    title: 'Fast Response',
    desc: 'Average 5-minute response time in your area',
    light: 'from-amber-50 to-orange-50 border-amber-200',
    dark:  'dark:from-amber-500/10 dark:to-amber-600/5 dark:border-amber-500/20',
    iconBg: 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  {
    icon: '📍',
    title: 'GPS Tracking',
    desc: 'Real-time tracking from dispatch to your door',
    light: 'from-blue-50 to-sky-50 border-blue-200',
    dark:  'dark:from-blue-500/10 dark:to-blue-600/5 dark:border-blue-500/20',
    iconBg: 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  {
    icon: '🕐',
    title: '24/7 Available',
    desc: 'Emergency services available round the clock',
    light: 'from-purple-50 to-violet-50 border-purple-200',
    dark:  'dark:from-purple-500/10 dark:to-purple-600/5 dark:border-purple-500/20',
    iconBg: 'bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400',
  },
  {
    icon: '✅',
    title: 'Certified Drivers',
    desc: 'All drivers are certified EMT professionals',
    light: 'from-emerald-50 to-green-50 border-emerald-200',
    dark:  'dark:from-emerald-500/10 dark:to-emerald-600/5 dark:border-emerald-500/20',
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
];

const stats = [
  { value: '500+', label: 'Ambulances' },
  { value: '<5min', label: 'Avg Response' },
  { value: '24/7', label: 'Availability' },
  { value: '10k+', label: 'Lives Saved' },
];

const steps = [
  { step: '01', icon: '📍', title: 'Share Location',    desc: 'Allow location access or enter your address manually',         color: 'bg-blue-500',    shadow: 'shadow-blue-200 dark:shadow-blue-500/30' },
  { step: '02', icon: '🚑', title: 'Request Ambulance', desc: 'Choose ambulance type and describe the emergency',             color: 'bg-primary-600', shadow: 'shadow-primary-200 dark:shadow-primary-500/30' },
  { step: '03', icon: '✅', title: 'Get Help Fast',     desc: 'Track ambulance in real-time until it arrives',               color: 'bg-emerald-500', shadow: 'shadow-emerald-200 dark:shadow-emerald-500/30' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* ——— Navbar ——— */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div
            className="px-5 h-14 flex items-center justify-between rounded-2xl backdrop-blur-xl shadow-sm"
            style={{
              background: 'var(--nav-bg)',
              border: '1px solid var(--nav-border)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 bg-primary-600 group-hover:bg-primary-500 rounded-xl flex items-center justify-center text-base shadow-md shadow-primary-900/30 transition-all group-hover:scale-105">
                🚑
              </div>
              <span className="font-bold text-base tracking-tight group-hover:opacity-80 transition-opacity" style={{ color: 'var(--on-surface)' }}>
                Ambulance<span className="text-primary-600 dark:text-primary-400">Finder</span>
              </span>
            </Link>

            {/* Nav links */}
            <nav className="hidden md:flex items-center gap-6 text-sm" style={{ color: 'var(--on-surface-muted)' }}>
              <a href="#features"      className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Features</a>
              <a href="#how-it-works"  className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">How It Works</a>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Link
                href="/login"
                className="text-sm font-medium px-4 py-2 rounded-xl transition-all duration-200 hover:bg-[var(--surface-2)]"
                style={{ color: 'var(--on-surface-muted)' }}
              >
                Login
              </Link>
              <Link
                href="/register"
                className="text-sm font-semibold text-white bg-primary-600 hover:bg-primary-500 px-4 py-2 rounded-xl transition-all duration-200 shadow-sm"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ——— Hero ——— */}
      <section className="relative flex-1 pt-32 pb-20 px-4 overflow-hidden bg-grid">
        {/* Orbs (dark only, light uses subtle gradient) */}
        <div className="orb w-[600px] h-[600px] bg-primary-600 -top-40 -left-40 dark:opacity-[0.12] opacity-[0.04]" />
        <div className="orb w-[500px] h-[500px] bg-rose-500 -top-20 right-0 dark:opacity-[0.08] opacity-[0.04]" style={{ animationDelay: '-4s' }} />
        <div className="orb w-[400px] h-[400px] bg-indigo-600 bottom-0 left-1/3 dark:opacity-[0.06] opacity-[0.03]" style={{ animationDelay: '-8s' }} />

        <div className="relative max-w-5xl mx-auto text-center">
          {/* Status pill */}
          <div className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full mb-10 border"
               style={{ background: 'var(--primary-light)', borderColor: 'var(--primary-muted)', color: 'var(--primary-text)' }}>
            <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
            Emergency Services Active — 24/7
          </div>

          {/* Ambulance icon */}
          <div className="relative inline-block mb-10">
            <div className="w-28 h-28 mx-auto rounded-3xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-2xl shadow-primary-300/40 dark:shadow-primary-900/60 emergency-pulse animate-float">
              <span className="text-6xl">🚑</span>
            </div>
            <div className="absolute inset-0 rounded-3xl border border-primary-400/30 scale-125 animate-ping opacity-20" />
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black mb-5 leading-[1.05] tracking-tight" style={{ color: 'var(--on-surface)' }}>
            Emergency Help,{' '}
            <span className="text-gradient">One Tap Away</span>
          </h1>

          <p className="text-lg sm:text-xl max-w-2xl mx-auto mb-12 leading-relaxed" style={{ color: 'var(--on-surface-muted)' }}>
            AmbulanceFinder connects you with certified ambulances in minutes.
            Fast, reliable, and available around the clock.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link
              href="/home"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-primary-600 hover:bg-primary-500 text-white font-bold text-base px-8 py-4 rounded-2xl transition-all duration-200 shadow-xl shadow-primary-300/40 dark:shadow-primary-900/50 active:scale-95 group"
            >
              <span className="text-xl">🚑</span>
              Request Emergency Now
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 font-bold text-base px-8 py-4 rounded-2xl border-2 transition-all duration-200 active:scale-95"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border-strong)',
                color: 'var(--on-surface)',
              }}
            >
              Sign In to Account
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {stats.map(({ value, label }) => (
              <div
                key={label}
                className="rounded-2xl px-4 py-4 hover:scale-[1.02] transition-transform"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
              >
                <p className="text-2xl font-black text-gradient mb-0.5">{value}</p>
                <p className="text-xs font-medium" style={{ color: 'var(--on-surface-subtle)' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ——— Features ——— */}
      <section id="features" className="py-24 px-4" style={{ background: 'var(--bg-2)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-widest uppercase mb-3">Why Choose Us</p>
            <h2 className="section-title mb-4">Built for Emergencies</h2>
            <p className="section-subtitle max-w-xl mx-auto">Purpose-built for critical moments. Every second counts.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map(({ icon, title, desc, light, dark, iconBg }) => (
              <div
                key={title}
                className={`relative p-6 rounded-2xl bg-gradient-to-br border hover:scale-[1.02] transition-all duration-300 cursor-default ${light} ${dark}`}
              >
                <div className={`w-12 h-12 mb-5 rounded-xl flex items-center justify-center text-xl ${iconBg}`}>
                  {icon}
                </div>
                <h3 className="font-bold mb-2 text-base" style={{ color: 'var(--on-surface)' }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--on-surface-muted)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ——— How It Works ——— */}
      <section id="how-it-works" className="py-24 px-4 relative" style={{ background: 'var(--bg)' }}>
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(to right, transparent, var(--border-strong), transparent)' }} />
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-widest uppercase mb-3">Simple Process</p>
            <h2 className="section-title mb-4">How It Works</h2>
            <p className="section-subtitle">Get life-saving help in 3 easy steps</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden sm:block absolute top-10 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px bg-gradient-to-r from-blue-400 via-primary-400 to-emerald-400 opacity-40" />

            {steps.map(({ step, icon, title, desc, color, shadow }) => (
              <div key={step} className="relative text-center group">
                <div className="relative inline-block mb-5">
                  <div className={`w-20 h-20 rounded-2xl ${color} text-white flex items-center justify-center text-3xl shadow-xl ${shadow} group-hover:scale-110 transition-transform duration-300`}>
                    {icon}
                  </div>
                  <span
                    className="absolute -top-2 -right-2 text-xs font-black w-7 h-7 rounded-full flex items-center justify-center border"
                    style={{ background: 'var(--surface)', color: 'var(--on-surface-muted)', borderColor: 'var(--border-strong)' }}
                  >
                    {step.slice(1)}
                  </span>
                </div>
                <h3 className="font-bold mb-2 text-base" style={{ color: 'var(--on-surface)' }}>{title}</h3>
                <p className="text-sm leading-relaxed max-w-xs mx-auto" style={{ color: 'var(--on-surface-muted)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ——— CTA Banner ——— */}
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(to right, transparent, var(--border-strong), transparent)' }} />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[800px] h-[400px] rounded-full bg-primary-500 opacity-[0.05] dark:opacity-[0.08] blur-3xl" />
        </div>

        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-block text-6xl mb-6 animate-float">🚑</div>
          <h2 className="text-4xl sm:text-5xl font-black mb-4 tracking-tight" style={{ color: 'var(--on-surface)' }}>
            Ready for <span className="text-gradient">Emergencies?</span>
          </h2>
          <p className="text-lg mb-10 max-w-xl mx-auto" style={{ color: 'var(--on-surface-muted)' }}>
            Sign up today and get instant access to our network of certified emergency ambulance services.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-bold px-10 py-4 rounded-2xl transition-all duration-200 shadow-xl shadow-primary-300/40 dark:shadow-primary-900/50 text-base active:scale-95"
            >
              Get Started — It&apos;s Free
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 font-bold px-10 py-4 rounded-2xl border-2 transition-all duration-200 text-base active:scale-95"
              style={{ background: 'var(--surface)', borderColor: 'var(--border-strong)', color: 'var(--on-surface)' }}
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ——— Footer ——— */}
      <footer className="py-10 px-4" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center text-sm group-hover:scale-105 transition-transform">🚑</div>
              <span className="font-bold text-sm tracking-tight group-hover:opacity-80 transition-opacity" style={{ color: 'var(--on-surface)' }}>
                Ambulance<span className="text-primary-600 dark:text-primary-400">Finder</span>
              </span>
            </Link>
            <p className="text-sm text-center" style={{ color: 'var(--on-surface-subtle)' }}>
              Emergency Help, One Tap Away © {new Date().getFullYear()}
            </p>
            <div className="flex items-center gap-5 text-sm" style={{ color: 'var(--on-surface-subtle)' }}>
              <a href="#" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Privacy</a>
              <a href="#" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Terms</a>
              <a href="#" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Contact</a>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
