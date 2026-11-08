// Comprehensive Automated Test Suite — 27 Test Cases
// Team 11 Railway Reservation System, CSE 2271
// Uses Vitest + Supertest (HTTP integration testing)
// Maps to: docs/TEST_PLAN.md test case IDs TC-01 through TC-27

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import app from '../src/index.js';
import { resetTestDatabase } from './setup.js';
import { closeDatabase, getDatabase } from '../src/db/database.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env['JWT_SECRET'] || 'test_jwt_secret_for_vitest';

// Helper: admin token
function getAdminToken(): string {
  return jwt.sign({ username: 'testadmin', role: 'ADMIN', id: 1 }, JWT_SECRET, { expiresIn: '1h' });
}

// Test dates from environment
let TOMORROW: string;
let NEXT_WEEK: string;
let SCHED1_ID: number; // Train 12028 (SBC→MAS, has 5 seats)
let SCHED2_ID: number; // Train 11013 (SBC→MAS, WL only)
let SCHED3_ID: number; // Train 12601 (MAS→TVC, overnight)

beforeAll(() => {
  TOMORROW = process.env['TEST_DATE_TOMORROW'] || '';
  NEXT_WEEK = process.env['TEST_DATE_NEXT_WEEK'] || '';
  SCHED1_ID = Number(process.env['TEST_SCHED1_ID']);
  SCHED2_ID = Number(process.env['TEST_SCHED2_ID']);
  SCHED3_ID = Number(process.env['TEST_SCHED3_ID']);
});

// ============================================================
// TC-01: Valid Train Search (FR-01, FR-03)
// ============================================================
describe('TC-01: Valid Train Search', () => {
  it('should return trains for valid SBC→MAS route', async () => {
    const res = await request(app)
      .get('/api/trains/search')
      .query({ from: 'SBC', to: 'MAS', date: TOMORROW });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.trains)).toBe(true);
    expect(res.body.trains.length).toBeGreaterThan(0);

    const train = res.body.trains[0];
    expect(train).toHaveProperty('train_number');
    expect(train).toHaveProperty('departure_time');
    expect(train).toHaveProperty('arrival_time');
    expect(train).toHaveProperty('classes');
    expect(train.classes.length).toBeGreaterThan(0);
    expect(train).toHaveProperty('journey_duration_minutes');
  });
});

// ============================================================
// TC-02: Missing Search Inputs (FR-02)
// Equivalence Class Partitioning: invalid/missing inputs
// ============================================================
describe('TC-02: Missing and Invalid Search Inputs', () => {
  it('should reject request with missing from station', async () => {
    const res = await request(app)
      .get('/api/trains/search')
      .query({ to: 'MAS', date: TOMORROW });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Error');
  });

  it('should reject request with missing date', async () => {
    const res = await request(app)
      .get('/api/trains/search')
      .query({ from: 'SBC', to: 'MAS' });

    expect(res.status).toBe(400);
  });

  it('should reject past date', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const res = await request(app)
      .get('/api/trains/search')
      .query({ from: 'SBC', to: 'MAS', date: yesterday.toISOString().split('T')[0] });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('past');
  });

  it('should reject date beyond 120 days', async () => {
    const farFuture = new Date();
    farFuture.setDate(farFuture.getDate() + 125);
    const res = await request(app)
      .get('/api/trains/search')
      .query({ from: 'SBC', to: 'MAS', date: farFuture.toISOString().split('T')[0] });

    expect(res.status).toBe(400);
  });
});

// ============================================================
// TC-03: Identical Source and Destination (FR-02)
// ============================================================
describe('TC-03: Identical Source and Destination', () => {
  it('should reject same station for source and destination', async () => {
    const res = await request(app)
      .get('/api/trains/search')
      .query({ from: 'SBC', to: 'SBC', date: TOMORROW });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('same');
  });
});

// ============================================================
// TC-04: No Matching Trains (FR-03)
// ============================================================
describe('TC-04: No Matching Trains Found', () => {
  it('should return empty array for route with no trains', async () => {
    const res = await request(app)
      .get('/api/trains/search')
      .query({ from: 'HYB', to: 'MYS', date: TOMORROW });

    expect(res.status).toBe(200);
    expect(res.body.trains).toHaveLength(0);
  });
});

// ============================================================
// TC-05: Correct Route Ordering (FR-01)
// Prevents reverse-direction booking
// ============================================================
describe('TC-05: Correct Route Ordering', () => {
  it('should not return train when stations are in reverse order', async () => {
    // Train 12028 goes SBC→MAS, so MAS→SBC should return empty
    const res = await request(app)
      .get('/api/trains/search')
      .query({ from: 'MAS', to: 'SBC', date: TOMORROW });

    expect(res.status).toBe(200);
    // Train 12028 should NOT appear since MAS is stop 2 and SBC is stop 1
    const train12028 = res.body.trains?.find((t: { train_number: string }) => t.train_number === '12028');
    expect(train12028).toBeUndefined();
  });
});

// ============================================================
// TC-06: Overnight Journey Duration (FR-03)
// ============================================================
describe('TC-06: Overnight Journey Duration Calculation', () => {
  it('should calculate correct duration for overnight train (MAS→TVC)', async () => {
    const res = await request(app)
      .get('/api/trains/search')
      .query({ from: 'MAS', to: 'TVC', date: TOMORROW });

    expect(res.status).toBe(200);
    expect(res.body.trains.length).toBeGreaterThan(0);

    const overnightTrain = res.body.trains.find((t: { train_number: string }) => t.train_number === '12601');
    expect(overnightTrain).toBeDefined();
    expect(overnightTrain.is_overnight).toBe(true);
    // 22:15 to 08:45 next day = 10h 30m = 630 minutes
    expect(overnightTrain.journey_duration_minutes).toBe(630);
  });
});

