// Express Application Entry Point — Railway Reservation System v2.0 (Team 11)
// CSE 2271 | Presidency University, Bengaluru
// DISCLAIMER: Academic demonstration system - no real tickets or payments processed

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Middleware
import { errorHandler, notFoundHandler, requireAdminAuth, requirePassengerAuth, optionalPassengerAuth } from './middleware/index.js';

// Controllers
import { TrainController } from './controllers/TrainController.js';
import { BookingController } from './controllers/BookingController.js';
import { AdminController } from './controllers/AdminController.js';
import { AuthController } from './controllers/AuthController.js';
import { PaymentController } from './controllers/PaymentController.js';
import { SpecialTicketController } from './controllers/SpecialTicketController.js';

// DB: initialize schema idempotently
import { getDatabase } from './db/database.js';
// Booking repo for hold expiry scheduler
import { BookingRepository } from './repositories/BookingRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// INITIALIZE DATABASE SCHEMA ON EVERY START (idempotent)
// Run `npm run db:seed` to populate demo data first time
// ============================================================
const schemaSQL = fs.readFileSync(path.resolve(__dirname, 'db/schema.sql'), 'utf-8');
getDatabase().exec(schemaSQL);
console.log('✅ Database schema ready (v2.0).');

// Run migrations (idempotent — IF NOT EXISTS throughout)
const migrationsDir = path.resolve(__dirname, 'db/migrations');
if (fs.existsSync(migrationsDir)) {
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    getDatabase().exec(sql);
    console.log(`✅ Applied migration: ${file}`);
  }
}

// ============================================================
// EXPRESS APP SETUP
// ============================================================
const app = express();
const PORT = Number(process.env.PORT) || 5000;
const MODE = process.env.PAYMENT_MODE || 'DEMO';

// Security headers via helmet (relaxed for API + demo)
app.use(helmet({
  contentSecurityPolicy: false, // API only — no HTML served
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Body parsing (captures raw body for cryptographic webhook HMAC verification)
app.use(express.json({
  limit: '1mb',
  verify: (req: any, _res, buf) => {
    req.rawBody = buf.toString('utf8');
  },
}));
app.use(express.urlencoded({ extended: true }));

// CORS — allow client dev server and configured origins
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://localhost:3000').split(',');
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// Academic disclaimer header on all responses
app.use((_req, res, next) => {
  res.setHeader('X-Academic-Disclaimer', 'Railway Reservation System - Team 11 - CSE 2271 - Presidency University - DEMO ONLY');
  res.setHeader('X-Payment-Mode', MODE);
  next();
});

// ============================================================
// RATE LIMITING
// In test mode (NODE_ENV=test or PORT=5001) limits are relaxed so the full
// test suite can run without tripping them. Production values are enforced
// in all other environments.
// ============================================================
const isTestEnv = process.env.NODE_ENV === 'test' || process.env.PORT === '5001';

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTestEnv ? 10000 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests', message: 'Please wait before retrying.' },
});

const bookingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isTestEnv ? 1000 : 20,
  message: { error: 'Too many booking requests', message: 'Maximum 20 bookings per minute.' },
});

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTestEnv ? 1000 : 10,
  message: { error: 'Too many login attempts', message: 'Account temporarily locked. Try again in 15 minutes.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTestEnv ? 1000 : 30,
  message: { error: 'Too many auth requests', message: 'Too many attempts, please wait.' },
});

app.use('/api', globalLimiter);

// ============================================================
// CONTROLLER INSTANCES
// ============================================================
const trainCtrl = new TrainController();
const bookingCtrl = new BookingController();
const adminCtrl = new AdminController();
const authCtrl = new AuthController();
const paymentCtrl = new PaymentController();
const specialCtrl = new SpecialTicketController();

// ============================================================
// ROUTES
// ============================================================

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Railway Reservation System API v3.0',
    version: '3.0.0',
    team: 'Team 11',
    course: 'CSE 2271 - Presidency University',
    payment_mode: MODE,
    disclaimer: 'Academic demonstration only. No real tickets or payments.',
    timestamp: new Date().toISOString(),
  });
});

// --- Trains & Stations ---
app.get('/api/trains/search', (req, res, next) => trainCtrl.searchTrains(req, res, next));
app.get('/api/stations', (req, res, next) => trainCtrl.getStations(req, res, next));
app.get('/api/stations/autocomplete', (req, res, next) => trainCtrl.autocompleteStations(req, res, next));
app.get('/api/trains/:trainId/stops', (req, res, next) => trainCtrl.getTrainStops(req, res, next));
app.get('/api/schedules/:scheduleId', (req, res, next) => trainCtrl.getScheduleInfo(req, res, next));

