// PnrStatusPage — Live PNR Status & Passenger Chart Enquiry
// Railway Reservation System v3.0 — Team 11, CSE 2271
// Academic Demonstration System — Presidency University, Bengaluru

import { useState, useEffect, type FormEvent } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  AlertCircle,
  Printer,
  ArrowLeft,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { apiClient } from '../api';
import type { ETicket } from '../types';
import { formatDate, formatTime, formatINR } from '../utils';

export function PnrStatusPage() {
  const [searchParams] = useSearchParams();
  const [pnrInput, setPnrInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [ticket, setTicket] = useState<ETicket | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const searchPnr = async (pnrToQuery: string, emailToQuery?: string) => {
    if (!pnrToQuery.trim()) return;
    setLoading(true);
    setError('');
    setTicket(null);
    try {
      const res = await apiClient.getTicket(pnrToQuery.trim(), emailToQuery?.trim() || undefined);
      setTicket(res.ticket);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PNR not found or invalid');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const qPnr = searchParams.get('pnr');
    if (qPnr) {
      setPnrInput(qPnr);
      searchPnr(qPnr);
    }
  }, [searchParams]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    searchPnr(pnrInput, emailInput);
  };

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
            <Activity className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
              Live PNR Status Enquiry
            </span>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Title */}
        <div className="text-center max-w-xl mx-auto space-y-1">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Check PNR Status</h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            Track current confirmation status, coach position, and berth allocation
          </p>
        </div>

        {/* Search Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Enter 10-Digit PNR Number
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  maxLength={10}
                  value={pnrInput}
                  onChange={(e) => setPnrInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 8492019482"
                  required
                  className="w-full pl-10 pr-3.5 py-3 font-mono text-base font-bold rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 transition tracking-wider"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Contact Email (Optional Verification)
              </label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="passenger@example.com"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading || pnrInput.length < 10}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md transition"
            >
              {loading ? 'Querying Passenger Reservation System…' : 'Get PNR Status'}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* RESULT VIEW */}
        {ticket && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden max-w-2xl mx-auto space-y-6">
            {/* Top Bar */}
            <div className="bg-gradient-to-r from-blue-900 to-slate-900 p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-orange-400">
                  Confirmed Reservation Record
                </div>
                <div className="text-2xl font-black font-mono tracking-tight mt-0.5">
                  PNR {ticket.pnr_number}
                </div>
                <div className="text-xs text-blue-200 font-medium mt-1">
                  {ticket.train_number} — {ticket.train_name}
                </div>
              </div>

              <div className="text-right">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase ${
                    ticket.booking_status === 'CONFIRMED'
                      ? 'bg-emerald-500 text-white'
                      : ticket.booking_status === 'WAITING_LIST'
                      ? 'bg-amber-500 text-white'
                      : 'bg-red-500 text-white'
                  }`}
                >
                  {ticket.booking_status}
                </span>
                <div className="text-[11px] text-slate-400 mt-1">Class: {ticket.class_code}</div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Journey Path */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Boarding From</span>
                  <div className="font-bold text-slate-800 text-sm">
                    {ticket.source_station} ({ticket.source_station_code})
                  </div>
                  <div className="text-slate-500 font-medium">
                    {formatDate(ticket.journey_date)} · {formatTime(ticket.departure_time)}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Destination</span>
                  <div className="font-bold text-slate-800 text-sm">
                    {ticket.dest_station} ({ticket.dest_station_code})
                  </div>
                  <div className="text-slate-500 font-medium">
                    {formatDate(ticket.journey_date)} · {formatTime(ticket.arrival_time)}
                  </div>
                </div>
              </div>

              {/* Chart Status Alert */}
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>
                    <strong>Chart Status:</strong> Chart Prepared 4 Hours Prior to Departure
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase bg-blue-200/80 text-blue-900 px-2 py-0.5 rounded">
                  Active
                </span>
              </div>

              {/* Passenger Berth Breakdown Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Passenger Booking & Current Status
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-600 text-[11px] uppercase font-bold">
                      <tr>
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">Passenger Name</th>
                        <th className="p-2.5">Age/Gender</th>
                        <th className="p-2.5">Booking Status</th>
                        <th className="p-2.5">Coach / Berth</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {ticket.passengers.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold">{idx + 1}</td>
                          <td className="p-2.5 font-bold">{p.passenger_name}</td>
                          <td className="p-2.5 text-slate-500">
                            {p.age} · {p.gender}
                          </td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              {p.status}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono font-bold text-blue-700">
                            {p.allocated_seat || (p.wl_number ? `WL ${p.wl_number}` : 'WAITLIST')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* QR Code & Total Fare */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {ticket.qr_code && (
                    <img
                      src={ticket.qr_code}
                      alt="PNR QR Code"
                      className="w-16 h-16 bg-white p-1 rounded-lg border border-slate-200"
                    />
                  )}
                  <div className="text-xs">
                    <div className="font-bold text-slate-900">Total Transaction Amount</div>
                    <div className="text-xl font-black font-mono text-emerald-700">
                      {formatINR(ticket.fare_breakdown.total_fare)}
                    </div>
                  </div>
                </div>

                <Link
                  to={`/ticket?pnr=${ticket.pnr_number}`}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Full E-Ticket</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
