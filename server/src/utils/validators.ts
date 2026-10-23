// Input validators — server-side validation (defense in depth beyond client-side)
import type { PassengerInput, ClassCode, Gender } from '../types/index.js';

const VALID_CLASSES: ClassCode[] = ['1A', '2A', '3A', 'SL', 'CC', '2S'];
const VALID_GENDERS: Gender[] = ['M', 'F', 'O'];
const MAX_BOOKING_DAYS_AHEAD = 120;

export interface ValidationError {
  field: string;
  message: string;
}

export function validateSearchParams(params: {
  from?: unknown;
  to?: unknown;
  date?: unknown;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!params.from || typeof params.from !== 'string' || params.from.trim().length < 2) {
    errors.push({ field: 'from', message: 'Source station code is required' });
  }
  if (!params.to || typeof params.to !== 'string' || params.to.trim().length < 2) {
    errors.push({ field: 'to', message: 'Destination station code is required' });
  }
  if (
    params.from &&
    params.to &&
    typeof params.from === 'string' &&
    typeof params.to === 'string' &&
    params.from.trim().toUpperCase() === params.to.trim().toUpperCase()
  ) {
    errors.push({ field: 'to', message: 'Source and destination stations cannot be the same' });
  }
  if (!params.date || typeof params.date !== 'string') {
    errors.push({ field: 'date', message: 'Journey date is required (YYYY-MM-DD)' });
  } else {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(params.date)) {
      errors.push({ field: 'date', message: 'Journey date must be in YYYY-MM-DD format' });
    } else {
      const selected = new Date(params.date + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) {
        errors.push({ field: 'date', message: 'Journey date cannot be in the past' });
      }
      const maxDate = new Date(today);
      maxDate.setDate(maxDate.getDate() + MAX_BOOKING_DAYS_AHEAD);
      if (selected > maxDate) {
        errors.push({
          field: 'date',
          message: `Reservations open up to ${MAX_BOOKING_DAYS_AHEAD} days in advance`,
        });
      }
    }
  }

  return errors;
}

export function validatePassengers(passengers: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!Array.isArray(passengers) || passengers.length < 1) {
    errors.push({ field: 'passengers', message: 'At least 1 passenger is required' });
    return errors;
  }
  if (passengers.length > 6) {
    errors.push({ field: 'passengers', message: 'Maximum 6 passengers per booking' });
  }

  passengers.forEach((p: unknown, i: number) => {
    const passenger = p as Partial<PassengerInput>;
    const prefix = `passengers[${i}]`;

    if (!passenger.passenger_name || typeof passenger.passenger_name !== 'string') {
      errors.push({ field: `${prefix}.passenger_name`, message: 'Passenger name is required' });
    } else {
      const nameRegex = /^[A-Za-z\s.'-]{2,60}$/;
      if (!nameRegex.test(passenger.passenger_name.trim())) {
        errors.push({
          field: `${prefix}.passenger_name`,
          message: 'Name must contain only letters, spaces, dots, hyphens (2–60 chars)',
        });
      }
    }

    if (passenger.age === undefined || passenger.age === null) {
      errors.push({ field: `${prefix}.age`, message: 'Passenger age is required' });
    } else {
      const age = Number(passenger.age);
      if (!Number.isInteger(age) || age < 1 || age > 120) {
        errors.push({ field: `${prefix}.age`, message: 'Age must be between 1 and 120' });
      }
    }

    if (!passenger.gender || !VALID_GENDERS.includes(passenger.gender as Gender)) {
      errors.push({
        field: `${prefix}.gender`,
        message: 'Gender must be M (Male), F (Female), or O (Other)',
      });
    }
  });

  return errors;
}

export function validateContactInfo(params: {
  contact_email?: unknown;
  contact_phone?: unknown;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (
    !params.contact_email ||
    typeof params.contact_email !== 'string' ||
    !emailRegex.test(params.contact_email)
  ) {
    errors.push({ field: 'contact_email', message: 'Valid email address is required' });
  }

  const phoneRegex = /^[6-9]\d{9}$/;
  if (
    !params.contact_phone ||
    typeof params.contact_phone !== 'string' ||
    !phoneRegex.test(params.contact_phone.replace(/\s/g, ''))
  ) {
    errors.push({
      field: 'contact_phone',
      message: 'Valid 10-digit Indian mobile number is required (starting with 6–9)',
    });
  }

  return errors;
}

export function validateClassCode(code: unknown): boolean {
  return typeof code === 'string' && VALID_CLASSES.includes(code as ClassCode);
}

export function validateIdempotencyKey(key: unknown): boolean {
  return typeof key === 'string' && key.trim().length >= 8 && key.trim().length <= 64;
}
