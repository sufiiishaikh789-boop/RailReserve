// PassengerDashboardPage — Indian Railway Journey Planner & Passenger Portal
// Railway Reservation System v3.0 — Team 11, CSE 2271
// Academic Demonstration System — Presidency University, Bengaluru

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Train,
  Ticket,
  Search,
  RotateCcw,
  MapPin,
  Clock,
  HelpCircle,
  Bell,
  LogOut,
  ChevronRight,
  ArrowRight,
  Compass,
  Layers,
  Activity,
  CheckCircle2,
  X,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api';
import type { ETicket, UnreservedTicket, PlatformTicket } from '../types';
import { formatDate, formatINR } from '../utils';

export function PassengerDashboardPage() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'all' | 'reserved' | 'unreserved' | 'platform'>('all');
  const [upcomingJourneys, setUpcomingJourneys] = useState<ETicket[]>([]);
  const [unreservedTickets, setUnreservedTickets] = useState<UnreservedTicket[]>([]);
  const [platformTickets, setPlatformTickets] = useState<PlatformTicket[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals for More Offerings
  const [routeInfoModalOpen, setRouteInfoModalOpen] = useState(false);
  const [coachInfoModalOpen, setCoachInfoModalOpen] = useState(false);
  const [trackTrainModalOpen, setTrackTrainModalOpen] = useState(false);

  // Quick PNR Lookup form on dashboard
  const [quickPnr, setQuickPnr] = useState('');

  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    setLoading(true);

    Promise.allSettled([
      apiClient.getDashboard(token),
      apiClient.getMyAllTickets(token),
    ]).then(([dashRes, specialRes]) => {
      if (!isMounted) return;

      if (dashRes.status === 'fulfilled') {
        setUpcomingJourneys(dashRes.value.upcoming_journeys || []);
      }
      if (specialRes.status === 'fulfilled') {
        setUnreservedTickets(specialRes.value.unreserved || []);
        setPlatformTickets(specialRes.value.platform || []);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const firstName = user?.full_name ? user.full_name.split(' ')[0] : 'Passenger';

  const handleQuickPnrSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickPnr.trim()) {
      navigate(`/app/pnr-status?pnr=${encodeURIComponent(quickPnr.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* 1. Header Navigation Bar */}
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <Link to="/app" className="flex items-center gap-2.5 text-white no-underline group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-red-600 flex items-center justify-center shadow-md shadow-orange-500/20 group-hover:scale-105 transition">
                  <Train className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-extrabold text-lg tracking-tight flex items-center gap-1">
                    <span>RailReserve</span>
                    <span className="text-[10px] uppercase font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 px-1.5 py-0.5 rounded">
                      Passenger
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">Team 11 · CSE 2271</div>
                </div>
              </Link>
            </div>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
              <Link
                to="/app"
                className="px-3.5 py-2 rounded-lg bg-slate-800 text-orange-400 transition"
              >
                Home
              </Link>
              <Link
                to="/app/bookings"
                className="px-3.5 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
              >
                My Bookings
              </Link>
              <Link
                to="/app/pnr-status"
                className="px-3.5 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
              >
                PNR Status
              </Link>
              <Link
                to="/app/refunds"
                className="px-3.5 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
              >
                Cancel & Refunds
              </Link>
              <Link
                to="/app/support"
                className="px-3.5 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
              >
                Help & Support
              </Link>
            </nav>

            {/* User Profile & Actions */}
            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => navigate('/app/bookings')}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {(user?.unread_notifications ?? 0) > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-slate-900" />
                  )}
                </button>
              </div>

              {/* Passenger Avatar & Name */}
              <Link
                to="/app/profile"
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-slate-800 transition group"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                  {firstName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-white leading-tight group-hover:text-orange-400 transition">
                    {user?.full_name || 'Passenger'}
                  </div>
                  <div className="text-[10px] text-slate-400">Account Profile</div>
                </div>
              </Link>

              {/* Logout Button */}
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* 2. Personalized Greeting Section */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-500/20 via-transparent to-transparent pointer-events-none" />

          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-orange-300 text-xs font-semibold mb-3 border border-white/10">
              <Compass className="w-3.5 h-3.5" />
              <span>National Rail Booking Experience</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
              Hi, {firstName}! 👋
            </h1>
            <p className="text-blue-100/90 text-sm sm:text-base mt-2 font-normal leading-relaxed">
              Plan your travel with India’s smartest passenger portal. Choose from confirmed reserved berths, instant UTS general tickets, or station platform passes.
            </p>

            {/* Quick PNR Tracker input inside hero */}
            <form onSubmit={handleQuickPnrSearch} className="mt-6 flex flex-col sm:flex-row gap-2 max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  maxLength={10}
                  value={quickPnr}
                  onChange={(e) => setQuickPnr(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 10-digit PNR for instant status…"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 text-white placeholder-blue-200 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs transition shadow-md whitespace-nowrap"
              >
                Track PNR
              </button>
            </form>
          </div>
        </div>

        {/* 3. Journey Planner — Three Large Illustrated Cards */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Journey Planner</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Select your booking category to begin your reservation
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Verified Indian Railways Standards</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* CARD 1 — RESERVED */}
            <div
              onClick={() => navigate('/app/reserved')}
              role="button"
              tabIndex={0}
              className="group relative rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1.5 cursor-pointer border border-slate-200/80 bg-slate-900"
              style={{ minHeight: '260px' }}
            >
              {/* Background Artwork */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{ backgroundImage: `url('/images/reserved-coach.svg')` }}
              />
              {/* Dark Gradient Overlay for typography readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-900/30" />

              {/* Card Badge */}
              <div className="absolute top-4 left-4 z-10">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-600/90 text-white backdrop-blur-md shadow-sm">
                  <Train className="w-3.5 h-3.5" />
                  AC & Sleeper Classes
                </span>
              </div>

              {/* Card Content at bottom */}
              <div className="absolute bottom-0 inset-x-0 p-6 z-10 text-white">
                <h3 className="text-2xl font-black tracking-tight group-hover:text-blue-300 transition-colors">
                  Reserved
                </h3>
                <p className="text-xs text-slate-200 mt-1 font-medium leading-relaxed">
                  Book your reserved train journey with live berth availability, Tatkal, RAC, and Waitlist tracking.
                </p>

                <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs font-semibold text-blue-200 group-hover:text-white transition">
                  <span>Search Trains & Book</span>
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2 — UNRESERVED */}
            <div
              onClick={() => navigate('/app/unreserved')}
              role="button"
              tabIndex={0}
              className="group relative rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1.5 cursor-pointer border border-slate-200/80 bg-slate-900"
              style={{ minHeight: '260px' }}
            >
              {/* Background Artwork */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{ backgroundImage: `url('/images/unreserved-coach.svg')` }}
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-900/30" />

              {/* Card Badge */}
              <div className="absolute top-4 left-4 z-10">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-600/90 text-white backdrop-blur-md shadow-sm">
                  <Ticket className="w-3.5 h-3.5" />
                  UTS General Pass
                </span>
              </div>

              {/* Card Content at bottom */}
              <div className="absolute bottom-0 inset-x-0 p-6 z-10 text-white">
                <h3 className="text-2xl font-black tracking-tight group-hover:text-emerald-300 transition-colors">
                  Unreserved
                </h3>
                <p className="text-xs text-slate-200 mt-1 font-medium leading-relaxed">
                  Book a general journey ticket instantly. Valid for 24 hours on ordinary, mail, and superfast routes.
                </p>

                <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs font-semibold text-emerald-200 group-hover:text-white transition">
                  <span>Issue UTS Ticket</span>
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 3 — PLATFORM */}
            <div
              onClick={() => navigate('/app/platform')}
              role="button"
              tabIndex={0}
              className="group relative rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1.5 cursor-pointer border border-slate-200/80 bg-slate-900"
              style={{ minHeight: '260px' }}
            >
              {/* Background Artwork */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{ backgroundImage: `url('/images/platform-station.svg')` }}
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-900/30" />

              {/* Card Badge */}
              <div className="absolute top-4 left-4 z-10">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-600/90 text-white backdrop-blur-md shadow-sm">
                  <Building2 className="w-3.5 h-3.5" />
                  Station Entry Pass
                </span>
              </div>

              {/* Card Content at bottom */}
              <div className="absolute bottom-0 inset-x-0 p-6 z-10 text-white">
                <h3 className="text-2xl font-black tracking-tight group-hover:text-amber-300 transition-colors">
                  Platform
                </h3>
                <p className="text-xs text-slate-200 mt-1 font-medium leading-relaxed">
                  Book a station platform entry ticket for visitors and send-offs. Fixed ₹10 with instant 2-hour digital QR pass.
                </p>

                <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs font-semibold text-amber-200 group-hover:text-white transition">
                  <span>Get Platform Pass</span>
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. More Offerings Section — 8 Responsive Cards */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                More Offerings & Railway Services
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Quick access to passenger tools, railway guides, and live services
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* 1. Search Trains */}
            <div
              onClick={() => navigate('/app/reserved')}
              className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-400 hover:shadow-md cursor-pointer transition flex flex-col items-start gap-2.5 group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition">
                  Search Trains
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Timings, fares & route seat matrix
                </p>
              </div>
            </div>

            {/* 2. PNR Status */}
            <div
              onClick={() => navigate('/app/pnr-status')}
              className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-orange-400 hover:shadow-md cursor-pointer transition flex flex-col items-start gap-2.5 group"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-orange-600 transition">
                  PNR Status
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Berth confirmation & charts
                </p>
              </div>
            </div>

            {/* 3. My Bookings */}
            <div
              onClick={() => navigate('/app/bookings')}
              className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-400 hover:shadow-md cursor-pointer transition flex flex-col items-start gap-2.5 group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition">
                <Ticket className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition">
                  My Bookings
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Reserved, UTS & Platform history
                </p>
              </div>
            </div>

            {/* 4. Cancel & Refund */}
            <div
              onClick={() => navigate('/app/refunds')}
              className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-red-400 hover:shadow-md cursor-pointer transition flex flex-col items-start gap-2.5 group"
            >
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-red-600 transition">
                  Cancel & Refund
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Rules, previews & instant credits
                </p>
              </div>
            </div>

            {/* 5. Train Route Info Modal */}
            <div
              onClick={() => setRouteInfoModalOpen(true)}
              className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-400 hover:shadow-md cursor-pointer transition flex flex-col items-start gap-2.5 group"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition">
                  Train Route Info
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Key stations, stops & distances
                </p>
              </div>
            </div>

            {/* 6. Coach & Class Info Modal */}
            <div
              onClick={() => setCoachInfoModalOpen(true)}
              className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-purple-400 hover:shadow-md cursor-pointer transition flex flex-col items-start gap-2.5 group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-purple-600 transition">
                  Coach & Class Info
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Guide to 1A, 2A, 3A, SL & 2S
                </p>
              </div>
            </div>

            {/* 7. Track Demo Train Simulator */}
            <div
              onClick={() => setTrackTrainModalOpen(true)}
              className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-teal-400 hover:shadow-md cursor-pointer transition flex flex-col items-start gap-2.5 group"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 transition">
                  Track Demo Train
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Simulate live running status
                </p>
              </div>
            </div>

            {/* 8. Help & Support */}
            <div
              onClick={() => navigate('/app/support')}
              className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-400 hover:shadow-md cursor-pointer transition flex flex-col items-start gap-2.5 group"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-slate-800 group-hover:text-white transition">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-slate-800 transition">
                  Help & Support
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  139 helpline & passenger FAQs
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Active & Recent Tickets Quick Bar */}
        <section className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Your Active & Recent Tickets</h3>
              <p className="text-xs text-slate-500">Quick access to upcoming journeys, UTS passes, and platform slips</p>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reserved')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'reserved' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Reserved ({upcomingJourneys.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('unreserved')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'unreserved' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Unreserved ({unreservedTickets.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('platform')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'platform' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Platform ({platformTickets.length})
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <div className="w-6 h-6 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-2" />
              <span className="text-xs">Loading ticket records…</span>
            </div>
          ) : (
            <div className="space-y-3">
              {/* If no tickets in chosen category */}
              {((activeTab === 'all' && upcomingJourneys.length === 0 && unreservedTickets.length === 0 && platformTickets.length === 0) ||
                (activeTab === 'reserved' && upcomingJourneys.length === 0) ||
                (activeTab === 'unreserved' && unreservedTickets.length === 0) ||
                (activeTab === 'platform' && platformTickets.length === 0)) && (
                <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                  <Ticket className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No active tickets found</p>
                  <p className="text-xs text-slate-400 mt-0.5">Use the Journey Planner above to book your next trip.</p>
                </div>
              )}

              {/* Reserved Journeys */}
              {(activeTab === 'all' || activeTab === 'reserved') &&
                upcomingJourneys.slice(0, 2).map((t, idx) => {
                  const passCount = t?.passengers?.length ?? (t as any)?.total_passengers ?? 1;
                  const totalFare = t?.fare_breakdown?.total_fare ?? (t as any)?.total_fare ?? 0;
                  const srcCode = t?.source_station_code || 'SRC';
                  const dstCode = t?.dest_station_code || 'DST';
                  const trNum = t?.train_number || 'N/A';
                  const trName = t?.train_name ? `— ${t.train_name}` : '';

                  return (
                    <div
                      key={t?.pnr_number || idx}
                      onClick={() => navigate(`/app/bookings`)}
                      className="p-4 rounded-2xl border border-blue-100 bg-blue-50/30 hover:bg-blue-50/70 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                          PNR
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-slate-900">{t?.pnr_number || 'PNR'}</span>
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              {t?.booking_status || 'CONFIRMED'}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">· Class {t?.class_code || 'SL'}</span>
                          </div>
                          <div className="text-xs font-semibold text-slate-800 mt-1">
                            {trNum} {trName}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {srcCode} → {dstCode} · Date: {t?.journey_date ? formatDate(t.journey_date) : 'Upcoming'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 text-xs font-semibold text-blue-700">
                        <span>{passCount} Passenger{passCount > 1 ? 's' : ''}</span>
                        <span className="font-mono text-slate-900">{formatINR(totalFare)}</span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  );
                })}

              {/* Unreserved Tickets */}
              {(activeTab === 'all' || activeTab === 'unreserved') &&
                unreservedTickets.slice(0, 2).map((u) => {
                  const passCount = u?.passenger_count ?? 1;
                  const fare = u?.total_fare ?? 0;
                  const trainType = u?.train_type ? u.train_type.replace('_', ' ') : 'ORDINARY';
                  const validStr = u?.valid_until
                    ? new Date(u.valid_until).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                    : '24 hours';

                  return (
                    <div
                      key={u.id}
                      onClick={() => navigate(`/app/bookings`)}
                      className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/30 hover:bg-emerald-50/70 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                          UTS
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-slate-900">{u.ticket_number}</span>
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              {u.booking_status}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">· {trainType}</span>
                          </div>
                          <div className="text-xs font-semibold text-slate-800 mt-1">
                            {u.source_name} ({u.source_code}) → {u.dest_name} ({u.dest_code})
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Valid until: {validStr}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 text-xs font-semibold text-emerald-700">
                        <span>{passCount} Passenger{passCount > 1 ? 's' : ''}</span>
                        <span className="font-mono text-slate-900">{formatINR(fare)}</span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  );
                })}

              {/* Platform Passes */}
              {(activeTab === 'all' || activeTab === 'platform') &&
                platformTickets.slice(0, 2).map((p) => {
                  const visitorCount = p?.ticket_count ?? 1;
                  const fare = p?.total_fare ?? 10;
                  const validStr = p?.valid_until
                    ? new Date(p.valid_until).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                    : '2 hours';

                  return (
                    <div
                      key={p.id}
                      onClick={() => navigate(`/app/bookings`)}
                      className="p-4 rounded-2xl border border-amber-100 bg-amber-50/30 hover:bg-amber-50/70 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                          PLT
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-slate-900">{p.ticket_number}</span>
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                              {p.booking_status}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">· Platform Entry</span>
                          </div>
                          <div className="text-xs font-semibold text-slate-800 mt-1">
                            Station: {p.station_name} ({p.station_code})
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Valid 2h window: {validStr}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 text-xs font-semibold text-amber-700">
                        <span>{visitorCount} Visitor{visitorCount > 1 ? 's' : ''}</span>
                        <span className="font-mono text-slate-900">{formatINR(fare)}</span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          <div className="pt-2 text-center">
            <Link
              to="/app/bookings"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800"
            >
              <span>View All Past & Upcoming Tickets in Detail</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      </main>

      {/* 6. MODAL: Train Route Info */}
      {routeInfoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Key Route Networks & Corridors</h3>
                  <p className="text-xs text-slate-500">Major Indian Railway corridors modelled in RailReserve</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRouteInfoModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-800 text-sm">North-South Trunk Route</div>
                <div className="text-slate-600 mt-1">
                  Connecting New Delhi (NDLS) ↔ Bengaluru (SBC) via Bhopal, Nagpur, and Secunderabad. Served by Karnataka Express (12627/12628) and Rajdhani.
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-800 text-sm">Western Trunk Route</div>
                <div className="text-slate-600 mt-1">
                  Connecting Mumbai Central (CSMT) ↔ New Delhi (NDLS) via Surat, Vadodara, and Kota. Served by Mumbai Rajdhani (12951/12952) and Paschim Express.
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-800 text-sm">Southern Deccan Corridor</div>
                <div className="text-slate-600 mt-1">
                  Connecting Bengaluru (SBC) ↔ Chennai Central (MAS) via Bangarapet and Katpadi. High-frequency Shatabdi & Vande Bharat corridor.
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-800 text-sm">Eastern Grand Trunk</div>
                <div className="text-slate-600 mt-1">
                  Connecting Howrah (HWH) ↔ New Delhi (NDLS) via Kanpur Central and Prayagraj.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setRouteInfoModalOpen(false);
                navigate('/app/reserved');
              }}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition"
            >
              Open Train Search to View Stoppages
            </button>
          </div>
        </div>
      )}

      {/* 7. MODAL: Coach & Class Info */}
      {coachInfoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Indian Railway Travel Classes</h3>
                  <p className="text-xs text-slate-500">Guide to amenities, berths, and fare structures</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCoachInfoModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl border border-purple-100 bg-purple-50/40">
                <div className="font-bold text-purple-900 text-sm">1A — AC First Class</div>
                <div className="text-slate-600 mt-1">
                  Private 2-berth coupes and 4-berth cabins with lockable doors, plush bedding, catered meals, and dedicated coach attendants.
                </div>
              </div>
              <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/40">
                <div className="font-bold text-blue-900 text-sm">2A — AC 2 Tier</div>
                <div className="text-slate-600 mt-1">
                  Air-conditioned 4 berths per bay (Lower & Upper) plus 2 side berths (Side Lower & Side Upper), curtains for privacy, reading lamps.
                </div>
              </div>
              <div className="p-3 rounded-xl border border-teal-100 bg-teal-50/40">
                <div className="font-bold text-teal-900 text-sm">3A — AC 3 Tier</div>
                <div className="text-slate-600 mt-1">
                  Air-conditioned 6 berths per bay (Lower, Middle, Upper) plus 2 side berths. Most popular long-distance air-conditioned travel class.
                </div>
              </div>
              <div className="p-3 rounded-xl border border-amber-100 bg-amber-50/40">
                <div className="font-bold text-amber-900 text-sm">SL — Sleeper Class</div>
                <div className="text-slate-600 mt-1">
                  Non-AC 6 berths per bay + 2 side berths with open windows. Economical long-distance travel option.
                </div>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                <div className="font-bold text-slate-900 text-sm">2S / General Unreserved</div>
                <div className="text-slate-600 mt-1">
                  Second class seating / unreserved general coach. No berth allocation. Ideal for short-to-medium distance day travel.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCoachInfoModalOpen(false)}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl text-xs transition"
            >
              Close Class Guide
            </button>
          </div>
        </div>
      )}

      {/* 8. MODAL: Track Demo Train Simulator */}
      {trackTrainModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Live Train Running Simulator</h3>
                  <p className="text-xs text-slate-500">Train 12951 — Mumbai Rajdhani Express</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTrackTrainModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <div className="text-[11px] font-bold text-teal-800 uppercase">Current Status</div>
                  <div className="text-sm font-black text-teal-900 mt-0.5">Departed Surat (ST) on time</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">Next Stop: Vadodara Junction (BRC) in 48 mins</div>
                </div>
                <span className="w-3 h-3 bg-teal-500 rounded-full animate-ping" />
              </div>

              {/* Stoppage tracker */}
              <div className="border border-slate-200 rounded-2xl p-4 space-y-3 text-xs">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="flex-1 flex justify-between">
                    <span className="font-semibold text-slate-800">Mumbai Central (CSMT)</span>
                    <span className="text-emerald-700 font-mono">17:00 (Dep)</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="flex-1 flex justify-between">
                    <span className="font-semibold text-slate-800">Surat (ST)</span>
                    <span className="text-emerald-700 font-mono">19:35 (Dep)</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="flex-1 flex justify-between">
                    <span className="font-semibold text-slate-800">Vadodara (BRC)</span>
                    <span className="text-amber-700 font-mono">21:05 (Expected)</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-slate-300 shrink-0" />
                  <div className="flex-1 flex justify-between">
                    <span className="text-slate-500">New Delhi (NDLS)</span>
                    <span className="text-slate-400 font-mono">08:35 (Next Day)</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setTrackTrainModalOpen(false)}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl text-xs transition"
            >
              Close Simulator
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Train className="w-4 h-4 text-orange-500" />
            <span className="font-semibold text-white">RailReserve</span>
            <span>· Academic Project Demonstration · Presidency University, Bengaluru</span>
          </div>
          <div>Course: Software Design and Development (CSE 2271) · Team 11</div>
        </div>
      </footer>
    </div>
  );
}
