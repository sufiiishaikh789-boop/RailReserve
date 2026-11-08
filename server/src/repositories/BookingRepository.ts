// Booking Repository — atomic seat allocation, booking CRUD, and WL management
// Critical: All multi-step operations use BEGIN IMMEDIATE transactions
//
// INVENTORY LIFECYCLE (v3.0 — fixed seat leak):
//   1. createBookingAtomically() — HOLDS seats by decrementing available_seats
//      or incrementing waiting_list_count. Sets hold_expires_at (10 min).
//   2. confirmBookingAfterPayment() — Converts PENDING_PAYMENT → CONFIRMED/WL.
//      Inventory stays consumed. Idempotent: checks for existing SUCCESS payment.
//   3. failBooking() — RELEASES seats by incrementing available_seats
//      or decrementing waiting_list_count. Marks booking FAILED.
//   4. expireHeldBookings() — Finds bookings past hold_expires_at and calls
//      failBooking() to release their inventory. Backend-driven expiry.
//
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

// Hold duration in minutes — bookings not paid within this window are auto-expired
const HOLD_DURATION_MINUTES = 10;

export class BookingRepository {
  // ============================================================
  // ATOMIC BOOKING CREATION (BEGIN IMMEDIATE transaction lock)
  // Prevents race conditions / overbooking under concurrent requests
  //
  // Seats are HELD (decremented) at creation time, with a hold_expires_at
  // timestamp. If payment doesn't arrive before expiry, expireHeldBookings()
  // releases the seats. failBooking() also releases seats on payment failure.
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
      // 0. Expire any stale holds first (reclaims phantom-consumed seats)
      this._expireHeldBookingsInTxn(db);

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

      const isWaitingList = inventory.available_seats < req.passengers.length;

