// Refund Calculator — deterministic, testable, documented
// DISCLAIMER: This policy is fictional for academic demonstration purposes.
// It does NOT represent official Indian Railways cancellation policy.
//
// Policy (as documented in docs/DATABASE_DESIGN.md):
//   > 48 hours before departure: Full refund minus ₹60/passenger
//   12–48 hours before departure: 75% refund (25% deduction)
//   < 12 hours before departure: 50% refund (50% deduction)
//   WL ticket cancellation: Full refund minus ₹30/passenger clerical fee

export interface RefundCalculation {
  original_fare: number;
  passengers: number;
  hours_to_departure: number;
  cancellation_charge: number;
  refund_amount: number;
  refund_percentage: number;
  policy_applied: string;
  booking_type: 'CONFIRMED' | 'WAITING_LIST';
}

const FLAT_CHARGE_PER_PASSENGER_CNF = 60;   // > 48 hours
const FLAT_CHARGE_PER_PASSENGER_WL = 30;    // Waiting list clerical fee

export function calculateRefund(
  totalFare: number,
  passengerCount: number,
  hoursToDeparture: number,
  bookingType: 'CONFIRMED' | 'WAITING_LIST'
): RefundCalculation {
  let cancellationCharge = 0;
  let refundAmount = 0;
  let refundPercentage = 0;
  let policyApplied = '';

  if (bookingType === 'WAITING_LIST') {
    // WL always gets full refund minus clerical fee
    cancellationCharge = FLAT_CHARGE_PER_PASSENGER_WL * passengerCount;
    refundAmount = Math.max(0, totalFare - cancellationCharge);
    refundPercentage = Math.round((refundAmount / totalFare) * 100);
    policyApplied = `WL Clerical Fee: ₹${FLAT_CHARGE_PER_PASSENGER_WL} × ${passengerCount} passengers`;
  } else if (hoursToDeparture > 48) {
    cancellationCharge = FLAT_CHARGE_PER_PASSENGER_CNF * passengerCount;
    refundAmount = Math.max(0, totalFare - cancellationCharge);
    refundPercentage = Math.round((refundAmount / totalFare) * 100);
    policyApplied = `> 48 hours: Flat ₹${FLAT_CHARGE_PER_PASSENGER_CNF} × ${passengerCount} passengers`;
  } else if (hoursToDeparture >= 12) {
    cancellationCharge = totalFare * 0.25;
    refundAmount = totalFare * 0.75;
    refundPercentage = 75;
    policyApplied = `12–48 hours: 25% cancellation charge (₹${Math.round(cancellationCharge)})`;
  } else {
    cancellationCharge = totalFare * 0.5;
    refundAmount = totalFare * 0.5;
    refundPercentage = 50;
    policyApplied = `< 12 hours: 50% cancellation charge (₹${Math.round(cancellationCharge)})`;
  }

  return {
    original_fare: totalFare,
    passengers: passengerCount,
    hours_to_departure: hoursToDeparture,
    cancellation_charge: Math.round(cancellationCharge * 100) / 100,
    refund_amount: Math.round(refundAmount * 100) / 100,
    refund_percentage: refundPercentage,
    policy_applied: policyApplied,
    booking_type: bookingType,
  };
}

export function calculateHoursToDeparture(
  journeyDate: string,
  departureTime: string | null | undefined
): number {
  const depTime = departureTime || '00:00';
  const [hours, minutes] = depTime.split(':').map(Number);
  const departure = new Date(`${journeyDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
  const now = new Date();
  const diffMs = departure.getTime() - now.getTime();
  return diffMs / (1000 * 60 * 60);
}

export function calculateFare(
  baseFare: number,
  passengerCount: number,
  trainType: string
): {
  passengers: number;
  base_fare_per_passenger: number;
  base_fare_total: number;
  reservation_fee: number;
  superfast_surcharge: number;
  total_fare: number;
} {
  const reservationFee = 60 * passengerCount;
  const superfastSurcharge = trainType === 'SUPERFAST' ? 45 * passengerCount : 0;
  const baseTotal = baseFare * passengerCount;
  const totalFare = baseTotal + reservationFee + superfastSurcharge;

  return {
    passengers: passengerCount,
    base_fare_per_passenger: baseFare,
    base_fare_total: baseTotal,
    reservation_fee: reservationFee,
    superfast_surcharge: superfastSurcharge,
    total_fare: Math.round(totalFare * 100) / 100,
  };
}
