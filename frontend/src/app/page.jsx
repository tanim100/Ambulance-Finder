// src/app/page.jsx — Enterprise-Grade Emergency Response Platform
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ThemeToggle from '@/components/ui/ThemeToggle';
import {
  Siren,
  PhoneCall,
  ShieldCheck,
  Clock,
  MapPin,
  Activity,
  HeartPulse,
  Navigation,
  ArrowRight,
  CheckCircle2,
  Zap,
  Ambulance,
  Radio,
  Sparkles,
  Phone,
  Hospital,
  ChevronDown,
  AlertTriangle,
  Stethoscope,
  Award,
  BadgeCheck,
  X,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

const AMBULANCE_FLEET = [
  {
    id: 'basic',
    name: 'Basic Life Support (BLS)',
    category: 'Non-Critical & Minor Trauma',
    eta: '3 - 5 Mins',
    baseFare: 'BDT 1,000',
    color: 'from-blue-500 to-cyan-500',
    tagColor: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    description: 'Specialized for stable patients, non-emergency transfers, post-surgery discharges, and orthopedic limb immobilization.',
    specs: ['Oxygen Cylinder & Flowmeter', 'Foldable Wheeled Stretcher', 'Comprehensive First Aid Kit', 'Certified Medical Driver'],
  },
  {
    id: 'advanced',
    name: 'Advanced Life Support (ALS)',
    category: 'Cardiac & Severe Respiratory',
    eta: '4 - 6 Mins',
    baseFare: 'BDT 1,800',
    color: 'from-rose-500 to-amber-500',
    tagColor: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    description: 'Equipped with cardiac defibrillation, IV infusion lines, airway management, and trained paramedics for critical emergencies.',
    specs: ['ECG Monitor & Defibrillator (AED)', 'Suction Machine & Bag Valve Mask', 'IV Cannulation & Emergency Drugs', 'Paramedic Level-2 on board'],
  },
  {
    id: 'icu',
    name: 'Mobile ICU Critical Care',
    category: 'Ventilator & Unstable ICU',
    eta: '5 - 8 Mins',
    baseFare: 'BDT 3,000',
    color: 'from-purple-500 to-rose-500',
    tagColor: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
    description: 'Hospital Intensive Care Unit on wheels designed for intubated, comatose, or multi-organ failure critical transfers.',
    specs: ['Biphasic Transport Ventilator', 'Multi-parameter Cardiac Monitor', 'Dual Syringe Infusion Pumps', 'Critical Care Doctor on request'],
  },
  {
    id: 'freezer',
    name: 'Freezing Mortuary Ambulance',
    category: 'Dignified Long-Distance',
    eta: '10 - 15 Mins',
    baseFare: 'BDT 3,500',
    color: 'from-slate-600 to-slate-800',
    tagColor: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    description: 'Temperature-controlled mortuary transport preserved between -5°C to -15°C for inter-district respectful journeys.',
    specs: ['Sub-zero Preservation Chiller', '24h Standby Battery Backup', 'Anti-bacterial Interior Lining', 'Long-haul Highway Clearance'],
  },
];

const HOSPITALS = [
  {
    name: 'Dhaka Medical College & Hospital',
    area: 'Secretariate Rd, Shahbagh, Dhaka',
    phone: '02-55165555',
    hotline: '01711-234567',
    emergency: '24/7 Level-1 Trauma, Burn Unit & CCU',
    beds: 'Available',
    type: 'Government Super-Specialized',
  },
  {
    name: 'Square Hospitals Ltd.',
    area: '18/F Panthapath, Dhaka',
    phone: '10616',
    hotline: '01713-377775',
    emergency: '24/7 Emergency, Stroke & Cardiac Center',
    beds: 'Available',
    type: 'Private Tertiary Care',
  },
  {
    name: 'Evercare Hospital Dhaka',
    area: 'Plot 81, Block E, Bashundhara R/A, Dhaka',
    phone: '10678',
    hotline: '09666710678',
    emergency: 'JCI Accredited, 24/7 Critical Care & Trauma',
    beds: 'Available',
    type: 'Private Multi-Disciplinary',
  },
  {
    name: 'United Hospital Gulshan',
    area: 'Plot 15, Road 71, Gulshan 2, Dhaka',
    phone: '10666',
    hotline: '01914-001234',
    emergency: '24/7 Comprehensive Cardiac & ER Care',
    beds: 'Available',
    type: 'Private Specialized',
  },
  {
    name: 'BIRDEM General Hospital',
    area: '122 Kazi Nazrul Islam Ave, Shahbagh, Dhaka',
    phone: '02-9661551',
    hotline: '01730-058888',
    emergency: '24/7 ICU, Nephrology & Emergency Triage',
    beds: 'Available',
    type: 'Specialized Endocrine & General',
  },
  {
    name: 'Bangabandhu Sheikh Mujib Medical University (BSMMU)',
    area: 'Shahbagh, Dhaka',
    phone: '02-9661051',
    hotline: '01712-987654',
    emergency: 'Super-Specialized Research & Emergency ICU',
    beds: 'Available',
    type: 'Public Medical University',
  },
  {
    name: 'National Institute of Cardiovascular Diseases (NICVD)',
    area: 'Sher-e-Bangla Nagar, Dhaka',
    phone: '02-9122560',
    hotline: '01715-667788',
    emergency: 'National Emergency Cardiac Cath-Lab & CCU',
    beds: 'Available',
    type: 'National Apex Cardiac Center',
  },
  {
    name: 'Kurmitola General Hospital',
    area: 'Dhaka-Mymensingh Rd, Dhaka Cantonment',
    phone: '02-55067201',
    hotline: '01769-010200',
    emergency: '24/7 Acute Trauma & General Emergency Care',
    beds: 'Available',
    type: 'Government General Hospital',
  },
];

const FAQS = [
  {
    q: 'How fast will an ambulance arrive after I make a request?',
    a: 'Our smart dispatch algorithm locates and assigns the nearest active ambulance in your immediate grid within 15 seconds. Average city response time is under 5 minutes with real-time GPS tracking.',
  },
  {
    q: 'Do I need to make any advance payment in an emergency?',
    a: 'No. We follow a strict Patient-First Emergency Policy. Dispatch is triggered instantly upon request. Fares can be settled via cash or bKash/cards after patient safety is secured at the destination.',
  },
  {
    q: 'What is the difference between BLS and ALS ambulances?',
    a: 'Basic Life Support (BLS) is equipped with oxygen and basic first aid for stable patients. Advanced Life Support (ALS) has cardiac monitors, AED defibrillators, IV medications, and a certified paramedic for life-threatening conditions.',
  },
  {
    q: 'Can I call if I do not have an internet connection or smartphone?',
    a: 'Yes. Our direct 24/7 National Emergency Hotline is connected with 999 and our central control room at 16263 and 01900-HELP99 for instant manual dispatch.',
  },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [selectedHospital, setSelectedHospital] = useState(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-rose-600 selection:text-white font-sans antialiased">

      {/* ── Top Bar: Live Crisis Telemetry ── */}
      <div className="bg-slate-950 text-slate-300 text-xs py-2 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              SYSTEM ACTIVE
            </span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="text-slate-300 hidden sm:inline">
              <strong className="text-white">42 Ambulances</strong> Ready across Dhaka Metro
            </span>
            <span className="text-slate-600 hidden md:inline">|</span>
            <span className="text-slate-400 hidden md:inline">
              Average Arrival: <strong className="text-emerald-400">4.2 Minutes</strong>
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs ml-auto">
            <span className="text-slate-400 hidden sm:inline font-medium">Emergency Hotlines:</span>
            <a
              href="tel:999"
              className="flex items-center gap-1 text-rose-400 font-extrabold hover:text-rose-300 transition-colors"
            >
              <PhoneCall size={12} /> 999
            </a>
            <span className="text-slate-700">/</span>
            <a
              href="tel:16263"
              className="flex items-center gap-1 text-blue-400 font-extrabold hover:text-blue-300 transition-colors"
            >
              16263 (Health)
            </a>
          </div>
        </div>
      </div>

      {/* ── Main Sticky Header ── */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${scrolled
          ? 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-md border-b border-slate-200 dark:border-slate-800'
          : 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-200/80 dark:border-slate-800/80'
          }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-600 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/25 group-hover:scale-105 transition-transform">
              <Siren size={24} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xl tracking-tight text-slate-950 dark:text-white">
                  Ambulance<span className="text-rose-600">Finder</span>
                </span>
                <span className="text-[10px] font-extrabold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded">
                  24/7
                </span>
              </div>
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 -mt-0.5">
                Emergency Medical Transport
              </span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <a href="#fleet" className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
              Fleet &amp; Equipment
            </a>
            <a href="#how-it-works" className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
              How Dispatch Works
            </a>
            <a href="#hospitals" className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
              Hospital Network
            </a>
            <a href="#faqs" className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="inline-flex text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO SECTION ── */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:py-24 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">

        {/* Soft pink/rose radial ambient glow at top */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '-25%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '1050px',
            height: '800px',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse at center, rgba(244, 63, 94, 0.22) 0%, rgba(254, 205, 211, 0.18) 45%, transparent 70%)',
            filter: 'blur(35px)',
          }}
        />

        {/* Light & razor-sharp grid pattern layer */}
        <div className="absolute inset-0 bg-grid-pattern pointer-events-none opacity-90 dark:opacity-40" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-7">

          {/* DGHS / Official Trust Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs sm:text-sm font-bold shadow-xs">
            <ShieldCheck size={17} className="text-rose-600 shrink-0" />
            <span>Certified Emergency Medical Response Platform</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping ml-1" />
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-950 dark:text-white tracking-tight leading-[1.12]">
            Emergency Help,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600">
              Seconds Away.
            </span>
          </h1>

          {/* CTAs */}
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/request"
              className="w-full sm:w-auto flex items-center justify-center gap-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-base px-9 py-4 rounded-2xl shadow-xl shadow-rose-600/30 hover:shadow-2xl hover:shadow-rose-600/40 hover:-translate-y-0.5 active:translate-y-0 transition-all"
            >
              <Siren size={20} className="animate-pulse" />
              <span>Request Emergency Ambulance</span>
              <ArrowRight size={18} />
            </Link>

            <Link
              href="/home"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border-2 border-slate-200 dark:border-slate-800 font-bold text-base px-7 py-4 rounded-2xl shadow-xs transition-all"
            >
              <MapPin size={18} className="text-rose-600" />
              <span>View Nearby Map</span>
            </Link>
          </div>

          {/* 3 Quick Value Badges in centered cards */}
          <div className="pt-8 border-t border-slate-200/80 dark:border-slate-800/80 max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-center space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-sm font-extrabold text-slate-950 dark:text-white">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                <span>No Advance Pay</span>
              </div>
              <p className="text-xs text-slate-500">Pay safely after trip completion</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-center space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-sm font-extrabold text-slate-950 dark:text-white">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                <span>Certified EMTs</span>
              </div>
              <p className="text-xs text-slate-500">Licensed life support crews</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-center space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-sm font-extrabold text-slate-950 dark:text-white">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                <span>Live GPS Telemetry</span>
              </div>
              <p className="text-xs text-slate-500">Turn-by-turn live tracking</p>
            </div>
          </div>

        </div>
      </section>

      {/* ── Key Metrics Strip ── */}
      <section className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { val: '550+', label: 'Registered Ambulances', sub: 'Across 64 districts', icon: Ambulance },
              { val: '< 4.5 Mins', label: 'Average Arrival Time', sub: 'From request to door', icon: Clock },
              { val: '24/7/365', label: 'Continuous Dispatch', sub: 'Active control room', icon: Radio },
              { val: '15,000+', label: 'Emergency Rescues', sub: '99.4% satisfaction', icon: HeartPulse },
            ].map(({ val, label, sub, icon: Icon }) => (
              <div key={label} className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-900">
                  <Icon size={24} />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight">
                    {val}
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                    {label}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {sub}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FLEET DETAILS GRID ── */}
      <section id="fleet" className="py-20 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs uppercase font-extrabold tracking-widest text-rose-600 dark:text-rose-400">
            Emergency Fleet Specification
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-950 dark:text-white tracking-tight mt-2">
            Every Emergency Needs The Right Ambulance
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base mt-3">
            From basic oxygen support to mobile ICU ventilators, every vehicle is certified by healthcare authorities.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {AMBULANCE_FLEET.map((fleet) => (
            <div
              key={fleet.id}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-rose-300 dark:hover:border-rose-800 transition-all flex flex-col justify-between"
            >
              <div>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${fleet.tagColor}`}>
                  {fleet.category}
                </span>

                <h3 className="font-black text-lg text-slate-950 dark:text-white mt-3">
                  {fleet.name}
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  {fleet.description}
                </p>

                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">On-board Equipment</p>
                  {fleet.specs.map((s) => (
                    <div key={s} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                      <span className="truncate">{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Base Fare</p>
                  <p className="text-base font-black text-slate-950 dark:text-white">{fleet.baseFare}</p>
                </div>
                <Link
                  href="/request"
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow transition-all"
                >
                  Book Unit →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW DISPATCH WORKS ── */}
      <section id="how-it-works" className="py-20 bg-slate-100 dark:bg-slate-900/60 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs uppercase font-extrabold tracking-widest text-rose-600 dark:text-rose-400">
              Crisis Protocol
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950 dark:text-white tracking-tight mt-2">
              From Request to Hospital in 3 Steps
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base mt-3">
              Streamlined for zero delay. No complicated forms or logins in emergencies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Instant GPS Detection',
                desc: 'Your device auto-pinpoints the emergency location. Or simply enter the nearest hospital or landmark.',
                icon: MapPin,
              },
              {
                step: '02',
                title: 'Automated Smart Radar Dispatch',
                desc: 'Our dispatch algorithm assigns the closest active ambulance with the required medical equipment.',
                icon: Zap,
              },
              {
                step: '03',
                title: 'Live Tracking & Hospital Handover',
                desc: 'Watch the ambulance approach in real-time. Direct communication with the driver and hospital triage.',
                icon: Navigation,
              },
            ].map(({ step, title, desc, icon: Icon }) => (
              <div
                key={step}
                className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm relative group hover:border-rose-300 dark:hover:border-rose-900 transition-all"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon size={28} />
                  </div>
                  <span className="text-4xl font-black text-slate-200 dark:text-slate-800 font-mono">
                    {step}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-950 dark:text-white mb-2">
                  {title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONNECTED HOSPITALS MARQUEE ── */}
      <section id="hospitals" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 text-center">
        <span className="text-xs uppercase font-extrabold tracking-widest text-slate-400">
          Hospital Emergency Network
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight mt-2 mb-2">
          Direct Triage Coordination with Leading Medical Centers
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto mb-8">
          Click any hospital for direct emergency triage hotline and immediate ambulance dispatch.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {HOSPITALS.map((h) => (
            <button
              key={h.name}
              type="button"
              onClick={() => setSelectedHospital(h)}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-500 dark:hover:border-rose-500 hover:shadow-lg transition-all duration-200 text-left flex flex-col justify-between group cursor-pointer active:scale-[0.98]"
            >
              <div className="flex items-start gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                  <Hospital size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors line-clamp-2">
                    {h.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {h.area}
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  24/7 Triage Ready
                </span>
                <span className="text-rose-600 dark:text-rose-400 font-bold group-hover:translate-x-0.5 transition-transform flex items-center">
                  Details & Booking →
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Hospital Detail Emergency Modal */}
        {selectedHospital && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 text-left"
            onClick={() => setSelectedHospital(null)}
          >
            <div
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setSelectedHospital(null)}
                className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title="Close"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3.5 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center border border-rose-200 dark:border-rose-900 shrink-0">
                  <Hospital size={26} />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700 bg-rose-50 dark:bg-rose-950/80 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-900">
                    {selectedHospital.type}
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1 leading-tight">
                    {selectedHospital.name}
                  </h3>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs sm:text-sm">
                <div className="flex items-start gap-2.5">
                  <MapPin size={16} className="text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-400 text-[11px] block">Location Address</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium">{selectedHospital.area}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Activity size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-400 text-[11px] block">Emergency Capabilities</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{selectedHospital.emergency}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Phone size={16} className="text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-400 text-[11px] block">Emergency Triage Hotline</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                      {selectedHospital.hotline || selectedHospital.phone}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons in Modal */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  href={`/request?destination=${encodeURIComponent(selectedHospital.name)}`}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 active:scale-95 transition-all text-center"
                >
                  <Ambulance size={16} />
                  <span>Dispatch Ambulance Here</span>
                </Link>

                <a
                  href={`tel:${(selectedHospital.hotline || selectedHospital.phone).replace(/[^0-9]/g, '')}`}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 active:scale-95 transition-all text-center"
                >
                  <Phone size={16} className="text-emerald-600" />
                  <span>Call Hospital ER Directly</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── 24/7 EMERGENCY DIRECT HOTLINES ── */}
      <section className="py-14 bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-6 border-b border-slate-800">
            <div>
              <span className="text-xs uppercase font-extrabold tracking-widest text-rose-400">
                Direct Emergency Call Lines
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
                Immediate Crisis Support Hotline
              </h2>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm max-w-md">
              For acute cardiac arrest, massive hemorrhage, or severe multi-trauma, dial national services directly.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { title: 'National Emergency', num: '999', sub: 'Police, Medical & Fire Rescue', col: 'bg-rose-600' },
              { title: 'Govt. Health Line', num: '16263', sub: '24/7 Emergency Medical Advice', col: 'bg-blue-600' },
              { title: 'AmbulanceFinder Control', num: '01900-HELP99', sub: 'Priority Manual Dispatch Room', col: 'bg-emerald-600' },
            ].map((c) => (
              <a
                key={c.num}
                href={`tel:${c.num.replace(/[^0-9]/g, '')}`}
                className="bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-2xl p-6 transition-all group block"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{c.title}</span>
                  <div className={`w-8 h-8 rounded-full ${c.col} text-white flex items-center justify-center`}>
                    <Phone size={14} />
                  </div>
                </div>
                <div className="text-3xl font-black text-white group-hover:text-rose-400 transition-colors">
                  {c.num}
                </div>
                <p className="text-xs text-slate-400 mt-2">{c.sub}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── FREQUENTLY ASKED QUESTIONS (FAQ) ── */}
      <section id="faqs" className="py-20 max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <span className="text-xs uppercase font-extrabold tracking-widest text-rose-600 dark:text-rose-400">
            Emergency FAQs
          </span>
          <h2 className="text-3xl font-black text-slate-950 dark:text-white tracking-tight mt-2">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, idx) => (
            <div
              key={faq.q}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-all"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full flex items-center justify-between text-left font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base gap-4"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  size={18}
                  className={`text-slate-400 transition-transform ${openFaq === idx ? 'rotate-180 text-rose-600' : ''}`}
                />
              </button>
              {openFaq === idx && (
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 leading-relaxed">
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CRISIS ACTION BANNER ── */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto rounded-3xl bg-gradient-to-r from-rose-600 via-rose-700 to-rose-800 text-white p-8 sm:p-14 text-center shadow-2xl shadow-rose-600/30 relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold backdrop-blur-xs">
              <Sparkles size={14} /> Seconds Save Lives
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
              In an Emergency? Act Now.
            </h2>
            <p className="text-rose-100 text-sm sm:text-base leading-relaxed">
              Every single second matters. Tap below to automatically locate and dispatch the closest ambulance immediately.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-4">
              <Link
                href="/request"
                className="bg-white text-rose-600 hover:bg-rose-50 font-black text-base px-9 py-4 rounded-2xl shadow-xl transition-all"
              >
                🚨 Request Ambulance Now
              </Link>
              <Link
                href="/login"
                className="bg-rose-900/60 hover:bg-rose-900 text-white border border-rose-400/30 font-bold text-base px-7 py-4 rounded-2xl transition-all"
              >
                Driver &amp; Hospital Portal
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROFESSIONAL FOOTER ── */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-8 border-b border-slate-100 dark:border-slate-900">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold">
                <Siren size={18} />
              </div>
              <span className="font-black text-sm text-slate-900 dark:text-white">
                AmbulanceFinder
              </span>
              <span className="text-slate-400">· Emergency Response Network Bangladesh</span>
            </div>

            <div className="flex items-center gap-6 font-semibold">
              <Link href="/request" className="hover:text-rose-600 transition-colors">Request Ambulance</Link>
              <Link href="/home" className="hover:text-rose-600 transition-colors">Live Map</Link>
              <Link href="/login" className="hover:text-rose-600 transition-colors">Admin Portal</Link>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-400">
            <p>© {new Date().getFullYear()} AmbulanceFinder Bangladesh. Built for rapid life-saving emergency response.</p>
            <p className="text-[11px]">In critical life-threatening emergencies, always dial 999 directly.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
