// Express Application Entry Point — Railway Reservation System (Team 11)
// CSE 2271 | Presidency University, Bengaluru
// DISCLAIMER: Academic demonstration system - no real tickets or payments processed

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
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
console.log('✅ Database schema ready.');

// ============================================================
// EXPRESS APP SETUP
// ============================================================
const app = express();
const PORT = Number(process.env.PORT) || 5000;

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS — allow client dev server
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
  ],
  credentials: true,
}));

// Academic disclaimer header on all responses
app.use((_req, res, next) => {
  res.setHeader(
    'X-Academic-Disclaimer',
    'Railway Reservation System - Team 11 - CSE 2271 - Presidency University - DEMO ONLY'
  );
  next();
});

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
    service: 'Railway Reservation System API',
    team: 'Team 11',
    course: 'CSE 2271 - Presidency University',
    disclaimer: 'Academic demonstration only. No real tickets or payments.',
    timestamp: new Date().toISOString(),
  });
});

// --- Trains & Stations ---
app.get('/api/trains/search', (req, res, next) => trainCtrl.searchTrains(req, res, next));
app.get('/api/stations', (req, res, next) => trainCtrl.getStations(req, res, next));
app.get('/api/schedules/:scheduleId', (req, res, next) => trainCtrl.getScheduleInfo(req, res, next));

// --- Bookings ---
app.post('/api/bookings', (req, res, next) => bookingCtrl.createBooking(req, res, next));
app.post('/api/bookings/:bookingId/payment', (req, res, next) => bookingCtrl.processPayment(req, res, next));
app.get('/api/bookings/pnr/:pnr', (req, res, next) => bookingCtrl.getTicket(req, res, next));
app.get('/api/bookings', (req, res, next) => bookingCtrl.getBookingHistory(req, res, next));
app.get('/api/bookings/:pnr/cancellation-preview', (req, res, next) => bookingCtrl.getCancellationPreview(req, res, next));
app.post('/api/bookings/:pnr/cancel', (req, res, next) => bookingCtrl.cancelBooking(req, res, next));

// --- Admin routes (ALL require JWT authentication middleware) ---
app.post('/api/admin/login', (req, res, next) => adminCtrl.login(req, res, next));
app.get('/api/admin/dashboard', requireAdminAuth, (req, res, next) => adminCtrl.getDashboard(req, res, next));
app.get('/api/admin/trains', requireAdminAuth, (req, res, next) => adminCtrl.getTrains(req, res, next));
app.get('/api/admin/bookings', requireAdminAuth, (req, res, next) => adminCtrl.getAllBookings(req, res, next));
app.patch('/api/admin/inventory/:scheduleId/:classCode', requireAdminAuth, (req, res, next) => adminCtrl.updateInventory(req, res, next));

// --- Error handling (must be last) ---
app.use(notFoundHandler);
app.use(errorHandler);

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║       RAILWAY RESERVATION SYSTEM — Team 11                  ║');
  console.log('║       CSE 2271 | Presidency University, Bengaluru            ║');
  console.log('║       ⚠️  ACADEMIC DEMONSTRATION ONLY                        ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Server running at: http://localhost:${PORT}                     ║`);
  console.log(`║  Health check:      http://localhost:${PORT}/api/health          ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
});

export default app;