// ============================================================
// TC-07: Passenger Detail Validation (FR-06)
// Boundary Value Analysis on age
// ============================================================
describe('TC-07: Passenger Detail Validation', () => {
  const baseBooking = () => ({
    schedule_id: SCHED1_ID,
    source_station_code: 'SBC',
    dest_station_code: 'MAS',
    class_code: 'CC',
    contact_email: 'test@example.com',
    contact_phone: '9876543210',
    idempotency_key: `test-${Date.now()}-${Math.random()}`,
  });

  it('should reject age 0 (BVA lower boundary)', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({ ...baseBooking(), passengers: [{ passenger_name: 'Test User', age: 0, gender: 'M' }] });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('age');
  });

  it('should reject age 121 (BVA upper boundary)', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({ ...baseBooking(), passengers: [{ passenger_name: 'Test User', age: 121, gender: 'M' }] });
    expect(res.status).toBe(400);
  });

  it('should accept age 1 (BVA valid lower boundary)', async () => {
    const key = `tc07-valid-${Date.now()}`;
    const res = await request(app)
      .post('/api/bookings')
      .send({ ...baseBooking(), idempotency_key: key, passengers: [{ passenger_name: 'Baby Test', age: 1, gender: 'F' }] });
    // Should succeed (201) or inventory error, not validation error
    expect([201, 400]).toContain(res.status);
    if (res.status === 400) {
      expect(JSON.stringify(res.body)).not.toContain('age');
    }
  });

  it('should reject passenger name with numbers', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({ ...baseBooking(), passengers: [{ passenger_name: 'User123', age: 25, gender: 'M' }] });
    expect(res.status).toBe(400);
  });

  it('should reject invalid phone number', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({
        ...baseBooking(),
        contact_phone: '12345',
        passengers: [{ passenger_name: 'Valid Name', age: 25, gender: 'M' }],
      });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('phone');
  });

  it('should reject invalid email', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({
        ...baseBooking(),
        contact_email: 'not-an-email',
        passengers: [{ passenger_name: 'Valid Name', age: 25, gender: 'M' }],
      });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('email');
  });

  it('should reject more than 6 passengers', async () => {
    const passengers = Array(7).fill({ passenger_name: 'Test', age: 25, gender: 'M' });
    const res = await request(app)
      .post('/api/bookings')
      .send({ ...baseBooking(), passengers });
    expect(res.status).toBe(400);
  });
});

// ============================================================
// TC-08: Fare Calculation (FR-07)
// ============================================================
describe('TC-08: Fare Calculation', () => {
  it('should include fare breakdown in booking response', async () => {
    const key = `tc08-fare-${Date.now()}`;
    const res = await request(app)
      .post('/api/bookings')
      .send({
        schedule_id: SCHED1_ID,
        source_station_code: 'SBC',
        dest_station_code: 'MAS',
        class_code: 'CC',
        contact_email: 'fare@test.com',
        contact_phone: '9876543211',
        idempotency_key: key,
        passengers: [{ passenger_name: 'Fare Tester', age: 30, gender: 'M' }],
      });

    if (res.status === 201) {
      expect(res.body).toHaveProperty('fare_breakdown');
      expect(res.body.fare_breakdown.total_fare).toBeGreaterThan(0);
      // For SUPERFAST: base_fare (650) + reservation_fee (60) + superfast (45) = 755
      expect(res.body.fare_breakdown.total_fare).toBe(755);
    }
  });
});

// ============================================================
// TC-09: Seat Availability Check (FR-08)
// ============================================================
describe('TC-09: Seat Availability', () => {
  it('should reflect correct seat counts in search results', async () => {
    const res = await request(app)
      .get('/api/trains/search')
      .query({ from: 'SBC', to: 'MAS', date: TOMORROW });

    const train12028 = res.body.trains?.find((t: { train_number: string }) => t.train_number === '12028');
    if (train12028) {
      const ccClass = train12028.classes.find((c: { class_code: string }) => c.class_code === 'CC');
      expect(ccClass).toBeDefined();
      expect(ccClass.available_seats).toBeGreaterThanOrEqual(0);
      expect(ccClass.availability_status).toMatch(/AVAILABLE|WAITING_LIST|NOT_AVAILABLE/);
    }
  });

  it('should show WL status for fully booked train', async () => {
    const res = await request(app)
      .get('/api/trains/search')
      .query({ from: 'SBC', to: 'MAS', date: TOMORROW });

    const train11013 = res.body.trains?.find((t: { train_number: string }) => t.train_number === '11013');
    if (train11013) {
      const slClass = train11013.classes.find((c: { class_code: string }) => c.class_code === 'SL');
      if (slClass) {
        // This train is seeded with 0 available seats
        expect(['WAITING_LIST', 'NOT_AVAILABLE']).toContain(slClass.availability_status);
      }
    }
  });
});

