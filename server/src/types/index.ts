// Shared TypeScript types for Railway Reservation System (Team 11)
// Used across controllers, services, and repositories

export interface Station {
  id: number;
  code: string;
  name: string;
  city: string;
  state: string;
}

export interface Train {
  id: number;
  train_number: string;
  name: string;
  type: 'SUPERFAST' | 'EXPRESS' | 'PASSENGER';
  active: number;
}

export interface TrainRoute {
  id: number;
  train_id: number;
  station_id: number;
  stop_sequence: number;
  arrival_time: string | null;
  departure_time: string | null;
  day_offset: number;
  distance_km: number;
}

export interface TrainClass {
  id: number;
  train_id: number;
  class_code: ClassCode;
  class_name: string;
  base_fare: number;
  total_seats: number;
  max_waiting_list: number;
}

export interface Schedule {
  id: number;
  train_id: number;
  journey_date: string;
  status: ScheduleStatus;
}

export interface SeatInventory {
  id: number;
  schedule_id: number;
  class_code: ClassCode;
  total_seats: number;
  available_seats: number;
  waiting_list_count: number;
  max_waiting_list: number;
}

export interface Booking {
  id: number;
  pnr_number: string;
  schedule_id: number;
  source_station_id: number;
  dest_station_id: number;
  journey_date: string;
  class_code: ClassCode;
  total_passengers: number;
  total_fare: number;
  booking_status: BookingStatus;
  payment_status: PaymentStatus;
  contact_email: string;
  contact_phone: string;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
}

export interface BookingPassenger {
  id: number;
  booking_id: number;
  passenger_name: string;
  age: number;
  gender: Gender;
  berth_preference: BerthPreference;
  allocated_seat: string | null;
  status: PassengerStatus;
  wl_number: number | null;
}

export interface Payment {
  id: number;
  booking_id: number;
  transaction_id: string;
  amount: number;
  payment_method: PaymentMethod;
  status: PaymentTxnStatus;
  failure_reason: string | null;
  created_at: string;
}

export interface Cancellation {
  id: number;
  booking_id: number;
  cancellation_reference: string;
  seats_cancelled: number;
  original_fare: number;
  cancellation_charge: number;
  refund_amount: number;
  refund_status: RefundStatus;
  cancelled_at: string;
}

export interface WaitingListEntry {
  id: number;
  schedule_id: number;
  class_code: ClassCode;
  booking_passenger_id: number;
  queue_position: number;
  status: WLStatus;
  created_at: string;
}

export interface AuditLog {
  id: number;
  event_type: AuditEventType;
  booking_id: number | null;
  description: string;
  ip_address: string;
  timestamp: string;
}

// ============================================================
// ENUM-LIKE TYPES
// ============================================================

export type ClassCode = '1A' | '2A' | '3A' | 'SL' | 'CC' | '2S';

export const CLASS_NAMES: Record<ClassCode, string> = {
  '1A': 'AC First Class',
  '2A': 'AC 2 Tier',
  '3A': 'AC 3 Tier',
  'SL': 'Sleeper Class',
  'CC': 'Chair Car',
  '2S': 'Second Sitting',
};

export type BookingStatus =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'WAITING_LIST'
  | 'FAILED'
  | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export type ScheduleStatus = 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'CANCELLED';

export type Gender = 'M' | 'F' | 'O';

export type BerthPreference = 'LB' | 'MB' | 'UB' | 'SL' | 'SU' | 'ANY';

export type PassengerStatus = 'CONFIRMED' | 'WAITING_LIST' | 'CANCELLED' | 'PENDING';

export type PaymentMethod = 'SIM' | 'CARD' | 'UPI';

export type PaymentTxnStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export type RefundStatus = 'INITIATED' | 'PROCESSED' | 'FAILED';

export type WLStatus = 'WAITING' | 'PROMOTED' | 'CANCELLED';

