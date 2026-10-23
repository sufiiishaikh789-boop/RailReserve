-- ============================================================
-- Railway Reservation System (Team 11) - Database Schema
-- CSE 2271 | Presidency University, Bengaluru
-- IMPORTANT: All data is fictional for academic demonstration only.
-- ============================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ============================================================
-- STATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS stations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    code        TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    name        TEXT    NOT NULL,
    city        TEXT    NOT NULL,
    state       TEXT    NOT NULL
);

-- ============================================================
-- TRAINS
-- ============================================================
CREATE TABLE IF NOT EXISTS trains (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    train_number TEXT    NOT NULL UNIQUE,
    name         TEXT    NOT NULL,
    type         TEXT    NOT NULL DEFAULT 'EXPRESS'
                 CHECK(type IN ('SUPERFAST','EXPRESS','PASSENGER')),
    active       INTEGER NOT NULL DEFAULT 1
                 CHECK(active IN (0,1))
);

-- ============================================================
-- TRAIN ROUTES (ordered stop sequence per train)
-- day_offset: 0 = same day as origin departure, 1 = next day, etc.
-- ============================================================
CREATE TABLE IF NOT EXISTS train_routes (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    train_id       INTEGER NOT NULL REFERENCES trains(id) ON DELETE CASCADE,
    station_id     INTEGER NOT NULL REFERENCES stations(id),
    stop_sequence  INTEGER NOT NULL CHECK(stop_sequence >= 1),
    arrival_time   TEXT,
    departure_time TEXT,
    day_offset     INTEGER NOT NULL DEFAULT 0 CHECK(day_offset >= 0),
    distance_km    INTEGER NOT NULL DEFAULT 0 CHECK(distance_km >= 0),
    UNIQUE(train_id, stop_sequence),
    UNIQUE(train_id, station_id)
);
CREATE INDEX IF NOT EXISTS idx_routes_train ON train_routes(train_id);
CREATE INDEX IF NOT EXISTS idx_routes_station ON train_routes(station_id);

-- ============================================================
-- TRAIN CLASSES (class offering per train, base fares)
-- ============================================================
CREATE TABLE IF NOT EXISTS train_classes (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    train_id         INTEGER NOT NULL REFERENCES trains(id) ON DELETE CASCADE,
    class_code       TEXT    NOT NULL
                     CHECK(class_code IN ('1A','2A','3A','SL','CC','2S')),
    class_name       TEXT    NOT NULL,
    base_fare        REAL    NOT NULL CHECK(base_fare > 0),
    total_seats      INTEGER NOT NULL CHECK(total_seats > 0),
    max_waiting_list INTEGER NOT NULL DEFAULT 10 CHECK(max_waiting_list >= 0),
    UNIQUE(train_id, class_code)
);

-- ============================================================
-- SCHEDULES (concrete per-date running instance)
-- ============================================================
CREATE TABLE IF NOT EXISTS schedules (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    train_id     INTEGER NOT NULL REFERENCES trains(id),
    journey_date TEXT    NOT NULL,
    status       TEXT    NOT NULL DEFAULT 'SCHEDULED'
                 CHECK(status IN ('SCHEDULED','RUNNING','COMPLETED','CANCELLED')),
    UNIQUE(train_id, journey_date)
);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(journey_date);
CREATE INDEX IF NOT EXISTS idx_schedules_train ON schedules(train_id);

-- ============================================================
-- SEAT INVENTORY (per schedule per class - THE atomic lock target)
-- CHECK constraint enforces zero-overbooking at DB level
-- ============================================================
CREATE TABLE IF NOT EXISTS seat_inventory (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id        INTEGER NOT NULL REFERENCES schedules(id),
    class_code         TEXT    NOT NULL
                       CHECK(class_code IN ('1A','2A','3A','SL','CC','2S')),
    total_seats        INTEGER NOT NULL CHECK(total_seats > 0),
    available_seats    INTEGER NOT NULL CHECK(available_seats >= 0),
    waiting_list_count INTEGER NOT NULL DEFAULT 0 CHECK(waiting_list_count >= 0),
    max_waiting_list   INTEGER NOT NULL DEFAULT 10 CHECK(max_waiting_list >= 0),
    UNIQUE(schedule_id, class_code),
    CHECK(available_seats <= total_seats),
    CHECK(waiting_list_count <= max_waiting_list)
);
CREATE INDEX IF NOT EXISTS idx_inventory_schedule ON seat_inventory(schedule_id);