// --- Passenger Auth ---
app.post('/api/auth/register', authLimiter, (req, res, next) => authCtrl.register(req, res, next));
app.post('/api/auth/login', authLimiter, (req, res, next) => authCtrl.login(req, res, next));
app.post('/api/auth/forgot-password', authLimiter, (req, res, next) => authCtrl.forgotPassword(req, res, next));
app.post('/api/auth/reset-password', authLimiter, (req, res, next) => authCtrl.resetPassword(req, res, next));
app.get('/api/auth/me', requirePassengerAuth, (req, res, next) => authCtrl.getProfile(req, res, next));
app.patch('/api/auth/profile', requirePassengerAuth, (req, res, next) => authCtrl.updateProfile(req, res, next));
app.post('/api/auth/change-password', requirePassengerAuth, (req, res, next) => authCtrl.changePassword(req, res, next));
app.get('/api/auth/dashboard', requirePassengerAuth, (req, res, next) => authCtrl.getDashboard(req, res, next));
app.get('/api/auth/bookings', requirePassengerAuth, (req, res, next) => authCtrl.getMyBookings(req, res, next));
app.get('/api/auth/saved-passengers', requirePassengerAuth, (req, res, next) => authCtrl.getSavedPassengers(req, res, next));
app.post('/api/auth/saved-passengers', requirePassengerAuth, (req, res, next) => authCtrl.addSavedPassenger(req, res, next));
app.delete('/api/auth/saved-passengers/:id', requirePassengerAuth, (req, res, next) => authCtrl.deleteSavedPassenger(req, res, next));
app.get('/api/auth/notifications', requirePassengerAuth, (req, res, next) => authCtrl.getNotifications(req, res, next));
app.post('/api/auth/notifications/read', requirePassengerAuth, (req, res, next) => authCtrl.markNotificationsRead(req, res, next));
app.get('/api/auth/my-all-tickets', requirePassengerAuth, (req, res, next) => specialCtrl.getMyAllTickets(req, res, next));

// --- Unreserved & Platform Ticket Endpoints (v3.0) ---
app.post('/api/unreserved/fare', (req, res, next) => specialCtrl.calculateFare(req, res, next));
app.post('/api/unreserved/book', bookingLimiter, optionalPassengerAuth, (req, res, next) => specialCtrl.bookUnreserved(req, res, next));
app.get('/api/unreserved/:ticketNumber', (req, res, next) => specialCtrl.getUnreservedTicket(req, res, next));
app.post('/api/platform/book', bookingLimiter, optionalPassengerAuth, (req, res, next) => specialCtrl.bookPlatform(req, res, next));
app.get('/api/platform/:ticketNumber', (req, res, next) => specialCtrl.getPlatformTicket(req, res, next));

// --- Bookings ---
app.post('/api/bookings', bookingLimiter, optionalPassengerAuth, (req, res, next) => bookingCtrl.createBooking(req, res, next));
app.post('/api/bookings/:bookingId/payment', bookingLimiter, optionalPassengerAuth, (req, res, next) => bookingCtrl.processPayment(req, res, next));
app.get('/api/bookings/pnr/:pnr', optionalPassengerAuth, (req, res, next) => bookingCtrl.getTicket(req, res, next));
app.get('/api/bookings', (req, res, next) => bookingCtrl.getBookingHistory(req, res, next));
app.get('/api/bookings/:pnr/cancellation-preview', optionalPassengerAuth, (req, res, next) => bookingCtrl.getCancellationPreview(req, res, next));
app.post('/api/bookings/:pnr/cancel', optionalPassengerAuth, (req, res, next) => bookingCtrl.cancelBooking(req, res, next));

// --- Admin routes (ALL require JWT authentication middleware) ---
app.post('/api/admin/login', adminLoginLimiter, (req, res, next) => adminCtrl.login(req, res, next));
app.get('/api/admin/dashboard', requireAdminAuth, (req, res, next) => adminCtrl.getDashboard(req, res, next));
app.get('/api/admin/trains', requireAdminAuth, (req, res, next) => adminCtrl.getTrains(req, res, next));
app.get('/api/admin/bookings', requireAdminAuth, (req, res, next) => adminCtrl.getAllBookings(req, res, next));
app.get('/api/admin/audit-logs', requireAdminAuth, (req, res, next) => adminCtrl.getAuditLogs(req, res, next));
app.patch('/api/admin/inventory/:scheduleId/:classCode', requireAdminAuth, (req, res, next) => adminCtrl.updateInventory(req, res, next));

// --- Payment routes ---
app.get('/api/payments/mode', (req, res, next) => paymentCtrl.getMode(req, res, next));
app.post('/api/payments/create-order', bookingLimiter, optionalPassengerAuth, (req, res, next) => paymentCtrl.createOrder(req, res, next));
app.post('/api/payments/verify', bookingLimiter, optionalPassengerAuth, (req, res, next) => paymentCtrl.verifyAndConfirm(req, res, next));
app.post('/api/payments/webhook', (req, res, next) => paymentCtrl.handleWebhook(req, res, next));

// --- Error handling (must be last) ---
app.use(notFoundHandler);
app.use(errorHandler);

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  RAILWAY RESERVATION SYSTEM v3.0 — Team 11                 ║');
  console.log('║  CSE 2271 | Presidency University, Bengaluru               ║');
  console.log('║  ⚠️  ACADEMIC DEMONSTRATION ONLY                            ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Server  : http://localhost:${PORT}                              ║`);
  console.log(`║  Health  : http://localhost:${PORT}/api/health                   ║`);
  console.log(`║  Mode    : ${MODE.padEnd(50)}║`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // ── Hold Expiry Scheduler ──────────────────────────────────────────────────
  // Runs every 2 minutes to release seats from expired payment holds.
  // This is the backend-driven expiry mechanism (not just a frontend countdown).
  const bookingRepoForExpiry = new BookingRepository();
  const EXPIRY_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
  setInterval(() => {
    try {
      const count = bookingRepoForExpiry.expireHeldBookings();
      if (count > 0) {
        console.log(`[HOLD_EXPIRY] Released inventory for ${count} expired booking(s).`);
      }
    } catch (err) {
      console.error('[HOLD_EXPIRY] Scheduler error:', err);
    }
  }, EXPIRY_INTERVAL_MS);
  console.log(`[HOLD_EXPIRY] Scheduler active — checking every ${EXPIRY_INTERVAL_MS / 60000} min\n`);
});

export default app;
