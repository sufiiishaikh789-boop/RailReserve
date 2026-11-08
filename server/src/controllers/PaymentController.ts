// Payment Controller — Razorpay order creation, payment verification, and webhooks
// DISCLAIMER: Academic demonstration system. Sandbox API or simulated demo — no real money.
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/index.js';
import { BookingRepository } from '../repositories/BookingRepository.js';
import { TrainRepository } from '../repositories/TrainRepository.js';
import { UserRepository } from '../repositories/UserRepository.js';
import {
  createPaymentOrder,
  verifyPayment,
  verifyWebhookSignature,
  getPaymentMode,
} from '../services/PaymentService.js';

const bookingRepo = new BookingRepository();
const trainRepo   = new TrainRepository();
const userRepo    = new UserRepository();

export class PaymentController {

  // GET /api/payments/mode
  // Returns current payment mode (SANDBOX or DEMO) so the UI can show appropriate UI
  getMode(_req: Request, res: Response, next: NextFunction): void {
    try {
      const mode = getPaymentMode();
      res.json({
        success: true,
        mode,
        currency: 'INR',
        key_id: mode === 'SANDBOX' ? (process.env.RAZORPAY_KEY_ID || '') : 'DEMO',
        disclaimer: mode === 'SANDBOX'
          ? '⚠️ RAZORPAY SANDBOX — Test cards only. No real money processed.'
          : '⚠️ DEMO MODE — Simulated payment only. Set RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET to enable sandbox.',
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/payments/create-order
  // Body: { booking_id: number }
  async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { booking_id } = req.body as { booking_id?: number };
      if (!booking_id || isNaN(Number(booking_id))) {
        throw new AppError('booking_id is required', 400);
      }

      const booking = bookingRepo.findBookingById(Number(booking_id));
      if (!booking) throw new AppError('Booking not found', 404);

      // Check if seat hold has expired
      if (booking.hold_expires_at && new Date(booking.hold_expires_at) < new Date()) {
        bookingRepo.failBooking(booking.id, 'Payment hold expired');
        throw new AppError(
          'Reservation hold has expired. The held seats have been released. Please reselect your train and try again.',
          410
        );
      }

      // Verify booking status
      if (booking.booking_status !== 'PENDING_PAYMENT') {
        throw new AppError(
          `Booking is already in status '${booking.booking_status}' — cannot create new payment order`,
          409
        );
      }

      // Verify ownership if passenger is authenticated
      if (req.passengerUser) {
        const isOwner = userRepo.isBookingOwner(booking.id, req.passengerUser.id);
        const allUserBookings = userRepo.getUserBookingIds(req.passengerUser.id);
        // If booking is registered to someone else, reject
        const hasOtherOwner = (bookingRepo as any).db
          ?.prepare('SELECT user_id FROM booking_ownership WHERE booking_id = ?')
          .get(booking.id) as { user_id: number } | undefined;
        if (hasOtherOwner && hasOtherOwner.user_id !== req.passengerUser.id) {
          throw new AppError('Access denied: You do not have permission to pay for this booking', 403);
        }
      }

      const order = await createPaymentOrder({
        booking_id: booking.id,
        pnr_number: booking.pnr_number,
        amount_rupees: booking.total_fare,
      });

      // Persist pending payment record in DB
      bookingRepo.recordPendingPayment(booking.id, order.order_id, booking.total_fare, 'RAZORPAY');

      res.json({
        success: true,
        ...order,
        pnr_number: booking.pnr_number,
        contact_email: booking.contact_email,
        contact_phone: booking.contact_phone,
        hold_expires_at: booking.hold_expires_at,
        amount_rupees: booking.total_fare,
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/payments/verify
  // Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking_id }
  async verifyAndConfirm(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking_id } =
        req.body as {
          razorpay_order_id?: string;
          razorpay_payment_id?: string;
          razorpay_signature?: string;
          booking_id?: number;
        };

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !booking_id) {
        throw new AppError(
          'razorpay_order_id, razorpay_payment_id, razorpay_signature, and booking_id are required',
          400
        );
      }

      const result = await verifyPayment({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      });

      if (!result.valid) {
        // Log failed verification attempt and fail booking
        bookingRepo.failBooking(Number(booking_id), 'Payment signature verification failed');
        throw new AppError('Payment verification failed — invalid signature', 400);
      }

      // Confirm booking
      const booking = bookingRepo.findBookingById(Number(booking_id));
      if (!booking) throw new AppError('Booking not found', 404);

      // Check hold expiry
      if (booking.hold_expires_at && new Date(booking.hold_expires_at) < new Date()) {
        bookingRepo.failBooking(booking.id, 'Payment verification after hold expired');
        throw new AppError('Reservation hold has expired. Inventory was released.', 410);
      }

      if (booking.booking_status !== 'PENDING_PAYMENT') {
        // Idempotent return if already confirmed
        const currentBooking = bookingRepo.findBookingById(booking.id)!;
        res.json({
          success: currentBooking.payment_status === 'PAID',
          mode: result.mode,
          transaction_id: result.transaction_id,
          booking_status: currentBooking.booking_status,
          payment_status: currentBooking.payment_status,
          message: `Booking is currently ${currentBooking.booking_status}`,
        });
        return;
      }

      const inv = trainRepo.getInventory(booking.schedule_id, booking.class_code);
      const isWaitingList = inv ? inv.available_seats < booking.total_passengers : false;

      bookingRepo.confirmBookingAfterPayment(booking.id, result.transaction_id, isWaitingList, {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        payment_method: 'RAZORPAY',
      });
      const updatedBooking = bookingRepo.findBookingById(booking.id)!;

      // Notify linked passenger
      if (req.passengerUser) {
        try {
          userRepo.createNotification({
            user_id: req.passengerUser.id,
            type: 'PAYMENT_SUCCESS',
            title: 'Payment Verified',
            message: `Your payment for PNR: ${updatedBooking.pnr_number} has been verified and your booking is ${isWaitingList ? 'on the Waiting List' : 'CONFIRMED'}.`,
            booking_id: booking.id,
          });
        } catch { /* non-fatal */ }
      }

      res.json({
        success: true,
        mode: result.mode,
        transaction_id: result.transaction_id,
        booking_status: updatedBooking.booking_status,
        payment_status: updatedBooking.payment_status,
        message: `Payment verified! Booking is ${updatedBooking.booking_status}.`,
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/payments/webhook
  // Razorpay calls this endpoint directly to notify of payment events.
  // Idempotent — safe to receive the same event multiple times.
  async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = req.headers['x-razorpay-signature'] as string | undefined;
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);

      const isWebhookSecured = getPaymentMode() === 'SANDBOX' || !!process.env.RAZORPAY_WEBHOOK_SECRET || !!signature;
      if (isWebhookSecured) {
        if (!signature || !verifyWebhookSignature(rawBody, signature)) {
          res.status(400).json({ success: false, error: 'Invalid webhook signature' });
          return;
        }
      }

      const event = req.body as {
        event: string;
        payload?: {
          payment?: { entity?: { id?: string; order_id?: string; amount?: number; status?: string } };
        };
      };

      const eventType = event.event;
      const paymentEntity = event.payload?.payment?.entity;

      if (!paymentEntity || !paymentEntity.order_id) {
        res.json({ success: true, message: 'No actionable payment order in payload', event: eventType });
        return;
      }

      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id || `wh_${Date.now()}`;
      const booking = bookingRepo.findBookingByRazorpayOrderId(orderId);

      if (!booking) {
        console.log(`[WEBHOOK] No booking found for order_id: ${orderId}`);
        res.json({ success: true, message: 'Booking not found for order', event: eventType });
        return;
      }

      console.log(`[WEBHOOK] Event: ${eventType}, Booking ID: ${booking.id}, PNR: ${booking.pnr_number}`);

      if (eventType === 'payment.captured' || eventType === 'order.paid') {
        if (booking.booking_status === 'PENDING_PAYMENT') {
          const inv = trainRepo.getInventory(booking.schedule_id, booking.class_code);
          const isWaitingList = inv ? inv.available_seats < booking.total_passengers : false;

          bookingRepo.confirmBookingAfterPayment(booking.id, paymentId, isWaitingList, {
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId,
            payment_method: 'RAZORPAY',
          });
        }
        res.json({ success: true, message: 'Booking confirmed via webhook', event: eventType });
        return;
      }

      if (eventType === 'payment.failed') {
        if (booking.booking_status === 'PENDING_PAYMENT') {
          bookingRepo.failBooking(booking.id, 'Payment failed according to gateway webhook');
        }
        res.json({ success: true, message: 'Payment failure recorded via webhook', event: eventType });
        return;
      }

      res.json({ success: true, message: 'Webhook event processed', event: eventType });
    } catch (err) {
      next(err);
    }
  }
}

