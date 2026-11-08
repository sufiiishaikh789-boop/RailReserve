// PaymentPage.tsx — Elite Railway Checkout UI/UX
// Railway Reservation System v3.0 — Team 11, CSE 2271
// Academic Demonstration System — Presidency University, Bengaluru

import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  CreditCard,
  Smartphone,
  Building2,
  Wallet,
  ShieldCheck,
  Lock,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Copy,
  FileText,
  Sparkles,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { apiClient } from '../api';
import type { TrainResult, ClassAvailability, FareBreakdown } from '../types';

interface PaymentLocationState {
  bookingId: number;
  pnrNumber: string;
  fareBreakdown: FareBreakdown;
  isWaitingList: boolean;
  train: TrainResult;
  selectedClass: ClassAvailability;
  date: string;
  from: string;
  to: string;
  contactEmail: string;
  contactPhone: string;
  passengers?: Array<{ name: string; age: number; gender: string; berthPreference?: string }>;
}

export type PaymentLifecycleState =
  | 'INITIAL'      // Reviewing checkout, selecting payment method
  | 'ORDER_CREATING' // Calling backend to create gateway/demo order
  | 'PROCESSING'   // Gateway active / processing verification
  | 'SUCCESS'      // Payment verified, ticket confirmed
  | 'FAILED'       // Payment declined / verification failed, hold released
  | 'CANCELLED'    // Payment dismissed / aborted by user
  | 'EXPIRED';     // Hold time exceeded, inventory auto-released

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if ((window as any).Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);
}