-- ============================================================
-- BOOKINGS (reservation header record)
-- idempotency_key prevents duplicate submission effects
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    pnr_number        TEXT    NOT NULL UNIQUE,
    schedule_id       INTEGER NOT NULL REFERENCES schedules(id),
    source_station_id INTEGER NOT NULL REFERENCES stations(id),
    dest_station_id   INTEGER NOT NULL REFERENCES stations(id),
    journey_date      TEXT    NOT NULL,
    class_code        TEXT    NOT NULL,
    total_passengers  INTEGER NOT NULL CHECK(total_passengers BETWEEN 1 AND 6),
    total_fare        REAL    NOT NULL CHECK(total_fare > 0),
    booking_status    TEXT    NOT NULL DEFAULT 'PENDING_PAYMENT'
                      CHECK(booking_status IN (
                        'PENDING_PAYMENT','CONFIRMED','WAITING_LIST',
                        'FAILED','CANCELLED'
                      )),
    payment_status    TEXT    NOT NULL DEFAULT 'PENDING'
                      CHECK(payment_status IN ('PENDING','PAID','FAILED','REFUNDED')),
    contact_email     TEXT    NOT NULL,
    contact_phone     TEXT    NOT NULL,
    idempotency_key   TEXT    NOT NULL UNIQUE,
    created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_bookings_pnr ON bookings(pnr_number);
CREATE INDEX IF NOT EXISTS idx_bookings_email ON bookings(contact_email);
CREATE INDEX IF NOT EXISTS idx_bookings_phone ON bookings(contact_phone);
CREATE INDEX IF NOT EXISTS idx_bookings_schedule ON bookings(schedule_id);

-- ============================================================
-- BOOKING PASSENGERS (individual passenger records)
-- ============================================================
CREATE TABLE IF NOT EXISTS booking_passengers (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id       INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    passenger_name   TEXT    NOT NULL,
    age              INTEGER NOT NULL CHECK(age BETWEEN 1 AND 120),
    gender           TEXT    NOT NULL CHECK(gender IN ('M','F','O')),
    berth_preference TEXT    DEFAULT 'ANY'
                     CHECK(berth_preference IN ('LB','MB','UB','SL','SU','ANY')),
    allocated_seat   TEXT,
    status           TEXT    NOT NULL DEFAULT 'PENDING'
                     CHECK(status IN ('CONFIRMED','WAITING_LIST','CANCELLED','PENDING')),
    wl_number        INTEGER CHECK(wl_number IS NULL OR wl_number >= 1)
);
CREATE INDEX IF NOT EXISTS idx_bp_booking ON booking_passengers(booking_id);

-- ============================================================
-- PAYMENTS (immutable payment attempt log)
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id     INTEGER NOT NULL REFERENCES bookings(id),
    transaction_id TEXT    NOT NULL UNIQUE,
    amount         REAL    NOT NULL CHECK(amount > 0),
    payment_method TEXT    NOT NULL DEFAULT 'SIM'
                   CHECK(payment_method IN ('SIM','CARD','UPI')),
    status         TEXT    NOT NULL
                   CHECK(status IN ('PENDING','SUCCESS','FAILED','REFUNDED')),
    failure_reason TEXT,
    created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);

-- ============================================================
-- CANCELLATIONS (one-to-one with cancelled bookings)
-- ============================================================
CREATE TABLE IF NOT EXISTS cancellations (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id             INTEGER NOT NULL UNIQUE REFERENCES bookings(id),
    cancellation_reference TEXT    NOT NULL UNIQUE,
    seats_cancelled        INTEGER NOT NULL CHECK(seats_cancelled >= 1),
    original_fare          REAL    NOT NULL CHECK(original_fare > 0),
    cancellation_charge    REAL    NOT NULL CHECK(cancellation_charge >= 0),
    refund_amount          REAL    NOT NULL CHECK(refund_amount >= 0),
    refund_status          TEXT    NOT NULL DEFAULT 'INITIATED'
                           CHECK(refund_status IN ('INITIATED','PROCESSED','FAILED')),
    cancelled_at           TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- WAITING LIST QUEUE (FIFO promotion order)
-- ============================================================
CREATE TABLE IF NOT EXISTS waiting_list_queue (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id           INTEGER NOT NULL REFERENCES schedules(id),
    class_code            TEXT    NOT NULL,
    booking_passenger_id  INTEGER NOT NULL UNIQUE REFERENCES booking_passengers(id),
    queue_position        INTEGER NOT NULL CHECK(queue_position >= 1),
    status                TEXT    NOT NULL DEFAULT 'WAITING'
                          CHECK(status IN ('WAITING','PROMOTED','CANCELLED')),
    created_at            TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_wlq_lookup ON waiting_list_queue(schedule_id, class_code, status, queue_position);

-- ============================================================
-- AUDIT LOGS (non-sensitive system event trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type  TEXT    NOT NULL
                CHECK(event_type IN (
                  'BOOKING_CREATED','PAYMENT_PROCESSED','PAYMENT_FAILED',
                  'TICKET_CANCELLED','WL_PROMOTED','ADMIN_LOGIN',
                  'ADMIN_MODIFIED','REFUND_PROCESSED'
                )),
    booking_id  INTEGER REFERENCES bookings(id),
    description TEXT    NOT NULL,
    ip_address  TEXT    DEFAULT 'SYSTEM',
    timestamp   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- ADMIN USERS (bcrypt-hashed, never plaintext passwords)
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL DEFAULT 'ADMIN'
                  CHECK(role IN ('ADMIN','SUPERADMIN')),
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
