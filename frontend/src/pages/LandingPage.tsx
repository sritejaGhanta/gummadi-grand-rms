import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  UtensilsCrossed,
  Shield,
  Zap,
  Smartphone,
  ChefHat,
  TrendingUp,
  Receipt,
  Users,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  ArrowRight,
  Star,
  Layers,
  Sparkles,
  Lock,
  Crown,
  ChevronRight,
  Split,
  FileSpreadsheet,
} from 'lucide-react';
import { superAdminApi } from '../api/endpoints';

export const LandingPage: React.FC = () => {
  const [cms, setCms] = useState<any>({
    brandName: 'AharPOS',
    tagline: 'Smart Dining. High-Yield Operations.',
    heroTitle: 'AharPOS — The Operating System for Fast-Growing Restaurants',
    heroSubtitle:
      'All-in-One Cloud & Local POS, Multi-Guest Table Sharing, Zero-Latency Kitchen KDS, Recipe Yield Inventory & WhatsApp E-Bills built for Indian Food Businesses.',
    trialDays: 30,
    plan6MonthsPrice: 10000,
    plan1YearPrice: 20000,
    bannerText: '🔥 Special Launch Offer: 1-Month Free Unlimited Trial for Restaurants!',
    bannerActive: true,
    contactPhone: '+91 98765 43210',
    contactEmail: 'sales@aharpos.in',
    contactWhatsapp: '+91 98765 43210',
    contactAddress: 'HITEC City, Madhapur, Hyderabad, Telangana 500081',
    themePrimary: '#f59e0b',
    testimonials: [
      {
        restaurantName: 'Gummadi Grand Restaurant',
        ownerName: 'Suresh Gummadi (Founder)',
        location: 'Kukatpally, Hyderabad',
        quote:
          'AharPOS changed our rush-hour table turnover completely. Table sharing and instant KOT to kitchen saved us 20 minutes per table!',
        rating: 5,
        growthMetric: '+35% Faster Table Turnover',
      },
      {
        restaurantName: 'Mandi King Arabian Restaurant',
        ownerName: 'Mohammed R. (Owner)',
        location: 'JNTU Road, Hyderabad',
        quote:
          'Our chefs love the KDS screen. No missed orders or handwritten paper slips. Daily closing Z-report on WhatsApp is a blessing.',
        rating: 5,
        growthMetric: '0 Lost KOTs',
      },
      {
        restaurantName: 'Teluguness Restaurant',
        ownerName: 'Chaitanya K. (Managing Partner)',
        location: 'Madhapur, Hi-Tech City',
        quote:
          'Petpooja was charging high commissions and hidden renewal fees. AharPOS flat 20K/year pricing and offline LAN mode is 10x better.',
        rating: 5,
        growthMetric: '₹1.2L Saved in Annual Fees',
      },
    ],
  });

  const [leadForm, setLeadForm] = useState({
    restaurantName: '',
    ownerName: '',
    phone: '',
    email: '',
    city: 'Hyderabad',
    seatingCapacity: '20-50 Seats',
    preferredPlan: '1_YEAR',
    notes: '',
  });

  const [leadSuccess, setLeadSuccess] = useState(false);
  const [submittingLead, setSubmittingLead] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);

  useEffect(() => {
    loadCms();
  }, []);

  const loadCms = async () => {
    try {
      const data = await superAdminApi.getLandingCms();
      if (data) {
        setCms((prev: any) => ({ ...prev, ...data }));
      }
    } catch (e) {
      console.warn('Using default CMS settings', e);
    }
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingLead(true);
    setLeadError(null);
    try {
      await superAdminApi.submitDemoInquiry(leadForm);
      setLeadSuccess(true);
      setLeadForm({
        restaurantName: '',
        ownerName: '',
        phone: '',
        email: '',
        city: 'Hyderabad',
        seatingCapacity: '20-50 Seats',
        preferredPlan: '1_YEAR',
        notes: '',
      });
    } catch (err: any) {
      setLeadError(err.message || 'Failed to submit inquiry. Please call our sales team.');
    } finally {
      setSubmittingLead(false);
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950 overflow-x-hidden">
      {/* Top Banner (Super Admin Controllable) */}
      {cms.bannerActive && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 font-bold text-xs py-2.5 px-4 text-center flex items-center justify-center gap-2 shadow-lg">
          <Sparkles className="w-4 h-4 animate-spin text-slate-950" />
          <span>{cms.bannerText}</span>
          <button
            onClick={() => scrollToSection('demo-section')}
            className="hidden sm:inline-flex items-center gap-1 underline underline-offset-2 ml-2 hover:text-black transition"
          >
            Claim {cms.trialDays} Days Free <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Modern Sticky Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 shadow-xl shadow-amber-500/25">
              <UtensilsCrossed className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-white flex items-center gap-1">
                {cms.brandName}
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  ENTERPRISE
                </span>
              </span>
              <p className="text-[10px] text-slate-400 hidden sm:block tracking-wide uppercase">
                {cms.tagline}
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-300">
            <button onClick={() => scrollToSection('features')} className="hover:text-amber-400 transition">
              Core Features
            </button>
            <button onClick={() => scrollToSection('pricing')} className="hover:text-amber-400 transition">
              Pricing Plans
            </button>
            <button onClick={() => scrollToSection('reviews')} className="hover:text-amber-400 transition">
              Client Reviews
            </button>
            <button onClick={() => scrollToSection('contact')} className="hover:text-amber-400 transition">
              Contact Us
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>Staff & Owner Login</span>
            </Link>
            <button
              onClick={() => scrollToSection('demo-section')}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5"
            >
              <span>Book Free Demo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute -top-20 left-10 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-amber-500/30 text-amber-300 text-xs font-bold tracking-wide shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Powering Top Restaurants with 0-Latency Speed</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.1]">
            The Operating System for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500">
              High-Growth Restaurants
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-base sm:text-xl text-slate-400 leading-relaxed font-normal">
            {cms.heroSubtitle}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => scrollToSection('demo-section')}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-base shadow-2xl shadow-amber-500/30 transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <span>Start {cms.trialDays}-Day Free Unlimited Trial</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-white font-bold text-base transition flex items-center justify-center gap-2"
            >
              <Zap className="w-5 h-5 text-amber-400" />
              <span>Explore Live Features</span>
            </button>
          </div>

          {/* Social Proof Strip */}
          <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-slate-800/80 max-w-4xl mx-auto text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-black shrink-0">
                0s
              </div>
              <div>
                <div className="text-sm font-black text-white">0-Latency LAN</div>
                <div className="text-xs text-slate-400">Offline-first billing</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black shrink-0">
                🤝
              </div>
              <div>
                <div className="text-sm font-black text-white">Table Sharing</div>
                <div className="text-xs text-slate-400">Multi-guest splitting</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-black shrink-0">
                📱
              </div>
              <div>
                <div className="text-sm font-black text-white">WhatsApp Bills</div>
                <div className="text-xs text-slate-400">Save 100% paper slips</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-black shrink-0">
                🔒
              </div>
              <div>
                <div className="text-sm font-black text-white">Anti-Theft OTP</div>
                <div className="text-xs text-slate-400">Manager approval control</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase (Petpooja Equivalent Advantages) */}
      <section id="features" className="py-24 bg-slate-900/50 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-black tracking-widest text-amber-400 uppercase">
              Engineered For Indian Restaurants
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Everything Your Restaurant Needs Under One Roof
            </h2>
            <p className="text-sm sm:text-base text-slate-400">
              No complex hardware. Runs seamlessly on touch POS terminals, tablets, smartphones, and PCs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1: Multi-Guest Table Sharing */}
            <div className="glass-panel p-8 rounded-3xl border border-slate-800 hover:border-amber-500/40 transition group space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition">
                <Split className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-white">Multi-Guest Table Sharing</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                When lunch rushes hit, seat two separate parties at the same 4-seater or 6-seater table. Punch orders for <strong>Guest A</strong> and <strong>Guest B</strong> independently and generate separate tax invoices with zero confusion.
              </p>
              <div className="pt-2 text-[11px] font-bold text-amber-400 flex items-center gap-1">
                <span>Exclusive AharPOS Feature</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Feature 2: 0-Latency KDS Kitchen Screen */}
            <div className="glass-panel p-8 rounded-3xl border border-slate-800 hover:border-emerald-500/40 transition group space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition">
                <ChefHat className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-white">Smart Kitchen KDS with Chime Alerts</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Replace greasy printed paper tickets with real-time digital kitchen screens. Chefs get audio chimes on new KOTs, color-coded prep timers, and 1-tap "Mark Ready" alerts to floor waiters.
              </p>
              <div className="pt-2 text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                <span>Cuts Kitchen Prep Delay by 40%</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Feature 3: Recipe Yield & Raw Inventory */}
            <div className="glass-panel p-8 rounded-3xl border border-slate-800 hover:border-blue-500/40 transition group space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition">
                <FileSpreadsheet className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-white">Auto-Deduct Recipe Inventory</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every plate of Biryani or Curry sold automatically deducts exact grams of basmati rice, oil, chicken, and spices. Stop pilferage and get real-time low-stock alerts before items run out.
              </p>
              <div className="pt-2 text-[11px] font-bold text-blue-400 flex items-center gap-1">
                <span>Eliminates Theft & Stock Leaks</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Feature 4: WhatsApp E-Bill & Customer CRM */}
            <div className="glass-panel p-8 rounded-3xl border border-slate-800 hover:border-purple-500/40 transition group space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition">
                <Smartphone className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-white">WhatsApp Bills & Loyalty CRM</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Send GST tax invoices directly to diners' WhatsApp with 1 tap. Collect customer phone numbers automatically for festive re-marketing, loyalty cashback, and Google review campaigns.
              </p>
              <div className="pt-2 text-[11px] font-bold text-purple-400 flex items-center gap-1">
                <span>Zero Paper Cost & Instant CRM</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Feature 5: Day Close EOD Cash Reconciliation */}
            <div className="glass-panel p-8 rounded-3xl border border-slate-800 hover:border-rose-500/40 transition group space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center group-hover:scale-110 transition">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-white">Day-End EOD Z-Report & Cash Lock</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Reconcile physical cash drawer notes vs expected POS cash at night. Any mismatch is flagged as cash variance. Lock the shift and auto-send a consolidated profit summary to the Owner's WhatsApp.
              </p>
              <div className="pt-2 text-[11px] font-bold text-rose-400 flex items-center gap-1">
                <span>100% Cash Drawer Auditing</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Feature 6: Offline-First Hybrid Architecture */}
            <div className="glass-panel p-8 rounded-3xl border border-slate-800 hover:border-amber-500/40 transition group space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition">
                <Shield className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-white">Offline LAN Mode — 0 Downtime</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Internet down in your area? Billing, KOT printing, and table service never stop. POS operates seamlessly across local WiFi/LAN and auto-syncs with the cloud once the connection is restored.
              </p>
              <div className="pt-2 text-[11px] font-bold text-amber-400 flex items-center gap-1">
                <span>Zero Sales Interruption Ever</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Transparent Pricing Section (Super Admin Controllable 10k/6mo, 20k/1yr) */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-black tracking-widest text-amber-400 uppercase">
              Transparent Pricing • No Hidden Commissions
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Simple, Affordable Pricing for Every Restaurant
            </h2>
            <p className="text-sm text-slate-400">
              Unlike competitors who charge percentage cuts on every order, AharPOS gives you unlimited orders and tables at a flat, honest fee.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Half-Yearly Plan */}
            <div className="glass-panel p-8 rounded-3xl border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-white">Half-Yearly Plan</h3>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
                    6 Months
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white">
                    ₹{cms.plan6MonthsPrice.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-slate-400">/ 6 Months + GST</span>
                </div>
                <p className="text-xs text-slate-400">
                  Ideal for single outlets looking for immediate operational transformation and rush-hour table turnover.
                </p>

                <div className="pt-4 border-t border-slate-800/80 space-y-3 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Includes <strong>{cms.trialDays} Days Free Unlimited Trial</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Multi-Guest Table Sharing (Guest A + Guest B)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Zero-Latency Kitchen KDS Screen</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>WhatsApp Digital E-Bills & Thermal KOT</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Up to 20 Staff Logins & 50 Tables</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setLeadForm((f) => ({ ...f, preferredPlan: '6_MONTHS' }));
                  scrollToSection('demo-section');
                }}
                className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold text-xs transition"
              >
                Choose 6 Months Plan
              </button>
            </div>

            {/* Annual Flagship Plan (Most Popular) */}
            <div className="glass-panel p-8 rounded-3xl border-2 border-amber-500/60 shadow-2xl shadow-amber-500/10 flex flex-col justify-between space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-amber-600 text-slate-950 font-black text-[10px] tracking-wider uppercase py-1 px-4 rounded-bl-xl shadow-md">
                BEST VALUE • RECOMMENDED
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-amber-300">Annual Flagship Plan</h3>
                  <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    1 Full Year
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white">
                    ₹{cms.plan1YearPrice.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-slate-400">/ Year + GST (Only ₹1,666/mo)</span>
                </div>
                <p className="text-xs text-slate-400">
                  Full enterprise operating suite for premier restaurants, cafes, and multi-branch outlets.
                </p>

                <div className="pt-4 border-t border-slate-800/80 space-y-3 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Includes <strong>{cms.trialDays} Days Free Unlimited Trial</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span><strong>Multi-Branch (2 Outlets Included)</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Automated Recipe Yield & Wastage Inventory</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Customer CRM, Loyalty Wallet & Marketing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>EOD Day-End Z-Report Cash Reconciliation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>VIP Priority 24/7 Phone & On-Site Support</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setLeadForm((f) => ({ ...f, preferredPlan: '1_YEAR' }));
                  scrollToSection('demo-section');
                }}
                className="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 transition"
              >
                Start 1-Year Free Trial Now
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Reviews & Testimonials Section */}
      <section id="reviews" className="py-24 bg-slate-900/60 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-black tracking-widest text-amber-400 uppercase">
              Restaurateur Success Stories
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Trusted by Premier Dining Brands
            </h2>
            <p className="text-sm text-slate-400">
              Hear directly from founders and operators who streamlined their kitchen, tables, and cash flow with {cms.brandName}.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {cms.testimonials.map((t: any, idx: number) => (
              <div
                key={idx}
                className="glass-panel p-8 rounded-3xl border border-slate-800/80 flex flex-col justify-between space-y-6 hover:border-slate-700 transition"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(t.rating || 5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400" />
                      ))}
                    </div>
                    {t.growthMetric && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {t.growthMetric}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-300 italic leading-relaxed">
                    "{t.quote}"
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 font-black flex items-center justify-center shrink-0">
                    {t.ownerName.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{t.ownerName}</div>
                    <div className="text-[11px] text-amber-400 font-semibold">{t.restaurantName}</div>
                    <div className="text-[10px] text-slate-500">{t.location}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Booking & Lead Capture Form */}
      <section id="demo-section" className="py-24 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-4xl mx-auto glass-panel p-8 sm:p-12 rounded-3xl border border-amber-500/30 shadow-2xl relative z-10 space-y-8">
          <div className="text-center space-y-3">
            <span className="text-xs font-black tracking-widest text-amber-400 uppercase">
              Free 15-Minute Live Interactive Demo
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Ready to Upgrade Your Restaurant Operations?
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Leave your details below. Our senior restaurant tech consultant will call you within 15 minutes and setup your <strong>{cms.trialDays}-Day Free Trial</strong> on your own hardware!
            </p>
          </div>

          {leadSuccess ? (
            <div className="p-8 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white">Inquiry Received Successfully!</h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                Thank you! Our AharPOS implementation specialist is reviewing your restaurant requirements and will contact you shortly to activate your <strong>{cms.trialDays}-Day Free Trial</strong>.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setLeadSuccess(false)}
                  className="px-5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 hover:bg-slate-800 transition"
                >
                  Submit Another Inquiry
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleLeadSubmit} className="space-y-4">
              {leadError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                  {leadError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Restaurant Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={leadForm.restaurantName}
                    onChange={(e) => setLeadForm({ ...leadForm, restaurantName: e.target.value })}
                    placeholder="e.g. Gummadi Grand / Paradise Biryani"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Owner / Manager Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={leadForm.ownerName}
                    onChange={(e) => setLeadForm({ ...leadForm, ownerName: e.target.value })}
                    placeholder="e.g. Suresh Gummadi"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Mobile Phone (for Demo Callback) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={leadForm.phone}
                    onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                    placeholder="e.g. +91 99480 12345"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    City / Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={leadForm.city}
                    onChange={(e) => setLeadForm({ ...leadForm, city: e.target.value })}
                    placeholder="e.g. Hyderabad / Vijayawada"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Seating Capacity
                  </label>
                  <select
                    value={leadForm.seatingCapacity}
                    onChange={(e) => setLeadForm({ ...leadForm, seatingCapacity: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-amber-500 transition"
                  >
                    <option value="Under 20 Seats">Under 20 Seats (Quick Service / Cafe)</option>
                    <option value="20-50 Seats">20 to 50 Seats (Standard Dine-in)</option>
                    <option value="50-100 Seats">50 to 100 Seats (Large Family Dining)</option>
                    <option value="100+ Seats">100+ Seats (Grand Multi-Floor Banquet)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Preferred Subscription Plan
                  </label>
                  <select
                    value={leadForm.preferredPlan}
                    onChange={(e) => setLeadForm({ ...leadForm, preferredPlan: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-amber-500 transition"
                  >
                    <option value="1_YEAR">Annual Flagship Plan (₹20,000 / Year)</option>
                    <option value="6_MONTHS">Half-Yearly Plan (₹10,000 / 6 Months)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Any specific requirements or current POS challenges?
                </label>
                <textarea
                  rows={2}
                  value={leadForm.notes}
                  onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
                  placeholder="e.g. We want table sharing, sound alert kitchen screens, and thermal bill printing."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <button
                type="submit"
                disabled={submittingLead}
                className="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submittingLead ? (
                  <span>Submitting Inquiry...</span>
                ) : (
                  <>
                    <span>Submit & Claim {cms.trialDays}-Day Free Trial</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer & Dynamic Contact Info (Super Admin Settings) */}
      <footer id="contact" className="bg-slate-950 border-t border-slate-800/80 pt-16 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <span className="text-xl font-black text-white">{cms.brandName}</span>
            </div>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              India's first hybrid cloud and local-first restaurant operating system. Engineered for high table turnover, zero missed KOTs, and transparent pricing.
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>All Systems Operational • 99.99% Uptime</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Product Portals</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link to="/login" className="hover:text-amber-400 transition">
                  Staff POS & Kitchen Login
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-amber-400 transition">
                  Restaurant Owner Dashboard
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-amber-400 transition flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-400" />
                  <span>Super Admin SaaS Console</span>
                </Link>
              </li>
              <li>
                <button onClick={() => scrollToSection('pricing')} className="hover:text-amber-400 transition">
                  Plans & Pricing (10K / 20K)
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Details (From Super Admin CMS) */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Enterprise Sales & Support</h4>
            <div className="space-y-2.5 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <a href={`tel:${cms.contactPhone}`} className="hover:text-white transition">
                  {cms.contactPhone}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <a
                  href={`https://wa.me/${cms.contactWhatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition"
                >
                  WhatsApp: {cms.contactWhatsapp}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <a href={`mailto:${cms.contactEmail}`} className="hover:text-white transition">
                  {cms.contactEmail}
                </a>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                <span>{cms.contactAddress}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-4">
          <p>© 2026 {cms.brandName} Technologies India Pvt. Ltd. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Enterprise Multi-Tenant SaaS</span>
            <span>Made with ❤️ for Indian Restaurateurs</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
