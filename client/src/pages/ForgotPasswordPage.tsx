// ForgotPasswordPage — passenger password recovery
// Railway Reservation System v3.0 — Team 11, CSE 2271
// Academic Demonstration System — Presidency University, Bengaluru

import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Train, Mail, ArrowLeft, KeyRound, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { apiClient } from '../api';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<{ message: string; demo_token?: string; demo_reset_token?: string } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSuccessData(null);
    try {
      const res = await apiClient.forgotPassword(email.trim().toLowerCase());
      setSuccessData({
        message: res.message,
        demo_token: res.demo_token,
        demo_reset_token: res.demo_token,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: `linear-gradient(rgba(10, 15, 30, 0.88), rgba(15, 23, 42, 0.95)), url('/images/auth-railway-bg.svg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100">
        {/* Top decorative header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 p-6 text-white text-center relative">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/15 backdrop-blur-md rounded-2xl mb-3 shadow-inner">
            <KeyRound className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Forgot Password?</h1>
          <p className="text-amber-100 text-xs mt-1 font-medium">
            RailReserve Passenger Account Recovery
          </p>
        </div>

        <div className="p-7">
          {error && (
            <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 text-sm p-3.5 rounded-xl">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {successData ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm p-4 rounded-xl">
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600" />
                <div>
                  <div className="font-semibold text-emerald-900">Reset Instructions Sent!</div>
                  <div className="text-xs text-emerald-700 mt-1">{successData.message}</div>
                </div>
              </div>

              {successData.demo_reset_token && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-1">
                    Demo Environment Active Token
                  </div>
                  <div className="text-xs text-amber-700 mb-2">
                    In this academic demonstration environment, your reset token is displayed below:
                  </div>
                  <div className="font-mono text-xs bg-white border border-amber-200 px-3 py-2 rounded-lg text-slate-800 select-all break-all font-semibold">
                    {successData.demo_reset_token}
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/reset-password?token=${encodeURIComponent(successData.demo_reset_token!)}`)}
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 px-4 rounded-lg text-xs transition"
                  >
                    <span>Proceed to Reset Password with this Token</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="pt-2 text-center">
                <Link
                  to="/login"
                  className="text-sm font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Enter your registered passenger email address. We will verify your account and issue a secure password reset token.
              </p>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Registered Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="name@example.com"
                    autoComplete="email"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm shadow-md transition transform active:scale-[0.99]"
              >
                {loading ? 'Verifying Account…' : 'Generate Reset Token'}
              </button>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <Link to="/login" className="hover:text-slate-800 font-medium inline-flex items-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Sign In
                </Link>
                <Link to="/register" className="hover:text-amber-600 font-medium">
                  Create new account
                </Link>
              </div>
            </form>
          )}

          {/* Academic Demonstration watermark */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
              <Train className="w-3.5 h-3.5 text-orange-500" />
              <span>RailReserve · Team 11 · CSE 2271</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
