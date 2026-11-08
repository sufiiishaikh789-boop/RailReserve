// Typed API client v2.0 — all HTTP calls go through here
import type {
  Station, TrainResult, BookingCreatedResponse,
  ETicket, CancellationPreview, PassengerInput, ClassCode
} from '../types';

const BASE_URL = '/api';

export class ApiError extends Error {
  status: number;
  details?: Array<{ field: string; message: string }>;

  constructor(message: string, status: number, details?: Array<{ field: string; message: string }>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('railreserve_token') : null;
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders, ...options?.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data.message || data.error || `HTTP ${res.status}`;
    throw new ApiError(msg, res.status, data.details);
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

  // ── Payment Endpoints (v3.0 — Razorpay Sandbox & Demo) ────
  getPaymentMode: () =>
    api<{ success: true; mode: 'SANDBOX' | 'DEMO'; disclaimer: string }>('/payments/mode'),

  createPaymentOrder: (bookingId: number) =>
    api<{
      success: true;
      mode: 'SANDBOX' | 'DEMO';
      order_id: string;
      amount_paise: number;
      amount_rupees?: number;
      currency: string;
      key_id: string;
      receipt: string;
      disclaimer: string;
      pnr_number?: string;
      contact_email?: string;
      contact_phone?: string;
      hold_expires_at?: string;
    }>('/payments/create-order', {
      method: 'POST',
      body: JSON.stringify({ booking_id: bookingId }),
    }),

  verifyPayment: (data: {
    booking_id: number;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) =>
    api<{
      success: boolean;
      mode: 'SANDBOX' | 'DEMO';
      transaction_id: string;
      booking_status: string;
      payment_status: string;
      message: string;
    }>('/payments/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

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

  updateInventory: (token: string, scheduleId: number, classCode: string, totalSeats: number, maxWaitingList?: number) =>
    api('/admin/inventory/' + scheduleId + '/' + classCode, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        ...(totalSeats !== undefined ? { total_seats: totalSeats } : {}),
        ...(maxWaitingList !== undefined ? { max_waiting_list: maxWaitingList } : {}),
      })
    }),

  // ── Passenger Auth ─────────────────────────────────────────
  register: (data: { full_name: string; email: string; phone: string; password: string; confirm_password: string }) =>
    api<{ success: true; token: string; user: { id: number; full_name: string; email: string; phone: string } }>(
      '/auth/register', { method: 'POST', body: JSON.stringify(data) }
    ),

  login: (email: string, password: string) =>
    api<{ success: true; token: string; user: { id: number; full_name: string; email: string; phone: string; unread_notifications: number } }>(
      '/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }
    ),

  getAuthProfile: (token: string) =>
    api<{ success: true; user: { id: number; full_name: string; email: string; phone: string; created_at: string; unread_notifications: number } }>(
      '/auth/me', { headers: { Authorization: `Bearer ${token}` } }
    ),

  updateProfile: (token: string, data: { full_name?: string; phone?: string }) =>
    api<{ success: true; user: { id: number; full_name: string; email: string; phone: string } }>(
      '/auth/profile', { method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(data) }
    ),

  changePassword: (token: string, data: { current_password: string; new_password: string; confirm_new_password: string }) =>
    api<{ success: true; message: string }>(
      '/auth/change-password', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(data) }
    ),

  getDashboard: (token: string) =>
    api<{
      success: true;
      summary: { total_bookings: number; upcoming: number; completed: number; cancelled: number };
      upcoming_journeys: ETicket[];
      recent_bookings: ETicket[];
      notifications: Array<{ id: number; type: string; title: string; message: string; booking_id: number | null; is_read: number; created_at: string }>;
      unread_notifications: number;
    }>('/auth/dashboard', { headers: { Authorization: `Bearer ${token}` } }),

  getMyBookings: (token: string) =>
    api<{ success: true; count: number; bookings: ETicket[] }>(
      '/auth/bookings', { headers: { Authorization: `Bearer ${token}` } }
    ),

  getSavedPassengers: (token: string) =>
    api<{ success: true; passengers: Array<{ id: number; passenger_name: string; age: number; gender: string; berth_preference: string }> }>(
      '/auth/saved-passengers', { headers: { Authorization: `Bearer ${token}` } }
    ),

  addSavedPassenger: (token: string, data: { passenger_name: string; age: number; gender: string; berth_preference?: string }) =>
    api<{ success: true; passenger: { id: number; passenger_name: string; age: number; gender: string; berth_preference: string } }>(
      '/auth/saved-passengers', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(data) }
    ),

  deleteSavedPassenger: (token: string, passengerId: number) =>
    api<{ success: true; message: string }>(
      `/auth/saved-passengers/${passengerId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
    ),

  getNotifications: (token: string, limit = 20) =>
    api<{ success: true; notifications: Array<{ id: number; type: string; title: string; message: string; booking_id: number | null; is_read: number; created_at: string }>; unread_count: number }>(
      `/auth/notifications?limit=${limit}`, { headers: { Authorization: `Bearer ${token}` } }
    ),

  markNotificationsRead: (token: string, ids?: number[]) =>
    api<{ success: true; message: string }>(
      '/auth/notifications/read', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ ids }) }
    ),

  forgotPassword: (email: string) =>
    api<{ success: true; message: string; demo_token?: string; instructions?: string }>(
      '/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }
    ),

  resetPassword: (data: { token: string; new_password: string; confirm_new_password?: string }) =>
    api<{ success: true; message: string }>(
      '/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }
    ),

  // ── Unreserved Journey Tickets (General Quota) ───────────
  calculateUnreservedFare: (data: { source_code: string; dest_code: string; passenger_count?: number; train_type?: string }) =>
    api<{
      success: true;
      source: { code: string; name: string; city: string };
      destination: { code: string; name: string; city: string };
      distance_km: number;
      fare_per_passenger: number;
      total_fare: number;
      train_type: string;
      passenger_count: number;
      rules_note: string;
    }>('/unreserved/fare', { method: 'POST', body: JSON.stringify(data) }),

  bookUnreservedTicket: (data: {
    source_code: string;
    dest_code: string;
    journey_date: string;
    passenger_names: string[];
    train_type?: string;
    contact_email?: string;
    contact_phone?: string;
  }) =>
    api<{ success: true; message: string; ticket: any }>(
      '/unreserved/book', { method: 'POST', body: JSON.stringify(data) }
    ),

  getUnreservedTicket: (ticketNumber: string) =>
    api<{ success: true; ticket: any }>(`/unreserved/${encodeURIComponent(ticketNumber)}`),

  // ── Railway Platform Tickets ──────────────────────────────
  bookPlatformTicket: (data: {
    station_code: string;
    ticket_count: number;
    visitor_name: string;
    contact_phone?: string;
  }) =>
    api<{ success: true; message: string; ticket: any }>(
      '/platform/book', { method: 'POST', body: JSON.stringify(data) }
    ),

  getPlatformTicket: (ticketNumber: string) =>
    api<{ success: true; ticket: any }>(`/platform/${encodeURIComponent(ticketNumber)}`),

  getMyAllTickets: (token?: string) =>
    api<{ success: true; unreserved: any[]; platform: any[] }>('/auth/my-all-tickets', {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }),
};
