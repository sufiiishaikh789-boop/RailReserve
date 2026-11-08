// Auth Controller — Passenger registration, login, profile management
// DISCLAIMER: Academic demonstration system. No real authentication services connected.
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/UserRepository.js';
import { BookingRepository } from '../repositories/BookingRepository.js';
import { TrainRepository } from '../repositories/TrainRepository.js';
import { AppError } from '../middleware/index.js';
import { CLASS_NAMES, type Booking, type ETicket, type ETicketPassenger, type FareBreakdown } from '../types/index.js';
import { calculateFare } from '../utils/refund.js';

const userRepo = new UserRepository();
const bookingRepo = new BookingRepository();
const trainRepo = new TrainRepository();

// Helper to transform raw booking rows into complete ETicket structures with route/fare details
function enrichBookingToETicket(booking: Booking): ETicket {
  const passengers = bookingRepo.findPassengersByBookingId(booking.id) || [];
  const payments = bookingRepo.findPaymentsByBookingId(booking.id) || [];
  const successPayment = payments.find(p => p.status === 'SUCCESS' || p.status === 'REFUNDED');
  const schedule = trainRepo.findScheduleById(booking.schedule_id);

  const sourceStation = trainRepo.findStationById(booking.source_station_id);
  const destStation   = trainRepo.findStationById(booking.dest_station_id);
  const sourceCode = sourceStation?.code || String(booking.source_station_id);
  const destCode   = destStation?.code   || String(booking.dest_station_id);

  const depRoute = schedule ? trainRepo.getTrainRouteByStationId(schedule.train_id, booking.source_station_id) : null;
  const arrRoute = schedule ? trainRepo.getTrainRouteByStationId(schedule.train_id, booking.dest_station_id) : null;

  const classInfo = schedule ? trainRepo.getTrainClassInfo(schedule.train_id, booking.class_code) : null;
  const fareBreakdown: FareBreakdown = (classInfo && schedule)
    ? calculateFare(classInfo.base_fare, booking.total_passengers || 1, schedule.train_type)
    : {
        passengers: booking.total_passengers || 1,
        base_fare_per_passenger: (booking.total_passengers ? booking.total_fare / booking.total_passengers : booking.total_fare),
        base_fare_total: booking.total_fare,
        reservation_fee: 0,
        superfast_surcharge: 0,
        total_fare: booking.total_fare,
      };

  return {
    id: booking.id,
    pnr_number: booking.pnr_number,
    schedule_id: booking.schedule_id,
    train_number: schedule?.train_number || 'N/A',
    train_name: schedule?.train_name || 'Express',
    source_station: sourceStation ? `${sourceCode} — ${sourceStation.city}` : sourceCode,
    dest_station: destStation ? `${destCode} — ${destStation.city}` : destCode,
    source_station_code: sourceCode,
    dest_station_code: destCode,
    journey_date: booking.journey_date,
    departure_time: depRoute?.departure_time || '06:00',
    arrival_time: arrRoute?.arrival_time || '12:00',
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
    fare_breakdown: fareBreakdown,
    total_fare: booking.total_fare,
    booking_status: booking.booking_status,
    payment_status: booking.payment_status,
    transaction_id: successPayment?.transaction_id,
    contact_email: booking.contact_email,
    contact_phone: booking.contact_phone,
    booked_at: booking.created_at,
    created_at: booking.created_at,
  } as unknown as ETicket;
}

// IMPORTANT: Must match the fallback in middleware/index.ts so tokens issued here are verifiable
const JWT_SECRET = process.env.JWT_SECRET || 'demo_railway_secret_change_in_production';
const JWT_EXPIRY = '24h';

// Validation helpers
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function isValidPhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone.replace(/\s/g, ''));
}
function isStrongPassword(password: string): boolean {
  return password.length >= 8;
}

export class AuthController {
  // POST /api/auth/register
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { full_name, email, phone, password, confirm_password } = req.body as {
        full_name?: string;
        email?: string;
        phone?: string;
        password?: string;
        confirm_password?: string;
      };

      const errors: { field: string; message: string }[] = [];

      if (!full_name?.trim() || full_name.trim().length < 2) {
        errors.push({ field: 'full_name', message: 'Please enter your full legal name (minimum 2 characters)' });
      }
      if (!email || !isValidEmail(email)) {
        errors.push({ field: 'email', message: 'Please enter a valid email address' });
      }
      if (!phone || !isValidPhone(phone)) {
        errors.push({ field: 'phone', message: 'Valid 10-digit Indian mobile number starting with 6-9 is required' });
      }
      if (!password || !isStrongPassword(password)) {
        errors.push({ field: 'password', message: 'Password must be at least 8 characters long' });
      }
      if (password !== confirm_password) {
        errors.push({ field: 'confirm_password', message: 'Passwords do not match' });
      }

      if (errors.length > 0) {
        const summaryMessage = errors.length === 1
          ? errors[0].message
          : `Please correct the following: ${errors.map((e) => e.message).join('; ')}`;
        res.status(400).json({ error: 'Validation Error', message: summaryMessage, details: errors });
        return;
      }