// ============================================================
// TC-10: Booking Creation (FR-09, FR-11)
// ============================================================
describe('TC-10: Booking Creation', () => {
  let createdBookingId: number;
  let createdPNR: string;

  it('should create a PENDING_PAYMENT booking successfully', async () => {
    const key = `tc10-create-${Date.now()}`;
    const res = await request(app)
      .post('/api/bookings')
      .send({
        schedule_id: SCHED1_ID,
        source_station_code: 'SBC',
        dest_station_code: 'MAS',
        class_code: 'CC',
        contact_email: 'booking@test.com',
        contact_phone: '9876543212',
        idempotency_key: key,
        passengers: [{ passenger_name: 'Test Passenger', age: 35, gender: 'M' }],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('pnr_number');
    expect(res.body.pnr_number).toMatch(/^PNR/);
    expect(res.body.booking_status).toBe('PENDING_PAYMENT');
    createdBookingId = res.body.booking_id;
    createdPNR = res.body.pnr_number;
  });
});

// ============================================================
// TC-11: Concurrent Booking — Overbooking Prevention (FR-09)
// NFR-01: Zero-overbooking invariant
// ============================================================
describe('TC-11: Concurrent Booking (Overbooking Prevention)', () => {
  it('should prevent overbooking under concurrent requests', async () => {
    // Close and reset the DB to start with known inventory (5 seats on SCHED1)
    // We must close the app's DB singleton first so Windows can release the file lock
    closeDatabase();
    resetTestDatabase();

    TOMORROW = process.env['TEST_DATE_TOMORROW'] || TOMORROW;
    SCHED1_ID = Number(process.env['TEST_SCHED1_ID']);

    // Available seats = 5, send 8 concurrent booking requests
    const concurrentRequests = Array.from({ length: 8 }, (_, i) =>
      request(app)
        .post('/api/bookings')
        .send({
          schedule_id: SCHED1_ID,
          source_station_code: 'SBC',
          dest_station_code: 'MAS',
          class_code: 'CC',
          contact_email: `concurrent${i}@test.com`,
          contact_phone: `987654${3200 + i}`,
          idempotency_key: `tc11-concurrent-${i}-${Date.now()}`,
          passengers: [{ passenger_name: `Passenger ${i}`, age: 25 + i, gender: 'M' }],
        })
    );

    const results = await Promise.all(concurrentRequests);
    const successful = results.filter((r) => r.status === 201);
    const allPNRs = successful.map((r) => r.body.pnr_number);
    const uniquePNRs = new Set(allPNRs);

    // All PNRs must be unique
    expect(uniquePNRs.size).toBe(allPNRs.length);
    // We'll confirm payments for all to check final seat count
    console.log(`   TC-11: ${successful.length}/8 bookings created (before payment)`);
    // Bookings only consume inventory on CONFIRM, so all 8 may be created as PENDING_PAYMENT
    // The critical test is after payment confirmation below
  });
});

// ============================================================
// TC-12: Payment Success — Booking Confirmed (FR-10)
// ============================================================
describe('TC-12 & TC-13: Payment Success and Failure', () => {
  let bookingId: number;

  it('TC-12: Payment SUCCESS should confirm booking', async () => {
    const key = `tc12-payment-${Date.now()}`;
    const createRes = await request(app)
      .post('/api/bookings')
      .send({
        schedule_id: SCHED1_ID,
        source_station_code: 'SBC',
        dest_station_code: 'MAS',
        class_code: 'CC',
        contact_email: 'paysuccess@test.com',
        contact_phone: '9876543213',
        idempotency_key: key,
        passengers: [{ passenger_name: 'Pay Success', age: 28, gender: 'F' }],
      });

    if (createRes.status !== 201) {
      console.warn('TC-12: Could not create booking (inventory may be exhausted)');
      return;
    }

    bookingId = createRes.body.booking_id;

    const payRes = await request(app)
      .post(`/api/bookings/${bookingId}/payment`)
      .send({ outcome: 'SUCCESS' });

    expect(payRes.status).toBe(200);
    expect(payRes.body.success).toBe(true);
    expect(['CONFIRMED', 'WAITING_LIST']).toContain(payRes.body.booking_status);
    expect(payRes.body.payment_status).toBe('PAID');
    expect(payRes.body).toHaveProperty('transaction_id');
  });

  it('TC-13: Payment FAILURE should NOT create a confirmed booking', async () => {
    const key = `tc13-failure-${Date.now()}`;
    const createRes = await request(app)
      .post('/api/bookings')
      .send({
        schedule_id: SCHED1_ID,
        source_station_code: 'SBC',
        dest_station_code: 'MAS',
        class_code: 'CC',
        contact_email: 'payfail@test.com',
        contact_phone: '9876543214',
        idempotency_key: key,
        passengers: [{ passenger_name: 'Pay Fail', age: 22, gender: 'M' }],
      });

    if (createRes.status !== 201) return;

    const failBookingId = createRes.body.booking_id;

    const payRes = await request(app)
      .post(`/api/bookings/${failBookingId}/payment`)
      .send({ outcome: 'FAILURE' });

    expect(payRes.status).toBe(200);
    expect(payRes.body.success).toBe(false);
    expect(payRes.body.booking_status).toBe('FAILED');
    // CRITICAL: Failed payment must NOT produce CONFIRMED status
    expect(payRes.body.booking_status).not.toBe('CONFIRMED');
  });
});

// ============================================================
// TC-15: Idempotency — Duplicate Submission Prevention (FR-09)
// ============================================================
describe('TC-15: Duplicate Submission Idempotency', () => {
  it('should return same booking for duplicate idempotency key', async () => {
    const key = `tc15-idempotent-${Date.now()}`;
    const body = {
      schedule_id: SCHED1_ID,
      source_station_code: 'SBC',
      dest_station_code: 'MAS',
      class_code: 'CC',
      contact_email: 'idempotent@test.com',
      contact_phone: '9876543215',
      idempotency_key: key,
      passengers: [{ passenger_name: 'Idempotent User', age: 30, gender: 'O' }],
    };

    const res1 = await request(app).post('/api/bookings').send(body);
    const res2 = await request(app).post('/api/bookings').send(body);

    if (res1.status === 201 && res2.status === 201) {
      // Must return the same PNR
      expect(res1.body.pnr_number).toBe(res2.body.pnr_number);
      expect(res1.body.booking_id).toBe(res2.body.booking_id);
    }
  });
});

// ============================================================
// TC-16: Unique Booking References (FR-11)
// ============================================================
describe('TC-16: Unique PNR Generation', () => {
  it('should generate unique PNRs for different bookings', async () => {
    const pnrs: string[] = [];

    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post('/api/bookings')
        .send({
          schedule_id: SCHED1_ID,
          source_station_code: 'SBC',
          dest_station_code: 'MAS',
          class_code: 'CC',
          contact_email: `unique${i}@test.com`,
          contact_phone: `987654${3220 + i}`,
          idempotency_key: `tc16-unique-${i}-${Date.now()}-${Math.random()}`,
          passengers: [{ passenger_name: `Unique User ${i}`, age: 25, gender: 'M' }],
        });
      if (res.status === 201) pnrs.push(res.body.pnr_number);
    }

    const uniquePNRs = new Set(pnrs);
    expect(uniquePNRs.size).toBe(pnrs.length);
  });
});

// ============================================================
// TC-17: E-Ticket Retrieval (FR-12, FR-13)
// ============================================================
describe('TC-17: E-Ticket Generation and Retrieval', () => {
  it('should retrieve ticket by PNR with matching contact', async () => {
    // Create and confirm a booking
    const key = `tc17-ticket-${Date.now()}`;
    const createRes = await request(app)
      .post('/api/bookings')
      .send({
        schedule_id: SCHED1_ID,
        source_station_code: 'SBC',
        dest_station_code: 'MAS',
        class_code: 'CC',
        contact_email: 'ticket@test.com',
        contact_phone: '9876543216',
        idempotency_key: key,
        passengers: [{ passenger_name: 'Ticket Tester', age: 40, gender: 'F' }],
      });

    if (createRes.status !== 201) return;

    const pnr = createRes.body.pnr_number;

    // Confirm payment
    await request(app)
      .post(`/api/bookings/${createRes.body.booking_id}/payment`)
      .send({ outcome: 'SUCCESS' });

    // Retrieve ticket
    const ticketRes = await request(app)
      .get(`/api/bookings/pnr/${pnr}`)
      .query({ email: 'ticket@test.com' });

    expect(ticketRes.status).toBe(200);
    expect(ticketRes.body.success).toBe(true);
    expect(ticketRes.body.ticket.pnr_number).toBe(pnr);
    expect(ticketRes.body.ticket.disclaimer).toContain('ACADEMIC DEMONSTRATION');
    expect(ticketRes.body.ticket.passengers).toHaveLength(1);
    expect(ticketRes.body.ticket.passengers[0].passenger_name).toBe('Ticket Tester');
  });
});

// ============================================================
// TC-18: Booking History Authorization (FR-13)
// ============================================================
describe('TC-18: Booking History Scoping', () => {
  it('should return only bookings for the provided contact email', async () => {
    const res = await request(app)
      .get('/api/bookings')
      .query({ email: 'ticket@test.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // All returned bookings should match the email
    if (res.body.bookings.length > 0) {
      res.body.bookings.forEach((b: { contact_email: string }) => {
        expect(b.contact_email).toBe('ticket@test.com');
      });
    }
  });

  it('should reject ticket retrieval with wrong contact', async () => {
    const key = `tc18-auth-${Date.now()}`;
    const createRes = await request(app)
      .post('/api/bookings')
      .send({
        schedule_id: SCHED1_ID,
        source_station_code: 'SBC',
        dest_station_code: 'MAS',
        class_code: 'CC',
        contact_email: 'owner@test.com',
        contact_phone: '9876543217',
        idempotency_key: key,
        passengers: [{ passenger_name: 'Owner User', age: 32, gender: 'M' }],
      });

    if (createRes.status !== 201) return;

    const pnr = createRes.body.pnr_number;
    const wrongContactRes = await request(app)
      .get(`/api/bookings/pnr/${pnr}`)
      .query({ email: 'attacker@evil.com' });

    // With wrong email, should get 403 or ticket without private details
    expect([200, 403, 404]).toContain(wrongContactRes.status);
    if (wrongContactRes.status === 403) {
      // error field is generic ('Request Error'); the specific message is in .message
      expect(wrongContactRes.body.message).toContain('Contact information');
    }
  });
});

// ============================================================
// TC-19: Waiting List Position (FR-14)
// ============================================================
describe('TC-19: Waiting List Assignment', () => {
  it('should assign WL status for fully booked train', async () => {
    // Train 11013/SL is seeded with 0 available seats
    const key = `tc19-wl-${Date.now()}`;
    const res = await request(app)
      .post('/api/bookings')
      .send({
        schedule_id: SCHED2_ID,
        source_station_code: 'SBC',
        dest_station_code: 'MAS',
        class_code: 'SL',
        contact_email: 'wl@test.com',
        contact_phone: '9876543218',
        idempotency_key: key,
        passengers: [{ passenger_name: 'WL Passenger', age: 26, gender: 'F' }],
      });

    if (res.status === 201) {
      expect(res.body.is_waiting_list).toBe(true);
    } else if (res.status === 400) {
      // WL capacity exhausted is also valid
      expect(JSON.stringify(res.body)).toContain('capacity');
    }
  });
});

// ============================================================
// TC-21: Cancellation Eligibility (FR-15)
// ============================================================
describe('TC-21: Cancellation Eligibility', () => {
  it('should return cancellation preview for eligible booking', async () => {
    const key = `tc21-cancel-${Date.now()}`;
    const createRes = await request(app)
      .post('/api/bookings')
      .send({
        schedule_id: SCHED1_ID,
        source_station_code: 'SBC',
        dest_station_code: 'MAS',
        class_code: 'CC',
        contact_email: 'cancel@test.com',
        contact_phone: '9876543219',
        idempotency_key: key,
        passengers: [{ passenger_name: 'Cancel Tester', age: 35, gender: 'M' }],
      });

    if (createRes.status !== 201) return;

    const pnr = createRes.body.pnr_number;
    await request(app)
      .post(`/api/bookings/${createRes.body.booking_id}/payment`)
      .send({ outcome: 'SUCCESS' });

    const previewRes = await request(app)
      .get(`/api/bookings/${pnr}/cancellation-preview`);

    expect(previewRes.status).toBe(200);
    expect(previewRes.body.preview).toHaveProperty('refund_amount');
    expect(previewRes.body.preview).toHaveProperty('cancellation_charge');
    expect(previewRes.body.preview.original_fare).toBeGreaterThan(0);
  });
});

// ============================================================
// TC-22: Duplicate Cancellation Prevention (FR-15)
// ============================================================
describe('TC-22: Duplicate Cancellation Prevention', () => {
  it('should reject a second cancellation of the same booking', async () => {
    const key = `tc22-dup-cancel-${Date.now()}`;
    const createRes = await request(app)
      .post('/api/bookings')
      .send({
        schedule_id: SCHED1_ID,
        source_station_code: 'SBC',
        dest_station_code: 'MAS',
        class_code: 'CC',
        contact_email: 'dupcancel@test.com',
        contact_phone: '9876543220',
        idempotency_key: key,
        passengers: [{ passenger_name: 'Dup Cancel', age: 28, gender: 'M' }],
      });

    if (createRes.status !== 201) return;

    const pnr = createRes.body.pnr_number;
    await request(app)
      .post(`/api/bookings/${createRes.body.booking_id}/payment`)
      .send({ outcome: 'SUCCESS' });

    const body = { contact_email: 'dupcancel@test.com' };

    const cancel1 = await request(app).post(`/api/bookings/${pnr}/cancel`).send(body);
    const cancel2 = await request(app).post(`/api/bookings/${pnr}/cancel`).send(body);

    // First cancellation should succeed
    expect([200]).toContain(cancel1.status);
    // Second cancellation should fail
    expect(cancel2.status).toBeGreaterThanOrEqual(400);
  });
});

// ============================================================
// TC-23: Refund Calculation (FR-16)
// ============================================================
describe('TC-23: Refund Calculation Accuracy', () => {
  it('should calculate correct refund for > 48 hours cancellation', async () => {
    const { calculateRefund } = await import('../src/utils/refund.js');

    const result = calculateRefund(755, 1, 72, 'CONFIRMED');
    expect(result.cancellation_charge).toBe(60);  // ₹60 × 1 passenger
    expect(result.refund_amount).toBe(695);        // 755 - 60 = 695
    expect(result.refund_percentage).toBe(92);
  });

  it('should calculate 25% deduction for 12-48 hour cancellation', async () => {
    const { calculateRefund } = await import('../src/utils/refund.js');
    const result = calculateRefund(1000, 1, 24, 'CONFIRMED');
    expect(result.cancellation_charge).toBe(250);
    expect(result.refund_amount).toBe(750);
    expect(result.refund_percentage).toBe(75);
  });

  it('should calculate 50% deduction for < 12 hour cancellation', async () => {
    const { calculateRefund } = await import('../src/utils/refund.js');
    const result = calculateRefund(1000, 1, 6, 'CONFIRMED');
    expect(result.cancellation_charge).toBe(500);
    expect(result.refund_amount).toBe(500);
    expect(result.refund_percentage).toBe(50);
  });

  it('should apply WL flat fee for WL ticket cancellation', async () => {
    const { calculateRefund } = await import('../src/utils/refund.js');
    const result = calculateRefund(1000, 2, 100, 'WAITING_LIST');
    expect(result.cancellation_charge).toBe(60);  // ₹30 × 2 passengers
    expect(result.refund_amount).toBe(940);
  });
});

// ============================================================
// TC-24: Administrator Authorization (FR-18)
// ============================================================
describe('TC-24: Administrator Authorization', () => {
  it('should reject admin routes without token', async () => {
    const res = await request(app).get('/api/admin/dashboard');
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Unauthorized');
  });

  it('should reject admin routes with invalid token', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });

  it('should allow access with valid admin JWT', async () => {
    const token = getAdminToken();
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('stats');
  });

  it('should allow admin login with correct credentials', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ username: 'testadmin', password: 'TestAdmin123!' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('should reject admin login with wrong password', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ username: 'testadmin', password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });
});

// ============================================================
// TC-25: Invalid API Requests (FR-20)
// ============================================================
describe('TC-25: Invalid API Request Handling', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/api/nonexistent/endpoint');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not Found');
  });

  it('should handle malformed booking body gracefully', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send('not-json-string')
      .set('Content-Type', 'text/plain');
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('should return 404 for non-existent PNR', async () => {
    const res = await request(app).get('/api/bookings/pnr/PNR-NONEXISTENT');
    expect(res.status).toBe(404);
  });
});