export type AuditEventType =
  | 'BOOKING_CREATED'
  | 'PAYMENT_PROCESSED'
  | 'PAYMENT_FAILED'
  | 'TICKET_CANCELLED'
  | 'WL_PROMOTED'
  | 'ADMIN_LOGIN'
  | 'ADMIN_MODIFIED'
  | 'REFUND_PROCESSED';

// ============================================================
// API REQUEST / RESPONSE DTOs
// ============================================================

export interface SearchTrainsRequest {
  from: string;   // Station code
  to: string;     // Station code
  date: string;   // ISO date: YYYY-MM-DD
}

export interface TrainSearchResult {
  schedule_id: number;
  train_id: number;
  train_number: string;
  train_name: string;
  train_type: string;
  source_code: string;
  source_name: string;
  dest_code: string;
  dest_name: string;
  departure_time: string;
  arrival_time: string;
  departure_day_offset: number;
  arrival_day_offset: number;
  journey_duration_minutes: number;
  is_overnight: boolean;
  distance_km: number;
  journey_date: string;
  classes: ClassAvailability[];
}

export interface ClassAvailability {
  class_code: ClassCode;
  class_name: string;
  base_fare: number;
  total_fare: number;  // including surcharges
  available_seats: number;
  waiting_list_count: number;
  max_waiting_list: number;
  availability_status: 'AVAILABLE' | 'WAITING_LIST' | 'NOT_AVAILABLE';
  availability_label: string;
}

export interface PassengerInput {
  passenger_name: string;
  age: number;
  gender: Gender;
  berth_preference?: BerthPreference;
}

export interface CreateBookingRequest {
  schedule_id: number;
  source_station_code: string;
  dest_station_code: string;
  class_code: ClassCode;
  passengers: PassengerInput[];
  contact_email: string;
  contact_phone: string;
  idempotency_key: string;
}

export interface FareBreakdown {
  passengers: number;
  base_fare_per_passenger: number;
  base_fare_total: number;
  reservation_fee: number;
  superfast_surcharge: number;
  total_fare: number;
}

export interface CreateBookingResponse {
  booking_id: number;
  pnr_number: string;
  booking_status: BookingStatus;
  fare_breakdown: FareBreakdown;
  message: string;
}

export interface ProcessPaymentRequest {
  booking_id: number;
  outcome: 'SUCCESS' | 'FAILURE' | 'CANCEL';
  payment_method?: PaymentMethod;
}

export interface ProcessPaymentResponse {
  success: boolean;
  transaction_id?: string;
  booking_status: BookingStatus;
  payment_status: PaymentStatus;
  message: string;
}

export interface ETicket {
  pnr_number: string;
  train_number: string;
  train_name: string;
  source_station: string;
  dest_station: string;
  journey_date: string;
  departure_time: string;
  arrival_time: string;
  arrival_date: string;
  class_code: ClassCode;
  class_name: string;
  total_passengers: number;
  passengers: ETicketPassenger[];
  fare_breakdown: FareBreakdown;
  booking_status: BookingStatus;
  payment_status: PaymentStatus;
  transaction_id?: string;
  contact_email: string;
  contact_phone: string;
  booked_at: string;
  disclaimer: string;
}

export interface ETicketPassenger {
  passenger_name: string;
  age: number;
  gender: string;
  status: PassengerStatus;
  allocated_seat: string | null;
  wl_number: number | null;
}

export interface CancellationPreview {
  pnr_number: string;
  booking_status: BookingStatus;
  journey_date: string;
  hours_to_departure: number;
  original_fare: number;
  cancellation_charge: number;
  refund_amount: number;
  refund_percentage: number;
  policy_applied: string;
  is_eligible: boolean;
  ineligibility_reason?: string;
}

export interface CancellationResponse {
  cancellation_reference: string;
  pnr_number: string;
  refund_amount: number;
  refund_status: RefundStatus;
  message: string;
}

export interface ApiError {
  error: string;
  message: string;
  field?: string;
}