      const user = await userRepo.createUser({
        full_name: full_name!.trim(),
        email: email!,
        phone: phone!.replace(/\s/g, ''),
        password: password!,
      });

      const token = jwt.sign(
        { id: user.id, email: user.email, role: 'PASSENGER' },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
      );

      res.status(201).json({
        success: true,
        message: 'Account created successfully. Welcome to RailReserve!',
        token,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
        },
      });
    } catch (err) {
      if (err instanceof Error && err.message.includes('already exists')) {
        const isEmail = err.message.toLowerCase().includes('email');
        const isPhone = err.message.toLowerCase().includes('phone');
        const details = isEmail
          ? [{ field: 'email', message: err.message }]
          : isPhone
          ? [{ field: 'phone', message: err.message }]
          : [];
        res.status(409).json({ error: 'Conflict', message: err.message, details });
        return;
      }
      next(err);
    }
  }

  // POST /api/auth/login
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body as { email?: string; password?: string };

      if (!email || !password) {
        throw new AppError('Email and password are required', 400);
      }

      const user = await userRepo.verifyCredentials(email, password);
      if (!user) {
        // Generic message prevents user enumeration
        throw new AppError('Invalid email or password', 401);
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: 'PASSENGER' },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
      );

      const unreadCount = userRepo.getUnreadCount(user.id);

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          unread_notifications: unreadCount,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/auth/me
  getProfile(req: Request, res: Response, next: NextFunction): void {
    try {
      const authReq = req as Request & { passengerUser?: { id: number; email: string } };
      const userId = authReq.passengerUser?.id;
      if (!userId) throw new AppError('Not authenticated', 401);

      const user = userRepo.findById(userId);
      if (!user) throw new AppError('User not found', 404);

      const unreadCount = userRepo.getUnreadCount(userId);

      res.json({
        success: true,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          created_at: user.created_at,
          unread_notifications: unreadCount,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/auth/profile
  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as Request & { passengerUser?: { id: number } };
      const userId = authReq.passengerUser?.id;
      if (!userId) throw new AppError('Not authenticated', 401);

      const { full_name, phone } = req.body as { full_name?: string; phone?: string };

      const errors: { field: string; message: string }[] = [];
      if (full_name !== undefined && full_name.trim().length < 2) {
        errors.push({ field: 'full_name', message: 'Full name must be at least 2 characters' });
      }
      if (phone !== undefined && !isValidPhone(phone)) {
        errors.push({ field: 'phone', message: 'Valid 10-digit Indian mobile number is required' });
      }
      if (errors.length > 0) {
        res.status(400).json({ error: 'Validation Error', details: errors });
        return;
      }

      const updated = await userRepo.updateProfile(userId, { full_name, phone });
      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: { id: updated.id, full_name: updated.full_name, email: updated.email, phone: updated.phone },
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/auth/change-password
  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as Request & { passengerUser?: { id: number } };
      const userId = authReq.passengerUser?.id;
      if (!userId) throw new AppError('Not authenticated', 401);

      const { current_password, new_password, confirm_new_password } = req.body as {
        current_password?: string;
        new_password?: string;
        confirm_new_password?: string;
      };

      if (!current_password || !new_password) throw new AppError('Current and new password are required', 400);
      if (new_password !== confirm_new_password) throw new AppError('New passwords do not match', 400);
      if (!isStrongPassword(new_password)) throw new AppError('New password must be at least 8 characters', 400);

      await userRepo.changePassword(userId, current_password, new_password);
      res.json({ success: true, message: 'Password changed successfully' });
    } catch (err) {
      if (err instanceof Error && err.message === 'Current password is incorrect') {
        res.status(400).json({ error: 'Bad Request', message: err.message });
        return;
      }
      next(err);
    }
  }

  // GET /api/auth/dashboard
  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as Request & { passengerUser?: { id: number } };
      const userId = authReq.passengerUser?.id;
      if (!userId) throw new AppError('Not authenticated', 401);

      const bookingIds = userRepo.getUserBookingIds(userId);

      // Load all bookings owned by this user and enrich them to full ETicket records
      const bookings = bookingIds
        .map(id => {
          const rawBooking = bookingRepo.findBookingById(id);
          if (!rawBooking) return null;
          return enrichBookingToETicket(rawBooking);
        })
        .filter((b): b is ETicket => b !== null);

      // Categorize bookings
      const now = new Date();
      const upcoming = bookings.filter(b => {
        if (!b) return false;
        const journeyDate = new Date(b.journey_date + 'T00:00:00');
        return journeyDate >= now && ['CONFIRMED', 'WAITING_LIST'].includes(b.booking_status);
      });
      const completed = bookings.filter(b => {
        if (!b) return false;
        const journeyDate = new Date(b.journey_date + 'T00:00:00');
        return journeyDate < now && b.booking_status !== 'CANCELLED';
      });
      const cancelled = bookings.filter(b => b?.booking_status === 'CANCELLED');

      const notifications = userRepo.getNotifications(userId, 10);
      const unreadCount = userRepo.getUnreadCount(userId);

      res.json({
        success: true,
        summary: {
          total_bookings: bookings.length,
          upcoming: upcoming.length,
          completed: completed.length,
          cancelled: cancelled.length,
        },
        upcoming_journeys: upcoming.slice(0, 5),
        recent_bookings: bookings.slice(0, 10),
        notifications,
        unread_notifications: unreadCount,
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/auth/bookings
  async getMyBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as Request & { passengerUser?: { id: number } };
      const userId = authReq.passengerUser?.id;
      if (!userId) throw new AppError('Not authenticated', 401);

      const bookingIds = userRepo.getUserBookingIds(userId);
      const bookings = bookingIds
        .map(id => {
          const rawBooking = bookingRepo.findBookingById(id);
          if (!rawBooking) return null;
          return enrichBookingToETicket(rawBooking);
        })
        .filter((b): b is ETicket => b !== null);

      res.json({ success: true, count: bookings.length, bookings });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/auth/saved-passengers
  getSavedPassengers(req: Request, res: Response, next: NextFunction): void {
    try {
      const authReq = req as Request & { passengerUser?: { id: number } };
      const userId = authReq.passengerUser?.id;
      if (!userId) throw new AppError('Not authenticated', 401);

      const passengers = userRepo.getSavedPassengers(userId);
      res.json({ success: true, passengers });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/auth/saved-passengers
  async addSavedPassenger(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as Request & { passengerUser?: { id: number } };
      const userId = authReq.passengerUser?.id;
      if (!userId) throw new AppError('Not authenticated', 401);

      const { passenger_name, age, gender, berth_preference } = req.body;
      if (!passenger_name || !age || !gender) throw new AppError('passenger_name, age, and gender are required', 400);

      const saved = userRepo.addSavedPassenger(userId, { passenger_name, age: Number(age), gender, berth_preference });
      res.status(201).json({ success: true, passenger: saved });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/auth/saved-passengers/:id
  deleteSavedPassenger(req: Request, res: Response, next: NextFunction): void {
    try {
      const authReq = req as Request & { passengerUser?: { id: number } };
      const userId = authReq.passengerUser?.id;
      if (!userId) throw new AppError('Not authenticated', 401);

      const passengerId = Number(req.params.id);
      userRepo.deleteSavedPassenger(userId, passengerId);
      res.json({ success: true, message: 'Saved passenger removed' });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/auth/notifications
  getNotifications(req: Request, res: Response, next: NextFunction): void {
    try {
      const authReq = req as Request & { passengerUser?: { id: number } };
      const userId = authReq.passengerUser?.id;
      if (!userId) throw new AppError('Not authenticated', 401);

      const limit = Math.min(Number(req.query.limit) || 20, 50);
      const notifications = userRepo.getNotifications(userId, limit);
      const unread = userRepo.getUnreadCount(userId);
      res.json({ success: true, notifications, unread_count: unread });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/auth/notifications/read
  markNotificationsRead(req: Request, res: Response, next: NextFunction): void {
    try {
      const authReq = req as Request & { passengerUser?: { id: number } };
      const userId = authReq.passengerUser?.id;
      if (!userId) throw new AppError('Not authenticated', 401);

      const { ids } = req.body as { ids?: number[] };
      userRepo.markNotificationsRead(userId, ids);
      res.json({ success: true, message: 'Notifications marked as read' });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/auth/forgot-password
  forgotPassword(req: Request, res: Response, next: NextFunction): void {
    try {
      const { email } = req.body as { email?: string };
      if (!email || !isValidEmail(email)) {
        throw new AppError('Valid email address is required', 400);
      }

      const user = userRepo.findByEmail(email.trim());
      if (!user) {
        res.json({
          success: true,
          message: 'If an account exists with this email, password reset instructions have been generated.',
        });
        return;
      }

      const resetToken = userRepo.createPasswordResetToken(user.id);
      res.json({
        success: true,
        message: 'Password reset token generated successfully.',
        demo_token: resetToken,
        instructions: 'Use this token on the /reset-password screen to set a new password.',
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/auth/reset-password
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, new_password, confirm_new_password } = req.body as {
        token?: string;
        new_password?: string;
        confirm_new_password?: string;
      };

      if (!token || !new_password) {
        throw new AppError('Reset token and new password are required', 400);
      }
      if (new_password.length < 8) {
        throw new AppError('New password must be at least 8 characters long', 400);
      }
      if (confirm_new_password && new_password !== confirm_new_password) {
        throw new AppError('Passwords do not match', 400);
      }

      const success = await userRepo.usePasswordResetToken(token.trim(), new_password);
      if (!success) {
        throw new AppError('Invalid or expired password reset token. Please request a new one.', 400);
      }

      res.json({
        success: true,
        message: 'Password has been reset successfully. You can now log in with your new password.',
      });
    } catch (err) {
      next(err);
    }
  }
}