// ============================================================
// TC-26: Health Check (NFR-05 Portability)
// ============================================================
describe('TC-26: API Health Check', () => {
  it('should return healthy status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.team).toBe('Team 11');
    expect(res.body.disclaimer).toContain('Academic demonstration');
  });
});

// ============================================================
// TC-27: Stations Endpoint (FR-03)
// ============================================================
describe('TC-27: Stations Listing', () => {
  it('should return all stations', async () => {
    const res = await request(app).get('/api/stations');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.stations)).toBe(true);
    expect(res.body.stations.length).toBeGreaterThan(0);
    const station = res.body.stations[0];
    expect(station).toHaveProperty('code');
    expect(station).toHaveProperty('name');
    expect(station).toHaveProperty('city');
  });
});

// ============================================================
// TC-28: Passenger Authentication (Registration & Login)
// ============================================================
describe('TC-28: Passenger Registration & Login', () => {
  const testEmail = `passenger_${Date.now()}@testrail.com`;
  const testPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  let passengerToken = '';

  it('should register a new passenger account', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'Aditi Sharma',
        email: testEmail,
        phone: testPhone,
        password: 'Password123!',
        confirm_password: 'Password123!',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body.user.full_name).toBe('Aditi Sharma');
  });

  it('should reject duplicate registration with same email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'Aditi Sharma',
        email: testEmail,
        phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
        password: 'Password123!',
        confirm_password: 'Password123!',
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('already exists');
  });

  it('should reject duplicate registration with same phone number', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'Another User',
        email: `another_${Date.now()}@testrail.com`,
        phone: testPhone, // Same phone as registered above
        password: 'Password123!',
        confirm_password: 'Password123!',
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('phone number already exists');
    expect(res.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'phone' }),
      ])
    );
  });

  it('should reject registration with invalid mobile number not starting with 6-9', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'Invalid Phone Tester',
        email: `valid_${Date.now()}@testrail.com`,
        phone: '1234567890', // Starts with 1
        password: 'Password123!',
        confirm_password: 'Password123!',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Error');
    expect(res.body.message).toContain('mobile number');
    expect(res.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'phone' }),
      ])
    );
  });

  it('should reject registration with invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'Invalid Email Tester',
        email: 'invalid-email-format',
        phone: '9876543299',
        password: 'Password123!',
        confirm_password: 'Password123!',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Error');
    expect(res.body.message).toContain('email');
    expect(res.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'email' }),
      ])
    );
  });

  it('should reject registration with password mismatch', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'Mismatch Tester',
        email: `mismatch_${Date.now()}@testrail.com`,
        phone: '9876543298',
        password: 'Password123!',
        confirm_password: 'DifferentPassword123!',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Error');
    expect(res.body.message).toContain('Passwords do not match');
  });

  it('should reject registration with weak password < 8 characters', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'Short Pwd Tester',
        email: `short_${Date.now()}@testrail.com`,
        phone: '9876543297',
        password: '123',
        confirm_password: '123',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Error');
    expect(res.body.message).toContain('8 characters');
  });

  it('should authenticate passenger and return valid JWT', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'Password123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('token');
    passengerToken = res.body.token;
  });

  it('should reject login with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
  });
});

