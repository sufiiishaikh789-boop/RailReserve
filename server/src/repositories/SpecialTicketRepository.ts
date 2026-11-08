// Special Ticket Repository — Unreserved (General) & Platform Ticket Operations
// CSE 2271 | Presidency University, Bengaluru (Team 11)
// DISCLAIMER: Fictional demonstration tickets. No connection to IRCTC/Indian Railways.

import { getDatabase } from '../db/database.js';
import QRCode from 'qrcode';
import { generateTransactionId } from '../utils/pnr.js';

export interface UnreservedFareEstimate {
  distance_km: number;
  fare_per_passenger: number;
  total_fare: number;
  train_type: 'ORDINARY' | 'MAIL_EXPRESS' | 'SUPERFAST';
  passenger_count: number;
  rules_note: string;
}

export interface UnreservedTicketRecord {
  id: number;
  ticket_number: string;
  user_id: number | null;
  source_station_id: number;
  source_code: string;
  source_name: string;
  source_city: string;
  dest_station_id: number;
  dest_code: string;
  dest_name: string;
  dest_city: string;
  journey_date: string;
  passenger_count: number;
  passenger_names: string;
  train_type: 'ORDINARY' | 'MAIL_EXPRESS' | 'SUPERFAST';
  distance_km: number;
  fare_per_passenger: number;
  total_fare: number;
  booking_status: 'CONFIRMED' | 'EXPIRED' | 'CANCELLED';
  payment_status: 'PENDING' | 'PAID' | 'FAILED';
  transaction_id: string | null;
  valid_until: string;
  qr_code?: string;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
}

export interface PlatformTicketRecord {
  id: number;
  ticket_number: string;
  user_id: number | null;
  station_id: number;
  station_code: string;
  station_name: string;
  station_city: string;
  ticket_count: number;
  fare_per_ticket: number;
  total_fare: number;
  visitor_name: string;
  contact_phone: string | null;
  valid_from: string;
  valid_until: string;
  booking_status: 'ACTIVE' | 'EXPIRED';
  payment_status: 'PENDING' | 'PAID' | 'FAILED';
  transaction_id: string | null;
  qr_code?: string;
  created_at: string;
}

export class SpecialTicketRepository {

  /**
   * Estimate distance and calculate demonstration unreserved ticket fare.
   * Based on route network or distance proxy formula.
   */
  calculateUnreservedFare(
    sourceStationId: number,
    destStationId: number,
    passengerCount: number,
    trainType: 'ORDINARY' | 'MAIL_EXPRESS' | 'SUPERFAST' = 'ORDINARY'
  ): UnreservedFareEstimate {
    const db = getDatabase();

    // Check if both stations exist on a shared train route
    const routeDistance = db.prepare(`
      SELECT ABS(r2.distance_km - r1.distance_km) AS km
      FROM train_routes r1
      JOIN train_routes r2 ON r1.train_id = r2.train_id
      WHERE r1.station_id = ? AND r2.station_id = ? AND r2.stop_sequence > r1.stop_sequence
      ORDER BY km ASC LIMIT 1
    `).get(sourceStationId, destStationId) as { km: number } | undefined;

    let distance_km = routeDistance && routeDistance.km > 0 ? routeDistance.km : 0;
    if (!distance_km) {
      // Deterministic distance proxy based on IDs
      distance_km = Math.max(30, Math.abs(sourceStationId - destStationId) * 38 + 25);
    }

    // Distance-tiered demonstration fare schedule (Academic demo rules)
    let baseRate = 30; // up to 50 km
    if (distance_km > 50 && distance_km <= 150) baseRate = 55;
    else if (distance_km > 150 && distance_km <= 300) baseRate = 95;
    else if (distance_km > 300 && distance_km <= 500) baseRate = 160;
    else if (distance_km > 500) baseRate = 240;

    // Train type surcharge multiplier
    let typeMultiplier = 1.0;
    if (trainType === 'MAIL_EXPRESS') typeMultiplier = 1.35;
    if (trainType === 'SUPERFAST') typeMultiplier = 1.6;

    const fare_per_passenger = Math.round(baseRate * typeMultiplier);
    const total_fare = fare_per_passenger * passengerCount;

    return {
      distance_km,
      fare_per_passenger,
      total_fare,
      train_type: trainType,
      passenger_count: passengerCount,
      rules_note: 'Demonstration UTS General Fare: No reserved berth allocated. Valid for travel on designated date in Second Class.',
    };
  }

