// RegisterPage — new passenger account registration
// Railway Reservation System v3.0 — Team 11, CSE 2271
// Academic Demonstration System — Presidency University, Bengaluru

import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Train, User, Mail, Phone, Lock, Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient, ApiError } from '../api';

export function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  function cleanPhoneNumber(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    // If entered with country code 91 (12 digits) or trunk prefix 0 (11 digits)
    if (digits.length === 12 && digits.startsWith('91') && /^[6-9]/.test(digits.slice(2))) {
      return digits.slice(2);
    }
    if (digits.length === 11 && digits.startsWith('0') && /^[6-9]/.test(digits.slice(1))) {
      return digits.slice(1);
    }
    return digits.slice(0, 10);
  }

  function set(field: keyof typeof form, value: string) {
    const cleanVal = field === 'phone' ? cleanPhoneNumber(value) : value;
    setForm((f) => ({ ...f, [field]: cleanVal }));
    setErrors((e) => ({ ...e, [field]: '' }));
    setGlobalError('');
  }

  // Password strength calculation
  const pwd = form.password;
  const hasMinLength = pwd.length >= 8;
  const hasNumber = /\d/.test(pwd);
  const hasLetter = /[a-zA-Z]/.test(pwd);
  const hasSpecial = /[^a-zA-Z0-9]/.test(pwd);
  const strengthScore = [hasMinLength, hasNumber, hasLetter, hasSpecial].filter(Boolean).length;

  const strengthColor =
    strengthScore <= 1
      ? 'bg-red-500'
      : strengthScore === 2
      ? 'bg-amber-500'
      : strengthScore === 3
      ? 'bg-blue-500'
      : 'bg-emerald-500';

  const strengthLabel =
    strengthScore <= 1
      ? 'Weak'
      : strengthScore === 2
      ? 'Fair'
      : strengthScore === 3
      ? 'Good'
      : 'Strong';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setGlobalError('');
    setSuccessMsg('');
    setErrors({});

    const cleanPhone = cleanPhoneNumber(form.phone);
    const errs: Record<string, string> = {};

    if (!form.full_name.trim() || form.full_name.trim().length < 2) {
      errs.full_name = 'Please enter your full legal name (minimum 2 characters)';
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.email.trim() || !emailPattern.test(form.email.trim())) {
      errs.email = 'Please enter a valid email address (e.g. name@example.com)';
    }

    if (!cleanPhone || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      errs.phone = 'Mobile number must be a valid 10-digit number starting with 6, 7, 8, or 9';
    }

    if (!form.password || form.password.length < 8) {
      errs.password = 'Password must be at least 8 characters long';
    }

    if (form.password !== form.confirm_password) {
      errs.confirm_password = 'Passwords do not match';
    }

    if (!agreedTerms) {
      errs.terms = 'Please accept the academic demonstration terms to proceed';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      const firstError = Object.values(errs)[0];
      setGlobalError(firstError);
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.register({
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: cleanPhone,
        password: form.password,
        confirm_password: form.confirm_password,
      });

      setSuccessMsg(`Welcome, ${res.user.full_name}! Account created. Entering dashboard…`);
      login(res.token, res.user);
      setTimeout(() => {
        navigate('/app');
      }, 700);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.details && err.details.length > 0) {
          const fieldMap: Record<string, string> = {};
          for (const d of err.details) {
            fieldMap[d.field] = d.message;
          }
          setErrors(fieldMap);
          setGlobalError(err.details[0]?.message || err.message);
        } else {
          setGlobalError(err.message);
          if (err.message.toLowerCase().includes('email')) {
            setErrors((prev) => ({ ...prev, email: err.message }));
          } else if (err.message.toLowerCase().includes('phone')) {
            setErrors((prev) => ({ ...prev, phone: err.message }));
          }
        }
      } else if (err instanceof Error) {
        setGlobalError(err.message);
      } else {
        setGlobalError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
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

      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 my-10 transition-all">
        {/* Brand Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 p-7 text-white text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-2xl" />

          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mb-3 shadow-lg shadow-emerald-500/30">
            <Train className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Create Passenger Account</h1>
          <p className="text-emerald-200 text-xs mt-1 font-medium tracking-wide">
            Access Reserved, UTS Unreserved & Platform Ticket Services
          </p>
        </div>

        <div className="p-7">
          {successMsg && (
            <div className="mb-5 flex items-start gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3.5 rounded-xl animate-pulse">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
              <span className="leading-relaxed font-medium">{successMsg}</span>
            </div>
          )}

          {globalError && (
            <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 text-xs p-3.5 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
              <span className="leading-relaxed font-medium">{globalError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => set('full_name', e.target.value)}
                  required
                  autoComplete="name"
                  placeholder="e.g. Rahul Sharma"
                  className={`w-full pl-10 pr-3.5 py-2 text-sm rounded-xl border ${
                    errors.full_name ? 'border-red-400 bg-red-50/50' : 'border-slate-300'
                  } focus:outline-none focus:ring-2 focus:ring-emerald-600 transition`}
                />
              </div>
              {errors.full_name && <p className="text-red-500 text-[11px] mt-1">{errors.full_name}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    className={`w-full pl-10 pr-3.5 py-2 text-sm rounded-xl border ${
                      errors.email ? 'border-red-400 bg-red-50/50' : 'border-slate-300'
                    } focus:outline-none focus:ring-2 focus:ring-emerald-600 transition`}
                  />
                </div>
                {errors.email && <p className="text-red-500 text-[11px] mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Mobile Number
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value.replace(/\D/g, ''))}
                    required
                    autoComplete="tel"
                    placeholder="9876543210"
                    className={`w-full pl-10 pr-3.5 py-2 text-sm rounded-xl border ${
                      errors.phone ? 'border-red-400 bg-red-50/50' : 'border-slate-300'
                    } focus:outline-none focus:ring-2 focus:ring-emerald-600 transition`}
                  />
                </div>
                {errors.phone && <p className="text-red-500 text-[11px] mt-1">{errors.phone}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="Min 8 characters"
                    className={`w-full pl-10 pr-10 py-2 text-sm rounded-xl border ${
                      errors.password ? 'border-red-400 bg-red-50/50' : 'border-slate-300'
                    } focus:outline-none focus:ring-2 focus:ring-emerald-600 transition`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-[11px] mt-1">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <ShieldCheck className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.confirm_password}
                    onChange={(e) => set('confirm_password', e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="Repeat password"
                    className={`w-full pl-10 pr-3.5 py-2 text-sm rounded-xl border ${
                      errors.confirm_password ? 'border-red-400 bg-red-50/50' : 'border-slate-300'
                    } focus:outline-none focus:ring-2 focus:ring-emerald-600 transition`}
                  />
                </div>
                {errors.confirm_password && (
                  <p className="text-red-500 text-[11px] mt-1">{errors.confirm_password}</p>
                )}
              </div>
            </div>

            {/* Password strength indicator */}
            {form.password.length > 0 && (
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center justify-between text-[11px] text-slate-600">
                  <span>
                    Password Strength: <strong className="font-semibold">{strengthLabel}</strong>
                  </span>
                  <span className="text-slate-400">{form.password.length} characters</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    className={`h-full ${strengthColor} transition-all duration-300`}
                    style={{ width: `${(strengthScore / 4) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Terms checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600 select-none">
                <input
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(e) => {
                    setAgreedTerms(e.target.checked);
                    if (errors.terms) setErrors((err) => ({ ...err, terms: '' }));
                  }}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 mt-0.5"
                />
                <span className="leading-relaxed">
                  I understand this is an academic demonstration system for CSE 2271 (Presidency University, Bengaluru) and agree to test terms.
                </span>
              </label>
              {errors.terms && <p className="text-red-500 text-[11px] mt-1">{errors.terms}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm shadow-md transition transform active:scale-[0.99] flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Registering Account…</span>
              ) : (
                <>
                  <span>Create Account & Enter Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-slate-600">
            <span>Already have an account? </span>
            <Link to="/login" className="font-bold text-emerald-600 hover:text-emerald-800 hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