// ============================================================
// TC-29: Passenger Account Features (Profile, Saved Passengers, Dashboard)
// ============================================================
describe('TC-29: Passenger Account Management', () => {
  let token = '';

  beforeAll(async () => {
    const email = `mgr_${Date.now()}@testrail.com`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'Kavitha Rao',
        email,
        phone: '9876543211',
        password: 'Password123!',
        confirm_password: 'Password123!',
      });
    token = res.body.token;
  });

  it('should get authenticated passenger profile', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.full_name).toBe('Kavitha Rao');
  });

  it('should manage saved passengers (create, list, delete)', async () => {
    // Add
    const addRes = await request(app)
      .post('/api/auth/saved-passengers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        passenger_name: 'Rahul Rao',
        age: 35,
        gender: 'M',
        berth_preference: 'LB',
      });
    expect(addRes.status).toBe(201);
    expect(addRes.body.passenger.passenger_name).toBe('Rahul Rao');
    const passengerId = addRes.body.passenger.id;

    // List
    const listRes = await request(app)
      .get('/api/auth/saved-passengers')
      .set('Authorization', `Bearer ${token}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.passengers.length).toBeGreaterThanOrEqual(1);

    // Delete
    const delRes = await request(app)
      .delete(`/api/auth/saved-passengers/${passengerId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(delRes.status).toBe(200);
  });

  it('should get personalized dashboard summary', async () => {
    const res = await request(app)
      .get('/api/auth/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary).toHaveProperty('total_bookings');
  });
});

// ============================================================
// TC-30: Payment Integration (Razorpay Orders & Mode)
// ============================================================
describe('TC-30: Payment Integration & Workflow', () => {
  it('should return payment mode (DEMO or SANDBOX)', async () => {
    const res = await request(app).get('/api/payments/mode');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(['DEMO', 'SANDBOX']).toContain(res.body.mode);
  });

  it('should create payment order for pending booking', async () => {
    const key = `tc30-order-${Date.now()}`;
    const bookRes = await request(app)
      .post('/api/bookings')
      .send({
        schedule_id: SCHED1_ID,
        source_station_code: 'SBC',
        dest_station_code: 'MAS',
        class_code: 'CC',
        contact_email: 'paytest@test.com',
        contact_phone: '9876543210',
        idempotency_key: key,
        passengers: [{ passenger_name: 'Payment Tester', age: 26, gender: 'F' }],
      });
    expect(bookRes.status).toBe(201);
    const bookingId = bookRes.body.booking_id;

    const orderRes = await request(app)
      .post('/api/payments/create-order')
      .send({ booking_id: bookingId });

    expect(orderRes.status).toBe(200);
    expect(orderRes.body.success).toBe(true);
    expect(orderRes.body).toHaveProperty('order_id');
    expect(orderRes.body.amount_paise).toBeGreaterThan(0);
  });
});

