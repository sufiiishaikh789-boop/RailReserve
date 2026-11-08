// UnreservedBookingPage — UTS General Railway Ticket Booking Flow
// Railway Reservation System v3.0 — Team 11, CSE 2271
// Academic Demonstration System — Presidency University, Bengaluru

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Ticket,
  MapPin,
  Calendar,
  CreditCard,
  ArrowRightLeft,
  CheckCircle,
  AlertCircle,
  Printer,
  ArrowLeft,
  QrCode,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api';
import type { Station, UnreservedTicket } from '../types';
import { formatINR } from '../utils';

export function UnreservedBookingPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  // Booking Form State
  const [fromCode, setFromCode] = useState('NDLS');
  const [fromDisplay, setFromDisplay] = useState('NDLS — New Delhi');
  const [toCode, setToCode] = useState('CNB');
  const [toDisplay, setToDisplay] = useState('CNB — Kanpur Central');

  const [journeyDate, setJourneyDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [passengerCount, setPassengerCount] = useState(1);
  const [passengerNames, setPassengerNames] = useState<string[]>(['']);
  const [trainType, setTrainType] = useState<'ORDINARY' | 'MAIL_EXPRESS' | 'SUPERFAST'>('MAIL_EXPRESS');

  // Autocomplete states
  const [fromSearch, setFromSearch] = useState('NDLS — New Delhi');
  const [toSearch, setToSearch] = useState('CNB — Kanpur Central');
  const [fromResults, setFromResults] = useState<Station[]>([]);
  const [toResults, setToResults] = useState<Station[]>([]);
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  // Quote State
  const [quote, setQuote] = useState<{
    fare_per_passenger: number;
    total_fare: number;
    distance_km: number;
    rules_note: string;
  } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  // Submission & Ticket State
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState('');
  const [issuedTicket, setIssuedTicket] = useState<UnreservedTicket | null>(null);

  // Sync passenger names array length with passenger count
  useEffect(() => {
    setPassengerNames((prev) => {
      const copy = [...prev];
      while (copy.length < passengerCount) copy.push('');
      while (copy.length > passengerCount) copy.pop();
      return copy;
    });
  }, [passengerCount]);

  // Initial user name prefill
  useEffect(() => {
    if (user?.full_name && passengerNames.length > 0 && !passengerNames[0]) {
      setPassengerNames([user.full_name]);
    }
  }, [user]);

  // Station Autocomplete logic
  const searchStations = useCallback(async (query: string, isFrom: boolean) => {
    if (query.trim().length < 1) {
      if (isFrom) setFromResults([]);
      else setToResults([]);
      return;
    }
    try {
      const res = await apiClient.autocompleteStations(query);
      if (isFrom) {
        setFromResults(res.stations);
        setFromOpen(true);
      } else {
        setToResults(res.stations);
        setToOpen(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Fetch real-time fare quote whenever parameters change
  useEffect(() => {
    if (!fromCode || !toCode || fromCode === toCode) {
      setQuote(null);
      return;
    }

    let isCurrent = true;
    setQuoteLoading(true);

    apiClient
      .calculateUnreservedFare({
        source_code: fromCode,
        dest_code: toCode,
        train_type: trainType,
        passenger_count: passengerCount,
      })
      .then((res) => {
        if (isCurrent) setQuote(res);
      })
      .catch(() => {
        if (isCurrent) setQuote(null);
      })
      .finally(() => {
        if (isCurrent) setQuoteLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [fromCode, toCode, trainType, passengerCount]);

  const handleSwapStations = () => {
    const oldFromCode = fromCode;
    const oldFromDisplay = fromDisplay;
    setFromCode(toCode);
    setFromDisplay(toDisplay);
    setFromSearch(toDisplay);

    setToCode(oldFromCode);
    setToDisplay(oldFromDisplay);
    setToSearch(oldFromDisplay);
  };

  const handleNameChange = (index: number, val: string) => {
    setPassengerNames((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  async function handleBookTicket(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      navigate('/login');
      return;
    }

    if (fromCode === toCode) {
      setError('Origin and Destination stations cannot be the same');
      return;
    }

    // Check all passenger names
    const emptyNameIdx = passengerNames.findIndex((n) => !n.trim());
    if (emptyNameIdx !== -1) {
      setError(`Please provide the name of Passenger ${emptyNameIdx + 1}`);
      return;
    }

    setError('');
    setBookingLoading(true);

    try {
      const res = await apiClient.bookUnreservedTicket({
        source_code: fromCode,
        dest_code: toCode,
        journey_date: journeyDate,
        train_type: trainType,
        passenger_names: passengerNames.map((n) => n.trim()),
        contact_email: user?.email,
        contact_phone: user?.phone,
      });
      setIssuedTicket(res.ticket);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to issue unreserved ticket');
    } finally {
      setBookingLoading(false);
    }
  }

  // Quick popular route chips
  const selectQuickRoute = (from: string, fromName: string, to: string, toName: string) => {
    setFromCode(from);
    setFromDisplay(`${from} — ${fromName}`);
    setFromSearch(`${from} — ${fromName}`);
    setToCode(to);
    setToDisplay(`${to} — ${toName}`);
    setToSearch(`${to} — ${toName}`);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      {/* Header bar */}
      <div className="bg-slate-900 border-b border-slate-800 text-white py-3.5 px-4 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/app" className="inline-flex items-center gap-2 text-slate-300 hover:text-white text-xs font-semibold">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              UTS Unreserved Ticket Counter
            </span>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* SUCCESS VIEW: Issued UTS Ticket */}
        {issuedTicket ? (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-black text-slate-900">UTS Ticket Issued Successfully!</h1>
              <p className="text-xs text-slate-500 font-medium">
                Your digital general journey ticket is active and ready for travel inspection.
              </p>
            </div>

            {/* Official UTS Ticket Card */}
            <div className="bg-white rounded-3xl border-2 border-emerald-600/30 shadow-xl overflow-hidden print:border-none print:shadow-none">
              {/* Ticket Top Ribbon */}
              <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 p-5 text-white flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-200">
                    Indian Railways · UTS Digital Ticket
                  </div>
                  <div className="text-xl font-black tracking-tight mt-0.5">
                    {issuedTicket.train_type.replace('_', ' ')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-emerald-200 uppercase font-semibold">Ticket Number</div>
                  <div className="font-mono text-base font-bold bg-white/20 px-2.5 py-1 rounded-lg">
                    {issuedTicket.ticket_number}
                  </div>
                </div>
              </div>

              {/* Station Route Banner */}
              <div className="p-6 bg-emerald-50/50 border-b border-emerald-100 flex items-center justify-between text-center sm:text-left">
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase">From Station</div>
                  <div className="text-2xl font-black text-slate-900">{issuedTicket.source_code}</div>
                  <div className="text-xs font-semibold text-slate-700">{issuedTicket.source_name}</div>
                </div>
                <div className="flex flex-col items-center px-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full mb-1">
                    General Class
                  </div>
                  <ArrowRightLeft className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">To Station</div>
                  <div className="text-2xl font-black text-slate-900">{issuedTicket.dest_code}</div>
                  <div className="text-xs font-semibold text-slate-700">{issuedTicket.dest_name}</div>
                </div>
              </div>

              {/* Ticket Details Body & QR Code */}
              <div className="p-6 space-y-6">
                <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  {/* Real Base64 QR Code */}
                  <div className="w-36 h-36 bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                    {issuedTicket.qr_code ? (
                      <img
                        src={issuedTicket.qr_code}
                        alt="UTS Digital Verification QR"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <QrCode className="w-20 h-20 text-slate-400" />
                    )}
                  </div>

                  <div className="space-y-2 text-xs flex-1 text-center sm:text-left">
                    <div>
                      <span className="text-slate-400 uppercase font-semibold text-[10px]">Validity Window:</span>
                      <div className="font-bold text-slate-800 text-sm">
                        Until {new Date(issuedTicket.valid_until).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-semibold text-[10px]">Total Passengers:</span>
                      <div className="font-semibold text-slate-800">
                        {issuedTicket.passenger_count} Passenger{issuedTicket.passenger_count > 1 ? 's' : ''} (General Seating)
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-semibold text-[10px]">Total Fare Paid:</span>
                      <div className="font-mono text-base font-black text-emerald-700">
                        {formatINR(issuedTicket.total_fare)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Passenger Names List */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                    Named Passengers ({issuedTicket.passenger_count})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(typeof issuedTicket.passenger_names === 'string'
                      ? issuedTicket.passenger_names.split(', ')
                      : Array.isArray(issuedTicket.passenger_names)
                      ? issuedTicket.passenger_names
                      : []
                    ).map((name: string, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold">
                          {idx + 1}
                        </span>
                        <span>{name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* UTS Rules Alert */}
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong>UTS Travel Conditions:</strong> Ticket is valid for 24 hours on any train of the specified type. Berths and seat numbers are not allocated. Keep this QR available for Ticket Checking Staff.
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap gap-3 items-center justify-between print:hidden">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl transition flex items-center gap-2 shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Ticket</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIssuedTicket(null);
                      setError('');
                    }}
                    className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-xl transition"
                  >
                    Issue Another Ticket
                  </button>
                  <Link
                    to="/app/bookings"
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition"
                  >
                    View in My Bookings
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* BOOKING FORM VIEW */
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Page Header */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold mb-2">
                <Ticket className="w-3.5 h-3.5" />
                <span>Instant Unreserved Ticketing System (UTS)</span>
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                Book Unreserved Journey Ticket
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
                Issue point-to-point general second-class tickets without seat reservations.
              </p>
            </div>

            {/* Quick Popular Route Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-slate-400 font-bold shrink-0 text-[11px] uppercase tracking-wider">
                Quick Routes:
              </span>
              <button
                type="button"
                onClick={() => selectQuickRoute('NDLS', 'New Delhi', 'CNB', 'Kanpur Central')}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-emerald-500 font-medium shrink-0 transition"
              >
                NDLS → CNB
              </button>
              <button
                type="button"
                onClick={() => selectQuickRoute('SBC', 'Bengaluru City', 'MAS', 'Chennai Central')}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-emerald-500 font-medium shrink-0 transition"
              >
                SBC → MAS
              </button>
              <button
                type="button"
                onClick={() => selectQuickRoute('CSMT', 'Mumbai Central', 'PUNE', 'Pune Junction')}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-emerald-500 font-medium shrink-0 transition"
              >
                CSMT → PUNE
              </button>
              <button
                type="button"
                onClick={() => selectQuickRoute('HWH', 'Howrah Junction', 'DDU', 'Pt. Deen Dayal')}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-emerald-500 font-medium shrink-0 transition"
              >
                HWH → DDU
              </button>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            {/* Main Booking Form */}
            <form onSubmit={handleBookTicket} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
              {/* Origin & Destination Autocomplete Inputs */}
              <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* From Station */}
                <div className="relative">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Origin Station (From)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <MapPin className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={fromSearch}
                      onChange={(e) => {
                        setFromSearch(e.target.value);
                        searchStations(e.target.value, true);
                      }}
                      onFocus={() => fromResults.length > 0 && setFromOpen(true)}
                      placeholder="Type city or station code…"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                    />
                  </div>
                  {fromOpen && fromResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto">
                      {fromResults.map((s) => (
                        <div
                          key={s.code}
                          onClick={() => {
                            setFromCode(s.code);
                            setFromDisplay(`${s.code} — ${s.city}`);
                            setFromSearch(`${s.code} — ${s.city}`);
                            setFromOpen(false);
                          }}
                          className="px-3.5 py-2 text-xs hover:bg-emerald-50 cursor-pointer flex items-center justify-between border-b border-slate-100 last:border-none"
                        >
                          <span className="font-bold text-slate-800">{s.city} ({s.code})</span>
                          <span className="text-[10px] text-slate-400">{s.state}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Swap button */}
                <button
                  type="button"
                  onClick={handleSwapStations}
                  className="sm:absolute sm:left-1/2 sm:top-[2.2rem] sm:-translate-x-1/2 w-8 h-8 rounded-full bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 text-slate-600 border border-slate-300 flex items-center justify-center transition z-10 self-center"
                  title="Swap Stations"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                </button>

                {/* To Station */}
                <div className="relative">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Destination Station (To)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <MapPin className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={toSearch}
                      onChange={(e) => {
                        setToSearch(e.target.value);
                        searchStations(e.target.value, false);
                      }}
                      onFocus={() => toResults.length > 0 && setToOpen(true)}
                      placeholder="Type city or station code…"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                    />
                  </div>
                  {toOpen && toResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto">
                      {toResults.map((s) => (
                        <div
                          key={s.code}
                          onClick={() => {
                            setToCode(s.code);
                            setToDisplay(`${s.code} — ${s.city}`);
                            setToSearch(`${s.code} — ${s.city}`);
                            setToOpen(false);
                          }}
                          className="px-3.5 py-2 text-xs hover:bg-emerald-50 cursor-pointer flex items-center justify-between border-b border-slate-100 last:border-none"
                        >
                          <span className="font-bold text-slate-800">{s.city} ({s.code})</span>
                          <span className="text-[10px] text-slate-400">{s.state}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Journey Date & Train Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Journey Date
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Calendar className="w-4 h-4" />
                    </span>
                    <input
                      type="date"
                      value={journeyDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setJourneyDate(e.target.value)}
                      required
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    UTS permits tickets for today or advance up to 3 days
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Train Type Category
                  </label>
                  <select
                    value={trainType}
                    onChange={(e) => setTrainType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition bg-white"
                  >
                    <option value="MAIL_EXPRESS">Mail / Express General (Standard)</option>
                    <option value="SUPERFAST">Superfast Express (With Surcharge)</option>
                    <option value="ORDINARY">Ordinary Passenger (Slow/Suburban)</option>
                  </select>
                </div>
              </div>

              {/* Number of Passengers */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Number of Passengers (1 to 6)
                  </label>
                  <span className="text-xs font-semibold text-emerald-700">Max 6 per UTS ticket</span>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setPassengerCount(num)}
                      className={`py-2 rounded-xl text-xs font-bold transition border ${
                        passengerCount === num
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Passenger Name Inputs */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Passenger Legal Names
                </label>
                {passengerNames.map((name, idx) => (
                  <div key={idx} className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => handleNameChange(idx, e.target.value)}
                      required
                      placeholder={`Passenger ${idx + 1} full name`}
                      className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                    />
                  </div>
                ))}
              </div>

              {/* Real-time Fare Calculation Card */}
              {quoteLoading ? (
                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 text-center text-xs text-emerald-800">
                  <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-1" />
                  Calculating distance-based UTS fare…
                </div>
              ) : quote ? (
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Approximate Distance:</span>
                    <span className="font-semibold text-slate-900">{quote.distance_km} km</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Fare per Passenger:</span>
                    <span className="font-semibold text-slate-900">{formatINR(quote.fare_per_passenger)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Passenger Count:</span>
                    <span className="font-semibold text-slate-900">{passengerCount}</span>
                  </div>
                  <div className="pt-2 border-t border-emerald-200 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                        Total Amount Payable
                      </div>
                      <div className="text-[11px] text-slate-500">{quote.rules_note}</div>
                    </div>
                    <div className="text-2xl font-black text-emerald-700 font-mono">
                      {formatINR(quote.total_fare)}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={bookingLoading || quoteLoading}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition transform active:scale-[0.99] flex items-center justify-center gap-2"
              >
                {bookingLoading ? (
                  <span>Issuing UTS Digital Ticket…</span>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Pay {quote ? formatINR(quote.total_fare) : ''} & Issue UTS Ticket</span>
                  </>
                )}
              </button>

              <div className="text-center text-[11px] text-slate-400">
                ⚠️ Academic Demonstration Sandbox: Payment is instantaneous. No real monetary transactions.
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
