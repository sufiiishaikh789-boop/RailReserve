import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Link, useLocation, Navigate } from 'react-router-dom';
import {
  Train, Search, Users, CreditCard, Ticket, Clock, MapPin,
  ChevronRight, AlertTriangle, CheckCircle, XCircle, Info,
  LogOut, LayoutDashboard, Printer, ArrowLeft,
  RefreshCw, Shield, ArrowRightLeft, Filter,
  IndianRupee, Navigation, Activity, ChevronDown, ChevronUp,
  FileText, UserCircle, Bell
} from 'lucide-react';
import { apiClient } from './api';
import type {
  Station, TrainResult, ClassAvailability, PassengerInput,
  ETicket, CancellationPreview, ClassCode
} from './types';
import {
  formatDate, formatTime, formatDuration, formatINR,
  getBookingStatusLabel, getPassengerStatusLabel,
  getMinDate, getMaxDate, generateIdempotencyKey
} from './utils';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { PassengerDashboardPage } from './pages/PassengerDashboardPage';
import { UnreservedBookingPage } from './pages/UnreservedBookingPage';
import { PlatformBookingPage } from './pages/PlatformBookingPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { PnrStatusPage } from './pages/PnrStatusPage';
import { RefundsPage } from './pages/RefundsPage';
import { SupportPage } from './pages/SupportPage';
import { ProfilePage } from './pages/ProfilePage';
import { PaymentPage } from './pages/PaymentPage';
import { ErrorBoundary } from './components/ErrorBoundary';

// ============================================================
// STATION AUTOCOMPLETE COMPONENT
// ============================================================
interface StationAutocompleteProps {
  value: string;
  displayValue: string;
  onSelect: (code: string, name: string) => void;
  placeholder?: string;
  label?: string;
  id?: string;
  icon?: React.ReactNode;
}