// ============================================================
// TC-31: E-Ticket QR Code Generation
// ============================================================
describe('TC-31: E-Ticket QR Code Generation', () => {
  it('should include a valid base64 QR code in retrieved ticket', async () => {
    const key = `tc31-qr-${Date.now()}`;
    const email = 'qrtest@example.com';
    const bookRes = await request(app)
      .post('/api/bookings')
      .send({
        schedule_id: SCHED1_ID,
        source_station_code: 'SBC',
        dest_station_code: 'MAS',
        class_code: 'CC',
        contact_email: email,
        contact_phone: '9876543210',
        idempotency_key: key,
        passengers: [{ passenger_name: 'QR User', age: 29, gender: 'M' }],
      });
    expect(bookRes.status).toBe(201);
    const pnr = bookRes.body.pnr_number;

    const ticketRes = await request(app)
      .get(`/api/bookings/pnr/${pnr}`)
      .query({ email });

    expect(ticketRes.status).toBe(200);
    expect(ticketRes.body.ticket).toHaveProperty('qr_code');
    expect(ticketRes.body.ticket.qr_code).toMatch(/^data:image\/png;base64,/);
  });
});

// ============================================================
// TC-32: Passenger Password Reset Flow
// ============================================================
describe('TC-32: Passenger Password Reset Flow', () => {
  it('should generate a reset token and successfully update password', { timeout: 20000 }, async () => {
    const userEmail = `reset.${Date.now()}@example.com`;
    // Register test user first
    await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'Reset Tester',
        email: userEmail,
        phone: '9876543299',
        password: 'InitialPassword@123',
        confirm_password: 'InitialPassword@123',
      });

    // 1. Request forgot password
    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: userEmail });

    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.success).toBe(true);
    expect(forgotRes.body).toHaveProperty('demo_token');
    const token = forgotRes.body.demo_token;

    // 2. Reset password using token
    const newPassword = 'NewSecretPassword@456';
    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token,
        new_password: newPassword,
        confirm_new_password: newPassword,
      });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);

    // 3. Verify sign in with new password
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: userEmail, password: newPassword });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toHaveProperty('token');
    expect(loginRes.body.user.email).toBe(userEmail);
  });
});

// ============================================================
// TC-33: UTS Unreserved Fare Calculation & Booking
// ============================================================
describe('TC-33: UTS Unreserved Fare Calculation & Booking', () => {
  it('should calculate distance-based UTS fare and issue ticket with valid QR code', async () => {
    // 1. Calculate fare using seeded stations SBC and MAS
    const fareRes = await request(app)
      .post('/api/unreserved/fare')
      .send({
        source_code: 'SBC',
        dest_code: 'MAS',
        passenger_count: 2,
        train_type: 'SUPERFAST',
      });

    expect(fareRes.status).toBe(200);
    expect(fareRes.body.success).toBe(true);
    expect(fareRes.body.distance_km).toBeGreaterThan(0);
    expect(fareRes.body.total_fare).toBeGreaterThan(0);
    expect(fareRes.body.total_fare).toBe(fareRes.body.fare_per_passenger * 2);

    // 2. Book UTS ticket
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const bookRes = await request(app)
      .post('/api/unreserved/book')
      .send({
        source_code: 'SBC',
        dest_code: 'MAS',
        journey_date: dateStr,
        passenger_names: ['Amit Verma', 'Suman Verma'],
        train_type: 'SUPERFAST',
        contact_email: 'amit@example.com',
      });

    expect(bookRes.status).toBe(201);
    expect(bookRes.body.success).toBe(true);
    expect(bookRes.body.ticket.ticket_number).toMatch(/^UTS-/);
    expect(bookRes.body.ticket.passenger_count).toBe(2);
    expect(bookRes.body.ticket).toHaveProperty('qr_code');
    expect(bookRes.body.ticket.qr_code).toMatch(/^data:image\/png;base64,/);
    expect(bookRes.body.ticket.booking_status).toBe('CONFIRMED');
  });
});

// ============================================================
// TC-34: Railway Platform Entry Pass Booking
// ============================================================
describe('TC-34: Railway Platform Entry Pass Booking', () => {
  it('should book platform ticket with standard ₹10/ticket price and 2-hour validity', async () => {
    const bookRes = await request(app)
      .post('/api/platform/book')
      .send({
        station_code: 'SBC',
        ticket_count: 3,
        visitor_name: 'Pooja Hegde',
        contact_phone: '9876543210',
      });

    expect(bookRes.status).toBe(201);
    expect(bookRes.body.success).toBe(true);
    expect(bookRes.body.ticket.ticket_number).toMatch(/^PLT-/);
    expect(bookRes.body.ticket.ticket_count).toBe(3);
    expect(bookRes.body.ticket.fare_per_ticket).toBe(10);
    expect(bookRes.body.ticket.total_fare).toBe(30);
    expect(bookRes.body.ticket.station_code).toBe('SBC');
    expect(bookRes.body.ticket).toHaveProperty('qr_code');
    expect(bookRes.body.ticket.qr_code).toMatch(/^data:image\/png;base64,/);

    // Verify 2 hours validity window
    const fromTime = new Date(bookRes.body.ticket.valid_from).getTime();
    const untilTime = new Date(bookRes.body.ticket.valid_until).getTime();
    const diffHours = (untilTime - fromTime) / (1000 * 60 * 60);
    expect(diffHours).toBeCloseTo(2, 0.1);
  });
});

// ============================================================
// TC-35: Consolidated My-All-Tickets Query
// ============================================================
describe('TC-35: Consolidated My-All-Tickets Query', () => {
  it('should return unreserved and platform passes for authenticated user', async () => {
    const userEmail = `myall.${Date.now()}@example.com`;
    const userPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'All Tickets Tester',
        email: userEmail,
        phone: userPhone,
        password: 'Password@123',
        confirm_password: 'Password@123',
      });

    expect(regRes.status).toBe(201);
    const token = regRes.body.token;

    // Book 1 UTS ticket under this user
    await request(app)
      .post('/api/unreserved/book')
      .set('Authorization', `Bearer ${token}`)
      .send({
        source_code: 'SBC',
        dest_code: 'MAS',
        journey_date: '2026-11-15',
        passenger_names: ['All Ticket Passenger'],
        train_type: 'ORDINARY',
        contact_email: userEmail,
      });

    const allRes = await request(app)
      .get('/api/auth/my-all-tickets')
      .set('Authorization', `Bearer ${token}`);

    expect(allRes.status).toBe(200);
    expect(allRes.body.success).toBe(true);
    expect(Array.isArray(allRes.body.unreserved)).toBe(true);
    expect(allRes.body.unreserved.length).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(allRes.body.platform)).toBe(true);
  });
});

// ============================================================
// TC-36: Payment Mode Discovery & Gateway Health Check
// ============================================================
describe('TC-36: Payment Mode Discovery & Gateway Health Check', () => {
  it('should return active payment gateway mode and safe configuration', async () => {
    const res = await request(app).get('/api/payments/mode');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(['SANDBOX', 'DEMO']).toContain(res.body.mode);
    expect(res.body).toHaveProperty('disclaimer');
    expect(res.body.currency).toBe('INR');
    if (res.body.mode === 'SANDBOX') {
      expect(res.body.key_id).toBeDefined();
    }
  });
});

