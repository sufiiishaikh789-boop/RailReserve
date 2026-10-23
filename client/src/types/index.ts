// Shared TypeScript types for client — mirrors server types
export type ClassCode = '1A' | '2A' | '3A' | 'SL' | 'CC' | '2S';
export type BookingStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'WAITING_LIST' | 'FAILED' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type PassengerStatus = 'CONFIRMED' | 'WAITING_LIST' | 'CANCELLED' | 'PENDING';
export type Gender = 'M' | 'F' | 'O';
export type BerthPreference = 'LB' | 'MB' | 'UB' | 'SL' | 'SU' | 'ANY';

export const CLASS_LABELS: Record<ClassCode, string> = {
  '1A': 'AC First Class',
  '2A': 'AC 2 Tier',
  '3A': 'AC 3 Tier',
  'SL': 'Sleeper',
  'CC': 'Chair Car',
  '2S': 'Second Sitting',
};

export interface Station {
  id: number;
  code: string;
  name: string;
  city: string;
  state: string;
}

export interface ClassAvailability {
  class_code: ClassCode;
  class_name: string;
  base_fare: number;
  total_fare: number;
  available_seats: number;
  waiting_list_count: number;
  max_waiting_list: number;
  availability_status: 'AVAILABLE' | 'WAITING_LIST' | 'NOT_AVAILABLE';
  availability_label: string;
}

export interface TrainResult {
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

export interface PassengerInput {
  passenger_name: string;
  age: number | '';
  gender: Gender | '';
  berth_preference: BerthPreference;
}

export interface FareBreakdown {
  passengers: number;
  base_fare_per_passenger: number;
  base_fare_total: number;
  reservation_fee: number;
  superfast_surcharge: number;
  total_fare: number;
}

export interface BookingCreatedResponse {
  success: boolean;
  booking_id: number;
  pnr_number: string;
  booking_status: BookingStatus;
  is_waiting_list: boolean;
  fare_breakdown: FareBreakdown;
  message: string;
}

export interface ETicketPassenger {
  passenger_name: string;
  age: number;
  gender: string;
  status: PassengerStatus;
  allocated_seat: string | null;
  wl_number: number | null;
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

// Booking wizard state
export interface BookingWizardState {
  // Step 1: Search
  from: string;
  to: string;
  date: string;
  // Step 2: Selection
  selectedTrain: TrainResult | null;
  selectedClass: ClassAvailability | null;
  // Step 3: Passengers
  passengers: PassengerInput[];
  contactEmail: string;
  contactPhone: string;
  // Step 4: Payment (simulated)
  bookingId: number | null;
  pnrNumber: string | null;
  fareBreakdown: FareBreakdown | null;
  isWaitingList: boolean;
  // Step 5: Ticket
  ticket: ETicket | null;
}
