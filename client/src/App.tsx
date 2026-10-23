import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Train, Search, Users, CreditCard, Ticket, Clock, MapPin,
  ChevronRight, AlertTriangle, CheckCircle, XCircle, Info,
  LogOut, LayoutDashboard, Settings, Printer, ArrowLeft,
  RefreshCw, Shield, Moon
} from 'lucide-react';
import { apiClient } from './api';
import type {
  Station, TrainResult, ClassAvailability, PassengerInput,
  FareBreakdown, ETicket, CancellationPreview, ClassCode
} from './types';
import {
  formatDate, formatTime, formatDuration, formatINR,
  getBookingStatusLabel, getPassengerStatusLabel, getTrainTypeBadge,
  getMinDate, getMaxDate, generateIdempotencyKey, classCodeColor
} from './utils';

// ============================================================
// NAVIGATION COMPONENT
// ============================================================
function Navbar() {
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken'));
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

  return (
    <nav className="nav">
      <div className="container-wide" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.25rem' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', textDecoration: 'none' }}>
          <div style={{ background: 'linear-gradient(135deg,#f97316,#ef4444)', borderRadius: '10px', padding: '7px', display: 'flex' }}>
            <Train size={20} color="#fff" />
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em' }}>RailReserve</div>
            <div style={{ color: '#93c5fd', fontSize: '0.65rem', fontWeight: 500 }}>Team 11 · CSE 2271 Demo</div>
          </div>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Link to="/lookup" className="btn btn-ghost" style={{ color: '#cbd5e1', fontSize: '0.85rem', padding: '0.45rem 0.85rem' }}>
            <Search size={15} /> PNR Lookup
          </Link>
          {adminToken ? (
            <>
              <Link to="/admin" className="btn btn-ghost" style={{ color: '#cbd5e1', fontSize: '0.85rem', padding: '0.45rem 0.85rem' }}>
                <LayoutDashboard size={15} /> Admin
              </Link>
              <button onClick={handleAdminLogout} className="btn btn-ghost" style={{ color: '#f87171', fontSize: '0.85rem', padding: '0.45rem 0.85rem' }}>
                <LogOut size={15} />
              </button>
            </>
          ) : (
            <Link to="/admin/login" className="btn btn-ghost" style={{ color: '#cbd5e1', fontSize: '0.85rem', padding: '0.45rem 0.85rem' }}>
              <Shield size={15} /> Admin
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

// ============================================================
// SEARCH PAGE (Step 1)
// ============================================================
function SearchPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    apiClient.getStations().then(r => setStations(r.stations)).catch(() => {});
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  const handleSwap = () => { const t = from; setFrom(to); setTo(t); };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!from || !to || !date) { setError('Please fill all fields'); return; }
    if (from === to) { setError('Source and destination cannot be the same'); return; }
    setLoading(true);
    try {
      const res = await apiClient.searchTrains(from, to, date);
      navigate('/results', { state: { results: res.trains, from, to, date } });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const quickRoutes = [
    { from: 'SBC', to: 'MAS', label: 'Bengaluru → Chennai' },
    { from: 'SBC', to: 'MYS', label: 'Bengaluru → Mysuru' },
    { from: 'SBC', to: 'HYB', label: 'Bengaluru → Hyderabad' },
    { from: 'MAS', to: 'TVC', label: 'Chennai → Trivandrum' },
  ];

  return (
    <div style={{ flex: 1 }}>
      {/* Hero */}
      <div className="bg-hero" style={{ padding: '3.5rem 1.25rem 5rem' }}>
        <div className="container-main">
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div className="badge badge-superfast" style={{ marginBottom: '1rem', fontSize: '0.75rem' }}>
              ⚠️ Academic Demonstration · Team 11 · CSE 2271
            </div>
            <h1 style={{ color: '#fff', fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
              Book Train Tickets
              <span style={{ color: '#60a5fa' }}> Instantly</span>
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '1.05rem', maxWidth: '460px', margin: '0 auto' }}>
              Fictional railway reservation demo — search, book, cancel, and manage tickets.
            </p>
          </div>

          {/* Search Box */}
          <div className="card slide-up" style={{ padding: '1.75rem' }}>
            <form onSubmit={handleSearch}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.75rem', alignItems: 'end', marginBottom: '1rem' }}>
                <div>
                  <label className="input-label">From Station</label>
                  <select className="input" value={from} onChange={e => setFrom(e.target.value)} required>
                    <option value="">Select departure</option>
                    {stations.map(s => (
                      <option key={s.code} value={s.code}>{s.code} — {s.city}</option>
                    ))}
                  </select>
                </div>
                <div style={{ paddingBottom: '0.1rem' }}>
                  <button type="button" onClick={handleSwap} className="btn btn-outline" style={{ padding: '0.65rem', borderRadius: '50%' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M8 3L4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4"/>
                    </svg>
                  </button>
                </div>
                <div>
                  <label className="input-label">To Station</label>
                  <select className="input" value={to} onChange={e => setTo(e.target.value)} required>
                    <option value="">Select destination</option>
                    {stations.map(s => (
                      <option key={s.code} value={s.code}>{s.code} — {s.city}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', alignItems: 'end' }}>
                <div>
                  <label className="input-label">Journey Date</label>
                  <input
                    type="date" className="input" value={date}
                    min={getMinDate()} max={getMaxDate()}
                    onChange={e => setDate(e.target.value)} required
                  />
                </div>
                <button type="submit" className="btn btn-accent pulse-accent" disabled={loading}
                  style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}>
                  {loading ? <><span className="spinner" style={{ width: '1.1rem', height: '1.1rem', borderWidth: '2px' }} /> Searching…</> : <><Search size={18} /> Search Trains</>}
                </button>
              </div>

              {error && (
                <div className="alert alert-danger" style={{ marginTop: '1rem' }}>
                  <AlertTriangle size={16} /> {error}
                </div>
              )}
            </form>
          </div>

          {/* Quick routes */}
          <div style={{ marginTop: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
            {quickRoutes.map(r => (
              <button key={r.label} className="btn glass" style={{ color: '#cbd5e1', fontSize: '0.82rem', padding: '0.4rem 0.9rem' }}
                onClick={() => { setFrom(r.from); setTo(r.to); }}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="container-wide" style={{ padding: '3rem 1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1.25rem' }}>
          {[
            { icon: <Shield size={22} color="#2563eb" />, title: 'ACID Transactions', desc: 'Zero-overbooking guarantee with SQLite BEGIN IMMEDIATE' },
            { icon: <Users size={22} color="#16a34a" />, title: 'Multi-Passenger', desc: 'Book for up to 6 passengers per transaction' },
            { icon: <RefreshCw size={22} color="#7c3aed" />, title: 'WL Promotion', desc: 'Automatic FIFO waiting-list seat promotion' },
            { icon: <Ticket size={22} color="#ea580c" />, title: 'Digital E-Ticket', desc: 'Instant PNR generation with printable ticket' },
          ].map(f => (
            <div key={f.title} className="card" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ background: '#f8fafc', borderRadius: '0.75rem', padding: '0.6rem', flexShrink: 0 }}>{f.icon}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem' }}>{f.title}</div>
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
// RESULTS PAGE (Step 2)
// ============================================================
function ResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { results: TrainResult[]; from: string; to: string; date: string } | null;

  const [trains, setTrains] = useState<TrainResult[]>(state?.results || []);
  const [sortBy, setSortBy] = useState<'time' | 'fare' | 'duration'>('time');

  useEffect(() => {
    if (!state) navigate('/');
  }, [state, navigate]);

  const sorted = [...trains].sort((a, b) => {
    if (sortBy === 'fare') {
      const fa = Math.min(...a.classes.map(c => c.total_fare));
      const fb = Math.min(...b.classes.map(c => c.total_fare));
      return fa - fb;
    }
    if (sortBy === 'duration') return a.journey_duration_minutes - b.journey_duration_minutes;
    return a.departure_time.localeCompare(b.departure_time);
  });

  if (!state) return null;

  return (
    <div style={{ flex: 1 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#0f172a,#1e3a5f)', padding: '1.5rem 1.25rem' }}>
        <div className="container-main">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/')} className="btn btn-ghost" style={{ color: '#94a3b8', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>
              <ArrowLeft size={16} /> Back
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>
                {state.from} → {state.to}
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.82rem' }}>{formatDate(state.date)} · {trains.length} train{trains.length !== 1 ? 's' : ''} found</div>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
              {(['time', 'fare', 'duration'] as const).map(s => (
                <button key={s} onClick={() => setSortBy(s)} className="btn"
                  style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', fontWeight: 600,
                    background: sortBy === s ? '#2563eb' : 'rgba(255,255,255,0.08)',
                    color: sortBy === s ? '#fff' : '#94a3b8', borderRadius: '9999px' }}>
                  {s === 'time' ? 'Time' : s === 'fare' ? 'Fare' : 'Duration'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Train cards */}
      <div className="container-main" style={{ padding: '1.5rem 1.25rem' }}>
        {sorted.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <Train size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>No trains found</div>
            <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>No trains operate on this route for the selected date.</div>
            <button onClick={() => navigate('/')} className="btn btn-primary">Search Again</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {sorted.map(train => (
              <TrainCard key={`${train.train_number}-${train.schedule_id}`} train={train} date={state.date}
                from={state.from} to={state.to} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TrainCard({ train, date, from, to }: { train: TrainResult; date: string; from: string; to: string }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const availableClasses = train.classes.filter(c => c.availability_status !== 'NOT_AVAILABLE');
  const cheapest = train.classes.reduce((a, b) => a.total_fare < b.total_fare ? a : b, train.classes[0]);

  return (
    <div className="train-card">
      {/* Header row */}
      <div style={{ padding: '1.25rem 1.5rem', display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', gap: '1rem', alignItems: 'center' }}>
        {/* Train info */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span style={{ fontWeight: 800, fontSize: '1rem', color: '#1e3a5f' }}>{train.train_number}</span>
            <span className={getTrainTypeBadge(train.train_type)}>{train.train_type}</span>
          </div>
          <div style={{ color: '#374151', fontSize: '0.88rem', fontWeight: 500 }}>{train.train_name}</div>
        </div>

        {/* Journey timeline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>{formatTime(train.departure_time)}</div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>{from}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1rem' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{formatDuration(train.journey_duration_minutes)}</div>
            <div style={{ width: '80px', height: '2px', background: 'linear-gradient(90deg,#2563eb,#60a5fa)', borderRadius: '2px', position: 'relative' }}>
              <div style={{ position: 'absolute', right: 0, top: '-5px', width: '6px', height: '6px', borderRadius: '50%', background: '#60a5fa' }} />
            </div>
            {train.is_overnight && <div style={{ fontSize: '0.65rem', color: '#7c3aed', fontWeight: 600 }}>🌙 Overnight</div>}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>{formatTime(train.arrival_time)}</div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>{to}{train.arrival_day_offset > 0 ? <span style={{ color: '#7c3aed', marginLeft: '2px' }}>+{train.arrival_day_offset}</span> : ''}</div>
          </div>
        </div>

        {/* Fare summary */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.1rem' }}>Starts from</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e3a5f' }}>{formatINR(cheapest.total_fare)}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{train.distance_km} km</div>
        </div>

        {/* Expand button */}
        <button onClick={() => setExpanded(!expanded)} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
          Book <ChevronRight size={16} style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
      </div>

      {/* Class availability (expanded) */}
      {expanded && (
        <div style={{ padding: '0 1.5rem 1.25rem', borderTop: '1px solid #f1f5f9' }} className="fade-in">
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Select Class
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: '0.65rem' }}>
            {train.classes.map(cls => {
              const cc = classCodeColor(cls.class_code);
              const unavail = cls.availability_status === 'NOT_AVAILABLE';
              return (
                <button key={cls.class_code}
                  className={`class-chip ${unavail ? 'unavailable' : ''}`}
                  disabled={unavail}
                  onClick={() => !unavail && navigate('/passenger', { state: { train, selectedClass: cls, date, from, to } })}
                  style={{ background: unavail ? '#f8fafc' : cc.bg }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: cc.text }}>{cls.class_code}</span>
                    <span className={`badge ${cls.availability_status === 'AVAILABLE' ? 'badge-available' : cls.availability_status === 'WAITING_LIST' ? 'badge-wl' : 'badge-unavail'}`}>
                      {cls.availability_label}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.2rem' }}>{cls.class_name}</div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>{formatINR(cls.total_fare)}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// PASSENGER FORM PAGE (Step 3)
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
      else if (!/^[A-Za-z\s.'-]{2,60}$/.test(p.passenger_name.trim())) e[`name_${i}`] = 'Letters only (2-60 chars)';
      if (p.age === '' || Number(p.age) < 1 || Number(p.age) > 120) e[`age_${i}`] = 'Age 1–120';
      if (!p.gender) e[`gender_${i}`] = 'Select gender';
    });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Valid email required';
    if (!/^[6-9]\d{9}$/.test(phone)) e.phone = '10-digit mobile (6-9...)';
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
        },
      });
    } catch (err) {
      setApiError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const totalFare = selectedClass.total_fare * passengers.length + 60 * passengers.length + (train.train_type === 'SUPERFAST' ? 45 * passengers.length : 0);

  return (
    <div style={{ flex: 1, background: '#f8fafc', padding: '2rem 1.25rem' }}>
      <div className="container-main">
        {/* Progress */}
        <StepBar current={3} />

        {/* Journey summary */}
        <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem', background: 'linear-gradient(135deg,#1e3a5f,#0c4a6e)', color: '#fff' }}>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#93c5fd', marginBottom: '0.1rem', textTransform: 'uppercase', fontWeight: 600 }}>Train</div>
              <div style={{ fontWeight: 700 }}>{train.train_number} · {train.train_name}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#93c5fd', marginBottom: '0.1rem', textTransform: 'uppercase', fontWeight: 600 }}>Route</div>
              <div style={{ fontWeight: 700 }}>{from} → {to} · {formatTime(train.departure_time)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#93c5fd', marginBottom: '0.1rem', textTransform: 'uppercase', fontWeight: 600 }}>Date</div>
              <div style={{ fontWeight: 700 }}>{formatDate(date)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#93c5fd', marginBottom: '0.1rem', textTransform: 'uppercase', fontWeight: 600 }}>Class</div>
              <div style={{ fontWeight: 700 }}>{selectedClass.class_code} · {selectedClass.class_name}</div>
            </div>
            {isWL && <span className="badge badge-wl" style={{ marginLeft: 'auto' }}>Waiting List Mode</span>}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Passengers */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e3a5f', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={18} /> Passenger Details
              </h2>
              {passengers.length < 6 && (
                <button type="button" onClick={addPassenger} className="btn btn-outline" style={{ fontSize: '0.82rem', padding: '0.35rem 0.85rem' }}>
                  + Add Passenger
                </button>
              )}
            </div>

            {passengers.map((p, i) => (
              <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
                  <div style={{ fontWeight: 600, color: '#374151', fontSize: '0.88rem' }}>Passenger {i + 1}</div>
                  {i > 0 && <button type="button" onClick={() => removePassenger(i)} className="btn btn-ghost" style={{ color: '#dc2626', fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}>Remove</button>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="input-label">Full Name</label>
                    <input className={`input ${errors[`name_${i}`] ? 'error' : ''}`} placeholder="e.g. Rahul Sharma" value={p.passenger_name} onChange={e => updatePassenger(i, 'passenger_name', e.target.value)} />
                    {errors[`name_${i}`] && <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.2rem' }}>{errors[`name_${i}`]}</div>}
                  </div>
                  <div>
                    <label className="input-label">Age</label>
                    <input type="number" className={`input ${errors[`age_${i}`] ? 'error' : ''}`} placeholder="25" min={1} max={120} value={p.age} onChange={e => updatePassenger(i, 'age', e.target.value)} />
                    {errors[`age_${i}`] && <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.2rem' }}>{errors[`age_${i}`]}</div>}
                  </div>
                  <div>
                    <label className="input-label">Gender</label>
                    <select className={`input ${errors[`gender_${i}`] ? 'error' : ''}`} value={p.gender} onChange={e => updatePassenger(i, 'gender', e.target.value)}>
                      <option value="">Select</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="O">Other</option>
                    </select>
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
                <label className="input-label">Email Address</label>
                <input type="email" className={`input ${errors.email ? 'error' : ''}`} placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                {errors.email && <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.2rem' }}>{errors.email}</div>}
              </div>
              <div>
                <label className="input-label">Mobile Number</label>
                <input type="tel" className={`input ${errors.phone ? 'error' : ''}`} placeholder="9876543210" value={phone} onChange={e => setPhone(e.target.value)} />
                {errors.phone && <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.2rem' }}>{errors.phone}</div>}
              </div>
            </div>
          </div>

          {/* Fare summary */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e3a5f', marginBottom: '1rem' }}>Fare Summary</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#374151' }}>
                <span>Base fare ({selectedClass.class_code}) × {passengers.length}</span>
                <span>{formatINR(selectedClass.base_fare * passengers.length)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#374151' }}>
                <span>Reservation fee × {passengers.length}</span>
                <span>{formatINR(60 * passengers.length)}</span>
              </div>
              {train.train_type === 'SUPERFAST' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#374151' }}>
                  <span>Superfast surcharge × {passengers.length}</span>
                  <span>{formatINR(45 * passengers.length)}</span>
                </div>
              )}
              <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>
                <span>Total</span>
                <span style={{ color: '#1e3a5f' }}>{formatINR(totalFare)}</span>
              </div>
            </div>
          </div>

          {apiError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}><AlertTriangle size={16} /> {apiError}</div>}
          {isWL && <div className="alert alert-warning" style={{ marginBottom: '1rem' }}><AlertTriangle size={16} /> <span><strong>Waiting List:</strong> Seats are unavailable. Proceeding will add you to the waiting list. Seats are allocated as cancellations occur (FIFO).</span></div>}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" onClick={() => navigate(-1)} className="btn btn-outline">← Back</button>
            <button type="submit" className="btn btn-accent" disabled={loading} style={{ flex: 1 }}>
              {loading ? <><span className="spinner" style={{ width: '1.1rem', height: '1.1rem', borderWidth: '2px' }} /> Processing…</> : <><CreditCard size={18} /> Proceed to Payment ({formatINR(totalFare)})</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// PAYMENT PAGE (Step 4) — Simulated payment modal
// ============================================================
function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as {
    bookingId: number; pnrNumber: string; fareBreakdown: FareBreakdown;
    isWaitingList: boolean; train: TrainResult; selectedClass: ClassAvailability;
    date: string; from: string; to: string; contactEmail: string; contactPhone: string;
  } | null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [outcome, setOutcome] = useState<'SUCCESS' | 'FAILURE' | null>(null);

  useEffect(() => { if (!state) navigate('/'); }, [state, navigate]);
  if (!state) return null;

  const handlePayment = async (choice: 'SUCCESS' | 'FAILURE' | 'CANCEL') => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.processPayment(state.bookingId, choice);
      if (choice === 'CANCEL') { navigate(-1); return; }
      if (res.success) {
        navigate('/ticket', { state: { pnr: state.pnrNumber, email: state.contactEmail } });
      } else {
        setOutcome('FAILURE');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ flex: 1, background: '#f8fafc', padding: '2rem 1.25rem' }}>
      <div className="container-main" style={{ maxWidth: '520px' }}>
        <StepBar current={4} />

        <div className="card" style={{ overflow: 'hidden' }}>
          {/* Payment header */}
          <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#0c4a6e)', padding: '1.75rem', textAlign: 'center', color: '#fff' }}>
            <div style={{ width: '3.5rem', height: '3.5rem', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
              <CreditCard size={24} color="#fff" />
            </div>
            <div style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: '0.25rem' }}>Simulated Payment</div>
            <div style={{ color: '#93c5fd', fontSize: '0.85rem' }}>Academic demonstration — no real payment</div>
          </div>

          <div style={{ padding: '1.75rem' }}>
            {/* Booking summary */}
            <div style={{ background: '#f8fafc', borderRadius: '0.75rem', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#374151', marginBottom: '0.4rem' }}>
                <span>PNR</span><span style={{ fontWeight: 700 }}>{state.pnrNumber}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#374151', marginBottom: '0.4rem' }}>
                <span>Route</span><span style={{ fontWeight: 600 }}>{state.from} → {state.to}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#374151', marginBottom: '0.4rem' }}>
                <span>Class</span><span style={{ fontWeight: 600 }}>{state.selectedClass.class_code}</span>
              </div>
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.2rem' }}>
                <span>Amount Due</span>
                <span style={{ color: '#1e3a5f' }}>{formatINR(state.fareBreakdown.total_fare)}</span>
              </div>
            </div>

            {state.isWaitingList && (
              <div className="alert alert-warning" style={{ marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                <AlertTriangle size={15} /> <span>This is a <strong>Waiting List</strong> booking. Full payment secures your WL position.</span>
              </div>
            )}

            {outcome === 'FAILURE' ? (
              <div>
                <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                  <XCircle size={16} /> Payment simulation failed. The booking is marked as failed.
                </div>
                <button onClick={() => navigate('/')} className="btn btn-primary" style={{ width: '100%' }}>Start Over</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ fontSize: '0.82rem', color: '#64748b', textAlign: 'center', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Choose payment simulation outcome</div>
                <button onClick={() => handlePayment('SUCCESS')} className="btn btn-accent" disabled={loading} style={{ fontSize: '1rem', padding: '1rem' }}>
                  {loading ? <span className="spinner" style={{ width: '1.1rem', height: '1.1rem', borderWidth: '2px' }} /> : <CheckCircle size={18} />}
                  ✅ Simulate Successful Payment
                </button>
                <button onClick={() => handlePayment('FAILURE')} className="btn btn-danger" disabled={loading}>
                  <XCircle size={16} /> Simulate Payment Failure
                </button>
                <button onClick={() => handlePayment('CANCEL')} className="btn btn-outline" disabled={loading}>
                  Cancel & Go Back
                </button>
              </div>
            )}

            {error && <div className="alert alert-danger" style={{ marginTop: '1rem', fontSize: '0.85rem' }}><AlertTriangle size={14} /> {error}</div>}

            <div className="alert alert-info" style={{ marginTop: '1.25rem', fontSize: '0.8rem' }}>
              <Info size={14} />
              <span>Academic demo: choose any outcome to test the booking state machine. No real payment is processed.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TICKET PAGE (Step 5)
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

  if (loading) return <LoadingScreen message="Loading your ticket…" />;
  if (error) return <ErrorScreen message={error} onBack={() => navigate('/')} />;
  if (!ticket) return null;

  const statusInfo = getBookingStatusLabel(ticket.booking_status);

  return (
    <div style={{ flex: 1, background: '#f8fafc', padding: '2rem 1.25rem' }}>
      <div className="container-main">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e3a5f', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={22} color="#16a34a" /> Booking {ticket.booking_status === 'CONFIRMED' ? 'Confirmed!' : ticket.booking_status === 'WAITING_LIST' ? 'Waiting List' : ticket.booking_status}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => window.print()} className="btn btn-outline no-print" style={{ fontSize: '0.85rem' }}>
              <Printer size={15} /> Print
            </button>
            {['CONFIRMED', 'WAITING_LIST'].includes(ticket.booking_status) && (
              <button onClick={() => setShowCancel(true)} className="btn btn-danger no-print" style={{ fontSize: '0.85rem' }}>
                Cancel Ticket
              </button>
            )}
            <button onClick={() => navigate('/')} className="btn btn-primary no-print" style={{ fontSize: '0.85rem' }}>
              New Search
            </button>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="alert alert-warning" style={{ marginBottom: '1rem', fontSize: '0.82rem' }}>
          <AlertTriangle size={15} /> {ticket.disclaimer}
        </div>

        {/* E-Ticket */}
        <div className="ticket slide-up">
          {/* Ticket header */}
          <div style={{ padding: '2rem 2rem 1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>PNR Number</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '0.05em', color: '#f0f9ff' }}>{ticket.pnr_number}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className={`badge ${statusInfo.className}`} style={{ fontSize: '0.8rem', padding: '0.3rem 0.9rem' }}>{statusInfo.label}</span>
                {ticket.transaction_id && (
                  <div style={{ fontSize: '0.7rem', color: '#93c5fd', marginTop: '0.35rem' }}>TXN: {ticket.transaction_id}</div>
                )}
              </div>
            </div>

            {/* Journey */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#f0f9ff' }}>
                  {ticket.departure_time !== 'See train schedule' ? formatTime(ticket.departure_time) : '—:—'}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#93c5fd', fontWeight: 600 }}>{ticket.train_number}</div>
                <div style={{ fontSize: '0.78rem', color: '#7dd3fc' }}>{ticket.train_name}</div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                <div style={{ width: '100%', height: '2px', background: 'linear-gradient(90deg,rgba(255,255,255,0.3),rgba(255,255,255,0.8),rgba(255,255,255,0.3))' }} />
                <div style={{ fontSize: '0.75rem', color: '#93c5fd' }}>
                  {ticket.class_code} · {ticket.class_name}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#f0f9ff' }}>
                  {ticket.arrival_time !== 'See train schedule' ? formatTime(ticket.arrival_time) : '—:—'}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#93c5fd', fontWeight: 600 }}>{formatDate(ticket.journey_date)}</div>
                <div style={{ fontSize: '0.78rem', color: '#7dd3fc' }}>{ticket.journey_date !== ticket.arrival_date ? `Arrives ${formatDate(ticket.arrival_date)}` : ''}</div>
              </div>
            </div>
          </div>

          {/* Perforated section — passengers */}
          <div className="ticket-perforated" style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '0.72rem', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Passengers ({ticket.total_passengers})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {ticket.passengers.map((p, i) => {
                const ps = getPassengerStatusLabel(p.status);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.06)', borderRadius: '0.5rem', padding: '0.6rem 0.875rem' }}>
                    <div>
                      <span style={{ fontWeight: 600, color: '#f0f9ff' }}>{i + 1}. {p.passenger_name}</span>
                      <span style={{ color: '#93c5fd', fontSize: '0.8rem', marginLeft: '0.5rem' }}>{p.age}y · {p.gender}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {p.allocated_seat && <span style={{ fontSize: '0.8rem', color: '#7dd3fc', fontWeight: 600 }}>{p.allocated_seat}</span>}
                      {p.wl_number && <span style={{ fontSize: '0.8rem', color: '#c4b5fd' }}>WL-{p.wl_number}</span>}
                      <span className={`badge ${ps.className}`}>{ps.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fare & Contact */}
          <div style={{ padding: '1.25rem 2rem 2rem', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Contact</div>
                <div style={{ color: '#e0f2fe', fontSize: '0.85rem' }}>{ticket.contact_email}</div>
                <div style={{ color: '#e0f2fe', fontSize: '0.85rem' }}>{ticket.contact_phone}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.72rem', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Total Fare</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f0f9ff' }}>{formatINR(ticket.fare_breakdown.total_fare)}</div>
                <div style={{ fontSize: '0.72rem', color: '#93c5fd' }}>Booked {new Date(ticket.booked_at).toLocaleDateString('en-IN')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Cancellation modal */}
        {showCancel && <CancellationModal pnr={ticket.pnr_number} email={ticket.contact_email} onClose={() => setShowCancel(false)} onSuccess={() => { setShowCancel(false); navigate('/'); }} />}
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
    <div className="modal-overlay">
      <div className="modal-box">
        <div style={{ background: '#dc2626', padding: '1.25rem 1.5rem', color: '#fff' }}>
          <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>Cancel Ticket</div>
          <div style={{ fontSize: '0.82rem', color: '#fecaca' }}>PNR: {pnr}</div>
        </div>
        <div style={{ padding: '1.5rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : error ? (
            <div className="alert alert-danger">{error}</div>
          ) : preview && !preview.is_eligible ? (
            <div className="alert alert-danger">{preview.ineligibility_reason}</div>
          ) : preview ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#374151' }}>
                  <span>Journey Date</span><span style={{ fontWeight: 600 }}>{formatDate(preview.journey_date)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#374151' }}>
                  <span>Policy Applied</span><span style={{ fontWeight: 600, color: '#1e40af', fontSize: '0.82rem' }}>{preview.policy_applied}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#374151' }}>
                  <span>Original Fare</span><span style={{ fontWeight: 600 }}>{formatINR(preview.original_fare)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                  <span>Cancellation Charge</span><span style={{ fontWeight: 600 }}>−{formatINR(preview.cancellation_charge)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 700, borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                  <span>Refund Amount ({preview.refund_percentage}%)</span>
                  <span style={{ fontSize: '1.1rem' }}>{formatINR(preview.refund_amount)}</span>
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', marginBottom: '1.25rem' }}>
                <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
                I confirm the cancellation and accept the refund policy
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
  const [pnr, setPnr] = useState('');
  const [email, setEmail] = useState('PNR-DEMO01');
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
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.25rem', background: '#f8fafc' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '4rem', height: '4rem', background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', borderRadius: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Search size={22} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e3a5f', marginBottom: '0.4rem' }}>PNR Lookup</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Enter your PNR number to view ticket details</p>
        </div>

        <div className="card slide-up" style={{ padding: '1.75rem' }}>
          <form onSubmit={handleLookup}>
            <div style={{ marginBottom: '1rem' }}>
              <label className="input-label">PNR Number</label>
              <input className="input" placeholder="e.g. PNR-DEMO01" value={pnr} onChange={e => setPnr(e.target.value)} style={{ fontFamily: 'monospace', fontSize: '1rem', letterSpacing: '0.05em' }} />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="input-label">Email (for verification)</label>
              <input type="email" className="input" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            {error && <div className="alert alert-danger" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}><AlertTriangle size={14} /> {error}</div>}
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
              {loading ? <><span className="spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} /> Searching…</> : <><Search size={16} /> Find Ticket</>}
            </button>
          </form>

          <div className="alert alert-info" style={{ marginTop: '1.25rem', fontSize: '0.8rem' }}>
            <Info size={14} />
            <span>Demo PNR: <strong>PNR-DEMO01</strong>, Email: <strong>demo.passenger@example.com</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ADMIN LOGIN PAGE
// ============================================================
function AdminLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if already logged in
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
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.25rem', background: '#f8fafc' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '4rem', height: '4rem', background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', borderRadius: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Shield size={22} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e3a5f' }}>Admin Portal</h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>JWT-protected administrator access</p>
        </div>

        <div className="card slide-up" style={{ padding: '1.75rem' }}>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1rem' }}>
              <label className="input-label">Username</label>
              <input className="input" value={username} onChange={e => setUsername(e.target.value)} required />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="input-label">Password</label>
              <input type="password" className="input" placeholder="PresidencyAdmin2026!" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && <div className="alert alert-danger" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}><AlertTriangle size={14} /> {error}</div>}
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
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
// ADMIN DASHBOARD PAGE
// ============================================================
function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<{ totalBookings: number; confirmedBookings: number; waitingList: number; cancelled: number; totalRevenue: number } | null>(null);
  const [bookings, setBookings] = useState<ETicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const token = localStorage.getItem('adminToken') || '';

  useEffect(() => {
    if (!token) { navigate('/admin/login'); return; }
    Promise.all([
      apiClient.getAdminDashboard(token),
      apiClient.getAdminBookings(token),
    ]).then(([dash, bk]) => {
      setStats(dash.stats);
      setBookings(bk.bookings as ETicket[]);
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
    { label: 'Total Bookings', value: stats?.totalBookings || 0, icon: <Ticket size={20} />, color: '#2563eb' },
    { label: 'Confirmed', value: stats?.confirmedBookings || 0, icon: <CheckCircle size={20} />, color: '#16a34a' },
    { label: 'Waiting List', value: stats?.waitingList || 0, icon: <Clock size={20} />, color: '#7c3aed' },
    { label: 'Revenue', value: formatINR(stats?.totalRevenue || 0), icon: <CreditCard size={20} />, color: '#ea580c' },
  ];

  return (
    <div style={{ flex: 1, background: '#f8fafc', padding: '2rem 1.25rem' }}>
      <div className="container-wide">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e3a5f', margin: 0 }}>Admin Dashboard</h1>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>Team 11 — CSE 2271 Demonstration System</p>
          </div>
          <div className="badge badge-pending" style={{ fontSize: '0.78rem' }}>⚠️ Academic Demo</div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {statCards.map(s => (
            <div key={s.label} className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div style={{ color: s.color, background: `${s.color}15`, borderRadius: '0.5rem', padding: '0.4rem' }}>{s.icon}</div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.2rem' }}>{s.value}</div>
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Bookings table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e3a5f', margin: 0 }}>Recent Bookings</h2>
            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>{bookings.length} records</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['PNR', 'Date', 'Class', 'Pax', 'Fare', 'Status', 'Payment'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No bookings yet</td></tr>
                ) : bookings.map((b: any, i: number) => {
                  const si = getBookingStatusLabel(b.booking_status);
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: '#1e3a5f' }}>{b.pnr_number}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#374151' }}>{b.journey_date}</td>
                      <td style={{ padding: '0.75rem 1rem' }}><span className="badge badge-confirmed">{b.class_code}</span></td>
                      <td style={{ padding: '0.75rem 1rem', color: '#374151' }}>{b.total_passengers}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{formatINR(b.total_fare)}</td>
                      <td style={{ padding: '0.75rem 1rem' }}><span className={`badge ${si.className}`}>{si.label}</span></td>
                      <td style={{ padding: '0.75rem 1rem' }}><span className={`badge ${b.payment_status === 'PAID' ? 'badge-available' : 'badge-pending'}`}>{b.payment_status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SHARED COMPONENTS
// ============================================================
function StepBar({ current }: { current: number }) {
  const steps = [
    { n: 1, label: 'Search', icon: <Search size={14} /> },
    { n: 2, label: 'Select', icon: <Train size={14} /> },
    { n: 3, label: 'Passengers', icon: <Users size={14} /> },
    { n: 4, label: 'Payment', icon: <CreditCard size={14} /> },
    { n: 5, label: 'Ticket', icon: <Ticket size={14} /> },
  ];
  return (
    <div className="step-bar no-print" style={{ marginBottom: '1.75rem' }}>
      {steps.map((s, i) => (
        <React.Fragment key={s.n}>
          <div className="step-item">
            <div className={`step-circle ${current === s.n ? 'active' : current > s.n ? 'done' : 'inactive'}`}>
              {current > s.n ? <CheckCircle size={14} /> : s.icon}
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: current >= s.n ? '#1e3a5f' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</span>
          </div>
          {i < steps.length - 1 && <div className={`step-line ${current > s.n + 1 || (current > s.n) ? 'done' : ''}`} style={{ marginBottom: '1.3rem' }} />}
        </React.Fragment>
      ))}
    </div>
  );
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', padding: '4rem' }}>
      <div className="spinner" style={{ width: '3rem', height: '3rem', borderWidth: '3px' }} />
      <div style={{ color: '#64748b', fontWeight: 500 }}>{message}</div>
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
// APP ROOT
// ============================================================
export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Disclaimer banner */}
        <div className="disclaimer">
          ⚠️ ACADEMIC DEMONSTRATION SYSTEM — TEAM 11 — CSE 2271 — PRESIDENCY UNIVERSITY, BENGALURU — NO REAL TICKETS, PAYMENTS, OR JOURNEYS
        </div>
        <Navbar />
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/passenger" element={<PassengerPage />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/ticket" element={<TicketPage />} />
          <Route path="/lookup" element={<LookupPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="*" element={
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
              <Train size={48} color="#cbd5e1" />
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#374151' }}>Page Not Found</div>
              <Link to="/" className="btn btn-primary">Go Home</Link>
            </div>
          } />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
