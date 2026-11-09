// PlatformBookingPage — Railway Platform Entry Pass Booking Flow
// Railway Reservation System v3.0 — Team 11, CSE 2271
// Academic Demonstration System — Presidency University, Bengaluru

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  MapPin,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Printer,
  ArrowLeft,
  QrCode,
  ShieldCheck,
  Phone,
  User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api';
import type { Station, PlatformTicket } from '../types';
import { formatINR } from '../utils';

export function PlatformBookingPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  // Form State
  const [stationCode, setStationCode] = useState('NDLS');
  const [stationSearch, setStationSearch] = useState('NDLS — New Delhi');
  const [stationResults, setStationResults] = useState<Station[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [quantity, setQuantity] = useState(1);
  const [visitorName, setVisitorName] = useState(user?.full_name ?? '');
  const [visitorMobile, setVisitorMobile] = useState(user?.phone ?? '');

  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState('');
  const [issuedTicket, setIssuedTicket] = useState<PlatformTicket | null>(null);

  // Sync user details if loaded late
  useEffect(() => {
    if (user?.full_name && !visitorName) setVisitorName(user.full_name);
    if (user?.phone && !visitorMobile) setVisitorMobile(user.phone);
  }, [user]);

  // Autocomplete stations
  const handleStationSearch = useCallback(async (query: string) => {
    if (query.trim().length < 1) {
      setStationResults([]);
      return;
    }
    try {
      const res = await apiClient.autocompleteStations(query);
      setStationResults(res.stations);
      setDropdownOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  // Quick station selector chips
  const selectQuickStation = (code: string, city: string) => {
    setStationCode(code);
    setStationSearch(`${code} — ${city}`);
    setDropdownOpen(false);
    setError('');
  };

  const PRICE_PER_TICKET = 10;
  const totalAmount = quantity * PRICE_PER_TICKET;

  async function handleBookPlatformTicket(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      navigate('/login');
      return;
    }

    if (!stationCode) {
      setError('Please select a valid railway station');
      return;
    }

    if (!visitorName.trim()) {
      setError('Please enter the primary visitor name');
      return;
    }

    if (!/^\d{10}$/.test(visitorMobile.trim())) {
      setError('Mobile number must be a valid 10-digit number');
      return;
    }

    setError('');
    setBookingLoading(true);

    try {
      const res = await apiClient.bookPlatformTicket({
        station_code: stationCode,
        ticket_count: quantity,
        visitor_name: visitorName.trim(),
        contact_phone: visitorMobile.trim(),
      });
      setIssuedTicket(res.ticket);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to book platform ticket');
    } finally {
      setBookingLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      {/* Top Header Bar */}
      <div className="bg-slate-900 border-b border-slate-800 text-white py-3.5 px-4 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/app" className="inline-flex items-center gap-2 text-slate-300 hover:text-white text-xs font-semibold">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Station Platform Pass Counter
            </span>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* SUCCESS VIEW: Issued Platform Pass */}
        {issuedTicket ? (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-black text-slate-900">Platform Pass Issued!</h1>
              <p className="text-xs text-slate-500 font-medium">
                Digital platform entry pass is active for immediate entry through station security gates.
              </p>
            </div>

            {/* Official Platform Pass Card */}
            <div className="bg-white rounded-3xl border-2 border-amber-600/30 shadow-xl overflow-hidden print:border-none print:shadow-none">
              {/* Ribbon */}
              <div className="bg-gradient-to-r from-amber-700 via-orange-600 to-amber-800 p-5 text-white flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-amber-200">
                    Indian Railways · Station Entry Pass
                  </div>
                  <div className="text-xl font-black tracking-tight mt-0.5">
                    Platform Ticket ({issuedTicket.ticket_count} Person{issuedTicket.ticket_count > 1 ? 's' : ''})
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-amber-200 uppercase font-semibold">Pass ID</div>
                  <div className="font-mono text-base font-bold bg-white/20 px-2.5 py-1 rounded-lg">
                    {issuedTicket.ticket_number}
                  </div>
                </div>
              </div>

              {/* Station Banner */}
              <div className="p-6 bg-amber-50/50 border-b border-amber-100 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Station Premises</div>
                  <div className="text-2xl font-black text-slate-900">{issuedTicket.station_code}</div>
                  <div className="text-xs font-semibold text-slate-700">{issuedTicket.station_name}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-200/80 px-2.5 py-1 rounded-full">
                    2 Hours Validity
                  </div>
                  <div className="text-xs text-slate-500 mt-1 font-mono">
                    {formatINR(issuedTicket.total_fare)} Total Paid
                  </div>
                </div>
              </div>

              {/* Pass Body & QR */}
              <div className="p-6 space-y-6">
                <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="w-36 h-36 bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                    {issuedTicket.qr_code ? (
                      <img
                        src={issuedTicket.qr_code}
                        alt="Platform Pass QR"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <QrCode className="w-20 h-20 text-slate-400" />
                    )}
                  </div>

                  <div className="space-y-2 text-xs flex-1 text-center sm:text-left">
                    <div>
                      <span className="text-slate-400 uppercase font-semibold text-[10px]">Valid From:</span>
                      <div className="font-bold text-slate-800">
                        {new Date(issuedTicket.valid_from).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-semibold text-[10px]">Valid Until (Strict):</span>
                      <div className="font-bold text-red-600 text-sm">
                        {new Date(issuedTicket.valid_until).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-semibold text-[10px]">Visitor Name & Contact:</span>
                      <div className="font-semibold text-slate-800">
                        {issuedTicket.visitor_name} · {issuedTicket.contact_phone || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Platform Rules Notice */}
                <div className="p-3.5 bg-slate-100 rounded-xl text-[11px] text-slate-600 space-y-1 leading-relaxed">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Station Security Conditions:</span>
                  </div>
                  <div>• Valid solely for entry into station platforms, concourse, and passenger waiting sheds.</div>
                  <div>• Strictly NOT valid for boarding any train. Travel on train requires a valid train journey ticket.</div>
                  <div>• Pass expires automatically after 2 hours from time of issuance.</div>
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
                  <span>Print Pass</span>
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
                    Book Another Pass
                  </button>
                  <Link
                    to="/app/bookings"
                    className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl transition"
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
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold mb-2">
                <Building2 className="w-3.5 h-3.5" />
                <span>Station Platform Entry Ticketing</span>
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                Book Station Platform Pass
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
                Entry pass for seeing off passengers, waiting at platforms, or meeting arriving guests.
              </p>
            </div>

            {/* Quick Popular Station Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-slate-400 font-bold shrink-0 text-[11px] uppercase tracking-wider">
                Popular Stations:
              </span>
              <button
                type="button"
                onClick={() => selectQuickStation('NDLS', 'New Delhi')}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-amber-500 font-medium shrink-0 transition"
              >
                NDLS (New Delhi)
              </button>
              <button
                type="button"
                onClick={() => selectQuickStation('CSMT', 'Mumbai Central')}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-amber-500 font-medium shrink-0 transition"
              >
                CSMT (Mumbai)
              </button>
              <button
                type="button"
                onClick={() => selectQuickStation('SBC', 'Bengaluru')}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-amber-500 font-medium shrink-0 transition"
              >
                SBC (Bengaluru)
              </button>
              <button
                type="button"
                onClick={() => selectQuickStation('MAS', 'Chennai')}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-amber-500 font-medium shrink-0 transition"
              >
                MAS (Chennai)
              </button>
              <button
                type="button"
                onClick={() => selectQuickStation('HWH', 'Howrah')}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-amber-500 font-medium shrink-0 transition"
              >
                HWH (Kolkata)
              </button>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleBookPlatformTicket} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
              {/* Station Selection */}
              <div className="relative">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Select Railway Station
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <MapPin className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={stationSearch}
                    onChange={(e) => {
                      setStationSearch(e.target.value);
                      handleStationSearch(e.target.value);
                    }}
                    onFocus={() => stationResults.length > 0 && setDropdownOpen(true)}
                    placeholder="Search by city or station code…"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                  />
                </div>
                {dropdownOpen && stationResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto">
                    {stationResults.map((s) => (
                      <div
                        key={s.code}
                        onClick={() => {
                          setStationCode(s.code);
                          setStationSearch(`${s.code} — ${s.city}`);
                          setDropdownOpen(false);
                        }}
                        className="px-3.5 py-2 text-xs hover:bg-amber-50 cursor-pointer flex items-center justify-between border-b border-slate-100 last:border-none"
                      >
                        <span className="font-bold text-slate-800">{s.city} ({s.code})</span>
                        <span className="text-[10px] text-slate-400">{s.state}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quantity Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Number of Visitors (1 to 10)
                  </label>
                  <span className="text-xs font-semibold text-amber-700">₹10 standard rate per person</span>
                </div>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setQuantity(num)}
                      className={`py-2 rounded-xl text-xs font-bold transition border ${quantity === num
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visitor Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Primary Visitor Name
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={visitorName}
                      onChange={(e) => setVisitorName(e.target.value)}
                      required
                      placeholder="e.g. Suresh Kumar"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Visitor Mobile Number
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={visitorMobile}
                      onChange={(e) => setVisitorMobile(e.target.value.replace(/\D/g, ''))}
                      required
                      placeholder="9876543210"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Price & Validity Summary Card */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Standard Ticket Rate:</span>
                  <span className="font-semibold text-slate-900">₹10 per visitor</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Total Visitors:</span>
                  <span className="font-semibold text-slate-900">{quantity} Person{quantity > 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Pass Validity Period:</span>
                  <span className="font-semibold text-amber-900">2 Hours from Issue Time</span>
                </div>
                <div className="pt-2 border-t border-amber-200 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-amber-950">
                      Total Payable
                    </div>
                    <div className="text-[11px] text-slate-500">Fixed statutory platform rate</div>
                  </div>
                  <div className="text-2xl font-black text-amber-700 font-mono">
                    {formatINR(totalAmount)}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={bookingLoading}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-sm shadow-lg shadow-amber-600/20 disabled:opacity-50 transition transform active:scale-[0.99] flex items-center justify-center gap-2"
              >
                {bookingLoading ? (
                  <span>Generating Platform Pass…</span>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Pay {formatINR(totalAmount)} & Issue Platform Pass</span>
                  </>
                )}
              </button>

              <div className="text-center text-[11px] text-slate-400">
                ⚠️ Academic Demonstration Sandbox: Immediate pass generation with verification QR code.
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
