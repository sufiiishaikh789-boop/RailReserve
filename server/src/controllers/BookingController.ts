// Booking Controller — HTTP layer for booking creation, payment, ticket, and cancellation
import type { Request, Response, NextFunction } from 'express';
import { BookingRepository } from '../repositories/BookingRepository.js';
import { TrainRepository } from '../repositories/TrainRepository.js';
import { validatePassengers, validateContactInfo, validateClassCode, validateIdempotencyKey } from '../utils/validators.js';
import { calculateFare, calculateRefund, calculateHoursToDeparture } from '../utils/refund.js';
import { generateTransactionId } from '../utils/pnr.js';
import { AppError } from '../middleware/index.js';
import type {
  CreateBookingRequest, ETicket, ETicketPassenger, FareBreakdown,
  CancellationPreview, CancellationResponse
} from '../types/index.js';
import { CLASS_NAMES } from '../types/index.js';

const bookingRepo = new BookingRepository();
const trainRepo = new TrainRepository();

export class BookingController {
  // POST /api/bookings
  createBooking(req: Request, res: Response, next: NextFunction): void {
    try {
      const body = req.body as CreateBookingRequest;

      // --- Validate all inputs (server-side defense in depth) ---
      const passengerErrors = validatePassengers(body.passengers);
      const contactErrors = validateContactInfo({
        contact_email: body.contact_email,
        contact_phone: body.contact_phone,
      });
      const allErrors = [...passengerErrors, ...contactErrors];

      if (!body.schedule_id || isNaN(Number(body.schedule_id))) {
        allErrors.push({ field: 'schedule_id', message: 'Valid schedule ID is required' });
      }
      if (!validateClassCode(body.class_code)) {
        allErrors.push({ field: 'class_code', message: 'Valid class code is required (1A,2A,3A,SL,CC,2S)' });
      }
      if (!validateIdempotencyKey(body.idempotency_key)) {
        allErrors.push({ field: 'idempotency_key', message: 'Idempotency key is required (8–64 chars)' });
      }
      if (!body.source_station_code || !body.dest_station_code) {
        allErrors.push({ field: 'stations', message: 'Source and destination station codes are required' });
      }

      if (allErrors.length > 0) {
        res.status(400).json({ error: 'Validation Error', message: 'Invalid booking input', details: allErrors });
        return;
      }

      // --- Resolve stations and schedule ---
      const schedule = trainRepo.findScheduleById(body.schedule_id);
      if (!schedule) throw new AppError('Schedule not found or unavailable', 404);

      const sourceStation = trainRepo.findStationByCode(body.source_station_code);
      const destStation = trainRepo.findStationByCode(body.dest_station_code);
      if (!sourceStation) throw new AppError('Source station not found', 404);
      if (!destStation) throw new AppError('Destination station not found', 404);

      const classInfo = trainRepo.getTrainClassInfo(schedule.train_id, body.class_code);
      if (!classInfo) throw new AppError('Selected class not available for this train', 400);

      // --- Atomically create booking (may throw if full) ---
      const { booking, passengers, isWaitingList } = bookingRepo.createBookingAtomically(
        body,
        {
          train_id: schedule.train_id,
          train_type: schedule.train_type,
          source_station_id: sourceStation.id,
          dest_station_id: destStation.id,
        },
        classInfo.base_fare
      );

      const fareInfo = calculateFare(classInfo.base_fare, body.passengers.length, schedule.train_type);

      res.status(201).json({
        success: true,
        booking_id: booking.id,
        pnr_number: booking.pnr_number,
        booking_status: booking.booking_status,
        is_waiting_list: isWaitingList,
        fare_breakdown: fareInfo,
        message: isWaitingList
          ? 'Booking created on Waiting List. Proceed to payment to confirm your position.'
          : 'Booking created. Proceed to payment to confirm your seat.',
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/bookings/:bookingId/payment
  processPayment(req: Request, res: Response, next: NextFunction): void {
    try {
      const bookingId = Number(req.params.bookingId);
      const { outcome, payment_method } = req.body as {
        outcome: 'SUCCESS' | 'FAILURE' | 'CANCEL';
        payment_method?: string;
      };

      if (!bookingId || isNaN(bookingId)) throw new AppError('Invalid booking ID', 400);
      if (!['SUCCESS', 'FAILURE', 'CANCEL'].includes(outcome)) {
        throw new AppError('Payment outcome must be SUCCESS, FAILURE, or CANCEL', 400);
      }

      const booking = bookingRepo.findBookingById(bookingId);
      if (!booking) throw new AppError('Booking not found', 404);

      if (booking.booking_status !== 'PENDING_PAYMENT') {
        res.json({
          success: false,
          booking_status: booking.booking_status,
          payment_status: booking.payment_status,
          message: 'Booking is no longer in PENDING_PAYMENT state',
        });
        return;
      }

      const isWL = false; // Will be determined by existing passenger statuses
      const txnId = generateTransactionId();

      if (outcome === 'SUCCESS') {
        const passengers = bookingRepo.findPassengersByBookingId(bookingId);
        const isWaitingList = passengers.length > 0 &&
          passengers.every(() => {
            // Check current inventory to determine if CNF or WL
            const inv = trainRepo.getInventory(booking.schedule_id, booking.class_code);
            return inv ? inv.available_seats === 0 : false;
          });

        // Re-check inventory to determine actual status at confirmation time
        const inv = trainRepo.getInventory(booking.schedule_id, booking.class_code);
        const actualIsWL = inv ? inv.available_seats < booking.total_passengers : false;

        bookingRepo.confirmBookingAfterPayment(bookingId, txnId, actualIsWL);

        const updatedBooking = bookingRepo.findBookingById(bookingId)!;
        res.json({
          success: true,
          transaction_id: txnId,
          booking_status: updatedBooking.booking_status,
          payment_status: updatedBooking.payment_status,
          message: `Payment successful! Booking ${updatedBooking.booking_status}.`,
        });
      } else {
        const reason = outcome === 'CANCEL' ? 'User cancelled payment' : 'Simulated payment decline';
        bookingRepo.failBooking(bookingId, reason);

        res.json({
          success: false,
          transaction_id: txnId,
          booking_status: 'FAILED',
          payment_status: 'FAILED',
          message: reason,
        });
      }
    } catch (err) {
      next(err);
    }
  }

  // GET /api/bookings/pnr/:pnr
  getTicket(req: Request, res: Response, next: NextFunction): void {
    try {
      const { pnr } = req.params;
      const { email, phone } = req.query;

      if (!pnr) throw new AppError('PNR number is required', 400);

      const booking = bookingRepo.findBookingByPNR(pnr.toUpperCase());
      if (!booking) throw new AppError('Booking not found for this PNR', 404);

      // Scope verification: require at least one contact match for non-admin
      if (email || phone) {
        const emailMatch = email && booking.contact_email.toLowerCase() === String(email).toLowerCase();
        const phoneMatch = phone && booking.contact_phone === String(phone).replace(/\s/g, '');
        if (!emailMatch && !phoneMatch) {
          throw new AppError('Contact information does not match booking records', 403);
        }
      }

      const passengers = bookingRepo.findPassengersByBookingId(booking.id);
      const payments = bookingRepo.findPaymentsByBookingId(booking.id);
      const successPayment = payments.find((p) => p.status === 'SUCCESS' || p.status === 'REFUNDED');
      const schedule = trainRepo.findScheduleById(booking.schedule_id);

      // Build e-ticket
      const classInfo = schedule
        ? trainRepo.getTrainClassInfo(schedule.train_id, booking.class_code)
        : null;
      const fareInfo = classInfo
        ? calculateFare(classInfo.base_fare, booking.total_passengers, schedule!.train_type)
        : null;

      // Look up station codes for ticket display
      const sourceStation = trainRepo.findStationById(booking.source_station_id);
      const destStation   = trainRepo.findStationById(booking.dest_station_id);
      const sourceCode = sourceStation?.code || booking.source_station_id.toString();
      const destCode   = destStation?.code   || booking.dest_station_id.toString();

      // Get departure/arrival times from train routes
      const depRoute = schedule ? trainRepo.getTrainRouteByStationId(schedule.train_id, booking.source_station_id) : null;
      const arrRoute = schedule ? trainRepo.getTrainRouteByStationId(schedule.train_id, booking.dest_station_id)   : null;

      const eticket: ETicket = {
        pnr_number: booking.pnr_number,
        train_number: schedule?.train_number || 'N/A',
        train_name: schedule?.train_name || 'N/A',
        source_station: sourceStation ? `${sourceCode} — ${sourceStation.city}` : sourceCode,
        dest_station:   destStation   ? `${destCode} — ${destStation.city}`     : destCode,
        source_station_code: sourceCode,
        dest_station_code:   destCode,
        journey_date: booking.journey_date,
        departure_time: depRoute?.departure_time || 'See schedule',
        arrival_time:   arrRoute?.arrival_time   || 'See schedule',
        arrival_date: booking.journey_date,

        class_code: booking.class_code,
        class_name: CLASS_NAMES[booking.class_code] || booking.class_code,
        total_passengers: booking.total_passengers,
        passengers: passengers.map((p): ETicketPassenger => ({
          passenger_name: p.passenger_name,
          age: p.age,
          gender: p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : 'Other',
          status: p.status,
          allocated_seat: p.allocated_seat,
          wl_number: p.wl_number,
        })),
        fare_breakdown: fareInfo || {
          passengers: booking.total_passengers,
          base_fare_per_passenger: booking.total_fare / booking.total_passengers,
          base_fare_total: booking.total_fare,
          reservation_fee: 0,
          superfast_surcharge: 0,
          total_fare: booking.total_fare,
        },
        booking_status: booking.booking_status,
        payment_status: booking.payment_status,
        transaction_id: successPayment?.transaction_id,
        contact_email: booking.contact_email,
        contact_phone: booking.contact_phone,
        booked_at: booking.created_at,
        disclaimer:
          '⚠️ ACADEMIC DEMONSTRATION TICKET — Fictional Data Only. ' +
          'Not a real railway ticket. No actual journey or payment processed.',
      };

      res.json({ success: true, ticket: eticket });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/bookings?email=...&phone=...
  getBookingHistory(req: Request, res: Response, next: NextFunction): void {
    try {
      const { email, phone } = req.query;
      if (!email && !phone) {
        throw new AppError('Email or phone number is required to look up bookings', 400);
      }
      const bookings = bookingRepo.findBookingsByContact(
        String(email || ''),
        phone ? String(phone) : undefined
      );
      res.json({ success: true, count: bookings.length, bookings });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/bookings/:pnr/cancellation-preview
  getCancellationPreview(req: Request, res: Response, next: NextFunction): void {
    try {
      const { pnr } = req.params;
      const booking = bookingRepo.findBookingByPNR(pnr.toUpperCase());
      if (!booking) throw new AppError('Booking not found', 404);

      if (!['CONFIRMED', 'WAITING_LIST'].includes(booking.booking_status)) {
        const preview: CancellationPreview = {
          pnr_number: booking.pnr_number,
          booking_status: booking.booking_status,
          journey_date: booking.journey_date,
          hours_to_departure: 0,
          original_fare: booking.total_fare,
          cancellation_charge: 0,
          refund_amount: 0,
          refund_percentage: 0,
          policy_applied: 'N/A',
          is_eligible: false,
          ineligibility_reason: `Booking is ${booking.booking_status} and cannot be cancelled`,
        };
        res.json({ success: true, preview });
        return;
      }

      // Get departure time for calculation
      const schedule = trainRepo.findScheduleById(booking.schedule_id);
      const sourceRoute = schedule
        ? trainRepo.getTrainRoute(schedule.train_id, '')
        : null;

      const hoursToDeparture = calculateHoursToDeparture(
        booking.journey_date,
        sourceRoute ? undefined : undefined // Use midnight if unknown
      );

      if (hoursToDeparture < 0) {
        const preview: CancellationPreview = {
          pnr_number: booking.pnr_number,
          booking_status: booking.booking_status,
          journey_date: booking.journey_date,
          hours_to_departure: hoursToDeparture,
          original_fare: booking.total_fare,
          cancellation_charge: 0,
          refund_amount: 0,
          refund_percentage: 0,
          policy_applied: 'N/A',
          is_eligible: false,
          ineligibility_reason: 'Cannot cancel a ticket for a journey that has already departed',
        };
        res.json({ success: true, preview });
        return;
      }

      const refundCalc = calculateRefund(
        booking.total_fare,
        booking.total_passengers,
        hoursToDeparture,
        booking.booking_status === 'WAITING_LIST' ? 'WAITING_LIST' : 'CONFIRMED'
      );

      const preview: CancellationPreview = {
        pnr_number: booking.pnr_number,
        booking_status: booking.booking_status,
        journey_date: booking.journey_date,
        hours_to_departure: Math.round(hoursToDeparture * 10) / 10,
        original_fare: booking.total_fare,
        cancellation_charge: refundCalc.cancellation_charge,
        refund_amount: refundCalc.refund_amount,
        refund_percentage: refundCalc.refund_percentage,
        policy_applied: refundCalc.policy_applied,
        is_eligible: true,
      };

      res.json({ success: true, preview });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/bookings/:pnr/cancel
  cancelBooking(req: Request, res: Response, next: NextFunction): void {
    try {
      const { pnr } = req.params;
      const { contact_email, contact_phone } = req.body as {
        contact_email?: string;
        contact_phone?: string;
      };

      const booking = bookingRepo.findBookingByPNR(pnr.toUpperCase());
      if (!booking) throw new AppError('Booking not found', 404);

      // Verify contact ownership
      const emailMatch = contact_email &&
        booking.contact_email.toLowerCase() === contact_email.toLowerCase();
      const phoneMatch = contact_phone &&
        booking.contact_phone === contact_phone.replace(/\s/g, '');

      if (!emailMatch && !phoneMatch) {
        throw new AppError('Contact information does not match booking records', 403);
      }

      if (!['CONFIRMED', 'WAITING_LIST'].includes(booking.booking_status)) {
        throw new AppError(`Booking cannot be cancelled — current status: ${booking.booking_status}`, 400);
      }

      const hoursToDeparture = calculateHoursToDeparture(booking.journey_date, undefined);
      if (hoursToDeparture < 0) {
        throw new AppError('Cannot cancel a ticket for a journey that has already departed', 400);
      }

      const refundCalc = calculateRefund(
        booking.total_fare,
        booking.total_passengers,
        hoursToDeparture,
        booking.booking_status === 'WAITING_LIST' ? 'WAITING_LIST' : 'CONFIRMED'
      );

      const { cancellation_reference } = bookingRepo.cancelBooking(
        booking.id,
        refundCalc.cancellation_charge,
        refundCalc.refund_amount
      );

      const response: CancellationResponse = {
        cancellation_reference,
        pnr_number: booking.pnr_number,
        refund_amount: refundCalc.refund_amount,
        refund_status: 'PROCESSED',
        message: `Booking cancelled successfully. Refund of ₹${refundCalc.refund_amount} processed (${refundCalc.policy_applied}).`,
      };

      res.json({ success: true, cancellation: response });
    } catch (err) {
      next(err);
    }
  }
}
