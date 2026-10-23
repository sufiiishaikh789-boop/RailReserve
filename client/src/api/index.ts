// Typed API client functions — all HTTP calls go through here
import type {
  Station, TrainResult, BookingCreatedResponse,
  ETicket, CancellationPreview, PassengerInput, ClassCode
} from '../types';

const BASE_URL = '/api';

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data.message || data.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export const apiClient = {
  // Stations
  getStations: () => api<{ success: true; stations: Station[] }>('/stations'),

  // Train search
  searchTrains: (from: string, to: string, date: string) =>
    api<{ success: true; count: number; trains: TrainResult[] }>(
      `/trains/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${date}`
    ),

  // Bookings
  createBooking: (body: {
    schedule_id: number;
    source_station_code: string;
    dest_station_code: string;
    class_code: ClassCode;
    passengers: PassengerInput[];
    contact_email: string;
    contact_phone: string;
    idempotency_key: string;
  }) => api<BookingCreatedResponse>('/bookings', { method: 'POST', body: JSON.stringify(body) }),

  processPayment: (bookingId: number, outcome: 'SUCCESS' | 'FAILURE' | 'CANCEL') =>
    api<{ success: boolean; booking_status: string; payment_status: string; transaction_id?: string; message: string }>(
      `/bookings/${bookingId}/payment`,
      { method: 'POST', body: JSON.stringify({ outcome }) }
    ),

  getTicket: (pnr: string, email?: string, phone?: string) => {
    const params = new URLSearchParams();
    if (email) params.set('email', email);
    if (phone) params.set('phone', phone);
    const query = params.toString() ? `?${params}` : '';
    return api<{ success: true; ticket: ETicket }>(`/bookings/pnr/${encodeURIComponent(pnr)}${query}`);
  },

  getBookingHistory: (email: string, phone?: string) => {
    const params = new URLSearchParams({ email });
    if (phone) params.set('phone', phone);
    return api<{ success: true; bookings: ETicket[] }>(`/bookings?${params}`);
  },

  getCancellationPreview: (pnr: string) =>
    api<{ success: true; preview: CancellationPreview }>(`/bookings/${pnr}/cancellation-preview`),

  cancelBooking: (pnr: string, contact_email: string, contact_phone?: string) =>
    api<{ success: true; cancellation: { cancellation_reference: string; refund_amount: number; message: string } }>(
      `/bookings/${pnr}/cancel`,
      { method: 'POST', body: JSON.stringify({ contact_email, contact_phone }) }
    ),

  // Admin
  adminLogin: (username: string, password: string) =>
    api<{ success: true; token: string; username: string; role: string }>('/admin/login', {
      method: 'POST', body: JSON.stringify({ username, password })
    }),

  getAdminDashboard: (token: string) =>
    api<{ success: true; stats: { totalBookings: number; confirmedBookings: number; waitingList: number; cancelled: number; totalRevenue: number }; trains: number; recent_audit_logs: unknown[] }>(
      '/admin/dashboard',
      { headers: { Authorization: `Bearer ${token}` } }
    ),

  getAdminBookings: (token: string) =>
    api<{ success: true; bookings: ETicket[] }>('/admin/bookings', {
      headers: { Authorization: `Bearer ${token}` }
    }),
};