      if (isWaitingList && inventory.waiting_list_count + req.passengers.length > inventory.max_waiting_list) {
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

      // Compute hold expiry timestamp (UTC)
      const holdExpiresAt = new Date(Date.now() + HOLD_DURATION_MINUTES * 60 * 1000).toISOString();

      // 4. Create booking header with hold_expires_at
      const bookingResult = db.prepare(`
        INSERT INTO bookings
          (pnr_number, schedule_id, source_station_id, dest_station_id,
           journey_date, class_code, total_passengers, total_fare,
           booking_status, payment_status, contact_email, contact_phone,
           idempotency_key, hold_expires_at)
        SELECT ?, ?, ?, ?, s.journey_date, ?, ?, ?, 'PENDING_PAYMENT', 'PENDING', ?, ?, ?, ?
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
        holdExpiresAt,
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

      // 6. Atomically update inventory (HOLD seats now, release on fail/expiry)
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
        const wlResult = db.prepare(`
          UPDATE seat_inventory 
          SET waiting_list_count = waiting_list_count + ?
          WHERE schedule_id = ? AND class_code = ?
            AND (waiting_list_count + ?) <= max_waiting_list
        `).run(req.passengers.length, req.schedule_id, req.class_code, req.passengers.length) as { changes: number };

        if (wlResult.changes === 0) {
          db.exec('ROLLBACK');
          throw new Error('Waiting list capacity became unavailable. Please try again.');
        }
      }

      // 7. Log audit event
      db.prepare(`
        INSERT INTO audit_logs (event_type, booking_id, description, ip_address)
        VALUES ('BOOKING_CREATED', ?, ?, 'SYSTEM')
      `).run(bookingId, `Booking created: PNR=${pnr}, Type=${isWaitingList ? 'WL' : 'CNF'}, Hold expires=${holdExpiresAt}`);

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
  // IDEMPOTENT: If a SUCCESS payment already exists for this booking,
  //   returns without creating a duplicate record.
  // ============================================================
  confirmBookingAfterPayment(
    bookingId: number,
    transactionId: string,
    isWaitingList: boolean,
    options?: {
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
      payment_method?: string;
    }
  ): void {
    const db = getDatabase();
    db.exec('BEGIN IMMEDIATE');
    try {
      // Idempotency guard: check if a SUCCESS payment already exists
      const existingPayment = db
        .prepare("SELECT id FROM payments WHERE booking_id = ? AND status = 'SUCCESS'")
        .get(bookingId) as { id: number } | undefined;
      if (existingPayment) {
        // Already confirmed — skip silently (idempotent)
        db.exec('ROLLBACK');
        return;
      }

      const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) as unknown as Booking;
      if (!booking) throw new Error('Booking not found');

      // Check hold expiry — do not confirm expired bookings
      if (booking.hold_expires_at && new Date(booking.hold_expires_at) < new Date()) {
        db.exec('ROLLBACK');
        this.failBooking(bookingId, 'Payment attempt after hold expired');
        throw new Error('Reservation hold has expired. Inventory was released.');
      }

      // Only allow transition from PENDING_PAYMENT
      if (booking.booking_status !== 'PENDING_PAYMENT') {
        db.exec('ROLLBACK');
        return;
      }

      const newStatus: BookingStatus = isWaitingList ? 'WAITING_LIST' : 'CONFIRMED';

      // Update booking status
      db.prepare(`
        UPDATE bookings SET booking_status = ?, payment_status = 'PAID',
          hold_expires_at = NULL, updated_at = datetime('now')
        WHERE id = ? AND booking_status = 'PENDING_PAYMENT'
      `).run(newStatus, bookingId);

      // Update passenger statuses and assign seats/WL numbers
      const passengers = db
        .prepare('SELECT * FROM booking_passengers WHERE booking_id = ? ORDER BY id')
        .all(bookingId) as unknown as BookingPassenger[];

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

      // Record successful payment (check for pending record first)
      const pendingPayment = db
        .prepare("SELECT id FROM payments WHERE booking_id = ? AND status = 'PENDING' ORDER BY id DESC LIMIT 1")
        .get(bookingId) as { id: number } | undefined;

      if (pendingPayment) {
        db.prepare(`
          UPDATE payments 
          SET status = 'SUCCESS', transaction_id = ?,
              razorpay_order_id = COALESCE(?, razorpay_order_id),
              razorpay_payment_id = ?, razorpay_signature = ?,
              payment_method = ?
          WHERE id = ?
        `).run(
          transactionId,
          options?.razorpay_order_id || null,
          options?.razorpay_payment_id || null,
          options?.razorpay_signature || null,
          options?.payment_method || 'SIM',
          pendingPayment.id
        );
      } else {
        db.prepare(`
          INSERT INTO payments 
            (booking_id, transaction_id, amount, status, razorpay_order_id, razorpay_payment_id, razorpay_signature, payment_method)
          VALUES (?, ?, ?, 'SUCCESS', ?, ?, ?, ?)
        `).run(
          bookingId,
          transactionId,
          booking.total_fare,
          options?.razorpay_order_id || null,
          options?.razorpay_payment_id || null,
          options?.razorpay_signature || null,
          options?.payment_method || 'SIM'
        );
      }

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

  // Record a newly created payment order as PENDING
  recordPendingPayment(
    bookingId: number,
    orderId: string,
    amount: number,
    method = 'RAZORPAY'
  ): void {
    const db = getDatabase();
    const tempTxn = `pend_${orderId.replace(/[^a-zA-Z0-9]/g, '')}`;
    db.prepare(`
      INSERT INTO payments (booking_id, transaction_id, amount, payment_method, status, razorpay_order_id)
      VALUES (?, ?, ?, ?, 'PENDING', ?)
    `).run(bookingId, tempTxn, amount, method, orderId);
  }

  // Lookup booking associated with a Razorpay order ID (for webhooks and callbacks)
  findBookingByRazorpayOrderId(orderId: string): (Booking & { razorpay_payment_id?: string }) | null {
    const db = getDatabase();
    const row = db.prepare(`
      SELECT b.*, p.razorpay_payment_id
      FROM bookings b
      JOIN payments p ON p.booking_id = b.id
      WHERE p.razorpay_order_id = ?
      ORDER BY p.id DESC
      LIMIT 1
    `).get(orderId) as (Booking & { razorpay_payment_id?: string }) | undefined;
    return row || null;
  }

  // ============================================================
  // FAIL BOOKING — RELEASE INVENTORY, mark as failed
  //
  // v3.0 FIX: Inventory IS consumed at creation time (holds).
  // On failure, we MUST restore available_seats / waiting_list_count.
  // ============================================================
  failBooking(bookingId: number, reason: string): void {
    const db = getDatabase();
    db.exec('BEGIN IMMEDIATE');
    try {
      const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) as unknown as Booking;
      if (!booking) { db.exec('ROLLBACK'); return; }

      if (booking.booking_status !== 'PENDING_PAYMENT') {
        db.exec('ROLLBACK');
        return; // Already processed — idempotent
      }

      // --- CRITICAL FIX: Release held inventory ---
      // Seats were decremented at booking creation. We must restore them.
      // Determine if this was a confirmed-seat hold or WL hold by checking
      // whether available_seats was consumed (confirmed) or waiting_list_count
      // was incremented (WL). We can tell from inventory state:
      // If available_seats < total_seats after releasing, it was a confirmed hold.
      // Simpler: check if any seats were available at creation time.
      // Since we don't store this flag, we check current inventory:
      // The booking consumed seats. We restore total_passengers seats.
      const inventory = db
        .prepare('SELECT * FROM seat_inventory WHERE schedule_id = ? AND class_code = ?')
        .get(booking.schedule_id, booking.class_code) as {
          total_seats: number;
          available_seats: number;
          waiting_list_count: number;
        } | undefined;

      if (inventory) {
        // Check if this booking had confirmed-seat holds or WL holds.
        // A booking that was created when seats were available would have
        // decremented available_seats. If seats were 0 at creation, it
        // would have incremented waiting_list_count.
        // Since available_seats was decremented or waiting_list_count incremented,
        // and the booking is still PENDING_PAYMENT, we need to figure out which.
        // We can check: if restoring seats would exceed total, it was WL.
        const seatsToRestore = booking.total_passengers;
        if (inventory.available_seats + seatsToRestore <= inventory.total_seats) {
          // Was a confirmed-seat hold — restore available_seats
          db.prepare(`
            UPDATE seat_inventory 
            SET available_seats = MIN(total_seats, available_seats + ?)
            WHERE schedule_id = ? AND class_code = ?
          `).run(seatsToRestore, booking.schedule_id, booking.class_code);
        } else {
          // Was a WL hold — decrement waiting_list_count
          db.prepare(`
            UPDATE seat_inventory 
            SET waiting_list_count = MAX(0, waiting_list_count - ?)
            WHERE schedule_id = ? AND class_code = ?
          `).run(seatsToRestore, booking.schedule_id, booking.class_code);
        }
      }

      // Mark booking as failed
      db.prepare(`
        UPDATE bookings SET booking_status = 'FAILED', payment_status = 'FAILED',
          hold_expires_at = NULL, updated_at = datetime('now')
        WHERE id = ?
      `).run(bookingId);

      // Update passengers
      db.prepare(`UPDATE booking_passengers SET status = 'CANCELLED' WHERE booking_id = ?`).run(bookingId);

      // Record failed payment (update pending payment or insert failed record)
      const existingPendingPayment = db
        .prepare("SELECT id FROM payments WHERE booking_id = ? AND status = 'PENDING'")
        .get(bookingId) as { id: number } | undefined;

      if (existingPendingPayment) {
        db.prepare(`
          UPDATE payments SET status = 'FAILED', failure_reason = ? WHERE id = ?
        `).run(reason, existingPendingPayment.id);
      } else {
        const existingFailedPayment = db
          .prepare("SELECT id FROM payments WHERE booking_id = ? AND status = 'FAILED'")
          .get(bookingId) as { id: number } | undefined;

        if (!existingFailedPayment) {
          const txnId = generateTransactionId();
          db.prepare(`
            INSERT INTO payments (booking_id, transaction_id, amount, status, failure_reason)
            VALUES (?, ?, ?, 'FAILED', ?)
          `).run(bookingId, txnId, booking.total_fare, reason);
        }
      }

      db.prepare(`
        INSERT INTO audit_logs (event_type, booking_id, description)
        VALUES ('PAYMENT_FAILED', ?, ?)
      `).run(bookingId, `Payment FAILED: ${reason}. Inventory released.`);

      db.exec('COMMIT');
    } catch (err) {
      try { db.exec('ROLLBACK'); } catch (_) {}
      throw err;
    }
  }

  // ============================================================
  // EXPIRE HELD BOOKINGS — backend-driven hold expiry
  // Called periodically and before new bookings to reclaim seats.
  // ============================================================
  expireHeldBookings(): number {
    const db = getDatabase();
    const now = new Date().toISOString();
    const expiredBookings = db.prepare(`
      SELECT id FROM bookings
      WHERE booking_status = 'PENDING_PAYMENT'
        AND hold_expires_at IS NOT NULL
        AND hold_expires_at <= ?
    `).all(now) as { id: number }[];

    let expiredCount = 0;
    for (const { id } of expiredBookings) {
      try {
        this.failBooking(id, 'Payment hold expired');
        // Update status to HOLD_EXPIRED for clarity (after failBooking sets FAILED)
        db.prepare(`
          UPDATE bookings SET booking_status = 'HOLD_EXPIRED', updated_at = datetime('now')
          WHERE id = ? AND booking_status = 'FAILED'
        `).run(id);
        db.prepare(`
          INSERT INTO audit_logs (event_type, booking_id, description)
          VALUES ('HOLD_EXPIRED', ?, 'Booking hold expired — inventory released')
        `).run(id);
        expiredCount++;
      } catch (_) {
        // Log but don't crash — other expirations should continue
        console.error(`[HOLD_EXPIRY] Failed to expire booking ${id}:`, _);
      }
    }
    return expiredCount;
  }

  // Internal: expire holds inside an existing transaction
  private _expireHeldBookingsInTxn(db: ReturnType<typeof getDatabase>): void {
    const now = new Date().toISOString();
    const expiredBookings = db.prepare(`
      SELECT id, schedule_id, class_code, total_passengers FROM bookings
      WHERE booking_status = 'PENDING_PAYMENT'
        AND hold_expires_at IS NOT NULL
        AND hold_expires_at <= ?
    `).all(now) as { id: number; schedule_id: number; class_code: string; total_passengers: number }[];

    for (const expired of expiredBookings) {
      // Restore inventory inline (we're already in a transaction)
      const inv = db
        .prepare('SELECT total_seats, available_seats FROM seat_inventory WHERE schedule_id = ? AND class_code = ?')
        .get(expired.schedule_id, expired.class_code) as { total_seats: number; available_seats: number } | undefined;

      if (inv) {
        if (inv.available_seats + expired.total_passengers <= inv.total_seats) {
          db.prepare('UPDATE seat_inventory SET available_seats = MIN(total_seats, available_seats + ?) WHERE schedule_id = ? AND class_code = ?')
            .run(expired.total_passengers, expired.schedule_id, expired.class_code);
        } else {
          db.prepare('UPDATE seat_inventory SET waiting_list_count = MAX(0, waiting_list_count - ?) WHERE schedule_id = ? AND class_code = ?')
            .run(expired.total_passengers, expired.schedule_id, expired.class_code);
        }
      }

      db.prepare(`UPDATE bookings SET booking_status = 'HOLD_EXPIRED', payment_status = 'FAILED', hold_expires_at = NULL, updated_at = datetime('now') WHERE id = ?`).run(expired.id);
      db.prepare(`UPDATE booking_passengers SET status = 'CANCELLED' WHERE booking_id = ?`).run(expired.id);
      db.prepare(`INSERT INTO audit_logs (event_type, booking_id, description) VALUES ('HOLD_EXPIRED', ?, 'Hold expired — inventory released automatically')`).run(expired.id);
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
      const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) as unknown as Booking;
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
    return getDatabase().prepare('SELECT * FROM bookings WHERE id = ?').get(id) as unknown as Booking | undefined;
  }

  findBookingByPNR(pnr: string): Booking | undefined {
    return getDatabase().prepare('SELECT * FROM bookings WHERE pnr_number = ?').get(pnr) as unknown as Booking | undefined;
  }

  findPassengersByBookingId(bookingId: number): BookingPassenger[] {
    return getDatabase()
      .prepare('SELECT * FROM booking_passengers WHERE booking_id = ? ORDER BY id')
      .all(bookingId) as unknown as BookingPassenger[];
  }

  findPaymentsByBookingId(bookingId: number): Payment[] {
    return getDatabase()
      .prepare('SELECT * FROM payments WHERE booking_id = ? ORDER BY created_at DESC')
      .all(bookingId) as unknown as Payment[];
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
      `).all(email, phone) as unknown as Booking[];
    }
    return db.prepare(`
      SELECT * FROM bookings 
      WHERE contact_email = ?
      ORDER BY created_at DESC LIMIT 20
    `).all(email) as unknown as Booking[];
  }

  // Admin: get all bookings (paginated, optional status filter) — enriched with route info
  findAllBookings(limit = 50, offset = 0, status?: string): (Booking & {
    source_station_code: string;
    source_station_city: string;
    dest_station_code: string;
    dest_station_city: string;
    train_number: string;
    train_name: string;
  })[] {
    const db = getDatabase();
    const baseQuery = `
      SELECT
        b.*,
        s_src.code  AS source_station_code,
        s_src.city  AS source_station_city,
        s_dst.code  AS dest_station_code,
        s_dst.city  AS dest_station_city,
        t.train_number,
        t.name AS train_name
      FROM bookings b
      LEFT JOIN stations s_src ON s_src.id = b.source_station_id
      LEFT JOIN stations s_dst ON s_dst.id = b.dest_station_id
      LEFT JOIN schedules sch  ON sch.id  = b.schedule_id
      LEFT JOIN trains t       ON t.id    = sch.train_id
    `;
    if (status) {
      return db.prepare(baseQuery + ' WHERE b.booking_status = ? ORDER BY b.created_at DESC LIMIT ? OFFSET ?')
        .all(status, limit, offset) as unknown as ReturnType<typeof this.findAllBookings>;
    }
    return db.prepare(baseQuery + ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?')
      .all(limit, offset) as unknown as ReturnType<typeof this.findAllBookings>;
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
