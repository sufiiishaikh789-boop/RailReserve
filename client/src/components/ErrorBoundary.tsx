// ErrorBoundary — Catches React render crashes and presents a diagnostics recovery screen
// Railway Reservation System v3.0 — Team 11, CSE 2271
// Presidency University, Bengaluru
import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, LogIn } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Caught render exception:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoDashboard = (): void => {
    window.location.href = '/app';
  };

  handleGoLogin = (): void => {
    window.location.href = '/login';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || 'An unexpected rendering error occurred.';
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans">
          <div className="w-full max-w-lg bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
            {/* Header Icon */}
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center mb-5 mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            {/* Title & Description */}
            <div className="text-center space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {this.props.fallbackTitle || 'Passenger Portal Recovered'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
                The interface encountered a runtime issue while loading journey data. Your session remains secure.
              </p>
            </div>

            {/* Error Message Box */}
            <div className="mt-5 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-left">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Diagnostic Information
              </div>
              <div className="font-mono text-xs text-red-300 break-words line-clamp-3">
                {errorMsg}
              </div>

              {this.state.errorInfo?.componentStack && (
                <div className="mt-2 pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                    className="text-[10px] text-slate-400 hover:text-slate-200 underline focus:outline-none"
                  >
                    {this.state.showDetails ? 'Hide stack details' : 'Show component stack'}
                  </button>
                  {this.state.showDetails && (
                    <pre className="mt-2 text-[10px] text-slate-500 font-mono whitespace-pre-wrap max-h-36 overflow-y-auto">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-orange-500/20"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry View</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoDashboard}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs flex items-center justify-center gap-2 transition"
              >
                <Home className="w-4 h-4" />
                <span>Home Dashboard</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoLogin}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold text-xs flex items-center justify-center gap-2 transition"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </button>
            </div>

            {/* Footer Notice */}
            <div className="mt-6 text-center text-[10px] text-slate-500">
              RailReserve Team 11 · CSE 2271 Academic Demo · Presidency University
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

