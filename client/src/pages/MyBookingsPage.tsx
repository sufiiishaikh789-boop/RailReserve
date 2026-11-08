// MyBookingsPage — Consolidated Passenger Bookings (Reserved, UTS, Platform)
// Railway Reservation System v3.0 — Team 11, CSE 2271
// Academic Demonstration System — Presidency University, Bengaluru

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Train,
  Ticket,
  Building2,
  QrCode,
  Printer,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  X,
  ArrowLeft,
  Search
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api';
import type { ETicket, UnreservedTicket, PlatformTicket, CancellationPreview } from '../types';
import { formatDate, formatTime, formatINR } from '../utils';

export function MyBookingsPage() {
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState<'all' | 'reserved' | 'unreserved' | 'platform'>('all');
  const [reservedBookings, setReservedBookings] = useState<ETicket[]>([]);
  const [unreservedTickets, setUnreservedTickets] = useState<UnreservedTicket[]>([]);
  const [platformTickets, setPlatformTickets] = useState<PlatformTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // QR Modal
  const [qrModalData, setQrModalData] = useState<{
    title: string;
    subtitle: string;
    qr: string;
    code: string;
  } | null>(null);

  // Cancellation Modal
  const [cancellingBooking, setCancellingBooking] = useState<ETicket | null>(null);
  const [cancelPreview, setCancelPreview] = useState<CancellationPreview | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState('');

  // Search filter
  const [searchFilter, setSearchFilter] = useState('');

  const loadData = () => {
    if (!token) return;
    setLoading(true);
    setError('');

    Promise.allSettled([
      apiClient.getMyBookings(token),
      apiClient.getMyAllTickets(token),
    ]).then(([resRes, specRes]) => {
      if (resRes.status === 'fulfilled') {
        setReservedBookings(resRes.value.bookings || []);
      }
      if (specRes.status === 'fulfilled') {
        setUnreservedTickets(specRes.value.unreserved || []);
        setPlatformTickets(specRes.value.platform || []);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, [token]);

  // Handle Cancellation Preview
  const handleInitiateCancel = async (booking: ETicket) => {
    setCancellingBooking(booking);
    setCancelPreview(null);
    setCancelSuccessMsg('');
    try {
      const prev = await apiClient.getCancellationPreview(booking.pnr_number);
      setCancelPreview(prev.preview);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to preview cancellation');
    }
  };

  // Confirm Cancellation
  const handleConfirmCancel = async () => {
    if (!cancellingBooking) return;
    setCancelLoading(true);
    try {
      const res = await apiClient.cancelBooking(
        cancellingBooking.pnr_number,
        cancellingBooking.contact_email,
        cancellingBooking.contact_phone
      );
      setCancelSuccessMsg(res.cancellation.message);
      loadData();
      setTimeout(() => {
        setCancellingBooking(null);
        setCancelSuccessMsg('');
      }, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancellation failed');
    } finally {
      setCancelLoading(false);
    }
  };

  // Filter lists based on searchFilter
  const q = searchFilter.toLowerCase().trim();

  const filteredReserved = reservedBookings.filter(
    (b) =>
      !q ||
      b.pnr_number.toLowerCase().includes(q) ||
      b.train_name.toLowerCase().includes(q) ||
      b.train_number.includes(q) ||
      b.source_station_code.toLowerCase().includes(q) ||
      b.dest_station_code.toLowerCase().includes(q)
  );

  const filteredUnreserved = unreservedTickets.filter(
    (u) =>
      !q ||
      u.ticket_number.toLowerCase().includes(q) ||
      u.source_name.toLowerCase().includes(q) ||
      u.dest_name.toLowerCase().includes(q) ||
      u.source_code.toLowerCase().includes(q) ||
      u.dest_code.toLowerCase().includes(q)
  );

  const filteredPlatform = platformTickets.filter(
    (p) =>
      !q ||
      p.ticket_number.toLowerCase().includes(q) ||
      p.station_name.toLowerCase().includes(q) ||
      p.station_code.toLowerCase().includes(q)
  );

  const totalCount = reservedBookings.length + unreservedTickets.length + platformTickets.length;

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      {/* Header bar */}
      <div className="bg-slate-900 border-b border-slate-800 text-white py-3.5 px-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/app" className="inline-flex items-center gap-2 text-slate-300 hover:text-white text-xs font-semibold">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
              Passenger Central Booking Ledger
            </span>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Title & Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              My Passenger Bookings
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Consolidated history of your Reserved Berths, UTS General Tickets, and Platform Passes
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search PNR, station, or pass ID…"
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
            />
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>All Bookings</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px]">
              {totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reserved')}
            className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'reserved'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Train className="w-3.5 h-3.5" />
            <span>Reserved (PNR)</span>
            <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px]">
              {reservedBookings.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('unreserved')}
            className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'unreserved'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>Unreserved (UTS)</span>
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">
              {unreservedTickets.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('platform')}
            className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'platform'
                ? 'border-amber-600 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Platform Passes</span>
            <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px]">
              {platformTickets.length}
            </span>
          </button>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-medium">Fetching verified railway booking records…</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 1. RESERVED BOOKINGS */}
            {(activeTab === 'all' || activeTab === 'reserved') && (
              <div className="space-y-3">
                {activeTab === 'all' && filteredReserved.length > 0 && (
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Reserved Journeys ({filteredReserved.length})
                  </h3>
                )}
                {filteredReserved.map((b, idx) => {
                  const passCount = b?.passengers?.length ?? (b as any)?.total_passengers ?? 1;
                  const totalFare = b?.fare_breakdown?.total_fare ?? (b as any)?.total_fare ?? 0;
                  const trainLabel = `${b?.train_number || ''} ${b?.train_name ? `— ${b.train_name}` : ''}`.trim() || 'Train';
                  const srcLabel = b?.source_station ? `${b.source_station} (${b.source_station_code || ''})` : (b?.source_station_code || 'Origin');
                  const dstLabel = b?.dest_station ? `${b.dest_station} (${b.dest_station_code || ''})` : (b?.dest_station_code || 'Destination');
                  const depTime = b?.departure_time ? formatTime(b.departure_time) : 'Scheduled';
                  const arrTime = b?.arrival_time ? formatTime(b.arrival_time) : 'Scheduled';
                  const passSummary = (b?.passengers && b.passengers.length > 0)
                    ? b.passengers.map((p) => `${p.passenger_name || 'Passenger'} (${p.allocated_seat || p.status || 'Confirmed'})`).join(', ')
                    : `${passCount} Passenger(s)`;

                  return (
                    <div
                      key={b.pnr_number || idx}
                      className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4 hover:border-blue-400 transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                            PNR
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-slate-900 text-base">{b.pnr_number}</span>
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                  b.booking_status === 'CONFIRMED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : b.booking_status === 'WAITING_LIST'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {b.booking_status}
                              </span>
                              <span className="text-xs text-slate-500 font-semibold">· Class {b.class_code}</span>
                            </div>
                            <div className="text-xs font-bold text-slate-800 mt-0.5">
                              {trainLabel}
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex items-center sm:flex-col sm:items-end justify-between">
                          <div className="text-base font-black text-slate-900 font-mono">
                            {formatINR(totalFare)}
                          </div>
                          <div className="text-[11px] text-slate-400 font-medium">
                            Booked on {b.booked_at ? formatDate(b.booked_at) : 'N/A'}
                          </div>
                        </div>
                      </div>

                      {/* Route and Passenger Summary */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                        <div>
                          <span className="text-slate-400 text-[10px] uppercase font-bold">Departure</span>
                          <div className="font-bold text-slate-800 text-sm">
                            {srcLabel}
                          </div>
                          <div className="text-slate-500 font-medium">
                            {b.journey_date ? formatDate(b.journey_date) : ''} at {depTime}
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-400 text-[10px] uppercase font-bold">Arrival</span>
                          <div className="font-bold text-slate-800 text-sm">
                            {dstLabel}
                          </div>
                          <div className="text-slate-500 font-medium">
                            {b.journey_date ? formatDate(b.journey_date) : ''} at {arrTime}
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-400 text-[10px] uppercase font-bold">Passengers & Seats</span>
                          <div className="font-bold text-slate-800">
                            {passCount} Passenger{passCount > 1 ? 's' : ''}
                          </div>
                          <div className="text-slate-500 font-medium truncate">
                            {passSummary}
                          </div>
                        </div>
                      </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        {b.qr_code && (
                          <button
                            type="button"
                            onClick={() =>
                              setQrModalData({
                                title: `PNR: ${b.pnr_number}`,
                                subtitle: `${b.train_number} ${b.train_name}`,
                                qr: b.qr_code!,
                                code: b.pnr_number,
                              })
                            }
                            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-1.5 transition"
                          >
                            <QrCode className="w-3.5 h-3.5 text-blue-600" />
                            <span>View QR</span>
                          </button>
                        )}
                        <Link
                          to={`/ticket?pnr=${b.pnr_number}`}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-1.5 transition"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Full E-Ticket</span>
                        </Link>
                      </div>

                      {b.booking_status !== 'CANCELLED' && (
                        <button
                          type="button"
                          onClick={() => handleInitiateCancel(b)}
                          className="px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 font-semibold flex items-center gap-1.5 transition"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Cancel Ticket</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

            {/* 2. UNRESERVED TICKETS */}
            {(activeTab === 'all' || activeTab === 'unreserved') && (
              <div className="space-y-3">
                {activeTab === 'all' && filteredUnreserved.length > 0 && (
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pt-3">
                    UTS Unreserved Tickets ({filteredUnreserved.length})
                  </h3>
                )}
                {filteredUnreserved.map((u) => (
                  <div
                    key={u.id}
                    className="bg-white rounded-2xl border border-emerald-200/90 shadow-sm p-5 space-y-4 hover:border-emerald-500 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                          UTS
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-slate-900 text-base">{u.ticket_number}</span>
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              {u.booking_status}
                            </span>
                            <span className="text-xs text-slate-500 font-semibold">
                              · {u.train_type.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-slate-800 mt-0.5">
                            {u.source_name} ({u.source_code}) → {u.dest_name} ({u.dest_code})
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex items-center sm:flex-col sm:items-end justify-between">
                        <div className="text-base font-black text-emerald-700 font-mono">
                          {formatINR(u.total_fare)}
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium">
                          Valid until {new Date(u.valid_until).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="text-slate-600">
                        <strong>{u.passenger_count} Passenger{u.passenger_count > 1 ? 's' : ''}:</strong>{' '}
                        {typeof u.passenger_names === 'string' ? u.passenger_names : (u.passenger_names as any || []).join(', ')}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setQrModalData({
                            title: `UTS: ${u.ticket_number}`,
                            subtitle: `${u.source_code} → ${u.dest_code}`,
                            qr: u.qr_code || '',
                            code: u.ticket_number,
                          })
                        }
                        className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-1.5 transition"
                      >
                        <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                        <span>View UTS Pass QR</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 3. PLATFORM PASSES */}
            {(activeTab === 'all' || activeTab === 'platform') && (
              <div className="space-y-3">
                {activeTab === 'all' && filteredPlatform.length > 0 && (
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pt-3">
                    Platform Passes ({filteredPlatform.length})
                  </h3>
                )}
                {filteredPlatform.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white rounded-2xl border border-amber-200/90 shadow-sm p-5 space-y-4 hover:border-amber-500 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                          PLT
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-slate-900 text-base">{p.ticket_number}</span>
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                              {p.booking_status}
                            </span>
                            <span className="text-xs text-slate-500 font-semibold">· Station Entry Pass</span>
                          </div>
                          <div className="text-xs font-bold text-slate-800 mt-0.5">
                            {p.station_name} ({p.station_code})
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex items-center sm:flex-col sm:items-end justify-between">
                        <div className="text-base font-black text-amber-700 font-mono">
                          {formatINR(p.total_fare)}
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium">
                          Strict 2h Window
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="text-slate-600">
                        <strong>Visitor:</strong> {p.visitor_name} ({p.contact_phone || 'N/A'}) · {p.ticket_count} Admitted
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setQrModalData({
                            title: `PLT: ${p.ticket_number}`,
                            subtitle: `Station: ${p.station_name} (${p.station_code})`,
                            qr: p.qr_code || '',
                            code: p.ticket_number,
                          })
                        }
                        className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-1.5 transition"
                      >
                        <QrCode className="w-3.5 h-3.5 text-amber-600" />
                        <span>View Platform QR</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {totalCount === 0 && (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
                <Ticket className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <h3 className="text-base font-bold text-slate-800">No Bookings Found</h3>
                <p className="text-xs text-slate-500 mt-1">
                  You haven’t made any reservations or purchased tickets yet.
                </p>
                <Link
                  to="/app"
                  className="mt-4 inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition"
                >
                  Go to Journey Planner
                </Link>
              </div>
            )}
          </div>
        )}
      </main>

      {/* QR MODAL */}
      {qrModalData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <div className="text-left">
                <h4 className="font-bold text-slate-900 text-sm">{qrModalData.title}</h4>
                <p className="text-[11px] text-slate-500">{qrModalData.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setQrModalData(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-52 h-52 bg-white p-3 rounded-2xl border border-slate-200 mx-auto shadow-inner flex items-center justify-center">
              <img src={qrModalData.qr} alt="Verification QR" className="w-full h-full object-contain" />
            </div>

            <div className="text-xs text-slate-500 font-mono">
              Pass / Verification ID: <strong className="text-slate-800">{qrModalData.code}</strong>
            </div>

            <button
              type="button"
              onClick={() => setQrModalData(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl text-xs transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* CANCELLATION PREVIEW MODAL */}
      {cancellingBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h4 className="font-bold text-slate-900 text-base">Cancel Reserved Journey</h4>
              <button
                type="button"
                onClick={() => setCancellingBooking(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {cancelSuccessMsg ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-center space-y-2">
                <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
                <div className="font-bold text-sm">Ticket Cancelled Successfully!</div>
                <div className="text-xs">{cancelSuccessMsg}</div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                  <div>
                    <strong>PNR:</strong> {cancellingBooking.pnr_number}
                  </div>
                  <div>
                    <strong>Train:</strong> {cancellingBooking.train_number} — {cancellingBooking.train_name}
                  </div>
                  <div>
                    <strong>Journey Date:</strong> {formatDate(cancellingBooking.journey_date)}
                  </div>
                </div>

                {cancelPreview ? (
                  <div className="p-4 bg-red-50/60 border border-red-200 rounded-2xl text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total Fare Paid:</span>
                      <span className="font-bold text-slate-900">{formatINR(cancelPreview.original_fare)}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Statutory Clerkage / Cancellation Fee:</span>
                      <span className="font-bold">- {formatINR(cancelPreview.cancellation_charge)}</span>
                    </div>
                    <div className="pt-2 border-t border-red-200 flex justify-between text-sm">
                      <span className="font-bold text-slate-900">Calculated Refund Amount:</span>
                      <span className="font-black text-emerald-700 font-mono">
                        {formatINR(cancelPreview.refund_amount)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 pt-1">
                      Rule: {cancelPreview.policy_applied}
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-slate-400">
                    <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-1" />
                    Calculating official refund amount…
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCancellingBooking(null)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-xs transition"
                  >
                    Keep Booking
                  </button>
                  <button
                    type="button"
                    disabled={cancelLoading || !cancelPreview}
                    onClick={handleConfirmCancel}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition shadow-md"
                  >
                    {cancelLoading ? 'Cancelling…' : 'Confirm Cancellation'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
