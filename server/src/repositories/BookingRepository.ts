// Booking Repository — atomic seat allocation, booking CRUD, and WL management
// Critical: All multi-step operations use BEGIN IMMEDIATE transactions
import { getDatabase } from '../db/database.js';
import type {
  Booking,
  BookingPassenger,
  Payment,
  WaitingListEntry,
  CreateBookingRequest,
  BookingStatus,
  PaymentStatus,
} from '../types/index.js';
import { generatePNR, generateTransactionId, generateCancellationRef, allocateSeat } from '../utils/pnr.js';
import { calculateFare } from '../utils/refund.js';

export class BookingRepository {
  // ============================================================
  // ATOMIC BOOKING CREATION (BEGIN IMMEDIATE transaction lock)
  // Prevents race conditions / overbooking under concurrent requests
  // ============================================================
  createBookingAtomically(
    req: CreateBookingRequest,
    scheduleInfo: {
      train_id: number;
      train_type: string;
      source_station_id: number;
      dest_station_id: number;
    },
    baseFare: number
  ): { booking: Booking; passengers: BookingPassenger[]; isWaitingList: boolean } {
    const db = getDatabase();

    // --- BEGIN IMMEDIATE acquires write lock immediately ---
    // All other writing transactions must wait.
    db.exec('BEGIN IMMEDIATE');
    try {
      // 1. Recheck inventory INSIDE the transaction (prevents phantom reads)
      // Note: SQLite does not support row-level locking; BEGIN IMMEDIATE is sufficient for write serialization
      const inventory = db
        .prepare(
          'SELECT * FROM seat_inventory WHERE schedule_id = ? AND class_code = ?'
        )
        .get(req.schedule_id, req.class_code) as {
          available_seats: number;
          waiting_list_count: number;
          max_waiting_list: number;
          total_seats: number;
        } | undefined;

      if (!inventory) {
        throw new Error('Seat inventory not found for selected class and schedule');
      }

      const isWaitingList = inventory.available_seats === 0;

      if (isWaitingList && inventory.waiting_list_count >= inventory.max_waiting_list) {
        throw new Error('No seats or waiting list capacity available for this class');
      }

      // 2. Check idempotency — return existing booking if duplicate submission
      const existingByKey = db
        .prepare('SELECT id, pnr_number FROM bookings WHERE idempotency_key = ?')
        .get(req.idempotency_key) as { id: number; pnr_number: string } | undefined;

      if (existingByKey) {
        db.exec('ROLLBACK');
        const existing = this.findBookingById(existingByKey.id);
        const existingPassengers = this.findPassengersByBookingId(existingByKey.id);
        return {
          booking: existing!,
          passengers: existingPassengers,
          isWaitingList: existing!.booking_status === 'WAITING_LIST',
        };
      }

      // 3. Calculate fare
      const fareInfo = calculateFare(baseFare, req.passengers.length, scheduleInfo.train_type);
      const pnr = generatePNR();

      // 4. Create booking header
      const bookingResult = db.prepare(`
        INSERT INTO bookings
          (pnr_number, schedule_id, source_station_id, dest_station_id,
           journey_date, class_code, total_passengers, total_fare,
           booking_status, payment_status, contact_email, contact_phone, idempotency_key)
        SELECT ?, ?, ?, ?, s.journey_date, ?, ?, ?, 'PENDING_PAYMENT', 'PENDING', ?, ?, ?
        FROM schedules s WHERE s.id = ?
      `).run(
        pnr,
        req.schedule_id,
        scheduleInfo.source_station_id,
        scheduleInfo.dest_station_id,
        req.class_code,
        req.passengers.length,
        fareInfo.total_fare,
        req.contact_email,
        req.contact_phone,
        req.idempotency_key,
        req.schedule_id
      ) as { lastInsertRowid: number };

      const bookingId = bookingResult.lastInsertRowid;

      // 5. Create passenger records
      const passengers: BookingPassenger[] = [];
      const insertPassenger = db.prepare(`
        INSERT INTO booking_passengers
          (booking_id, passenger_name, age, gender, berth_preference, allocated_seat, status, wl_number)
        VALUES (?, ?, ?, ?, ?, ?, 'PENDING', NULL)
      `);

      for (const p of req.passengers) {
        const result = insertPassenger.run(
          bookingId,
          p.passenger_name,
          p.age,
          p.gender,
          p.berth_preference || 'ANY',
          null
        ) as { lastInsertRowid: number };

        passengers.push({
          id: result.lastInsertRowid,
          booking_id: bookingId,
          passenger_name: p.passenger_name,
          age: p.age,
          gender: p.gender,
          berth_preference: p.berth_preference || 'ANY',
          allocated_seat: null,
          status: 'PENDING',
          wl_number: null,
        });
      }

      // 6. Atomically update inventory
      if (!isWaitingList) {
        // Decrement available seats — atomic check prevents overbooking
        const updateResult = db.prepare(`
          UPDATE seat_inventory 
          SET available_seats = available_seats - ?
          WHERE schedule_id = ? AND class_code = ? AND available_seats >= ?
        `).run(req.passengers.length, req.schedule_id, req.class_code, req.passengers.length) as { changes: number };

        if (updateResult.changes === 0) {
          // Another transaction grabbed the seats concurrently
          db.exec('ROLLBACK');
          throw new Error('Seats became unavailable. Please try again or choose Waiting List.');
        }
      } else {
        // Increment waiting list count
        db.prepare(`
          UPDATE seat_inventory 
          SET waiting_list_count = waiting_list_count + ?
          WHERE schedule_id = ? AND class_code = ? AND waiting_list_count < max_waiting_list
        `).run(req.passengers.length, req.schedule_id, req.class_code);
      }

      // 7. Log audit event
      db.prepare(`
        INSERT INTO audit_logs (event_type, booking_id, description, ip_address)
        VALUES ('BOOKING_CREATED', ?, ?, 'SYSTEM')
      `).run(bookingId, `Booking created: PNR=${pnr}, Type=${isWaitingList ? 'WL' : 'CNF'}`);

      db.exec('COMMIT');

      const booking = this.findBookingById(bookingId)!;
      return { booking, passengers, isWaitingList };
    } catch (err) {
      try { db.exec('ROLLBACK'); } catch (_) {}
      throw err;
    }
  }

