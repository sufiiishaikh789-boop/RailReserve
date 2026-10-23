// Typed API client v2.0 — all HTTP calls go through here
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
  // Stations — full list
  getStations: () => api<{ success: true; stations: Station[] }>('/stations'),

  // Station autocomplete — partial search
  autocompleteStations: (q: string) =>
    api<{ success: true; stations: Station[] }>(`/stations/autocomplete?q=${encodeURIComponent(q)}`),

  // Train search with optional filters
  searchTrains: (from: string, to: string, date: string, sort?: string, filterClass?: string, filterAvail?: string) => {
    const params = new URLSearchParams({ from, to, date });
    if (sort)        params.set('sort', sort);
    if (filterClass) params.set('filter_class', filterClass);
    if (filterAvail) params.set('filter_avail', filterAvail);
    return api<{ success: true; count: number; trains: TrainResult[] }>(`/trains/search?${params}`);
  },

  // Train intermediate stops
  getTrainStops: (trainId: number) =>
    api<{ success: true; stops: Array<{
      stop_sequence: number; station_code: string; station_name: string; city: string;
      arrival_time: string | null; departure_time: string | null; day_offset: number; distance_km: number;
    }> }>(`/trains/${trainId}/stops`),

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
    api<{
      success: true;
      stats: { totalBookings: number; confirmedBookings: number; waitingList: number; cancelled: number; totalRevenue: number };
      trains: number;
      recent_audit_logs: unknown[];
    }>('/admin/dashboard', { headers: { Authorization: `Bearer ${token}` } }),

  getAdminBookings: (token: string, status?: string, limit = 50, offset = 0) => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (status) params.set('status', status);
    return api<{ success: true; bookings: ETicket[]; count: number }>(`/admin/bookings?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  getAdminAuditLogs: (token: string, limit = 50) =>
    api<{ success: true; total: number; logs: unknown[] }>(`/admin/audit-logs?limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  updateInventory: (token: string, scheduleId: number, classCode: string, seats: number) =>
    api('/admin/inventory/' + scheduleId + '/' + classCode, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ available_seats: seats })
    }),
};