  /**
   * Issue an Unreserved Journey Ticket atomically.
   */
  async createUnreservedTicket(data: {
    user_id?: number | null;
    source_station_id: number;
    dest_station_id: number;
    journey_date: string;
    passenger_count: number;
    passenger_names: string[];
    train_type?: 'ORDINARY' | 'MAIL_EXPRESS' | 'SUPERFAST';
    contact_email?: string;
    contact_phone?: string;
    payment_method?: string;
  }): Promise<UnreservedTicketRecord> {
    const db = getDatabase();
    const trainType = data.train_type || 'ORDINARY';
    const fare = this.calculateUnreservedFare(
      data.source_station_id,
      data.dest_station_id,
      data.passenger_count,
      trainType
    );

    const ticketNumber = `UTS-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const txnId = `TXN-UTS-${generateTransactionId()}`;
    const validUntil = `${data.journey_date} 23:59:59`;
    const namesJson = JSON.stringify(data.passenger_names);

    const insertStmt = db.prepare(`
      INSERT INTO unreserved_tickets
        (ticket_number, user_id, source_station_id, dest_station_id, journey_date,
         passenger_count, passenger_names, train_type, distance_km, fare_per_passenger,
         total_fare, booking_status, payment_status, transaction_id, valid_until,
         contact_email, contact_phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', 'PAID', ?, ?, ?, ?)
    `);

    insertStmt.run(
      ticketNumber,
      data.user_id ?? null,
      data.source_station_id,
      data.dest_station_id,
      data.journey_date,
      data.passenger_count,
      namesJson,
      trainType,
      fare.distance_km,
      fare.fare_per_passenger,
      fare.total_fare,
      txnId,
      validUntil,
      data.contact_email ?? null,
      data.contact_phone ?? null
    );

    // If user is logged in, record a notification
    if (data.user_id) {
      try {
        db.prepare(`
          INSERT INTO notifications (user_id, type, title, message)
          VALUES (?, 'BOOKING_CREATED', 'Unreserved Ticket Issued', ?)
        `).run(data.user_id, `Unreserved Ticket #${ticketNumber} confirmed for ${data.journey_date}.`);
      } catch { /* non-fatal */ }
    }

