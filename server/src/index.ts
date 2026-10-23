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
import { errorHandler, notFoundHandler, requireAdminAuth } from './middleware/index.js';

// Controllers
import { TrainController } from './controllers/TrainController.js';
import { BookingController } from './controllers/BookingController.js';
import { AdminController } from './controllers/AdminController.js';

// DB: initialize schema idempotently
import { getDatabase } from './db/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// INITIALIZE DATABASE SCHEMA ON EVERY START (idempotent)
// Run `npm run db:seed` to populate demo data first time
// ============================================================
const schemaSQL = fs.readFileSync(path.resolve(__dirname, 'db/schema.sql'), 'utf-8');
getDatabase().exec(schemaSQL);
console.log('✅ Database schema ready (v2.0).');

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

// Body parsing
app.use(express.json({ limit: '1mb' }));
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
// ============================================================
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests', message: 'Please wait before retrying.' },
});

const bookingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: { error: 'Too many booking requests', message: 'Maximum 20 bookings per minute.' },
});

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts', message: 'Account temporarily locked. Try again in 15 minutes.' },
});

app.use('/api', globalLimiter);

// ============================================================
// CONTROLLER INSTANCES
// ============================================================
const trainCtrl = new TrainController();
const bookingCtrl = new BookingController();
const adminCtrl = new AdminController();

// ============================================================
// ROUTES
// ============================================================

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Railway Reservation System API v2.0',
    version: '2.0.0',
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

// --- Bookings ---
app.post('/api/bookings', bookingLimiter, (req, res, next) => bookingCtrl.createBooking(req, res, next));
app.post('/api/bookings/:bookingId/payment', bookingLimiter, (req, res, next) => bookingCtrl.processPayment(req, res, next));
app.get('/api/bookings/pnr/:pnr', (req, res, next) => bookingCtrl.getTicket(req, res, next));
app.get('/api/bookings', (req, res, next) => bookingCtrl.getBookingHistory(req, res, next));
app.get('/api/bookings/:pnr/cancellation-preview', (req, res, next) => bookingCtrl.getCancellationPreview(req, res, next));
app.post('/api/bookings/:pnr/cancel', (req, res, next) => bookingCtrl.cancelBooking(req, res, next));

// --- Admin routes (ALL require JWT authentication middleware) ---
app.post('/api/admin/login', adminLoginLimiter, (req, res, next) => adminCtrl.login(req, res, next));
app.get('/api/admin/dashboard', requireAdminAuth, (req, res, next) => adminCtrl.getDashboard(req, res, next));
app.get('/api/admin/trains', requireAdminAuth, (req, res, next) => adminCtrl.getTrains(req, res, next));
app.get('/api/admin/bookings', requireAdminAuth, (req, res, next) => adminCtrl.getAllBookings(req, res, next));
app.get('/api/admin/audit-logs', requireAdminAuth, (req, res, next) => adminCtrl.getAuditLogs(req, res, next));
app.patch('/api/admin/inventory/:scheduleId/:classCode', requireAdminAuth, (req, res, next) => adminCtrl.updateInventory(req, res, next));

// --- Error handling (must be last) ---
app.use(notFoundHandler);
app.use(errorHandler);

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  RAILWAY RESERVATION SYSTEM v2.0 — Team 11                 ║');
  console.log('║  CSE 2271 | Presidency University, Bengaluru               ║');
  console.log('║  ⚠️  ACADEMIC DEMONSTRATION ONLY                            ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Server  : http://localhost:${PORT}                              ║`);
  console.log(`║  Health  : http://localhost:${PORT}/api/health                   ║`);
  console.log(`║  Mode    : ${MODE.padEnd(50)}║`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
});

export default app;