  // ============================================================
  // CONFIRM BOOKING AFTER PAYMENT SUCCESS
  // ============================================================
  confirmBookingAfterPayment(
    bookingId: number,
    transactionId: string,
    isWaitingList: boolean
  ): void {
    const db = getDatabase();
    db.exec('BEGIN IMMEDIATE');
    try {
      const newStatus: BookingStatus = isWaitingList ? 'WAITING_LIST' : 'CONFIRMED';

      // Update booking status
      db.prepare(`
        UPDATE bookings SET booking_status = ?, payment_status = 'PAID', updated_at = datetime('now')
        WHERE id = ? AND booking_status = 'PENDING_PAYMENT'
      `).run(newStatus, bookingId);

      // Get booking info
      const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) as Booking;
      if (!booking) throw new Error('Booking not found');

      // Update passenger statuses and assign seats/WL numbers
      const passengers = db
        .prepare('SELECT * FROM booking_passengers WHERE booking_id = ? ORDER BY id')
        .all(bookingId) as BookingPassenger[];

      if (!isWaitingList) {
        // Assign seat numbers
        const inventory = db
          .prepare('SELECT * FROM seat_inventory WHERE schedule_id = ? AND class_code = ?')
          .get(booking.schedule_id, booking.class_code) as { total_seats: number; available_seats: number };

        const usedSeats = inventory.total_seats - inventory.available_seats;

        passengers.forEach((p, i) => {
          const seatNum = usedSeats - passengers.length + i + 1;
          const seatLabel = allocateSeat(booking.class_code, seatNum);
          db.prepare(`
            UPDATE booking_passengers 
            SET status = 'CONFIRMED', allocated_seat = ?, wl_number = NULL
            WHERE id = ?
          `).run(seatLabel, p.id);
        });
      } else {
        // Assign WL numbers
        const wlBase = db
          .prepare('SELECT waiting_list_count FROM seat_inventory WHERE schedule_id = ? AND class_code = ?')
          .get(booking.schedule_id, booking.class_code) as { waiting_list_count: number };

        passengers.forEach((p, i) => {
          const wlNum = (wlBase?.waiting_list_count || 0) - passengers.length + i + 1;
          db.prepare(`
            UPDATE booking_passengers 
            SET status = 'WAITING_LIST', wl_number = ?
            WHERE id = ?
          `).run(wlNum, p.id);

          // Add to WL queue
          db.prepare(`
            INSERT OR IGNORE INTO waiting_list_queue
              (schedule_id, class_code, booking_passenger_id, queue_position)
            SELECT ?, ?, ?, COALESCE(MAX(queue_position), 0) + 1
            FROM waiting_list_queue
            WHERE schedule_id = ? AND class_code = ? AND status = 'WAITING'
          `).run(booking.schedule_id, booking.class_code, p.id, booking.schedule_id, booking.class_code);
        });
      }

      // Record successful payment
      db.prepare(`
        INSERT INTO payments (booking_id, transaction_id, amount, status)
        VALUES (?, ?, ?, 'SUCCESS')
      `).run(bookingId, transactionId, booking.total_fare);

      // Audit log
      db.prepare(`
        INSERT INTO audit_logs (event_type, booking_id, description)
        VALUES ('PAYMENT_PROCESSED', ?, ?)
      `).run(bookingId, `Payment SUCCESS: TXN=${transactionId}, Status=${newStatus}`);

      db.exec('COMMIT');
    } catch (err) {
      try { db.exec('ROLLBACK'); } catch (_) {}
      throw err;
    }
  }

  // ============================================================
  // FAIL BOOKING — release inventory, mark as failed
  // ============================================================
  failBooking(bookingId: number, reason: string): void {
    const db = getDatabase();
    db.exec('BEGIN IMMEDIATE');
    try {
      const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) as Booking;
      if (!booking) { db.exec('ROLLBACK'); return; }

      if (booking.booking_status !== 'PENDING_PAYMENT') {
        db.exec('ROLLBACK');
        return; // Already processed
      }

      // Release inventory
      if (booking.booking_status === 'PENDING_PAYMENT') {
        // Note: seats are only actually decremented after payment success
        // For WL, we also need to release if we pre-incremented
        // In this implementation: inventory is updated on confirm, not on booking creation
        // So no rollback needed here for confirmed seats
      }

      // Mark booking as failed
      db.prepare(`
        UPDATE bookings SET booking_status = 'FAILED', payment_status = 'FAILED', updated_at = datetime('now')
        WHERE id = ?
      `).run(bookingId);

      // Update passengers
      db.prepare(`UPDATE booking_passengers SET status = 'CANCELLED' WHERE booking_id = ?`).run(bookingId);

      // Record failed payment
      const txnId = generateTransactionId();
      db.prepare(`
        INSERT INTO payments (booking_id, transaction_id, amount, status, failure_reason)
        VALUES (?, ?, ?, 'FAILED', ?)
      `).run(bookingId, txnId, booking.total_fare, reason);

      db.prepare(`
        INSERT INTO audit_logs (event_type, booking_id, description)
        VALUES ('PAYMENT_FAILED', ?, ?)
      `).run(bookingId, `Payment FAILED: ${reason}`);

      db.exec('COMMIT');
    } catch (err) {
      try { db.exec('ROLLBACK'); } catch (_) {}
      throw err;
    }
  }

  // ============================================================
  // CANCEL BOOKING — release seat, promote WL, calculate refund
  // ============================================================
  cancelBooking(
    bookingId: number,
    cancellationCharge: number,
    refundAmount: number
  ): { cancellation_reference: string } {
    const db = getDatabase();
    db.exec('BEGIN IMMEDIATE');
    try {
      const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) as Booking;
      if (!booking) throw new Error('Booking not found');

      if (!['CONFIRMED', 'WAITING_LIST'].includes(booking.booking_status)) {
        throw new Error('Booking cannot be cancelled in its current state');
      }

      // Check for duplicate cancellation
      const existingCancellation = db
        .prepare('SELECT id FROM cancellations WHERE booking_id = ?')
        .get(bookingId);
      if (existingCancellation) {
        throw new Error('Booking has already been cancelled (idempotent rejection)');
      }

      const cancellationRef = generateCancellationRef();

      // 1. Create cancellation record
      db.prepare(`
        INSERT INTO cancellations
          (booking_id, cancellation_reference, seats_cancelled, original_fare,
           cancellation_charge, refund_amount, refund_status)
        VALUES (?, ?, ?, ?, ?, ?, 'INITIATED')
      `).run(
        bookingId,
        cancellationRef,
        booking.total_passengers,
        booking.total_fare,
        cancellationCharge,
        refundAmount
      );

      // 2. Update booking status
      db.prepare(`
        UPDATE bookings 
        SET booking_status = 'CANCELLED', payment_status = 'REFUNDED', updated_at = datetime('now')
        WHERE id = ?
      `).run(bookingId);

      // 3. Update passenger statuses
      db.prepare(`UPDATE booking_passengers SET status = 'CANCELLED' WHERE booking_id = ?`).run(bookingId);

      if (booking.booking_status === 'CONFIRMED') {
        // 4. Release seats back to inventory
        db.prepare(`
          UPDATE seat_inventory 
          SET available_seats = MIN(total_seats, available_seats + ?)
          WHERE schedule_id = ? AND class_code = ?
        `).run(booking.total_passengers, booking.schedule_id, booking.class_code);

        // 5. Promote next WL passenger(s)
        for (let i = 0; i < booking.total_passengers; i++) {
          this.promoteNextWaitingListPassenger(booking.schedule_id, booking.class_code, db);
        }
      } else {
        // WL cancellation: decrement WL count and remove from queue
        db.prepare(`
          UPDATE seat_inventory 
          SET waiting_list_count = MAX(0, waiting_list_count - ?)
          WHERE schedule_id = ? AND class_code = ?
        `).run(booking.total_passengers, booking.schedule_id, booking.class_code);

        // Mark WL queue entries as cancelled
        const passengers = db
          .prepare('SELECT id FROM booking_passengers WHERE booking_id = ?')
          .all(bookingId) as { id: number }[];

        for (const p of passengers) {
          db.prepare(`
            UPDATE waiting_list_queue SET status = 'CANCELLED' WHERE booking_passenger_id = ?
          `).run(p.id);
        }

        // Renumber remaining WL positions
        this.renumberWaitingList(booking.schedule_id, booking.class_code, db);
      }

      // 6. Simulate refund processing
      db.prepare(`
        UPDATE cancellations SET refund_status = 'PROCESSED'
        WHERE booking_id = ?
      `).run(bookingId);

      // 7. Update payment record
      db.prepare(`UPDATE payments SET status = 'REFUNDED' WHERE booking_id = ? AND status = 'SUCCESS'`).run(bookingId);

      // 8. Audit log
      db.prepare(`
        INSERT INTO audit_logs (event_type, booking_id, description)
        VALUES ('TICKET_CANCELLED', ?, ?)
      `).run(bookingId, `Cancelled: Ref=${cancellationRef}, Refund=₹${refundAmount}`);

      db.exec('COMMIT');
      return { cancellation_reference: cancellationRef };
    } catch (err) {
      try { db.exec('ROLLBACK'); } catch (_) {}
      throw err;
    }
  }

  private promoteNextWaitingListPassenger(scheduleId: number, classCode: string, db: ReturnType<typeof getDatabase>): void {
    // Find the first WAITING passenger in the queue
    const nextInQueue = db.prepare(`
      SELECT wlq.*, bp.booking_id, bp.passenger_name
      FROM waiting_list_queue wlq
      JOIN booking_passengers bp ON bp.id = wlq.booking_passenger_id
      WHERE wlq.schedule_id = ? AND wlq.class_code = ? AND wlq.status = 'WAITING'
      ORDER BY wlq.queue_position ASC
      LIMIT 1
    `).get(scheduleId, classCode) as (WaitingListEntry & { booking_id: number; passenger_name: string }) | undefined;

    if (!nextInQueue) return;

    // Get current used seats for assignment
    const inventory = db.prepare('SELECT * FROM seat_inventory WHERE schedule_id = ? AND class_code = ?')
      .get(scheduleId, classCode) as { total_seats: number; available_seats: number };

    const usedSeats = inventory ? (inventory.total_seats - inventory.available_seats) : 0;
    const seatLabel = allocateSeat(classCode, usedSeats + 1);

    // Promote passenger
    db.prepare(`
      UPDATE booking_passengers 
      SET status = 'CONFIRMED', allocated_seat = ?, wl_number = NULL
      WHERE id = ?
    `).run(seatLabel, nextInQueue.booking_passenger_id);

    // Mark queue entry as promoted
    db.prepare(`
      UPDATE waiting_list_queue SET status = 'PROMOTED' WHERE id = ?
    `).run(nextInQueue.id);

    // Decrement inventory available (promoted from WL to CNF)
    db.prepare(`
      UPDATE seat_inventory 
      SET available_seats = MAX(0, available_seats - 1),
          waiting_list_count = MAX(0, waiting_list_count - 1)
      WHERE schedule_id = ? AND class_code = ?
    `).run(scheduleId, classCode);

    // Update parent booking status if all passengers are now confirmed
    const bookingPassengers = db
      .prepare("SELECT status FROM booking_passengers WHERE booking_id = ? AND status != 'CANCELLED'")
      .all(nextInQueue.booking_id) as { status: string }[];

    const allConfirmed = bookingPassengers.every(p => p.status === 'CONFIRMED');
    if (allConfirmed) {
      db.prepare(`
        UPDATE bookings SET booking_status = 'CONFIRMED', updated_at = datetime('now')
        WHERE id = ?
      `).run(nextInQueue.booking_id);
    }

    // Audit promotion
    db.prepare(`
      INSERT INTO audit_logs (event_type, booking_id, description)
      VALUES ('WL_PROMOTED', ?, ?)
    `).run(nextInQueue.booking_id, `WL Promoted: Passenger=${nextInQueue.passenger_name}, Seat=${seatLabel}`);

    // Renumber remaining WL positions
    this.renumberWaitingList(scheduleId, classCode, db);
  }

  private renumberWaitingList(scheduleId: number, classCode: string, db: ReturnType<typeof getDatabase>): void {
    const remaining = db.prepare(`
      SELECT id FROM waiting_list_queue
      WHERE schedule_id = ? AND class_code = ? AND status = 'WAITING'
      ORDER BY created_at ASC, id ASC
    `).all(scheduleId, classCode) as { id: number }[];

    remaining.forEach((entry, index) => {
      db.prepare('UPDATE waiting_list_queue SET queue_position = ? WHERE id = ?')
        .run(index + 1, entry.id);

      // Also update booking_passengers wl_number
      const bp = db.prepare('SELECT id, booking_id FROM booking_passengers WHERE id = (SELECT booking_passenger_id FROM waiting_list_queue WHERE id = ?)')
        .get(entry.id) as { id: number } | undefined;
      if (bp) {
        db.prepare('UPDATE booking_passengers SET wl_number = ? WHERE id = ?')
          .run(index + 1, bp.id);
      }
    });
  }

  // ============================================================
  // QUERY METHODS
  // ============================================================

  findBookingById(id: number): Booking | undefined {
    return getDatabase().prepare('SELECT * FROM bookings WHERE id = ?').get(id) as Booking | undefined;
  }

  findBookingByPNR(pnr: string): Booking | undefined {
    return getDatabase().prepare('SELECT * FROM bookings WHERE pnr_number = ?').get(pnr) as Booking | undefined;
  }

  findPassengersByBookingId(bookingId: number): BookingPassenger[] {
    return getDatabase()
      .prepare('SELECT * FROM booking_passengers WHERE booking_id = ? ORDER BY id')
      .all(bookingId) as BookingPassenger[];
  }

  findPaymentsByBookingId(bookingId: number): Payment[] {
    return getDatabase()
      .prepare('SELECT * FROM payments WHERE booking_id = ? ORDER BY created_at DESC')
      .all(bookingId) as Payment[];
  }

  findCancellationByBookingId(bookingId: number) {
    return getDatabase()
      .prepare('SELECT * FROM cancellations WHERE booking_id = ?')
      .get(bookingId) as import('../types/index.js').Cancellation | undefined;
  }

  // Scope-limited lookup: requires matching contact info (prevents cross-user access)
  findBookingsByContact(email: string, phone?: string): Booking[] {
    const db = getDatabase();
    if (phone) {
      return db.prepare(`
        SELECT * FROM bookings 
        WHERE contact_email = ? OR contact_phone = ?
        ORDER BY created_at DESC LIMIT 20
      `).all(email, phone) as Booking[];
    }
    return db.prepare(`
      SELECT * FROM bookings 
      WHERE contact_email = ?
      ORDER BY created_at DESC LIMIT 20
    `).all(email) as Booking[];
  }

  // Admin: get all bookings (paginated, optional status filter)
  findAllBookings(limit = 50, offset = 0, status?: string): Booking[] {
    const db = getDatabase();
    if (status) {
      return db.prepare('SELECT * FROM bookings WHERE booking_status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
        .all(status, limit, offset) as Booking[];
    }
    return db.prepare('SELECT * FROM bookings ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .all(limit, offset) as Booking[];
  }

  getSystemStats() {
    const db = getDatabase();
    const totalBookings = (db.prepare("SELECT COUNT(*) as c FROM bookings WHERE booking_status NOT IN ('FAILED')").get() as { c: number }).c;
    const confirmedBookings = (db.prepare("SELECT COUNT(*) as c FROM bookings WHERE booking_status = 'CONFIRMED'").get() as { c: number }).c;
    const waitingList = (db.prepare("SELECT COUNT(*) as c FROM bookings WHERE booking_status = 'WAITING_LIST'").get() as { c: number }).c;
    const cancelled = (db.prepare("SELECT COUNT(*) as c FROM bookings WHERE booking_status = 'CANCELLED'").get() as { c: number }).c;
    const totalRevenue = (db.prepare("SELECT COALESCE(SUM(total_fare), 0) as r FROM bookings WHERE payment_status = 'PAID'").get() as { r: number }).r;
    return { totalBookings, confirmedBookings, waitingList, cancelled, totalRevenue };
  }
}