    return (await this.getUnreservedTicketByNumber(ticketNumber))!;
  }

  /**
   * Retrieve unreserved ticket by ticket number with full station info and QR code.
   */
  async getUnreservedTicketByNumber(ticketNumber: string): Promise<UnreservedTicketRecord | null> {
    const db = getDatabase();
    const row = db.prepare(`
      SELECT
        u.*,
        s1.code AS source_code, s1.name AS source_name, s1.city AS source_city,
        s2.code AS dest_code, s2.name AS dest_name, s2.city AS dest_city
      FROM unreserved_tickets u
      JOIN stations s1 ON s1.id = u.source_station_id
      JOIN stations s2 ON s2.id = u.dest_station_id
      WHERE u.ticket_number = ?
    `).get(ticketNumber) as (UnreservedTicketRecord & { passenger_names: string }) | undefined;

    if (!row) return null;

    let qr_code: string | undefined;
    try {
      const payload = JSON.stringify({
        uts: row.ticket_number,
        from: row.source_code,
        to: row.dest_code,
        date: row.journey_date,
        pax: row.passenger_count,
        type: row.train_type,
        fare: row.total_fare,
        valid: row.valid_until,
        sys: 'RailReserve-UTS-Demo',
      });
      qr_code = await QRCode.toDataURL(payload, {
        width: 220,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
      });
    } catch (e) {
      console.warn('[QR] Unreserved QR generation failed:', e);
    }

    return {
      ...row,
      qr_code,
    };
  }

  /**
   * Issue a Platform Ticket atomically (standard ₹10 per ticket, 2h validity).
   */
  async createPlatformTicket(data: {
    user_id?: number | null;
    station_id: number;
    ticket_count: number;
    visitor_name: string;
    contact_phone?: string;
    fare_per_ticket?: number;
  }): Promise<PlatformTicketRecord> {
    const db = getDatabase();
    const farePerTicket = data.fare_per_ticket || 10.0;
    const totalFare = farePerTicket * data.ticket_count;
    const ticketNumber = `PLT-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const txnId = `TXN-PLT-${generateTransactionId()}`;

    // Valid from now to now + 2 hours (demonstration rule)
    const now = new Date();
    const expiry = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const validFrom = now.toISOString().replace('T', ' ').substring(0, 19);
    const validUntil = expiry.toISOString().replace('T', ' ').substring(0, 19);

    db.prepare(`
      INSERT INTO platform_tickets
        (ticket_number, user_id, station_id, ticket_count, fare_per_ticket,
         total_fare, visitor_name, contact_phone, valid_from, valid_until,
         booking_status, payment_status, transaction_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'PAID', ?)
    `).run(
      ticketNumber,
      data.user_id ?? null,
      data.station_id,
      data.ticket_count,
      farePerTicket,
      totalFare,
      data.visitor_name,
      data.contact_phone ?? null,
      validFrom,
      validUntil,
      txnId
    );

    if (data.user_id) {
      try {
        db.prepare(`
          INSERT INTO notifications (user_id, type, title, message)
          VALUES (?, 'BOOKING_CREATED', 'Platform Ticket Issued', ?)
        `).run(data.user_id, `Platform Ticket #${ticketNumber} issued (valid for 2 hours).`);
      } catch { /* non-fatal */ }
    }

    return (await this.getPlatformTicketByNumber(ticketNumber))!;
  }

  /**
   * Retrieve platform ticket by ticket number with full station info and QR code.
   */
  async getPlatformTicketByNumber(ticketNumber: string): Promise<PlatformTicketRecord | null> {
    const db = getDatabase();
    const row = db.prepare(`
      SELECT
        p.*,
        s.code AS station_code, s.name AS station_name, s.city AS station_city
      FROM platform_tickets p
      JOIN stations s ON s.id = p.station_id
      WHERE p.ticket_number = ?
    `).get(ticketNumber) as PlatformTicketRecord | undefined;

    if (!row) return null;

    let qr_code: string | undefined;
    try {
      const payload = JSON.stringify({
        plt: row.ticket_number,
        stn: row.station_code,
        count: row.ticket_count,
        from: row.valid_from,
        until: row.valid_until,
        fare: row.total_fare,
        sys: 'RailReserve-Platform-Demo',
      });
      qr_code = await QRCode.toDataURL(payload, {
        width: 220,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
      });
    } catch (e) {
      console.warn('[QR] Platform QR generation failed:', e);
    }

    return {
      ...row,
      qr_code,
    };
  }

  /**
   * Get all tickets for an authenticated passenger (Reserved, Unreserved, Platform).
   */
  getUserAllTickets(userId: number) {
    const db = getDatabase();

    const unreserved = db.prepare(`
      SELECT
        u.*,
        s1.code AS source_code, s1.city AS source_city,
        s2.code AS dest_code, s2.city AS dest_city
      FROM unreserved_tickets u
      JOIN stations s1 ON s1.id = u.source_station_id
      JOIN stations s2 ON s2.id = u.dest_station_id
      WHERE u.user_id = ?
      ORDER BY u.created_at DESC
    `).all(userId) as unknown as UnreservedTicketRecord[];

    const platform = db.prepare(`
      SELECT
        p.*,
        s.code AS station_code, s.name AS station_name, s.city AS station_city
      FROM platform_tickets p
      JOIN stations s ON s.id = p.station_id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `).all(userId) as unknown as PlatformTicketRecord[];

    return { unreserved, platform };
  }
}