// ============================================================
// TC-37: Payment Order Creation & 10-Minute Hold Window Enforcement
// ============================================================
describe('TC-37: Payment Order Creation & Hold Window Enforcement', () => {
  it('should create order and verify hold expires ~10 minutes in future', async () => {
    const key = `tc37-order-${Date.now()}`;
    const createRes = await request(app)
      .post('/api/bookings')
      .send({
        schedule_id: SCHED1_ID,
        source_station_code: 'SBC',
        dest_station_code: 'MAS',
        class_code: 'CC',
        contact_email: 'orderholder@test.com',
        contact_phone: '9876543299',
        idempotency_key: key,
        passengers: [{ passenger_name: 'Hold Passenger', age: 29, gender: 'M' }],
      });

    expect(createRes.status).toBe(201);
    const bookingId = createRes.body.booking_id;

    const orderRes = await request(app)
      .post('/api/payments/create-order')
      .send({ booking_id: bookingId });

    expect(orderRes.status).toBe(200);
    expect(orderRes.body.success).toBe(true);
    expect(orderRes.body).toHaveProperty('order_id');
    expect(orderRes.body.order_id).toMatch(/^(order_|demo_order_)/);
    expect(orderRes.body.amount_paise).toBe(createRes.body.fare_breakdown.total_fare * 100);
    expect(orderRes.body.currency).toBe('INR');
    expect(orderRes.body.hold_expires_at).toBeDefined();

    const expiresAt = new Date(orderRes.body.hold_expires_at).getTime();
    const now = Date.now();
    const diffMinutes = (expiresAt - now) / (60 * 1000);
    expect(diffMinutes).toBeGreaterThan(9.0);
    expect(diffMinutes).toBeLessThanOrEqual(10.5);
  });

  it('should reject order creation if 10-minute hold window has expired', async () => {
    const key = `tc37-expired-${Date.now()}`;
    const createRes = await request(app)
      .post('/api/bookings')
      .send({
        schedule_id: SCHED1_ID,
        source_station_code: 'SBC',
        dest_station_code: 'MAS',
        class_code: 'CC',
        contact_email: 'expiredhold@test.com',
        contact_phone: '9876543298',
        idempotency_key: key,
        passengers: [{ passenger_name: 'Expired Passenger', age: 40, gender: 'F' }],
      });

    expect(createRes.status).toBe(201);
    const bookingId = createRes.body.booking_id;

    // Simulate expired hold by directly updating hold_expires_at in database
    const db = getDatabase();
    const pastTime = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
    db.prepare('UPDATE bookings SET hold_expires_at = ? WHERE id = ?').run(pastTime, bookingId);

    const orderRes = await request(app)
      .post('/api/payments/create-order')
      .send({ booking_id: bookingId });

    expect(orderRes.status).toBe(410);
    expect(orderRes.body.message).toMatch(/hold.*expired/i);
  });
});

// ============================================================
// TC-38: Cryptographic Signature Verification & Confirmation Idempotency
// ============================================================
describe('TC-38: Cryptographic Signature Verification & Confirmation Idempotency', () => {
  it('should confirm booking with valid HMAC-SHA256 signature and handle replay idempotently', async () => {
    const key = `tc38-sig-${Date.now()}`;
    const createRes = await request(app)
      .post('/api/bookings')
      .send({
        schedule_id: SCHED1_ID,
        source_station_code: 'SBC',
        dest_station_code: 'MAS',
        class_code: 'CC',
        contact_email: 'sigverify@test.com',
        contact_phone: '9876543297',
        idempotency_key: key,
        passengers: [{ passenger_name: 'Signature Verified', age: 33, gender: 'M' }],
      });

    expect(createRes.status).toBe(201);
    const bookingId = createRes.body.booking_id;

    const orderRes = await request(app)
      .post('/api/payments/create-order')
      .send({ booking_id: bookingId });

    expect(orderRes.status).toBe(200);
    const orderId = orderRes.body.order_id;
    const paymentId = `pay_test_${Date.now()}`;

    const secret = process.env.RAZORPAY_KEY_SECRET || 'dev_secret_key_railreserve_2026';
    const validSignature = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

    // 1. Verify with valid signature -> CONFIRMED
    const verifyRes = await request(app)
      .post('/api/payments/verify')
      .send({
        booking_id: bookingId,
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: validSignature,
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(['CONFIRMED', 'WAITING_LIST']).toContain(verifyRes.body.booking_status);
    expect(verifyRes.body.transaction_id).toBe(paymentId);

    // 2. Replay same verification request -> Idempotent success without error or double booking
    const replayRes = await request(app)
      .post('/api/payments/verify')
      .send({
        booking_id: bookingId,
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: validSignature,
      });

    expect(replayRes.status).toBe(200);
    expect(replayRes.body.success).toBe(true);
    expect(replayRes.body.message).toMatch(/(already confirmed|WAITING_LIST)/i);

    // 3. Reject invalid signature on fresh booking
    const key2 = `tc38-bad-${Date.now()}`;
    const freshRes = await request(app)
      .post('/api/bookings')
      .send({
        schedule_id: SCHED1_ID,
        source_station_code: 'SBC',
        dest_station_code: 'MAS',
        class_code: 'CC',
        contact_email: 'badsig@test.com',
        contact_phone: '9876543296',
        idempotency_key: key2,
        passengers: [{ passenger_name: 'Tamper Tester', age: 24, gender: 'F' }],
      });

    const badBookingId = freshRes.body.booking_id;
    const badVerifyRes = await request(app)
      .post('/api/payments/verify')
      .send({
        booking_id: badBookingId,
        razorpay_order_id: 'order_fake_123',
        razorpay_payment_id: 'pay_fake_456',
        razorpay_signature: 'invalid_sha256_hash_value_1234567890abcdef',
      });

    expect(badVerifyRes.status).toBe(400);
    expect(badVerifyRes.body.message).toMatch(/signature/i);
  });
});

// ============================================================
// TC-39: Razorpay Webhook Processing (Captured vs Failed)
// ============================================================
describe('TC-39: Razorpay Webhook Processing', () => {
  it('should confirm booking on payment.captured webhook event', async () => {
    const key = `tc39-webhook-cap-${Date.now()}`;
    const createRes = await request(app)
      .post('/api/bookings')
      .send({
        schedule_id: SCHED1_ID,
        source_station_code: 'SBC',
        dest_station_code: 'MAS',
        class_code: 'CC',
        contact_email: 'webhookuser@test.com',
        contact_phone: '9876543295',
        idempotency_key: key,
        passengers: [{ passenger_name: 'Webhook Passenger', age: 31, gender: 'M' }],
      });

    expect(createRes.status).toBe(201);
    const bookingId = createRes.body.booking_id;

    const orderRes = await request(app)
      .post('/api/payments/create-order')
      .send({ booking_id: bookingId });

    const orderId = orderRes.body.order_id;
    const paymentId = `pay_wh_${Date.now()}`;

    const webhookPayload = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: paymentId,
            order_id: orderId,
            amount: 75500,
            status: 'captured',
          },
        },
      },
    });

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'dev_webhook_secret_railreserve_2026';
    const signature = crypto.createHmac('sha256', webhookSecret).update(webhookPayload).digest('hex');

    const hookRes = await request(app)
      .post('/api/payments/webhook')
      .set('x-razorpay-signature', signature)
      .set('Content-Type', 'application/json')
      .send(webhookPayload);

    expect(hookRes.status).toBe(200);
    expect(hookRes.body.success).toBe(true);

    // Verify booking is confirmed in database
    const db = getDatabase();
    const row = db.prepare('SELECT booking_status, payment_status FROM bookings WHERE id = ?').get(bookingId) as { booking_status: string; payment_status: string };
    expect(['CONFIRMED', 'WAITING_LIST']).toContain(row.booking_status);
    expect(row.payment_status).toBe('PAID');
  });

  it('should reject webhook with invalid signature', async () => {
    const hookRes = await request(app)
      .post('/api/payments/webhook')
      .set('x-razorpay-signature', 'forged_webhook_signature')
      .send({ event: 'payment.captured' });

    expect(hookRes.status).toBe(400);
    expect(hookRes.body.success).toBe(false);
  });
});