export function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as PaymentLocationState | null;

  // Checkout State
  const [paymentState, setPaymentState] = useState<PaymentLifecycleState>('INITIAL');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'NETBANK' | 'WALLET'>('UPI');
  const [gatewayMode, setGatewayMode] = useState<'SANDBOX' | 'DEMO'>('DEMO');
  const [gatewayDisclaimer, setGatewayDisclaimer] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [failureReason, setFailureReason] = useState('');
  const [copiedTxn, setCopiedTxn] = useState(false);

  // Result details
  const [resultData, setResultData] = useState<{
    transactionId: string;
    pnr: string;
    bookingStatus: string;
    amount: number;
    mode: string;
    paidAt: string;
  } | null>(null);

  // Hold Countdown Timer (Seconds remaining)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(600); // 10 minutes default
  const holdIntervalRef = useRef<any>(null);

  // Evaluator Simulation Panel accordion
  const [showSimPanel, setShowSimPanel] = useState(true);

  // Redirect if no booking state
  useEffect(() => {
    if (!state?.bookingId) {
      navigate('/app');
    }
  }, [state, navigate]);

  // Fetch Payment Mode & Order details on mount
  useEffect(() => {
    if (!state?.bookingId) return;
    const currentBookingId = state.bookingId;

    let isMounted = true;
    async function initCheckout() {
      try {
        const modeRes = await apiClient.getPaymentMode();
        if (isMounted) {
          setGatewayMode(modeRes.mode);
          setGatewayDisclaimer(modeRes.disclaimer);
        }

        // Pre-create/probe order to obtain authoritative hold expiration
        const orderRes = await apiClient.createPaymentOrder(currentBookingId);
        if (isMounted && orderRes.hold_expires_at) {
          const expiresMs = new Date(orderRes.hold_expires_at).getTime();
          const remainingSecs = Math.max(0, Math.floor((expiresMs - Date.now()) / 1000));
          setSecondsRemaining(remainingSecs);
        }
      } catch (err) {
        console.warn('Payment init error:', err);
      }
    }

    initCheckout();

    return () => {
      isMounted = false;
    };
  }, [state?.bookingId]);

  // Active Hold Countdown Timer
  useEffect(() => {
    if (paymentState === 'SUCCESS' || paymentState === 'FAILED' || paymentState === 'EXPIRED') {
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
      return;
    }

    holdIntervalRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
          setPaymentState('EXPIRED');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    };
  }, [paymentState]);

  if (!state) return null;
  const booking = state;

  const totalFare = booking.fareBreakdown?.total_fare || 0;
  const baseFare = booking.fareBreakdown?.base_fare_total || Math.round(totalFare * 0.85);
  const resvCharge = booking.fareBreakdown?.reservation_fee || 40;
  const superfastCharge = booking.fareBreakdown?.superfast_surcharge || (totalFare - baseFare - resvCharge);

  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const formattedCountdown = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  // Primary Gateway Checkout Initiation
  async function handleProceedPayment() {
    if (secondsRemaining <= 0) {
      setPaymentState('EXPIRED');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      if (gatewayMode === 'SANDBOX') {
        setPaymentState('ORDER_CREATING');
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          throw new Error('Unable to connect to Razorpay Checkout. Please check your network or try Demo mode.');
        }

        const order = await apiClient.createPaymentOrder(booking.bookingId);
        setPaymentState('PROCESSING');

        const options = {
          key: order.key_id,
          amount: order.amount_paise,
          currency: order.currency || 'INR',
          name: 'RailReserve',
          description: `PNR: ${booking.pnrNumber} · ${booking.train.train_name}`,
          order_id: order.order_id,
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            setPaymentState('PROCESSING');
            try {
              const verifyRes = await apiClient.verifyPayment({
                booking_id: booking.bookingId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });

              if (verifyRes.success) {
                setResultData({
                  transactionId: verifyRes.transaction_id,
                  pnr: booking.pnrNumber,
                  bookingStatus: verifyRes.booking_status,
                  amount: totalFare,
                  mode: 'RAZORPAY_SANDBOX',
                  paidAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                });
                setPaymentState('SUCCESS');
              } else {
                setFailureReason(verifyRes.message || 'Payment signature verification failed');
                setPaymentState('FAILED');
              }
            } catch (err) {
              setFailureReason(err instanceof Error ? err.message : 'Verification failed');
              setPaymentState('FAILED');
            }
          },
          prefill: {
            name: booking.contactEmail ? booking.contactEmail.split('@')[0] : 'Passenger',
            email: booking.contactEmail,
            contact: booking.contactPhone,
          },
          theme: { color: '#0f172a' },
          modal: {
            ondismiss: () => {
              setPaymentState('CANCELLED');
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        // DEMO MODE: Realistic simulation flow
        setPaymentState('PROCESSING');
        setTimeout(async () => {
          try {
            const res = await apiClient.processPayment(booking.bookingId, 'SUCCESS');
            if (res.success) {
              setResultData({
                transactionId: res.transaction_id || `DEMO_TXN_${Date.now()}`,
                pnr: booking.pnrNumber,
                bookingStatus: res.booking_status,
                amount: totalFare,
                mode: 'ACADEMIC_DEMO',
                paidAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              });
              setPaymentState('SUCCESS');
            } else {
              setFailureReason(res.message || 'Payment could not be confirmed');
              setPaymentState('FAILED');
            }
          } catch (err) {
            setFailureReason(err instanceof Error ? err.message : 'Simulation failed');
            setPaymentState('FAILED');
          }
        }, 1200);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not initiate checkout');
      setPaymentState('INITIAL');
    } finally {
      setLoading(false);
    }
  }

  // Academic Simulator Actions
  async function handleSimulationChoice(choice: 'SUCCESS' | 'FAILURE' | 'CANCEL') {
    setLoading(true);
    setErrorMessage('');
    try {
      if (choice === 'CANCEL') {
        await apiClient.processPayment(booking.bookingId, 'CANCEL');
        setPaymentState('CANCELLED');
        return;
      }

      setPaymentState('PROCESSING');
      const res = await apiClient.processPayment(booking.bookingId, choice);
      if (choice === 'SUCCESS' && res.success) {
        setResultData({
          transactionId: res.transaction_id || `TXN_${Date.now()}`,
          pnr: booking.pnrNumber,
          bookingStatus: res.booking_status,
          amount: totalFare,
          mode: 'ACADEMIC_DEMO',
          paidAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        });
        setPaymentState('SUCCESS');
      } else {
        setFailureReason(res.message || 'Payment simulation declined by test bank');
        setPaymentState('FAILED');
      }
    } catch (err) {
      setFailureReason(err instanceof Error ? err.message : 'Payment simulation failed');
      setPaymentState('FAILED');
    } finally {
      setLoading(false);
    }
  }

  function handleCopyTxn(id: string) {
    navigator.clipboard.writeText(id);
    setCopiedTxn(true);
    setTimeout(() => setCopiedTxn(false), 2000);
  }

  // ============================================================
  // RENDER DEDICATED RESULT SCREENS
  // ============================================================

  // 1. SUCCESS RESULT SCREEN
  if (paymentState === 'SUCCESS' && resultData) {
    return (
      <div className="min-h-screen bg-slate-50 py-10 px-4 flex items-center justify-center">
        <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900 p-8 text-white text-center relative">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-400/40">
              <CheckCircle2 className="w-12 h-12 text-emerald-300 animate-bounce" />
            </div>
            <span className="text-[11px] font-semibold tracking-widest uppercase bg-emerald-900/60 text-emerald-300 px-3 py-1 rounded-full border border-emerald-400/20">
              Payment Confirmed · Verified Transaction
            </span>
            <h1 className="text-3xl font-extrabold mt-3 tracking-tight">Payment Successful!</h1>
            <p className="text-emerald-100 text-sm mt-1">
              Your railway reservation has been confirmed and the e-ticket is ready.
            </p>
          </div>

          <div className="p-8 space-y-6">
            {/* Key Payment Meta Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">PNR Number</span>
                <span className="font-mono text-base font-extrabold text-blue-900">{resultData.pnr}</span>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">Amount Paid</span>
                <span className="text-base font-extrabold text-emerald-700">{formatINR(resultData.amount)}</span>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">Booking Status</span>
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                  resultData.bookingStatus === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {resultData.bookingStatus}
                </span>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">Payment Mode</span>
                <span className="text-xs font-bold text-slate-700 uppercase">{resultData.mode}</span>
              </div>
            </div>

            {/* Transaction ID & Receipt strip */}
            <div className="flex items-center justify-between p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-900">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Transaction Ref: <strong className="font-mono">{resultData.transactionId}</strong></span>
              </div>
              <button
                onClick={() => handleCopyTxn(resultData.transactionId)}
                className="text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1"
              >
                {copiedTxn ? <span className="text-emerald-600 font-bold">Copied!</span> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
              </button>
            </div>

            {/* Journey Summary snippet */}
            <div className="border border-slate-200 rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-semibold text-slate-700">{booking.train.train_number} — {booking.train.train_name}</span>
                <span>{booking.date}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-bold text-slate-900">
                <span>{booking.from}</span>
                <span className="text-slate-400 font-normal">────── 🚂 ──────</span>
                <span>{booking.to}</span>
              </div>
              <div className="mt-2 text-xs text-slate-500 flex justify-between">
                <span>Class: <strong>{booking.selectedClass.class_code} ({booking.selectedClass.class_name})</strong></span>
                <span>Contact: <strong>{booking.contactEmail}</strong></span>
              </div>
            </div>

            {/* CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Link
                to="/ticket"
                state={{ pnr: resultData.pnr, email: booking.contactEmail }}
                className="flex-1 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white font-semibold py-3.5 px-6 rounded-xl text-center text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                <span>View & Print E-Ticket</span>
              </Link>
              <Link
                to="/app/bookings"
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-3.5 px-6 rounded-xl text-center text-sm transition flex items-center justify-center gap-2"
              >
                <span>My Bookings</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="text-center text-[11px] text-slate-400 pt-2 border-t border-slate-100">
              Academic Demonstration · Presidency University · CSE 2271 · Team 11
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. FAILED RESULT SCREEN
  if (paymentState === 'FAILED') {
    return (
      <div className="min-h-screen bg-slate-50 py-10 px-4 flex items-center justify-center">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-red-100 overflow-hidden">
          <div className="bg-gradient-to-r from-red-600 to-rose-800 p-8 text-white text-center">
            <div className="w-16 h-16 bg-red-400/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-red-300/30">
              <XCircle className="w-10 h-10 text-red-200" />
            </div>
            <h1 className="text-2xl font-bold">Payment Failed</h1>
            <p className="text-red-100 text-xs mt-1">
              Your transaction could not be processed by the payment provider.
            </p>
          </div>

          <div className="p-7 space-y-5">
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-xs space-y-1">
              <strong className="block font-semibold">Failure Details:</strong>
              <p>{failureReason || 'Simulated bank decline or signature mismatch.'}</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>PNR Reference:</span>
                <strong className="font-mono text-slate-900">{booking.pnrNumber}</strong>
              </div>
              <div className="flex justify-between">
                <span>Inventory Status:</span>
                <span className="text-emerald-700 font-semibold">Held seats safely restored</span>
              </div>
              <div className="flex justify-between">
                <span>Amount:</span>
                <strong className="text-slate-900">{formatINR(totalFare)}</strong>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => {
                  setPaymentState('INITIAL');
                  setFailureReason('');
                }}
                className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-xl text-xs shadow transition flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry Payment</span>
              </button>
              <button
                onClick={() => navigate('/app/reserved')}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-xl text-xs transition"
              >
                Return to Search
              </button>
            </div>

            <div className="text-center text-[11px] text-slate-400">
              Need assistance? Contact 24x7 Rail Madad at <strong>139</strong>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. EXPIRED RESULT SCREEN
  if (paymentState === 'EXPIRED') {
    return (
      <div className="min-h-screen bg-slate-50 py-10 px-4 flex items-center justify-center">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-amber-100 overflow-hidden text-center p-8">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
            <Clock className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Reservation Hold Expired</h1>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            The 10-minute payment hold window for PNR <strong className="font-mono text-slate-800">{booking.pnrNumber}</strong> has elapsed.
            To prevent permanent capacity locking, your held seats have been automatically restored to the available inventory.
          </p>

          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={() => navigate('/app/reserved')}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-xl text-xs transition shadow"
            >
              Re-select Train & Rebook
            </button>
            <button
              onClick={() => navigate('/app')}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-xl text-xs transition"
            >
              Go to Passenger Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. CANCELLED RESULT SCREEN
  if (paymentState === 'CANCELLED') {
    return (
      <div className="min-h-screen bg-slate-50 py-10 px-4 flex items-center justify-center">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden p-8 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-600">
            <AlertTriangle className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Payment Cancelled</h1>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            You aborted the payment gateway transaction. Your reservation hold is still active for another{' '}
            <strong className="text-amber-600">{formattedCountdown}</strong>.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setPaymentState('INITIAL')}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl text-xs transition shadow"
            >
              Resume Payment
            </button>
            <button
              onClick={() => navigate('/app')}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-xl text-xs transition"
            >
              Abandon Booking
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 5. PROCESSING / VERIFYING SCREEN
  if (paymentState === 'PROCESSING' || paymentState === 'ORDER_CREATING') {
    return (
      <div className="min-h-screen bg-slate-900/40 backdrop-blur-sm fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center border border-slate-100 animate-in fade-in zoom-in duration-200">
          <div className="relative w-20 h-20 mx-auto mb-5">
            <div className="absolute inset-0 border-4 border-blue-200 rounded-full animate-ping opacity-25" />
            <div className="w-20 h-20 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Lock className="w-7 h-7 text-blue-700" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Processing Your Payment</h2>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Please do not refresh, close, or navigate away from this window while we verify your transaction with the payment gateway.
          </p>
          <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>256-bit TLS Encrypted Transaction · PNR {booking.pnrNumber}</span>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // MAIN CHECKOUT VIEW: TWO-COLUMN LAYOUT
  // ============================================================
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Breadcrumb & Stepper */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Complete Your Booking</h1>
            <p className="text-xs text-slate-500 mt-0.5">Review your journey and securely complete your payment.</p>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 overflow-x-auto pb-1 md:pb-0">
            <span className="text-slate-400 font-medium">1. Search</span>
            <span className="text-slate-300">›</span>
            <span className="text-slate-400 font-medium">2. Select</span>
            <span className="text-slate-300">›</span>
            <span className="text-slate-400 font-medium">3. Passengers</span>
            <span className="text-slate-300">›</span>
            <span className="bg-blue-900 text-white px-2.5 py-1 rounded-lg font-bold shadow-sm">4. Payment</span>
            <span className="text-slate-300">›</span>
            <span className="text-slate-400 font-medium">5. Ticket</span>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-4 rounded-2xl flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Two-Column Grid: 60% Left / 40% Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ============================================================
              LEFT COLUMN (60%): Payment Method, Checkout, Security
             ============================================================ */}
          <div className="lg:col-span-7 space-y-6">
            {/* Mode Banner */}
            <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
              gatewayMode === 'SANDBOX'
                ? 'bg-purple-50 border-purple-200 text-purple-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 flex-shrink-0 text-amber-600" />
                <div>
                  <strong className="font-semibold block">
                    {gatewayMode === 'SANDBOX' ? 'Razorpay Sandbox Active' : 'Academic Demonstration Mode'}
                  </strong>
                  <span className="text-[11px] opacity-80">{gatewayDisclaimer || 'Simulated payment only. No real money collected.'}</span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase bg-white/60">
                {gatewayMode}
              </span>
            </div>

            {/* Payment Method Selection Card */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-700" />
                  <span>Select Payment Method</span>
                </h2>
                <span className="text-xs text-slate-400">All channels encrypted</span>
              </div>

              {/* 4 Interactive Method Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Method 1: UPI */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('UPI')}
                  className={`p-4 rounded-2xl border text-left transition flex items-start gap-3.5 ${
                    paymentMethod === 'UPI'
                      ? 'border-blue-700 bg-blue-50/40 ring-2 ring-blue-700/20 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl ${paymentMethod === 'UPI' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-900">UPI / QR Code</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Google Pay, PhonePe, Paytm, BHIM</div>
                    <span className="inline-block mt-2 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      ⚡ Fastest & 0% Surcharge
                    </span>
                  </div>
                </button>

                {/* Method 2: Cards */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CARD')}
                  className={`p-4 rounded-2xl border text-left transition flex items-start gap-3.5 ${
                    paymentMethod === 'CARD'
                      ? 'border-blue-700 bg-blue-50/40 ring-2 ring-blue-700/20 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl ${paymentMethod === 'CARD' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-900">Credit / Debit Card</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Visa, MasterCard, RuPay, Maestro</div>
                    <span className="inline-block mt-2 text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                      International cards accepted
                    </span>
                  </div>
                </button>

                {/* Method 3: Net Banking */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('NETBANK')}
                  className={`p-4 rounded-2xl border text-left transition flex items-start gap-3.5 ${
                    paymentMethod === 'NETBANK'
                      ? 'border-blue-700 bg-blue-50/40 ring-2 ring-blue-700/20 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl ${paymentMethod === 'NETBANK' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-900">Net Banking</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">SBI, HDFC, ICICI, Axis, PNB & 50+ Banks</div>
                    <span className="inline-block mt-2 text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                      Direct retail banking
                    </span>
                  </div>
                </button>

                {/* Method 4: Wallets */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('WALLET')}
                  className={`p-4 rounded-2xl border text-left transition flex items-start gap-3.5 ${
                    paymentMethod === 'WALLET'
                      ? 'border-blue-700 bg-blue-50/40 ring-2 ring-blue-700/20 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl ${paymentMethod === 'WALLET' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-900">Wallets & PayLater</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Paytm, Mobikwik, Amazon Pay</div>
                    <span className="inline-block mt-2 text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                      Instant 1-tap checkout
                    </span>
                  </div>
                </button>
              </div>

              {/* Primary Payment Action CTA */}
              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleProceedPayment}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 hover:from-blue-950 hover:to-indigo-950 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-blue-900/20 transition transform active:scale-[0.99] flex items-center justify-between text-sm disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-400" />
                    <span>Pay {formatINR(totalFare)} Securely</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-blue-200">
                    <span>via {paymentMethod}</span>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </div>
                </button>
                <p className="text-[11px] text-center text-slate-400 mt-2">
                  🔒 By completing this transaction, you agree to IRCTC standard passenger ticketing guidelines.
                </p>
              </div>
            </div>

            {/* Academic Evaluator Simulation Panel (CSE 2271) */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md border border-slate-800 space-y-4">
              <div
                className="flex items-center justify-between cursor-pointer select-none"
                onClick={() => setShowSimPanel(!showSimPanel)}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Academic Evaluator Demo Controls (CSE 2271)
                  </h3>
                </div>
                {showSimPanel ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              </div>

              {showSimPanel && (
                <div className="space-y-3 pt-1 border-t border-slate-800 text-xs">
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Test the complete booking lifecycle and inventory release mechanism directly without configuring merchant gateway keys:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleSimulationChoice('SUCCESS')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Simulate Success</span>
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleSimulationChoice('FAILURE')}
                      className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Simulate Decline</span>
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleSimulationChoice('CANCEL')}
                      className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Simulate Cancel</span>
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-400 text-center">
                    Simulating decline/failure automatically verifies inventory reversal in <code>seat_inventory</code>.
                  </div>
                </div>
              )}
            </div>

            {/* Security & Trust Guarantee */}
            <div className="grid grid-cols-3 gap-3 text-center text-slate-600 text-[11px] bg-white p-4 rounded-2xl border border-slate-200/80">
              <div className="flex flex-col items-center gap-1">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span className="font-semibold text-slate-800">256-bit SSL</span>
                <span className="text-[10px] text-slate-400">Encrypted checkout</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Lock className="w-5 h-5 text-blue-700" />
                <span className="font-semibold text-slate-800">No Raw Credentials</span>
                <span className="text-[10px] text-slate-400">PCI-DSS delegated</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <RefreshCw className="w-5 h-5 text-indigo-600" />
                <span className="font-semibold text-slate-800">Instant Refunds</span>
                <span className="text-[10px] text-slate-400">Automated cancellation</span>
              </div>
            </div>
          </div>

          {/* ============================================================
              RIGHT COLUMN (40%): Sticky Itinerary, Countdown, Fare Breakdown
             ============================================================ */}
          <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-6">
            {/* Hold Expiry Countdown Banner */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-sm ${
              secondsRemaining < 120
                ? 'bg-red-50 border-red-200 text-red-900 animate-pulse'
                : 'bg-amber-50/80 border-amber-200 text-amber-900'
            }`}>
              <div className="flex items-center gap-2.5">
                <Clock className={`w-5 h-5 ${secondsRemaining < 120 ? 'text-red-600' : 'text-amber-600'}`} />
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider block">Seat Hold Expiry</span>
                  <span className="text-xs text-slate-600">Inventory reserved for</span>
                </div>
              </div>
              <span className="font-mono text-xl font-extrabold tracking-tight">
                {formattedCountdown}
              </span>
            </div>

            {/* Travel Itinerary Summary Card */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Journey Itinerary</span>
                <span className="font-mono text-xs font-extrabold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  PNR: {booking.pnrNumber}
                </span>
              </div>

              {/* Route */}
              <div>
                <div className="flex items-center justify-between text-base font-extrabold text-slate-900">
                  <span>{booking.from}</span>
                  <span className="text-xs text-slate-400 font-normal">──────── 🚆 ────────</span>
                  <span>{booking.to}</span>
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                  <span>{booking.train.train_number} · {booking.train.train_name}</span>
                  <span className="font-semibold text-slate-700">{booking.date}</span>
                </div>
              </div>

              {/* Class & Quota Pill */}
              <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                <span>Class: <strong>{booking.selectedClass.class_code} ({booking.selectedClass.class_name})</strong></span>
                <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                  booking.isWaitingList ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {booking.isWaitingList ? 'Waitlist Allocation' : 'Confirmed Allocation'}
                </span>
              </div>

              {/* Passengers list */}
              {booking.passengers && booking.passengers.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Passengers ({booking.passengers.length})
                  </span>
                  <div className="space-y-1">
                    {booking.passengers.map((p, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs text-slate-700">
                        <span>{idx + 1}. {p.name}</span>
                        <span className="text-slate-400 text-[11px]">{p.age}y · {p.gender} · {p.berthPreference || 'ANY'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fare Breakdown */}
              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Fare Breakdown
                </span>
                <div className="flex justify-between text-slate-600">
                  <span>Base Journey Fare</span>
                  <span>{formatINR(baseFare)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Reservation & Safety Charge</span>
                  <span>{formatINR(resvCharge)}</span>
                </div>
                {superfastCharge > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Superfast Supplementary Charge</span>
                    <span>{formatINR(superfastCharge)}</span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline">
                  <div>
                    <span className="font-extrabold text-sm text-slate-900 block">Total Payable</span>
                    <span className="text-[10px] text-slate-400">All taxes & railway fees included</span>
                  </div>
                  <div className="text-2xl font-black text-blue-900 tracking-tight">
                    {formatINR(totalFare)}
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px] text-slate-500 space-y-0.5">
                <div className="flex justify-between">
                  <span>E-Ticket Delivery:</span>
                  <strong className="text-slate-700">{booking.contactEmail}</strong>
                </div>
                <div className="flex justify-between">
                  <span>SMS Updates:</span>
                  <strong className="text-slate-700">{booking.contactPhone}</strong>
                </div>
              </div>

              {/* Safe Navigation Back */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="text-xs text-slate-500 hover:text-slate-800 transition inline-flex items-center gap-1 font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Modify passenger details or class</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
