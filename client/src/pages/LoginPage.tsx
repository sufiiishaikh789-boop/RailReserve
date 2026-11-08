// LoginPage — passenger sign in
// Railway Reservation System v3.0 — Team 11, CSE 2271
// Academic Demonstration System — Presidency University, Bengaluru

import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Train, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, Shield, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiClient.login(email.trim().toLowerCase(), password);
      login(res.token, res.user);
      if (rememberMe) {
        localStorage.setItem('railreserve_remember_email', email.trim());
      } else {
        localStorage.removeItem('railreserve_remember_email');
      }
      navigate('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  // Quick fill helper for CSE 2271 evaluators
  function handleDemoFill() {
    setEmail('rahul.sharma@example.com');
    setPassword('Password@123');
    setError('');
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: `linear-gradient(rgba(10, 15, 30, 0.85), rgba(15, 23, 42, 0.94)), url('/images/auth-railway-bg.svg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Top Academic Banner */}
      <div className="absolute top-0 inset-x-0 bg-slate-900/80 backdrop-blur-md border-b border-white/10 px-4 py-2 text-center">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-amber-400">
          Academic Project Demonstration · Team 11 · CSE 2271 · Presidency University
        </span>
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 my-10 transition-all">
        {/* Brand Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-8 text-white text-center relative overflow-hidden">
          {/* Subtle glow circle */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/20 rounded-full blur-2xl" />
          
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl mb-4 shadow-lg shadow-orange-500/30">
            <Train className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">RailReserve</h1>
          <p className="text-blue-200 text-xs mt-1 font-medium tracking-wide">
            Next-Generation Indian Railway Passenger Portal
          </p>
        </div>

        <div className="p-8">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-slate-900">Welcome Back</h2>
            <p className="text-xs text-slate-500 mt-1">
              Sign in to manage journeys, UTS tickets, and platform passes
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 text-xs p-3.5 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Email Address
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
                  autoComplete="email"
                  placeholder="passenger@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Your secure password"
                  className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span>Remember my credentials</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-800 hover:to-indigo-800 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm shadow-md transition transform active:scale-[0.99] flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Signing In…</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo quick fill button */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleDemoFill}
              className="w-full py-2 px-3 text-xs font-medium text-slate-600 hover:text-blue-700 bg-slate-50 hover:bg-blue-50/50 rounded-xl border border-dashed border-slate-200 transition flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Fill Seeded Demo Passenger Credentials</span>
            </button>
          </div>

          <div className="mt-6 text-center text-xs text-slate-600">
            <span>New passenger? </span>
            <Link to="/register" className="font-bold text-blue-600 hover:text-blue-800 hover:underline">
              Create an Account
            </Link>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <Link to="/admin/login" className="hover:text-slate-600 inline-flex items-center gap-1">
              <Shield className="w-3 h-3 text-slate-400" />
              Admin Portal
            </Link>
            <span>v3.0.0 · Team 11</span>
          </div>
        </div>
      </div>
    </div>
  );
}
