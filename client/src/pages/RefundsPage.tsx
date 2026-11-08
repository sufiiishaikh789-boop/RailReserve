// RefundsPage — Indian Railway Cancellation Rules, Refund Matrix & Calculator
// Railway Reservation System v3.0 — Team 11, CSE 2271
// Academic Demonstration System — Presidency University, Bengaluru

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  RotateCcw,
  ArrowLeft,
  Calculator,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api';
import type { ETicket } from '../types';
import { formatINR, formatDate } from '../utils';

export function RefundsPage() {
  const { token } = useAuth();
  const [cancelledBookings, setCancelledBookings] = useState<ETicket[]>([]);

  // Calculator State
  const [calcClass, setCalcClass] = useState('3A');
  const [calcFare, setCalcFare] = useState(1200);
  const [calcTiming, setCalcTiming] = useState<'48h_plus' | '12_to_48h' | '4_to_12h' | 'under_4h' | 'wl'>('48h_plus');

  useEffect(() => {
    if (!token) return;
    apiClient
      .getMyBookings(token)
      .then((res) => {
        setCancelledBookings((res.bookings || []).filter((b) => b.booking_status === 'CANCELLED'));
      })
      .catch(() => {
        /* silent */
      });
  }, [token]);

  // Refund calculation logic
  const calculateEstimate = () => {
    const clerkageMap: Record<string, number> = {
      '1A': 240,
      '2A': 200,
      '3A': 180,
      CC: 180,
      SL: 120,
      '2S': 60,
    };
    const minClerkage = clerkageMap[calcClass] || 120;

    if (calcTiming === 'wl') {
      const fee = 60;
      return { fee, refund: Math.max(0, calcFare - fee), percent: Math.round(((calcFare - fee) / calcFare) * 100) };
    }
    if (calcTiming === '48h_plus') {
      const fee = minClerkage;
      return { fee, refund: Math.max(0, calcFare - fee), percent: Math.round(((calcFare - fee) / calcFare) * 100) };
    }
    if (calcTiming === '12_to_48h') {
      const fee = Math.max(minClerkage, Math.round(calcFare * 0.25));
      return { fee, refund: Math.max(0, calcFare - fee), percent: 75 };
    }
    if (calcTiming === '4_to_12h') {
      const fee = Math.max(minClerkage, Math.round(calcFare * 0.5));
      return { fee, refund: Math.max(0, calcFare - fee), percent: 50 };
    }
    // under_4h (after chart preparation)
    return { fee: calcFare, refund: 0, percent: 0 };
  };

  const estimate = calculateEstimate();

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      {/* Top Header */}
      <div className="bg-slate-900 border-b border-slate-800 text-white py-3.5 px-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/app" className="inline-flex items-center gap-2 text-slate-300 hover:text-white text-xs font-semibold">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-red-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-red-400">
              Cancellation & Refund Protocol
            </span>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Indian Railways Refund Policy & Calculator
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
            Transparent breakdown of statutory clerkage fees, deduction slabs, and refund timelines
          </p>
        </div>

        {/* 1. Official Deduction Rules Matrix */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Standard IRCTC Cancellation Rules</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
              <div className="font-bold text-emerald-900 text-sm">&gt; 48 Hours Before</div>
              <p className="text-slate-600 leading-relaxed">
                Flat clerkage fee per passenger deducted. 1A: ₹240, 2A: ₹200, 3A: ₹180, SL: ₹120, 2S: ₹60.
              </p>
              <div className="text-emerald-700 font-bold text-[11px]">Maximum Refund (~90-95%)</div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-2">
              <div className="font-bold text-blue-900 text-sm">12 to 48 Hours Before</div>
              <p className="text-slate-600 leading-relaxed">
                25% of the total base fare deducted, subject to minimum statutory clerkage fee per passenger.
              </p>
              <div className="text-blue-700 font-bold text-[11px]">75% Fare Refunded</div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
              <div className="font-bold text-amber-900 text-sm">4 to 12 Hours Before</div>
              <p className="text-slate-600 leading-relaxed">
                50% of the total base fare deducted prior to charting or up to 4 hours before scheduled departure.
              </p>
              <div className="text-amber-700 font-bold text-[11px]">50% Fare Refunded</div>
            </div>

            <div className="p-4 rounded-2xl bg-red-50/70 border border-red-200 space-y-2">
              <div className="font-bold text-red-900 text-sm">&lt; 4 Hours (Post Chart)</div>
              <p className="text-slate-600 leading-relaxed">
                No refund admissible on confirmed tickets after chart preparation or inside 4 hours of departure.
              </p>
              <div className="text-red-700 font-bold text-[11px]">0% Refund Admissible</div>
            </div>
          </div>
        </section>

        {/* 2. Interactive Refund Calculator */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-bold text-slate-900">Interactive Cancellation Estimator</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4 md:col-span-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Travel Class
                  </label>
                  <select
                    value={calcClass}
                    onChange={(e) => setCalcClass(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="1A">AC First Class (1A)</option>
                    <option value="2A">AC 2 Tier (2A)</option>
                    <option value="3A">AC 3 Tier (3A)</option>
                    <option value="CC">AC Chair Car (CC)</option>
                    <option value="SL">Sleeper Class (SL)</option>
                    <option value="2S">Second Sitting (2S)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Ticket Fare Paid (₹)
                  </label>
                  <input
                    type="number"
                    min={100}
                    max={10000}
                    step={50}
                    value={calcFare}
                    onChange={(e) => setCalcFare(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Time of Cancellation
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setCalcTiming('48h_plus')}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      calcTiming === '48h_plus'
                        ? 'bg-blue-600 text-white border-blue-600 font-bold'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div>&gt; 48h Before</div>
                    <div className="text-[10px] opacity-80">Flat Clerkage</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCalcTiming('12_to_48h')}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      calcTiming === '12_to_48h'
                        ? 'bg-blue-600 text-white border-blue-600 font-bold'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div>12h – 48h Before</div>
                    <div className="text-[10px] opacity-80">25% Deduction</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCalcTiming('4_to_12h')}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      calcTiming === '4_to_12h'
                        ? 'bg-blue-600 text-white border-blue-600 font-bold'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div>4h – 12h Before</div>
                    <div className="text-[10px] opacity-80">50% Deduction</div>
                  </button>
                </div>
              </div>
            </div>

            {/* Estimated Calculation Summary */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-blue-950 text-white flex flex-col justify-between space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400">
                  Estimated Refund
                </span>
                <div className="text-3xl font-black font-mono text-emerald-400 mt-1">
                  {formatINR(estimate.refund)}
                </div>
                <div className="text-xs text-blue-200 mt-1">
                  ({estimate.percent}% of ticket fare)
                </div>
              </div>

              <div className="border-t border-white/10 pt-3 space-y-1 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Deduction Fee:</span>
                  <span className="text-red-400 font-bold font-mono">- {formatINR(estimate.fee)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Credit Speed:</span>
                  <span className="text-white font-semibold">Instant (Demo Sandbox)</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Your Cancelled Bookings */}
        {cancelledBookings.length > 0 && (
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Your Cancelled Bookings History</h2>
            <div className="space-y-3">
              {cancelledBookings.map((b, idx) => (
                <div
                  key={b.pnr_number || idx}
                  className="p-4 rounded-2xl border border-red-200 bg-red-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{b.pnr_number}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 uppercase">
                        Cancelled
                      </span>
                    </div>
                    <div className="text-slate-700 font-medium mt-1">
                      {b.train_number} — {b.train_name} ({b.source_station_code} → {b.dest_station_code})
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-slate-900">{formatINR(b.fare_breakdown.total_fare)}</div>
                    <div className="text-[11px] text-slate-400">Date: {formatDate(b.journey_date)}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
