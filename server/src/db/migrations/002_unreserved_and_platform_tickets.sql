-- Migration 002: Unreserved and Platform Ticket Architecture
-- Railway Reservation System v3.0 — Team 11
-- CSE 2271 | Presidency University, Bengaluru
--
-- Adds dedicated models for:
-- 1. Unreserved journey tickets (general quota / UTS simulation)
-- 2. Railway station platform entry tickets (hourly validity simulation)
-- 3. Password reset token management extensions
--
-- All operations are additive and idempotent (IF NOT EXISTS).

-- ============================================================
-- UNRESERVED TICKETS (General Coach / UTS)
-- ============================================================
CREATE TABLE IF NOT EXISTS unreserved_tickets (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_number       TEXT    NOT NULL UNIQUE,
    user_id             INTEGER REFERENCES passenger_users(id) ON DELETE SET NULL,
    source_station_id   INTEGER NOT NULL REFERENCES stations(id),
    dest_station_id     INTEGER NOT NULL REFERENCES stations(id),
    journey_date        TEXT    NOT NULL,
    passenger_count     INTEGER NOT NULL CHECK(passenger_count BETWEEN 1 AND 6),
    passenger_names     TEXT    NOT NULL, -- JSON string or comma-separated names
    train_type          TEXT    NOT NULL DEFAULT 'ORDINARY'
                        CHECK(train_type IN ('ORDINARY', 'MAIL_EXPRESS', 'SUPERFAST')),
    distance_km         INTEGER NOT NULL DEFAULT 50,
    fare_per_passenger  REAL    NOT NULL,
    total_fare          REAL    NOT NULL,
    booking_status      TEXT    NOT NULL DEFAULT 'CONFIRMED'
                        CHECK(booking_status IN ('CONFIRMED', 'EXPIRED', 'CANCELLED')),
    payment_status      TEXT    NOT NULL DEFAULT 'PAID'
                        CHECK(payment_status IN ('PENDING', 'PAID', 'FAILED')),
    transaction_id      TEXT,
    valid_until         TEXT    NOT NULL,
    qr_payload          TEXT,
    contact_email       TEXT,
    contact_phone       TEXT,
    created_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_unreserved_ticket_num ON unreserved_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_unreserved_user ON unreserved_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_unreserved_date ON unreserved_tickets(journey_date);

-- ============================================================
-- PLATFORM TICKETS (Station Entry)
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_tickets (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_number   TEXT    NOT NULL UNIQUE,
    user_id         INTEGER REFERENCES passenger_users(id) ON DELETE SET NULL,
    station_id      INTEGER NOT NULL REFERENCES stations(id),
    ticket_count    INTEGER NOT NULL CHECK(ticket_count BETWEEN 1 AND 10),
    fare_per_ticket REAL    NOT NULL DEFAULT 10.0,
    total_fare      REAL    NOT NULL,
    visitor_name    TEXT    NOT NULL,
    contact_phone   TEXT,
    valid_from      TEXT    NOT NULL,
    valid_until     TEXT    NOT NULL, -- Demonstration rule: 2 hours validity
    booking_status  TEXT    NOT NULL DEFAULT 'ACTIVE'
                    CHECK(booking_status IN ('ACTIVE', 'EXPIRED')),
    payment_status  TEXT    NOT NULL DEFAULT 'PAID'
                    CHECK(payment_status IN ('PENDING', 'PAID', 'FAILED')),
    transaction_id  TEXT,
    qr_payload      TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_platform_ticket_num ON platform_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_platform_user ON platform_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_station ON platform_tickets(station_id);

-- ============================================================
-- RECORD MIGRATION ENTRY
-- ============================================================
INSERT OR IGNORE INTO schema_migrations (migration) VALUES ('002_unreserved_and_platform_tickets');