function StationAutocomplete({ value: _value, displayValue, onSelect, placeholder, label, id, icon }: StationAutocompleteProps) {
  const [query, setQuery] = useState(displayValue);
  const [results, setResults] = useState<Station[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync display when parent changes value externally
  useEffect(() => { setQuery(displayValue); }, [displayValue]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback((q: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (q.length < 1) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await apiClient.autocompleteStations(q);
        setResults(r.stations);
        setOpen(r.stations.length > 0);
        setActiveIdx(-1);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }, 180);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    search(e.target.value);
  };

  const handleSelect = (s: Station) => {
    setQuery(`${s.code} — ${s.city}`);
    onSelect(s.code, `${s.code} — ${s.city}`);
    setOpen(false);
    setResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); handleSelect(results[activeIdx]); }
    if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div ref={ref} className="autocomplete-wrapper">
      {label && <label className="input-label" htmlFor={id}>{label}</label>}
      <div style={{ position: 'relative' }}>
        <span className="autocomplete-icon" style={{ top: '50%', transform: 'translateY(-50%)', position: 'absolute', left: '0.75rem', zIndex: 1 }}>
          {icon || <MapPin size={16} />}
        </span>
        <input
          id={id}
          type="text"
          className="autocomplete-input"
          placeholder={placeholder || 'Search station…'}
          value={query}
          onChange={handleChange}
          onFocus={() => query.length > 0 && results.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        {loading && (
          <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}>
            <span className="spinner" style={{ width: '0.9rem', height: '0.9rem', borderWidth: '2px', color: '#94a3b8' }} />
          </span>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="autocomplete-dropdown">
          {results.map((s, i) => (
            <div
              key={s.id}
              className={`autocomplete-item ${i === activeIdx ? 'active' : ''}`}
              onMouseDown={() => handleSelect(s)}
            >
              <span className="autocomplete-code">{s.code}</span>
              <div>
                <div className="autocomplete-name">{s.city}</div>
                <div className="autocomplete-city">{s.name.replace(' (Demo)', '')} · {s.state}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// NAVBAR
// ============================================================
function Navbar() {
  const location = useLocation();
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken'));
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleAdminLogout = () => {
    localStorage.removeItem('adminToken');
    setAdminToken(null);
    navigate('/');
  };

  useEffect(() => {
    const onStorage = () => setAdminToken(localStorage.getItem('adminToken'));
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const isAuthPage = ['/login', '/register', '/forgot-password', '/reset-password'].includes(location.pathname);
  const isDashboardPage = location.pathname.startsWith('/app');

  if (isAuthPage || isDashboardPage) {
    return null;
  }

  return (
    <nav className="nav">
      <div className="container-wide" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.25rem' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', textDecoration: 'none' }}>
          <div style={{ background: 'linear-gradient(135deg,#f97316,#ef4444)', borderRadius: '10px', padding: '7px', display: 'flex' }}>
            <Train size={20} color="#fff" />
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em' }}>RailReserve</div>
            <div style={{ color: '#64748b', fontSize: '0.63rem', fontWeight: 500 }}>Team 11 · CSE 2271 Demo</div>
          </div>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Link to="/lookup" className="btn btn-ghost" style={{ color: '#94a3b8', fontSize: '0.83rem', padding: '0.4rem 0.75rem' }}>
            <Search size={14} /> PNR Lookup
          </Link>

          {/* Passenger auth nav */}
          {user ? (
            <>
              <Link to="/dashboard" className="btn btn-ghost" style={{ color: '#94a3b8', fontSize: '0.83rem', padding: '0.4rem 0.75rem' }}>
                <Bell size={14} />
                {(user.unread_notifications ?? 0) > 0 && (
                  <span style={{ background: '#ef4444', color: '#fff', borderRadius: '9999px', fontSize: '0.6rem', padding: '0 4px', marginLeft: '2px' }}>
                    {user.unread_notifications}
                  </span>
                )}
                {' '}Dashboard
              </Link>
              <Link to="/profile" className="btn btn-ghost" style={{ color: '#94a3b8', fontSize: '0.83rem', padding: '0.4rem 0.75rem' }}>
                <UserCircle size={14} /> {user.full_name.split(' ')[0]}
              </Link>
              <button onClick={() => { logout(); navigate('/'); }} className="btn btn-ghost" style={{ color: '#f87171', fontSize: '0.83rem', padding: '0.4rem 0.65rem' }}>
                <LogOut size={14} />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost" style={{ color: '#94a3b8', fontSize: '0.83rem', padding: '0.4rem 0.75rem' }}>
                Sign In
              </Link>
              <Link to="/register" className="btn btn-primary" style={{ fontSize: '0.83rem', padding: '0.4rem 0.9rem' }}>
                Register
              </Link>
            </>
          )}

          {/* Admin nav */}
          {adminToken ? (
            <>
              <Link to="/admin" className="btn btn-ghost" style={{ color: '#94a3b8', fontSize: '0.83rem', padding: '0.4rem 0.75rem' }}>
                <LayoutDashboard size={14} /> Admin
              </Link>
              <button onClick={handleAdminLogout} className="btn btn-ghost" style={{ color: '#f87171', fontSize: '0.83rem', padding: '0.4rem 0.65rem' }}>
                <LogOut size={14} />
              </button>
            </>
          ) : (
            <Link to="/admin/login" className="btn btn-ghost" style={{ color: '#64748b', fontSize: '0.83rem', padding: '0.4rem 0.75rem' }}>
              <Shield size={14} />
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

// ============================================================
// HOMEPAGE / SEARCH PAGE
// ============================================================
function SearchPage() {
  const [fromCode, setFromCode] = useState('');
  const [fromDisplay, setFromDisplay] = useState('');
  const [toCode, setToCode] = useState('');
  const [toDisplay, setToDisplay] = useState('');
  const [date, setDate] = useState('');
  const [passengers, setPassengers] = useState(1);
  const [travelClass, setTravelClass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  const handleSwap = () => {
    const tc = fromCode, td = fromDisplay;
    setFromCode(toCode); setFromDisplay(toDisplay);
    setToCode(tc); setToDisplay(td);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!fromCode || !toCode || !date) { setError('Please fill all required fields'); return; }
    if (fromCode === toCode) { setError('Source and destination cannot be the same'); return; }
    setLoading(true);
    try {
      const res = await apiClient.searchTrains(fromCode, toCode, date, undefined, travelClass || undefined);
      navigate('/results', { state: { results: res.trains, from: fromCode, to: toCode, date } });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const quickRoutes = [
    { from: 'SBC', fromD: 'SBC — Bengaluru', to: 'MAS', toD: 'MAS — Chennai',   label: 'Bengaluru → Chennai',   emoji: '🚄' },
    { from: 'SBC', fromD: 'SBC — Bengaluru', to: 'MYS', toD: 'MYS — Mysuru',    label: 'Bengaluru → Mysuru',    emoji: '🚆' },
    { from: 'MAS', fromD: 'MAS — Chennai',   to: 'TVC', toD: 'TVC — Trivandrum', label: 'Chennai → Trivandrum',  emoji: '🌴' },
    { from: 'SBC', fromD: 'SBC — Bengaluru', to: 'HYB', toD: 'HYB — Hyderabad', label: 'Bengaluru → Hyderabad', emoji: '🕌' },
    { from: 'ERS', fromD: 'ERS — Kochi',     to: 'NDLS',toD: 'NDLS — New Delhi', label: 'Kochi → Delhi',         emoji: '🏛️' },
    { from: 'CSTM',fromD:'CSTM — Mumbai',    to: 'PUNE',toD: 'PUNE — Pune',      label: 'Mumbai → Pune',         emoji: '🌆' },
  ];

  const features = [
    { icon: <Shield size={20} color="#2563eb" />, title: 'Zero Overbooking',    desc: 'ACID transactions prevent double-booking' },
    { icon: <RefreshCw size={20} color="#7c3aed" />, title: 'WL Promotion',     desc: 'FIFO waiting-list seat allocation' },
    { icon: <Ticket size={20} color="#ea580c" />, title: 'Instant E-Tickets',  desc: 'PNR + printable ticket on confirmation' },
    { icon: <Activity size={20} color="#16a34a" />, title: '55+ Stations',      desc: '22 demo trains across South & North India' },
  ];

  return (
    <div style={{ flex: 1 }}>
      {/* Hero */}
      <div className="bg-hero" style={{ padding: '3.5rem 1.25rem 6rem', position: 'relative' }}>
        <div className="container-main" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '2.25rem' }}>
            <div className="badge badge-demo" style={{ marginBottom: '1rem' }}>
              ⚠️ Academic Demonstration · Team 11 · CSE 2271
            </div>
            <h1 style={{ color: '#fff', fontSize: 'clamp(1.75rem,4vw,2.75rem)', fontWeight: 900, marginBottom: '0.65rem', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
              Book Train Tickets
              <span style={{ color: '#f97316' }}> Across India</span>
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '1rem', maxWidth: '440px', margin: '0 auto', lineHeight: 1.6 }}>
              Search 22 demo trains, 55 stations, real booking flows and e-tickets — all academic demonstration data.
            </p>
          </div>

          {/* Search Card */}
          <div className="glass-card" style={{ borderRadius: '20px', padding: '1.75rem 2rem' }}>
            <form onSubmit={handleSearch}>
              {/* Station selectors */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 48px 1fr', gap: '0.65rem', alignItems: 'end', marginBottom: '1rem' }}>
                <StationAutocomplete
                  id="from-station"
                  label="From Station"
                  placeholder="e.g. Bengaluru or SBC"
                  value={fromCode}
                  displayValue={fromDisplay}
                  icon={<Navigation size={15} />}
                  onSelect={(code, disp) => { setFromCode(code); setFromDisplay(disp); }}
                />
                <div style={{ paddingBottom: '0.05rem', display: 'flex', alignItems: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={handleSwap}
                    className="btn btn-outline"
                    style={{ padding: '0.7rem', borderRadius: '50%', width: '44px', height: '44px' }}
                    title="Swap stations"
                  >
                    <ArrowRightLeft size={16} />
                  </button>
                </div>
                <StationAutocomplete
                  id="to-station"
                  label="To Station"
                  placeholder="e.g. Chennai or MAS"
                  value={toCode}
                  displayValue={toDisplay}
                  icon={<MapPin size={15} />}
                  onSelect={(code, disp) => { setToCode(code); setToDisplay(disp); }}
                />
              </div>

              {/* Date + class + passengers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0.65rem', alignItems: 'end' }}>
                <div>
                  <label className="input-label" htmlFor="journey-date">Journey Date</label>
                  <input
                    id="journey-date"
                    type="date"
                    className="input"
                    value={date}
                    min={getMinDate()}
                    max={getMaxDate()}
                    onChange={e => setDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="input-label" htmlFor="travel-class">Travel Class</label>
                  <select id="travel-class" className="input" value={travelClass} onChange={e => setTravelClass(e.target.value)}>
                    <option value="">All Classes</option>
                    <option value="1A">1A — AC First Class</option>
                    <option value="2A">2A — AC 2 Tier</option>
                    <option value="3A">3A — AC 3 Tier</option>
                    <option value="SL">SL — Sleeper</option>
                    <option value="CC">CC — Chair Car</option>
                    <option value="2S">2S — Second Sitting</option>
                  </select>
                </div>
                <div>
                  <label className="input-label" htmlFor="passengers">Passengers</label>
                  <select id="passengers" className="input" value={passengers} onChange={e => setPassengers(Number(e.target.value))}>
                    {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} {n === 1 ? 'Adult' : 'Adults'}</option>)}
                  </select>
                </div>
                <button
                  type="submit"
                  className="btn btn-accent btn-lg pulse-accent"
                  disabled={loading}
                  style={{ padding: '0.72rem 2rem', whiteSpace: 'nowrap' }}
                >
                  {loading
                    ? <><span className="spinner" style={{ width: '1.1rem', height: '1.1rem', borderWidth: '2px' }} /> Searching…</>
                    : <><Search size={18} /> Search</>
                  }
                </button>
              </div>

              {error && (
                <div className="alert alert-danger" style={{ marginTop: '1rem' }}>
                  <AlertTriangle size={16} /> {error}
                </div>
              )}
            </form>

            {/* Quick routes */}
            <div style={{ marginTop: '1.25rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.65rem' }}>
                Popular Routes
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {quickRoutes.map(r => (
                  <button
                    key={r.label}
                    className="popular-route-card"
                    style={{ fontSize: '0.82rem', fontWeight: 500, color: '#374151' }}
                    onClick={() => {
                      setFromCode(r.from); setFromDisplay(r.fromD);
                      setToCode(r.to); setToDisplay(r.toD);
                    }}
                  >
                    <span style={{ fontSize: '1rem' }}>{r.emoji}</span>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="container-wide" style={{ padding: '2.5rem 1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '1rem' }}>
          {features.map(f => (
            <div key={f.title} className="card card-hover" style={{ padding: '1.35rem 1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '0.6rem', flexShrink: 0 }}>{f.icon}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem', color: '#0f172a' }}>{f.title}</div>
                <div style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// RESULTS PAGE
// ============================================================
function ResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { results: TrainResult[]; from: string; to: string; date: string } | null;

  const [trains, setTrains] = useState<TrainResult[]>(state?.results || []);
  const [sortBy, setSortBy] = useState<'time' | 'fare' | 'duration' | 'arrival'>('time');
  const [filterAvail, setFilterAvail] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!state) navigate('/'); }, [state, navigate]);

  // Re-query with filters
  const applyFilters = useCallback(async (sort: string, cls: string, avail: string) => {
    if (!state) return;
    setLoading(true);
    try {
      const res = await apiClient.searchTrains(state.from, state.to, state.date, sort, cls || undefined, avail || undefined);
      setTrains(res.trains);
    } catch { /* keep current */ }
    finally { setLoading(false); }
  }, [state]);

  useEffect(() => { applyFilters(sortBy, filterClass, filterAvail); }, [sortBy, filterClass, filterAvail]);

  if (!state) return null;

  return (
    <div style={{ flex: 1, background: 'var(--bg-page)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#0a0f1e,#0f2444)', padding: '1.25rem 1.25rem 1.5rem' }}>
        <div className="container-wide">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/')} className="btn btn-ghost" style={{ color: '#64748b', padding: '0.4rem 0.7rem', fontSize: '0.85rem' }}>
              <ArrowLeft size={15} /> Back
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.15rem' }}>
                {state.from} <span style={{ color: '#f97316' }}>→</span> {state.to}
              </div>
              <div style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '0.1rem' }}>
                {formatDate(state.date)} · {loading ? 'Searching…' : `${trains.length} train${trains.length !== 1 ? 's' : ''} found`}
              </div>
            </div>
            <Link to="/" className="btn btn-outline" style={{ fontSize: '0.82rem', color: '#94a3b8', borderColor: 'rgba(255,255,255,.15)' }}>
              <Search size={14} /> New Search
            </Link>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="container-wide" style={{ padding: '0.85rem 1.25rem' }}>
        <div className="filter-bar">
          <Filter size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '0.25rem' }}>
            Sort:
          </span>
          {(['time','fare','duration','arrival'] as const).map(s => (
            <button key={s} className={`filter-chip ${sortBy === s ? 'active' : ''}`} onClick={() => setSortBy(s)}>
              {s === 'time' ? '⏰ Departure' : s === 'fare' ? '₹ Fare' : s === 'duration' ? '⌚ Duration' : '🏁 Arrival'}
            </button>
          ))}
          <div style={{ width: '1px', background: '#e2e8f0', height: '20px', margin: '0 0.25rem' }} />
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '0.25rem' }}>
            Filter:
          </span>
          <button className={`filter-chip ${filterAvail === 'AVAILABLE' ? 'active' : ''}`}
            onClick={() => setFilterAvail(filterAvail === 'AVAILABLE' ? '' : 'AVAILABLE')}>
            ✅ Available
          </button>
          <button className={`filter-chip ${filterAvail === 'WL' ? 'active' : ''}`}
            onClick={() => setFilterAvail(filterAvail === 'WL' ? '' : 'WL')}>
            📋 Waitlist
          </button>
          <select className="filter-select" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
            <option value="">All Classes</option>
            {(['1A','2A','3A','SL','CC','2S'] as ClassCode[]).map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {(filterClass || filterAvail) && (
            <button className="filter-chip" style={{ color: '#dc2626', borderColor: 'rgba(220,38,38,.3)' }}
              onClick={() => { setFilterClass(''); setFilterAvail(''); }}>
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* Train list */}
      <div className="container-wide" style={{ padding: '0.5rem 1.25rem 2.5rem' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[1,2,3].map(i => (
              <div key={i} className="skeleton-card" style={{ height: '140px' }}>
                <div className="skeleton skeleton-line" style={{ width: '30%', marginBottom: '0.75rem' }} />
                <div className="skeleton skeleton-line" style={{ width: '60%', marginBottom: '0.5rem' }} />
                <div className="skeleton skeleton-line" style={{ width: '45%' }} />
              </div>
            ))}
          </div>
        ) : trains.length === 0 ? (
          <div className="card" style={{ padding: '3.5rem', textAlign: 'center' }}>
            <Train size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#374151', marginBottom: '0.5rem' }}>No trains found</div>
            <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              {filterClass || filterAvail
                ? 'No trains match the selected filters. Try clearing some filters.'
                : 'No trains operate on this route for the selected date.'}
            </div>
            {(filterClass || filterAvail) && (
              <button className="btn btn-outline" onClick={() => { setFilterClass(''); setFilterAvail(''); }} style={{ marginRight: '0.65rem' }}>
                Clear Filters
              </button>
            )}
            <button onClick={() => navigate('/')} className="btn btn-primary">Search Again</button>
          </div>
        ) : (
          <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {trains.map(train => (
              <TrainCard
                key={`${train.train_number}-${train.schedule_id}`}
                train={train}
                date={state.date}
                from={state.from}
                to={state.to}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Train card with stop timeline
function TrainCard({ train, date, from, to }: { train: TrainResult; date: string; from: string; to: string }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [stops, setStops] = useState<Array<{
    stop_sequence: number; station_code: string; station_name: string; city: string;
    arrival_time: string | null; departure_time: string | null; day_offset: number; distance_km: number;
  }>>([]);
  const [loadingStops, setLoadingStops] = useState(false);

  const cheapest = train.classes.reduce((a, b) => a.total_fare < b.total_fare ? a : b, train.classes[0]);
  const hasAvailable = train.classes.some(c => c.availability_status === 'AVAILABLE');

  const toggleExpand = async () => {
    if (!expanded && stops.length === 0) {
      setLoadingStops(true);
      try {
        const r = await apiClient.getTrainStops(train.train_id);
        setStops(r.stops);
      } catch { /* ignore */ }
      finally { setLoadingStops(false); }
    }
    setExpanded(!expanded);
  };

  const getTypeBadge = (type: string) => {
    if (type === 'SUPERFAST') return 'badge badge-superfast';
    if (type === 'MAIL') return 'badge badge-mail';
    if (type === 'EXPRESS') return 'badge badge-express';
    return 'badge badge-passenger';
  };

  return (
    <div className="train-card fade-in">
      <div className="train-card-header">
        {/* Train identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, minWidth: 0 }}>
          <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#2d5a8e)', borderRadius: '8px', padding: '0.4rem 0.5rem', flexShrink: 0 }}>
            <Train size={16} color="#fff" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1e3a5f', fontVariantNumeric: 'tabular-nums' }}>
                {train.train_number}
              </span>
              <span className={getTypeBadge(train.train_type)}>{train.train_type}</span>
            </div>
            <div style={{ color: '#475569', fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {train.train_name}
            </div>
          </div>
        </div>

        {/* Journey times */}
        <div className="train-route-row" style={{ flex: 2, justifyContent: 'center', marginBottom: 0 }}>
          <div style={{ textAlign: 'center' }}>
            <div className="train-time">{formatTime(train.departure_time)}</div>
            <div className="train-station-code">{from}</div>
          </div>
          <div className="train-duration-line">
            <div className="train-duration-label">{formatDuration(train.journey_duration_minutes)}</div>
            <div className="train-duration-bar" />
            {train.is_overnight && (
              <div style={{ fontSize: '0.65rem', color: '#7c3aed', fontWeight: 700, marginTop: '2px' }}>🌙 Overnight</div>
            )}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="train-time">{formatTime(train.arrival_time)}</div>
            <div className="train-station-code">
              {to}
              {train.arrival_day_offset > 0 && (
                <span style={{ color: '#7c3aed', marginLeft: '2px', fontWeight: 700 }}>+{train.arrival_day_offset}</span>
              )}
            </div>
          </div>
        </div>

        {/* Fare + actions */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8', textAlign: 'right' }}>Starts from</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#1e3a5f', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
              {formatINR(cheapest.total_fare)}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8', textAlign: 'right' }}>{train.distance_km} km</div>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              onClick={toggleExpand}
              className="btn btn-outline btn-sm"
              style={{ fontSize: '0.78rem' }}
            >
              {loadingStops ? <span className="spinner" style={{ width: '0.8rem', height: '0.8rem', borderWidth: '2px' }} />
                : expanded ? <><ChevronUp size={13} /> Hide</> : <><ChevronDown size={13} /> Details</>}
            </button>
            {hasAvailable && (
              <button
                onClick={toggleExpand}
                className="btn btn-accent btn-sm"
                style={{ fontSize: '0.78rem' }}
              >
                Book <ChevronRight size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded: class chips + stop timeline */}
      {expanded && (
        <div style={{ borderTop: '1px solid #f1f5f9', padding: '1rem 1.25rem 1.25rem' }} className="fade-in">
          {/* Class availability */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>
              Select Class & Book
            </div>
            <div className="class-chips">
              {train.classes.map(cls => {
                const avail = cls.availability_status;
                const chipClass = avail === 'AVAILABLE' ? 'available' : avail === 'WAITING_LIST' ? 'waiting' : 'unavailable';
                return (
                  <button
                    key={cls.class_code}
                    className={`class-chip ${chipClass}`}
                    disabled={avail === 'NOT_AVAILABLE'}
                    onClick={() => avail !== 'NOT_AVAILABLE' && navigate('/passenger', {
                      state: { train, selectedClass: cls, date, from, to }
                    })}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '2px' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.88rem' }}>{cls.class_code}</span>
                        <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>{cls.availability_label}</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', opacity: 0.8, marginBottom: '2px' }}>{cls.class_name}</div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{formatINR(cls.total_fare)}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Intermediate stops */}
          {stops.length > 0 && (
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
                Route ({stops.length} stops)
              </div>
              <div style={{ display: 'flex', overflowX: 'auto', gap: '0', paddingBottom: '4px' }}>
                {stops.map((s, i) => {
                  const isOrigin = s.station_code === from;
                  const isDest = s.station_code === to;
                  const isHighlighted = isOrigin || isDest;
                  const time = isOrigin ? s.departure_time : (i === stops.length - 1 ? s.arrival_time : (s.arrival_time || s.departure_time));
                  return (
                    <div key={s.stop_sequence} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{ textAlign: 'center', minWidth: '80px' }}>
                        <div style={{
                          width: 12, height: 12, borderRadius: '50%', margin: '0 auto 4px',
                          background: isOrigin ? '#f97316' : isDest ? '#1e3a5f' : '#e2e8f0',
                          border: isHighlighted ? `3px solid ${isOrigin ? '#f97316' : '#1e3a5f'}` : '2px solid #e2e8f0',
                          boxSizing: 'border-box'
                        }} />
                        <div style={{ fontSize: '0.7rem', fontWeight: isHighlighted ? 700 : 500, color: isHighlighted ? '#0f172a' : '#94a3b8' }}>
                          {s.station_code}
                        </div>
                        {time && <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{time}</div>}
                        {s.day_offset > 0 && <div style={{ fontSize: '0.6rem', color: '#7c3aed' }}>+{s.day_offset}d</div>}
                      </div>
                      {i < stops.length - 1 && (
                        <div style={{ width: '32px', height: '2px', background: 'linear-gradient(to right,#e2e8f0,#e2e8f0)', flexShrink: 0 }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// PASSENGER FORM PAGE
// ============================================================
function PassengerPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { train: TrainResult; selectedClass: ClassAvailability; date: string; from: string; to: string } | null;

  const [passengers, setPassengers] = useState<PassengerInput[]>([
    { passenger_name: '', age: '', gender: '', berth_preference: 'ANY' }
  ]);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => { if (!state) navigate('/'); }, [state, navigate]);
  if (!state) return null;

  const { train, selectedClass, date, from, to } = state;
  const isWL = selectedClass.availability_status === 'WAITING_LIST';

  const addPassenger = () => {
    if (passengers.length < 6) setPassengers([...passengers, { passenger_name: '', age: '', gender: '', berth_preference: 'ANY' }]);
  };
  const removePassenger = (i: number) => setPassengers(passengers.filter((_, idx) => idx !== i));
  const updatePassenger = (i: number, field: keyof PassengerInput, value: string | number) => {
    setPassengers(passengers.map((p, idx) => idx === i ? { ...p, [field]: value } : p));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    passengers.forEach((p, i) => {
      if (!p.passenger_name.trim()) e[`name_${i}`] = 'Name required';
      else if (!/^[A-Za-z\s.''-]{2,60}$/.test(p.passenger_name.trim())) e[`name_${i}`] = 'Letters only (2–60 chars)';
      if (p.age === '' || Number(p.age) < 1 || Number(p.age) > 120) e[`age_${i}`] = 'Age 1–120';
      if (!p.gender) e[`gender_${i}`] = 'Select gender';
    });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Valid email required';
    if (!/^[6-9]\d{9}$/.test(phone)) e.phone = '10-digit Indian mobile number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setApiError('');
    try {
      const res = await apiClient.createBooking({
        schedule_id: train.schedule_id,
        source_station_code: from,
        dest_station_code: to,
        class_code: selectedClass.class_code,
        passengers: passengers.map(p => ({ ...p, age: Number(p.age) })) as PassengerInput[],
        contact_email: email,
        contact_phone: phone,
        idempotency_key: generateIdempotencyKey(),
      });
      navigate('/payment', {
        state: {
          bookingId: res.booking_id,
          pnrNumber: res.pnr_number,
          fareBreakdown: res.fare_breakdown,
          isWaitingList: res.is_waiting_list,
          train, selectedClass, date, from, to,
          contactEmail: email, contactPhone: phone,
          passengers: passengers.map(p => ({ name: p.passenger_name, age: Number(p.age), gender: p.gender, berthPreference: p.berth_preference })),
        },
      });
    } catch (err) {
      setApiError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const reservationFee = 60;
  const superfastCharge = (train.train_type === 'SUPERFAST' || train.train_type === 'MAIL') ? 45 : 0;
  const totalFare = (selectedClass.base_fare + reservationFee + superfastCharge) * passengers.length;

  return (
    <div style={{ flex: 1, background: 'var(--bg-page)', padding: '2rem 1.25rem' }}>
      <div className="container-main">
        <StepBar current={3} />

        {/* Journey summary banner */}
        <div style={{ background: 'linear-gradient(135deg,#0f2444,#1e3a5f)', borderRadius: 'var(--r-lg)', padding: '1.1rem 1.5rem', marginBottom: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'center' }}>
          {[
            { label: 'Train', value: `${train.train_number} · ${train.train_name}` },
            { label: 'Route', value: `${from} → ${to} · ${formatTime(train.departure_time)}` },
            { label: 'Date', value: formatDate(date) },
            { label: 'Class', value: `${selectedClass.class_code} — ${selectedClass.class_name}` },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: '0.66rem', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '0.1rem' }}>{label}</div>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.88rem' }}>{value}</div>
            </div>
          ))}
          {isWL && <span className="badge badge-waiting" style={{ marginLeft: 'auto' }}>Waiting List Mode</span>}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Passenger details */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e3a5f', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={18} /> Passenger Details
              </h2>
              {passengers.length < 6 && (
                <button type="button" onClick={addPassenger} className="btn btn-outline btn-sm">
                  + Add Passenger
                </button>
              )}
            </div>

            {passengers.map((p, i) => (
              <div key={i} style={{ border: '1.5px solid var(--border)', borderRadius: 'var(--r-md)', padding: '1.1rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                  <div style={{ fontWeight: 700, color: '#1e3a5f', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div style={{ width: '22px', height: '22px', background: '#1e3a5f', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.72rem', fontWeight: 800 }}>{i + 1}</div>
                    Passenger {i + 1}
                  </div>
                  {i > 0 && <button type="button" onClick={() => removePassenger(i)} className="btn btn-xs" style={{ color: '#dc2626', background: 'rgba(220,38,38,.06)', border: '1px solid rgba(220,38,38,.2)' }}>✕ Remove</button>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0.65rem' }}>
                  <div>
                    <label className="input-label">Full Name *</label>
                    <input className={`input ${errors[`name_${i}`] ? 'input-error' : ''}`}
                      placeholder="e.g. Rahul Sharma"
                      value={p.passenger_name}
                      onChange={e => updatePassenger(i, 'passenger_name', e.target.value)} />
                    {errors[`name_${i}`] && <div className="field-error"><AlertTriangle size={11} />{errors[`name_${i}`]}</div>}
                  </div>
                  <div>
                    <label className="input-label">Age *</label>
                    <input type="number" className={`input ${errors[`age_${i}`] ? 'input-error' : ''}`}
                      placeholder="28" min={1} max={120}
                      value={p.age} onChange={e => updatePassenger(i, 'age', e.target.value)} />
                    {errors[`age_${i}`] && <div className="field-error"><AlertTriangle size={11} />{errors[`age_${i}`]}</div>}
                  </div>
                  <div>
                    <label className="input-label">Gender *</label>
                    <select className={`input ${errors[`gender_${i}`] ? 'input-error' : ''}`}
                      value={p.gender} onChange={e => updatePassenger(i, 'gender', e.target.value)}>
                      <option value="">Select</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="O">Other</option>
                    </select>
                    {errors[`gender_${i}`] && <div className="field-error"><AlertTriangle size={11} />{errors[`gender_${i}`]}</div>}
                  </div>
                  <div>
                    <label className="input-label">Berth Pref.</label>
                    <select className="input" value={p.berth_preference} onChange={e => updatePassenger(i, 'berth_preference', e.target.value)}>
                      <option value="ANY">Any</option>
                      <option value="LB">Lower</option>
                      <option value="MB">Middle</option>
                      <option value="UB">Upper</option>
                      <option value="SL">Side Lower</option>
                      <option value="SU">Side Upper</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Contact */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e3a5f', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={18} /> Contact Information
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label className="input-label" htmlFor="email">Email Address *</label>
                <input id="email" type="email" className={`input ${errors.email ? 'input-error' : ''}`}
                  placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                {errors.email && <div className="field-error"><AlertTriangle size={11} />{errors.email}</div>}
              </div>
              <div>
                <label className="input-label" htmlFor="phone">Mobile Number *</label>
                <input id="phone" type="tel" className={`input ${errors.phone ? 'input-error' : ''}`}
                  placeholder="9876543210" value={phone} onChange={e => setPhone(e.target.value)} />
                {errors.phone && <div className="field-error"><AlertTriangle size={11} />{errors.phone}</div>}
              </div>
            </div>
          </div>

          {/* Fare summary */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e3a5f', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <IndianRupee size={18} /> Fare Summary
            </h2>
            <div style={{ fontSize: '0.9rem' }}>
              {[
                { label: `Base fare (${selectedClass.class_code}) × ${passengers.length}`, amount: selectedClass.base_fare * passengers.length },
                { label: `Reservation fee × ${passengers.length}`, amount: reservationFee * passengers.length },
                ...(superfastCharge > 0 ? [{ label: `Superfast surcharge × ${passengers.length}`, amount: superfastCharge * passengers.length }] : []),
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', marginBottom: '0.4rem' }}>
                  <span>{row.label}</span><span>{formatINR(row.amount)}</span>
                </div>
              ))}
              <div style={{ borderTop: '2px solid var(--border)', paddingTop: '0.6rem', marginTop: '0.35rem', display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1.15rem', color: '#1e3a5f' }}>
                <span>Total Payable</span><span>{formatINR(totalFare)}</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.3rem', textAlign: 'right' }}>
                ⚠️ Demonstration fare — no real payment
              </div>
            </div>
          </div>

          {apiError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}><AlertTriangle size={16} /> {apiError}</div>}
          {isWL && (
            <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
              <AlertTriangle size={16} />
              <span><strong>Waiting List Booking:</strong> No confirmed seats available. Proceeding adds you to the FIFO waitlist. Seats are allocated as cancellations occur.</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" onClick={() => navigate(-1)} className="btn btn-outline">← Back</button>
            <button type="submit" className="btn btn-accent" disabled={loading} style={{ flex: 1 }}>
              {loading
                ? <><span className="spinner" style={{ width: '1.1rem', height: '1.1rem', borderWidth: '2px' }} /> Creating booking…</>
                : <><CreditCard size={18} /> Proceed to Payment ({formatINR(totalFare)})</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// TICKET PAGE
// ============================================================
function TicketPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { pnr: string; email: string } | null;

  const [ticket, setTicket] = useState<ETicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCancel, setShowCancel] = useState(false);

  useEffect(() => {
    if (!state?.pnr) { navigate('/'); return; }
    apiClient.getTicket(state.pnr, state.email)
      .then(r => setTicket(r.ticket))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen message="Loading your e-ticket…" />;
  if (error) return <ErrorScreen message={error} onBack={() => navigate('/')} />;
  if (!ticket) return null;

  const statusInfo = getBookingStatusLabel(ticket.booking_status);
  const isConfirmed = ticket.booking_status === 'CONFIRMED';
  const isWL = ticket.booking_status === 'WAITING_LIST';

  return (
    <div style={{ flex: 1, background: 'var(--bg-page)', padding: '2rem 1.25rem' }}>
      <div className="container-main">
        <StepBar current={5} />

        {/* Action bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.65rem' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e3a5f', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isConfirmed ? <CheckCircle size={22} color="#16a34a" /> : isWL ? <Clock size={22} color="#7c3aed" /> : <XCircle size={22} color="#dc2626" />}
            {isConfirmed ? 'Booking Confirmed!' : isWL ? 'On Waiting List' : `Booking ${ticket.booking_status}`}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }} className="no-print">
            <button onClick={() => window.print()} className="btn btn-outline btn-sm"><Printer size={14} /> Print</button>
            {(isConfirmed || isWL) && (
              <button onClick={() => setShowCancel(true)} className="btn btn-danger btn-sm">Cancel Ticket</button>
            )}
            <button onClick={() => navigate('/')} className="btn btn-primary btn-sm">New Search</button>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="alert alert-demo" style={{ marginBottom: '1rem', fontSize: '0.82rem' }}>
          <AlertTriangle size={14} /> {ticket.disclaimer}
        </div>

        {/* E-Ticket */}
        <div className="ticket slide-up">
          {/* Header */}
          <div className="ticket-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>PNR Number</div>
                <div style={{ fontSize: '1.7rem', fontWeight: 900, letterSpacing: '0.04em', color: '#f0f9ff', fontFamily: 'monospace' }}>
                  {ticket.pnr_number}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className={`badge ${statusInfo.className}`} style={{ fontSize: '0.8rem', padding: '0.3rem 0.85rem' }}>
                  {statusInfo.label}
                </span>
                {ticket.transaction_id && (
                  <div style={{ fontSize: '0.68rem', color: '#93c5fd', marginTop: '0.3rem' }}>TXN: {ticket.transaction_id}</div>
                )}
              </div>
            </div>

            {/* Journey */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#f0f9ff', fontVariantNumeric: 'tabular-nums' }}>
                  {ticket.departure_time !== 'See train schedule' ? formatTime(ticket.departure_time) : '—:—'}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#93c5fd', fontWeight: 700 }}>{ticket.source_station_code}</div>
                <div style={{ fontSize: '0.75rem', color: '#7dd3fc' }}>{ticket.train_number} · {ticket.train_name}</div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                <div style={{ width: '100%', height: '2px', background: 'linear-gradient(90deg,rgba(255,255,255,.2),rgba(255,255,255,.7),rgba(255,255,255,.2))', borderRadius: '1px' }} />
                <div style={{ fontSize: '0.72rem', color: '#93c5fd' }}>{ticket.class_code} · {ticket.class_name}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#f0f9ff', fontVariantNumeric: 'tabular-nums' }}>
                  {ticket.arrival_time !== 'See train schedule' ? formatTime(ticket.arrival_time) : '—:—'}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#93c5fd', fontWeight: 700 }}>{ticket.dest_station_code}</div>
                <div style={{ fontSize: '0.75rem', color: '#7dd3fc' }}>{formatDate(ticket.journey_date)}</div>
              </div>
            </div>
          </div>

          {/* Ticket body */}
          <div className="ticket-body">
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
              Passengers ({ticket.total_passengers})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {ticket.passengers.map((p, i) => {
                const ps = getPassengerStatusLabel(p.status);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', borderRadius: '8px', padding: '0.6rem 0.875rem', border: '1px solid var(--border)' }}>
                    <div>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{i + 1}. {p.passenger_name}</span>
                      <span style={{ color: '#64748b', fontSize: '0.82rem', marginLeft: '0.5rem' }}>{p.age}y · {p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : 'Other'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {p.allocated_seat && <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e3a5f', fontFamily: 'monospace' }}>{p.allocated_seat}</span>}
                      {p.wl_number && <span style={{ fontSize: '0.8rem', color: '#7c3aed', fontWeight: 600 }}>WL-{p.wl_number}</span>}
                      <span className={`badge ${ps.className}`}>{ps.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: ticket.qr_code ? '1fr auto 1fr' : '1fr 1fr', gap: '1.25rem', paddingTop: '1rem', borderTop: '1px dashed var(--border)', alignItems: 'center' }}>
              <div>
                <div className="ticket-label">Contact</div>
                <div className="ticket-value" style={{ fontSize: '0.85rem' }}>{ticket.contact_email}</div>
                <div style={{ color: '#475569', fontSize: '0.85rem' }}>{ticket.contact_phone}</div>
              </div>
              {ticket.qr_code && (
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <img src={ticket.qr_code} alt="Ticket QR Verification Code" style={{ width: '100px', height: '100px', borderRadius: '6px', border: '1px solid var(--border)', background: '#fff', padding: '3px' }} />
                  <span style={{ fontSize: '0.62rem', color: '#64748b', marginTop: '0.2rem', fontWeight: 700, letterSpacing: '0.05em' }}>VERIFY PNR</span>
                </div>
              )}
              <div style={{ textAlign: 'right' }}>
                <div className="ticket-label">Total Fare</div>
                <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#1e3a5f', fontVariantNumeric: 'tabular-nums' }}>
                  {formatINR(ticket.fare_breakdown.total_fare)}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  Booked {new Date(ticket.booked_at).toLocaleDateString('en-IN')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cancellation modal */}
        {showCancel && (
          <CancellationModal
            pnr={ticket.pnr_number}
            email={ticket.contact_email}
            onClose={() => setShowCancel(false)}
            onSuccess={() => { setShowCancel(false); navigate('/'); }}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================
// CANCELLATION MODAL
// ============================================================
function CancellationModal({ pnr, email, onClose, onSuccess }: { pnr: string; email: string; onClose: () => void; onSuccess: () => void }) {
  const [preview, setPreview] = useState<CancellationPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    apiClient.getCancellationPreview(pnr)
      .then(r => setPreview(r.preview))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await apiClient.cancelBooking(pnr, email);
      onSuccess();
    } catch (e) {
      setError((e as Error).message);
      setCancelling(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.25rem' }}>
      <div className="card scale-in" style={{ width: '100%', maxWidth: '440px', overflow: 'hidden' }}>
        <div style={{ background: '#dc2626', padding: '1.25rem 1.5rem', color: '#fff' }}>
          <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>Cancel Ticket</div>
          <div style={{ fontSize: '0.82rem', color: '#fecaca' }}>PNR: {pnr}</div>
        </div>
        <div style={{ padding: '1.5rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto', color: '#94a3b8' }} />
            </div>
          ) : error ? (
            <div className="alert alert-danger">{error}</div>
          ) : preview && !preview.is_eligible ? (
            <div className="alert alert-danger">{preview.ineligibility_reason}</div>
          ) : preview ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
                {[
                  { label: 'Journey Date', value: formatDate(preview.journey_date), color: '#374151' },
                  { label: 'Policy Applied', value: preview.policy_applied, color: '#1e40af', small: true },
                  { label: 'Original Fare', value: formatINR(preview.original_fare), color: '#374151' },
                  { label: 'Cancellation Charge', value: `−${formatINR(preview.cancellation_charge)}`, color: '#dc2626' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', color: row.color }}>
                    <span>{row.label}</span>
                    <span style={{ fontWeight: 600, fontSize: row.small ? '0.82rem' : undefined }}>{row.value}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 800, borderTop: '1px solid var(--border)', paddingTop: '0.5rem', marginTop: '0.25rem', fontSize: '1.05rem' }}>
                  <span>Refund ({preview.refund_percentage}%)</span>
                  <span>{formatINR(preview.refund_amount)}</span>
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', marginBottom: '1.25rem', padding: '0.75rem', background: '#fff7ed', borderRadius: 'var(--r-sm)', border: '1px solid rgba(249,115,22,.2)' }}>
                <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
                <span>I confirm cancellation and accept the refund amount of <strong>{formatINR(preview.refund_amount)}</strong></span>
              </label>
            </>
          ) : null}

          <div style={{ display: 'flex', gap: '0.65rem' }}>
            <button onClick={onClose} className="btn btn-outline" style={{ flex: 1 }}>Keep Ticket</button>
            <button onClick={handleCancel} className="btn btn-danger" style={{ flex: 1 }}
              disabled={!confirmed || cancelling || loading || !preview?.is_eligible}>
              {cancelling ? <span className="spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} /> : 'Confirm Cancellation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PNR LOOKUP PAGE
// ============================================================
function LookupPage() {
  const navigate = useNavigate();
  const [pnr, setPnr] = useState('PNR-DEMO01');
  const [email, setEmail] = useState('demo.passenger@example.com');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!pnr.trim()) { setError('PNR number is required'); return; }
    setLoading(true);
    try {
      await apiClient.getTicket(pnr.trim().toUpperCase(), email.trim() || undefined);
      navigate('/ticket', { state: { pnr: pnr.trim().toUpperCase(), email: email.trim() } });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.25rem', background: 'var(--bg-page)' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '4rem', height: '4rem', background: 'linear-gradient(135deg,#1e3a5f,#2d5a8e)', borderRadius: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Search size={22} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e3a5f', marginBottom: '0.4rem' }}>PNR Lookup</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Enter your PNR number to view ticket details</p>
        </div>

        <div className="card slide-up" style={{ padding: '1.75rem' }}>
          <form onSubmit={handleLookup}>
            <div style={{ marginBottom: '1rem' }}>
              <label className="input-label" htmlFor="pnr-input">PNR Number *</label>
              <input
                id="pnr-input"
                className="input"
                placeholder="e.g. PNR-DEMO01"
                value={pnr}
                onChange={e => setPnr(e.target.value)}
                style={{ fontFamily: 'monospace', fontSize: '1rem', letterSpacing: '0.05em' }}
              />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="input-label" htmlFor="email-input">Email (for verification)</label>
              <input id="email-input" type="email" className="input" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            {error && <div className="alert alert-danger" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}><AlertTriangle size={14} /> {error}</div>}
            <button type="submit" className="btn btn-primary btn-wide" disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} /> Searching…</> : <><Search size={16} /> Find Ticket</>}
            </button>
          </form>

          <div className="alert alert-info" style={{ marginTop: '1.25rem', fontSize: '0.8rem' }}>
            <Info size={14} />
            <span>Demo: PNR = <strong>PNR-DEMO01</strong>, Email = <strong>demo.passenger@example.com</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// BOOKING HISTORY PAGE
// ============================================================
function HistoryPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bookings, setBookings] = useState<ETicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Email is required'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await apiClient.getBookingHistory(email.trim(), phone.trim() || undefined);
      setBookings(res.bookings);
      setSearched(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ flex: 1, background: 'var(--bg-page)', padding: '2rem 1.25rem' }}>
      <div className="container-main">
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e3a5f', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={22} /> My Booking History
        </h1>

        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <form onSubmit={handleSearch} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.75rem', alignItems: 'end' }}>
            <div>
              <label className="input-label" htmlFor="h-email">Email Address *</label>
              <input id="h-email" type="email" className="input" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="input-label" htmlFor="h-phone">Mobile (optional)</label>
              <input id="h-phone" type="tel" className="input" placeholder="9876543210" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} /> : <><Search size={15} /> Find</>}
            </button>
          </form>
          {error && <div className="alert alert-danger" style={{ marginTop: '1rem', fontSize: '0.85rem' }}><AlertTriangle size={14} /> {error}</div>}
        </div>

        {searched && (
          bookings.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
              <Ticket size={40} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
              <div style={{ fontWeight: 700, color: '#374151', marginBottom: '0.5rem' }}>No bookings found</div>
              <div style={{ color: '#64748b', fontSize: '0.9rem' }}>No bookings are associated with this email address.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {bookings.map((b: any) => {
                const si = getBookingStatusLabel(b.booking_status);
                return (
                  <div key={b.pnr_number} className="card card-hover" style={{ padding: '1.1rem 1.35rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', cursor: 'pointer' }}
                    onClick={() => navigate('/ticket', { state: { pnr: b.pnr_number, email: b.contact_email } })}>
                    <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#1e3a5f', fontSize: '0.95rem', minWidth: '110px' }}>{b.pnr_number}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>{formatDate(b.journey_date)}</div>
                      <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{b.class_code} · {b.total_passengers} passenger{b.total_passengers > 1 ? 's' : ''}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, color: '#1e3a5f', fontSize: '1.05rem' }}>{formatINR(b.total_fare)}</div>
                      <span className={`badge ${si.className}`}>{si.label}</span>
                    </div>
                    <ChevronRight size={18} color="#94a3b8" />
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ============================================================
// ADMIN LOGIN
// ============================================================
function AdminLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (localStorage.getItem('adminToken')) navigate('/admin');
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiClient.adminLogin(username, password);
      localStorage.setItem('adminToken', res.token);
      window.dispatchEvent(new Event('storage'));
      navigate('/admin');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.25rem', background: 'var(--bg-page)' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '4rem', height: '4rem', background: 'linear-gradient(135deg,#1e3a5f,#2d5a8e)', borderRadius: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Shield size={22} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e3a5f' }}>Admin Portal</h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>JWT-protected administrator access</p>
        </div>

        <div className="card slide-up" style={{ padding: '1.75rem' }}>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1rem' }}>
              <label className="input-label" htmlFor="admin-user">Username</label>
              <input id="admin-user" className="input" value={username} onChange={e => setUsername(e.target.value)} required />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="input-label" htmlFor="admin-pass">Password</label>
              <input id="admin-pass" type="password" className="input" placeholder="PresidencyAdmin2026!" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && <div className="alert alert-danger" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}><AlertTriangle size={14} /> {error}</div>}
            <button type="submit" className="btn btn-primary btn-wide" disabled={loading} id="admin-login-btn">
              {loading ? <span className="spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} /> : <><Shield size={16} /> Sign In</>}
            </button>
          </form>
          <div className="alert alert-info" style={{ marginTop: '1.25rem', fontSize: '0.79rem' }}>
            <Info size={14} />
            <span>Demo: <strong>admin / PresidencyAdmin2026!</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ADMIN DASHBOARD
// ============================================================
function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<{ totalBookings: number; confirmedBookings: number; waitingList: number; cancelled: number; totalRevenue: number } | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'bookings' | 'trains'>('bookings');

  const token = localStorage.getItem('adminToken') || '';

  useEffect(() => {
    if (!token) { navigate('/admin/login'); return; }
    Promise.all([
      apiClient.getAdminDashboard(token),
      apiClient.getAdminBookings(token),
    ]).then(([dash, bk]) => {
      setStats(dash.stats);
      setBookings(bk.bookings as any[]);
    }).catch(e => {
      if (e.message.includes('Invalid') || e.message.includes('Unauthorized')) {
        localStorage.removeItem('adminToken');
        navigate('/admin/login');
      }
      setError(e.message);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen message="Loading dashboard…" />;
  if (error) return <ErrorScreen message={error} onBack={() => navigate('/')} />;

  const statCards = [
    { label: 'Total Bookings', value: stats?.totalBookings || 0, icon: <Ticket size={22} />, color: '#2563eb', bg: 'rgba(37,99,235,.1)' },
    { label: 'Confirmed', value: stats?.confirmedBookings || 0, icon: <CheckCircle size={22} />, color: '#16a34a', bg: 'rgba(22,163,74,.1)' },
    { label: 'Waiting List', value: stats?.waitingList || 0, icon: <Clock size={22} />, color: '#7c3aed', bg: 'rgba(124,58,237,.1)' },
    { label: 'Cancelled', value: stats?.cancelled || 0, icon: <XCircle size={22} />, color: '#dc2626', bg: 'rgba(220,38,38,.1)' },
    { label: 'Total Revenue', value: formatINR(stats?.totalRevenue || 0), icon: <IndianRupee size={22} />, color: '#f97316', bg: 'rgba(249,115,22,.1)' },
  ];

  return (
    <div style={{ flex: 1, background: 'var(--bg-page)', padding: '2rem 1.25rem' }}>
      <div className="container-wide">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e3a5f', margin: 0 }}>Admin Dashboard</h1>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>RailReserve v2.0 — Team 11 · CSE 2271 Demonstration System</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span className="badge badge-demo">⚠️ Demo Mode</span>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {statCards.map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon" style={{ background: s.bg }}>
                <span style={{ color: s.color }}>{s.icon}</span>
              </div>
              <div>
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          {(['bookings','trains'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`btn ${tab === t ? 'btn-primary' : 'btn-outline'} btn-sm`}>
              {t === 'bookings' ? <><Ticket size={13} /> Bookings</> : <><Train size={13} /> Trains</>}
            </button>
          ))}
        </div>

        {/* Bookings table */}
        {tab === 'bookings' && (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e3a5f', margin: 0 }}>Recent Bookings</h2>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{bookings.length} records shown</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                    {['PNR', 'Date', 'Route', 'Class', 'Pax', 'Fare', 'Status', 'Payment'].map(h => (
                      <th key={h} style={{ padding: '0.7rem 1rem', textAlign: 'left', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookings.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No bookings yet</td></tr>
                  ) : bookings.map((b: any, i: number) => {
                    const si = getBookingStatusLabel(b.booking_status);
                    return (
                      <tr key={i}
                        className="card-hover"
                        style={{ cursor: 'pointer', borderBottom: '1px solid #f8fafc' }}
                        onClick={() => navigate('/ticket', { state: { pnr: b.pnr_number, email: b.contact_email } })}>
                        <td style={{ padding: '0.7rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: '#1e3a5f', fontSize: '0.82rem' }}>{b.pnr_number}</td>
                        <td style={{ padding: '0.7rem 1rem', color: '#374151', whiteSpace: 'nowrap' }}>{b.journey_date}</td>
                        <td style={{ padding: '0.7rem 1rem', color: '#1e3a5f', fontWeight: 600, whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                          {b.source_station_code && b.dest_station_code ? `${b.source_station_code} → ${b.dest_station_code}` : '—'}
                        </td>
                        <td style={{ padding: '0.7rem 1rem' }}><span className="badge badge-confirmed">{b.class_code}</span></td>
                        <td style={{ padding: '0.7rem 1rem', color: '#374151' }}>{b.total_passengers}</td>
                        <td style={{ padding: '0.7rem 1rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{formatINR(b.total_fare)}</td>
                        <td style={{ padding: '0.7rem 1rem' }}><span className={`badge ${si.className}`}>{si.label}</span></td>
                        <td style={{ padding: '0.7rem 1rem' }}><span className={`badge ${b.payment_status === 'PAID' ? 'badge-confirmed' : 'badge-pending'}`}>{b.payment_status}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'trains' && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e3a5f', marginBottom: '1rem' }}>Demo Train Network</h2>
            <div className="alert alert-info" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
              <Info size={14} /> 42 demonstration trains · 55 stations · 1,470 schedules seeded for 35 days. All data is fictional for academic use only.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '0.65rem' }}>
              {[
                { num: 'D0001', name: 'Demo Rajdhani Superfast Express', type: 'SUPERFAST', route: 'SBC → NDLS (13 stops)' },
                { num: 'D0002', name: 'Demo Shatabdi Chair Car Express', type: 'SUPERFAST', route: 'SBC → MAS (4 stops)' },
                { num: 'D0007', name: 'Demo Garib Rath Express',          type: 'EXPRESS',   route: 'MAS → TVC (11 stops)' },
                { num: 'D0011', name: 'Demo Mangala Express',             type: 'EXPRESS',   route: 'TVC → NDLS (14 stops)' },
                { num: 'D0017', name: 'Demo Coromandel Express',          type: 'SUPERFAST', route: 'MAS → HWH (5 stops)' },
                { num: 'D0016', name: 'Demo Kerala Express',              type: 'SUPERFAST', route: 'NDLS → TVC (9 stops)' },
              ].map(t => (
                <div key={t.num} className="card" style={{ padding: '0.85rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e3a5f' }}>{t.num}</span>
                    <span className={t.type === 'SUPERFAST' ? 'badge badge-superfast' : 'badge badge-express'}>{t.type}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '0.15rem' }}>{t.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{t.route}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// STEP BAR
// ============================================================
function StepBar({ current }: { current: number }) {
  const steps = [
    { n: 1, label: 'Search', icon: <Search size={13} /> },
    { n: 2, label: 'Select', icon: <Train size={13} /> },
    { n: 3, label: 'Details', icon: <Users size={13} /> },
    { n: 4, label: 'Payment', icon: <CreditCard size={13} /> },
    { n: 5, label: 'Ticket', icon: <Ticket size={13} /> },
  ];
  return (
    <div className="stepper no-print" style={{ marginBottom: '1.75rem' }}>
      {steps.map((s, i) => (
        <React.Fragment key={s.n}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div className={`step-circle ${current === s.n ? 'active' : current > s.n ? 'done' : 'inactive'}`}>
              {current > s.n ? <CheckCircle size={13} /> : s.icon}
            </div>
            <span className={`step-label ${current === s.n ? 'active' : current > s.n ? 'done' : ''}`}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`step-connector ${current > s.n + 1 ? 'done' : current > s.n ? 'active' : ''}`} style={{ marginBottom: '18px' }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', padding: '4rem' }}>
      <div className="spinner" style={{ width: '2.5rem', height: '2.5rem', borderWidth: '3px', color: '#1e3a5f' }} />
      <div style={{ color: '#64748b', fontWeight: 500, fontSize: '0.95rem' }}>{message}</div>
    </div>
  );
}

function ErrorScreen({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 1.25rem' }}>
      <div className="card" style={{ padding: '2.5rem', textAlign: 'center', maxWidth: '400px' }}>
        <XCircle size={40} color="#dc2626" style={{ marginBottom: '1rem' }} />
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e3a5f', marginBottom: '0.5rem' }}>Something went wrong</div>
        <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{message}</div>
        <button onClick={onBack} className="btn btn-primary">Go Home</button>
      </div>
    </div>
  );
}

// ============================================================
// AUTH GUARDS & ROUTE WRAPPERS
// ============================================================
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 rounded-2xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center mb-3 animate-pulse">
          <Train className="w-6 h-6 text-orange-400" />
        </div>
        <p className="text-xs font-semibold text-slate-300">Restoring RailReserve session…</p>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

function PublicAuthRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (token) {
    return <Navigate to="/app" replace />;
  }
  return <>{children}</>;
}

function RootGateway() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (token) {
    return <Navigate to="/app" replace />;
  }
  return <Navigate to="/login" replace />;
}

function AppShell() {
  const location = useLocation();
  const isAuthPage = ['/login', '/register', '/forgot-password', '/reset-password'].includes(location.pathname);
  const isDashboardPage = location.pathname.startsWith('/app');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {!isAuthPage && !isDashboardPage && (
        <div style={{
          background: 'linear-gradient(135deg,#7c2d12,#9a3412)',
          color: '#fed7aa',
          fontSize: '0.72rem',
          fontWeight: 600,
          letterSpacing: '0.04em',
          padding: '0.35rem 1.25rem',
          textAlign: 'center',
        }}>
          ⚠️ ACADEMIC DEMONSTRATION SYSTEM — TEAM 11 — CSE 2271 — PRESIDENCY UNIVERSITY, BENGALURU — ALL DATA IS FICTIONAL
        </div>
      )}
      <Navbar />
      <ErrorBoundary>
        <Routes>
          {/* Root Gateway — redirects unauthenticated users to /login, authenticated to /app */}
          <Route path="/" element={<RootGateway />} />

          {/* Passenger Authentication Routes */}
          <Route path="/login" element={<PublicAuthRoute><LoginPage /></PublicAuthRoute>} />
          <Route path="/register" element={<PublicAuthRoute><RegisterPage /></PublicAuthRoute>} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Passenger App & Category Dashboard Routes */}
          <Route path="/app" element={<ProtectedRoute><PassengerDashboardPage /></ProtectedRoute>} />
          <Route path="/app/reserved" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
          <Route path="/app/unreserved" element={<ProtectedRoute><UnreservedBookingPage /></ProtectedRoute>} />
          <Route path="/app/platform" element={<ProtectedRoute><PlatformBookingPage /></ProtectedRoute>} />
          <Route path="/app/bookings" element={<ProtectedRoute><MyBookingsPage /></ProtectedRoute>} />
          <Route path="/app/pnr-status" element={<ProtectedRoute><PnrStatusPage /></ProtectedRoute>} />
          <Route path="/app/refunds" element={<ProtectedRoute><RefundsPage /></ProtectedRoute>} />
          <Route path="/app/support" element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />
          <Route path="/app/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/app/dashboard" element={<Navigate to="/app" replace />} />
          <Route path="/dashboard" element={<Navigate to="/app" replace />} />

          {/* Booking Engine & Journey Flow */}
          <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
          <Route path="/results" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
          <Route path="/passenger" element={<ProtectedRoute><PassengerPage /></ProtectedRoute>} />
          <Route path="/payment" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
          <Route path="/ticket" element={<TicketPage />} />
          <Route path="/lookup" element={<LookupPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

          {/* Admin Portal */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<AdminDashboard />} />

          {/* 404 Fallback */}
          <Route path="*" element={
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', padding: '4rem 1.25rem' }}>
              <Train size={48} color="#cbd5e1" />
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#374151' }}>Page Not Found</div>
              <Link to="/app" className="btn btn-primary">Go to Home Dashboard</Link>
            </div>
          } />
        </Routes>
      </ErrorBoundary>

      {!isAuthPage && !isDashboardPage && (
        <footer style={{ background: '#0a0f1e', color: '#64748b', padding: '1.5rem 1.25rem', fontSize: '0.78rem', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,.05)' }}>
          <div style={{ marginBottom: '0.35rem' }}>
            <span style={{ color: '#f97316', fontWeight: 700 }}>RailReserve</span> — Team 11 · Software Design and Development · CSE 2271 · Presidency University, Bengaluru
          </div>
          <div>⚠️ Academic demonstration only. All train schedules, seat availability, and booking data are fictional.</div>
        </footer>
      )}
    </div>
  );
}

// ============================================================
// APP ROOT
// ============================================================
export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