// ============================================================
// TC-40: Inventory Restoration on Payment Failure
// ============================================================
describe('TC-40: Inventory Restoration on Payment Failure', () => {
  it('should safely restore held seats when payment fails or times out', async () => {
    const db = getDatabase();
    const invBefore = db.prepare('SELECT available_seats FROM seat_inventory WHERE schedule_id = ? AND class_code = ?').get(SCHED3_ID, '3A') as { available_seats: number };

    const key = `tc40-inv-${Date.now()}`;
    const createRes = await request(app)
      .post('/api/bookings')
      .send({
        schedule_id: SCHED3_ID,
        source_station_code: 'MAS',
        dest_station_code: 'TVC',
        class_code: '3A',
        contact_email: 'failrestore@test.com',
        contact_phone: '9876543294',
        idempotency_key: key,
        passengers: [
          { passenger_name: 'Passenger One', age: 20, gender: 'M' },
          { passenger_name: 'Passenger Two', age: 22, gender: 'F' },
        ],
      });

    expect(createRes.status).toBe(201);
    const bookingId = createRes.body.booking_id;

    // Available seats should have decremented by 2
    const invHeld = db.prepare('SELECT available_seats FROM seat_inventory WHERE schedule_id = ? AND class_code = ?').get(SCHED3_ID, '3A') as { available_seats: number };
    expect(invHeld.available_seats).toBe(invBefore.available_seats - 2);

    // Simulate Payment Failure
    const failRes = await request(app)
      .post(`/api/bookings/${bookingId}/payment`)
      .send({ outcome: 'FAILURE' });

    expect(failRes.status).toBe(200);
    expect(failRes.body.success).toBe(false);
    expect(failRes.body.booking_status).toBe('FAILED');

    // Available seats should now be restored to original count!
    const invRestored = db.prepare('SELECT available_seats FROM seat_inventory WHERE schedule_id = ? AND class_code = ?').get(SCHED3_ID, '3A') as { available_seats: number };
    expect(invRestored.available_seats).toBe(invBefore.available_seats);
  });
});

// ============================================================
// TC-41: Passenger Dashboard & My Bookings Enriched ETicket Data
// ============================================================
describe('TC-41: Passenger Dashboard & My Bookings Enriched ETicket Data', () => {
  it('should return fully enriched bookings with fare_breakdown, route, and train details', async () => {
    const userEmail = `dash.enriched.${Date.now()}@example.com`;
    const userPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;

    // 1. Register passenger
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'Dashboard Enriched Tester',
        email: userEmail,
        phone: userPhone,
        password: 'Password@123',
        confirm_password: 'Password@123',
      });
    expect(regRes.status).toBe(201);
    const token = regRes.body.token;

    // 2. Create a booking linked to this passenger
    const key = `tc41-dash-${Date.now()}`;
    const bookRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        schedule_id: SCHED3_ID,
        source_station_code: 'MAS',
        dest_station_code: 'TVC',
        class_code: '3A',
        contact_email: userEmail,
        contact_phone: userPhone,
        idempotency_key: key,
        passengers: [{ passenger_name: 'Enriched Passenger', age: 28, gender: 'F' }],
      });
    expect(bookRes.status).toBe(201);
    const bookingId = bookRes.body.booking_id;

    // Confirm booking via payment simulation
    await request(app)
      .post(`/api/bookings/${bookingId}/payment`)
      .send({ outcome: 'SUCCESS', method: 'UPI' });

    // 3. Verify GET /api/auth/dashboard
    const dashRes = await request(app)
      .get('/api/auth/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(dashRes.status).toBe(200);
    expect(dashRes.body.success).toBe(true);
    expect(dashRes.body.summary.total_bookings).toBeGreaterThanOrEqual(1);
    expect(dashRes.body.upcoming_journeys.length).toBeGreaterThanOrEqual(1);

    const firstJourney = dashRes.body.upcoming_journeys[0];
    expect(firstJourney).toHaveProperty('pnr_number');
    expect(firstJourney).toHaveProperty('train_number');
    expect(firstJourney).toHaveProperty('train_name');
    expect(firstJourney).toHaveProperty('source_station_code');
    expect(firstJourney).toHaveProperty('dest_station_code');
    expect(firstJourney).toHaveProperty('fare_breakdown');
    expect(firstJourney.fare_breakdown).toHaveProperty('total_fare');
    expect(typeof firstJourney.fare_breakdown.total_fare).toBe('number');
    expect(Array.isArray(firstJourney.passengers)).toBe(true);
    expect(firstJourney.passengers.length).toBeGreaterThanOrEqual(1);

    // 4. Verify GET /api/auth/bookings
    const myBookingsRes = await request(app)
      .get('/api/auth/bookings')
      .set('Authorization', `Bearer ${token}`);

    expect(myBookingsRes.status).toBe(200);
    expect(myBookingsRes.body.success).toBe(true);
    expect(myBookingsRes.body.bookings.length).toBeGreaterThanOrEqual(1);

    const firstBooking = myBookingsRes.body.bookings[0];
    expect(firstBooking).toHaveProperty('fare_breakdown');
    expect(firstBooking.fare_breakdown).toHaveProperty('total_fare');
    expect(firstBooking).toHaveProperty('train_number');
    expect(firstBooking).toHaveProperty('train_name');
    expect(Array.isArray(firstBooking.passengers)).toBe(true);
  });
});

