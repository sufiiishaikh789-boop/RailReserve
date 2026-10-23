// Utility functions for the client
import type { ClassCode, BookingStatus, PassengerStatus } from '../types';

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m > 0 ? `${m}m` : ''}`.trim();
}

export function formatDate(isoDate: string): string {
  if (!isoDate) return '';
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(time: string): string {
  if (!time || time === 'N/A') return time;
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function getBookingStatusLabel(status: BookingStatus): { label: string; className: string } {
  switch (status) {
    case 'CONFIRMED':     return { label: 'Confirmed', className: 'badge-confirmed' };
    case 'WAITING_LIST':  return { label: 'Waiting List', className: 'badge-wl' };
    case 'CANCELLED':     return { label: 'Cancelled', className: 'badge-cancelled' };
    case 'PENDING_PAYMENT': return { label: 'Pending Payment', className: 'badge-pending' };
    case 'FAILED':        return { label: 'Failed', className: 'badge-cancelled' };
    default:              return { label: status, className: 'badge-pending' };
  }
}

export function getPassengerStatusLabel(status: PassengerStatus): { label: string; className: string } {
  switch (status) {
    case 'CONFIRMED':    return { label: 'CNF', className: 'badge-confirmed' };
    case 'WAITING_LIST': return { label: 'WL', className: 'badge-wl' };
    case 'CANCELLED':    return { label: 'CXL', className: 'badge-cancelled' };
    default:             return { label: 'PNR', className: 'badge-pending' };
  }
}

export function getTrainTypeBadge(type: string): string {
  switch (type) {
    case 'SUPERFAST': return 'badge badge-superfast';
    case 'EXPRESS':   return 'badge badge-express';
    case 'MAIL':      return 'badge badge-mail';
    default:          return 'badge badge-passenger';
  }
}


export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function getMinDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export function getMaxDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 120);
  return d.toISOString().split('T')[0];
}

export function generateIdempotencyKey(): string {
  return `IK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function classCodeColor(code: ClassCode): { bg: string; text: string } {
  const map: Record<ClassCode, { bg: string; text: string }> = {
    '1A': { bg: '#fef3c7', text: '#92400e' },
    '2A': { bg: '#dbeafe', text: '#1e40af' },
    '3A': { bg: '#ede9fe', text: '#5b21b6' },
    'SL': { bg: '#d1fae5', text: '#065f46' },
    'CC': { bg: '#fce7f3', text: '#9d174d' },
    '2S': { bg: '#f1f5f9', text: '#334155' },
  };
  return map[code] || { bg: '#f1f5f9', text: '#334155' };
}
