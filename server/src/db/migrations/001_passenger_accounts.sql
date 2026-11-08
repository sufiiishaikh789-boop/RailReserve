-- Migration 001: Passenger Account System
-- Railway Reservation System v3.0 — Team 11
-- CSE 2271 | Presidency University, Bengaluru
--
-- Adds passenger user accounts, password reset, saved passengers,
-- notifications, and booking ownership.
-- All changes are additive (IF NOT EXISTS) — safe to run on existing DB.

-- ============================================================
-- PASSENGER USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS passenger_users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name       TEXT    NOT NULL,
    email           TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    phone           TEXT    NOT NULL,
    password_hash   TEXT    NOT NULL,
    is_verified     INTEGER NOT NULL DEFAULT 0 CHECK(is_verified IN (0, 1)),
    is_active       INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_passenger_email ON passenger_users(email);
CREATE INDEX IF NOT EXISTS idx_passenger_phone ON passenger_users(phone);

-- ============================================================
-- PASSWORD RESET TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES passenger_users(id) ON DELETE CASCADE,
    token_hash  TEXT    NOT NULL UNIQUE,
    expires_at  TEXT    NOT NULL,
    used        INTEGER NOT NULL DEFAULT 0 CHECK(used IN (0, 1)),
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- SAVED PASSENGERS (frequent travellers for quick booking)
-- ============================================================
CREATE TABLE IF NOT EXISTS saved_passengers (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER NOT NULL REFERENCES passenger_users(id) ON DELETE CASCADE,
    passenger_name   TEXT    NOT NULL,
    age              INTEGER NOT NULL CHECK(age BETWEEN 1 AND 120),
    gender           TEXT    NOT NULL CHECK(gender IN ('M','F','O')),
    berth_preference TEXT    NOT NULL DEFAULT 'ANY'
                     CHECK(berth_preference IN ('LB','MB','UB','SL','SU','ANY')),
    created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_saved_passengers_user ON saved_passengers(user_id);

-- ============================================================
-- BOOKING OWNERSHIP — links bookings to registered accounts
-- ============================================================
CREATE TABLE IF NOT EXISTS booking_ownership (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id  INTEGER NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES passenger_users(id),
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ownership_user ON booking_ownership(user_id);
CREATE INDEX IF NOT EXISTS idx_ownership_booking ON booking_ownership(booking_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES passenger_users(id) ON DELETE CASCADE,
    type        TEXT    NOT NULL CHECK(type IN (
                  'BOOKING_CREATED','PAYMENT_SUCCESS','PAYMENT_FAILED',
                  'BOOKING_CANCELLED','REFUND_INITIATED','REFUND_PROCESSED',
                  'WL_PROMOTED','JOURNEY_REMINDER','SYSTEM'
                )),
    title       TEXT    NOT NULL,
    message     TEXT    NOT NULL,
    booking_id  INTEGER REFERENCES bookings(id),
    is_read     INTEGER NOT NULL DEFAULT 0 CHECK(is_read IN (0, 1)),
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notifs_user ON notifications(user_id, is_read, created_at);

-- ============================================================
-- SCHEMA MIGRATIONS TRACKER
-- ============================================================
CREATE TABLE IF NOT EXISTS schema_migrations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    migration   TEXT    NOT NULL UNIQUE,
    applied_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO schema_migrations (migration) VALUES ('001_passenger_accounts');

-- Seed default demo passenger user for CSE 2271 evaluation
INSERT OR IGNORE INTO passenger_users (
    id, full_name, email, phone, password_hash, is_verified, is_active
) VALUES (
    1,
    'Rahul Sharma',
    'rahul.sharma@example.com',
    '9876543210',
    '$2b$10$KXlAy9hRhIyL/BJYoorh0u1UKbG8EKsEaIgdixGQwOdPnt.NehwyG',
    1,
    1
);

INSERT OR IGNORE INTO notifications (
    user_id, type, title, message
) VALUES (
    1,
    'SYSTEM',
    'Welcome to RailReserve!',
    'Your passenger account is active. Explore reserved bookings, unreserved UTS tickets, and platform entry passes.'
);

