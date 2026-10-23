# Database Design — Railway Reservation System (Team 11)
**Course:** CSE 2271 | Presidency University, Bengaluru  
**Database Engine:** SQLite 3 via Node.js v24 built-in `node:sqlite`  
**File Location:** `server/data/railway.db`

---

## 1. Design Principles

The schema applies Third Normal Form (3NF) normalization principles:
- Every non-key attribute depends only on the primary key.
- No transitive dependencies between non-key attributes.
- Route information is stored in `train_routes` (not repeated in `bookings`).
- Inventory is tracked per `schedule + class_code` — not per `train + class_code` — ensuring separate journeys on the same train on different dates have independent inventory.

---

## 2. Entity Descriptions and Business Justifications

| Table | Business Entity | Key Design Decision |
| :--- | :--- | :--- |
| `stations` | Physical railway stations | Code + name separation allows display-name changes without breaking foreign keys |
| `trains` | Train service definitions | Trains are abstract (KSK Express always runs); schedules are concrete per-date instances |
| `train_routes` | Ordered station stop sequence | `stop_sequence` + `day_offset` enables correct journey ordering and overnight detection |
| `train_classes` | Travel class definitions per train | Base fares stored here; schedule-level inventory in `seat_inventory` |
| `schedules` | Concrete running instance per date | Allows per-date inventory and status management |
| `seat_inventory` | Live availability per schedule + class | The authoritative seat count — updated atomically during booking/cancellation |
| `bookings` | Reservation header record | Contains `idempotency_key` (UNIQUE) preventing double-submission |
| `booking_passengers` | Individual passenger records | Separated from booking header for multi-passenger support |
| `payments` | Payment attempt records | Immutable log; status transitions (PENDING → SUCCESS/FAILED) never delete rows |
| `cancellations` | Cancellation + refund records | Separation from bookings preserves booking history after cancellation |
| `waiting_list_queue` | WL ordering | FIFO ordering via `created_at` timestamp |
| `audit_logs` | Non-sensitive event log | Security and traceability without storing sensitive data |
| `admin_users` | Administrator credentials | bcrypt-hashed passwords; JWT-based session management |

---

## 3. Complete Schema Definition

```sql
-- ============================================================
-- STATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS stations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    code        TEXT    NOT NULL UNIQUE,   -- e.g. SBC, MAS, MYS
    name        TEXT    NOT NULL,          -- e.g. Bengaluru City Junction
    city        TEXT    NOT NULL,
    state       TEXT    NOT NULL
);

-- ============================================================
-- TRAINS
-- ============================================================
CREATE TABLE IF NOT EXISTS trains (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    train_number TEXT    NOT NULL UNIQUE,  -- e.g. 12028
    name         TEXT    NOT NULL,         -- e.g. Shatabdi Express
    type         TEXT    NOT NULL          -- SUPERFAST | EXPRESS | PASSENGER
                 CHECK(type IN ('SUPERFAST','EXPRESS','PASSENGER')),
    active       INTEGER NOT NULL DEFAULT 1
);

-- ============================================================
-- TRAIN ROUTES (ordered stop sequence)
-- ============================================================
CREATE TABLE IF NOT EXISTS train_routes (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    train_id       INTEGER NOT NULL REFERENCES trains(id) ON DELETE CASCADE,
    station_id     INTEGER NOT NULL REFERENCES stations(id),
    stop_sequence  INTEGER NOT NULL,
    arrival_time   TEXT,                   -- NULL for origin stop
    departure_time TEXT,                   -- NULL for terminal stop
    day_offset     INTEGER NOT NULL DEFAULT 0,  -- 0=same day, 1=next day, etc.
    distance_km    INTEGER NOT NULL DEFAULT 0,  -- from origin
    UNIQUE(train_id, stop_sequence),
    UNIQUE(train_id, station_id)
);
CREATE INDEX IF NOT EXISTS idx_routes_train ON train_routes(train_id);
CREATE INDEX IF NOT EXISTS idx_routes_station ON train_routes(station_id);

-- ============================================================
-- TRAIN CLASSES (per train)
-- ============================================================
CREATE TABLE IF NOT EXISTS train_classes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    train_id        INTEGER NOT NULL REFERENCES trains(id) ON DELETE CASCADE,
    class_code      TEXT    NOT NULL
                    CHECK(class_code IN ('1A','2A','3A','SL','CC','2S')),
    class_name      TEXT    NOT NULL,
    base_fare       REAL    NOT NULL CHECK(base_fare > 0),
    total_seats     INTEGER NOT NULL CHECK(total_seats > 0),
    max_waiting_list INTEGER NOT NULL DEFAULT 10 CHECK(max_waiting_list >= 0),
    UNIQUE(train_id, class_code)
);

-- ============================================================
-- SCHEDULES (per-date running instance)
-- ============================================================
CREATE TABLE IF NOT EXISTS schedules (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    train_id     INTEGER NOT NULL REFERENCES trains(id),
    journey_date TEXT    NOT NULL,         -- ISO date: 2026-11-15
    status       TEXT    NOT NULL DEFAULT 'SCHEDULED'
                 CHECK(status IN ('SCHEDULED','RUNNING','COMPLETED','CANCELLED')),
    UNIQUE(train_id, journey_date)
);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(journey_date);

-- ============================================================
-- SEAT INVENTORY (per schedule per class) — THE BOOKING LOCK
-- ============================================================
CREATE TABLE IF NOT EXISTS seat_inventory (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id        INTEGER NOT NULL REFERENCES schedules(id),
    class_code         TEXT    NOT NULL
                       CHECK(class_code IN ('1A','2A','3A','SL','CC','2S')),
    total_seats        INTEGER NOT NULL,
    available_seats    INTEGER NOT NULL CHECK(available_seats >= 0),
    waiting_list_count INTEGER NOT NULL DEFAULT 0 CHECK(waiting_list_count >= 0),
    max_waiting_list   INTEGER NOT NULL DEFAULT 10,
    UNIQUE(schedule_id, class_code),
    CHECK(available_seats <= total_seats),
    CHECK(waiting_list_count <= max_waiting_list)
);

-- ============================================================
-- BOOKINGS (reservation header)
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
CREATE INDEX IF NOT EXISTS idx_bookings_schedule ON bookings(schedule_id);

-- ============================================================
-- BOOKING PASSENGERS (per-passenger detail within a booking)
-- ============================================================
CREATE TABLE IF NOT EXISTS booking_passengers (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id       INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    passenger_name   TEXT    NOT NULL,
    age              INTEGER NOT NULL CHECK(age BETWEEN 1 AND 120),
    gender           TEXT    NOT NULL CHECK(gender IN ('M','F','O')),
    berth_preference TEXT    CHECK(berth_preference IN ('LB','MB','UB','SL','SU','ANY')),
    allocated_seat   TEXT,                 -- e.g. S1-23, A1-4
    status           TEXT    NOT NULL DEFAULT 'PENDING'
                     CHECK(status IN ('CONFIRMED','WAITING_LIST','CANCELLED','PENDING')),
    wl_number        INTEGER              -- WL position (1-based); NULL if CNF
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

-- ============================================================
-- CANCELLATIONS (one per cancelled booking)
-- ============================================================
CREATE TABLE IF NOT EXISTS cancellations (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id             INTEGER NOT NULL UNIQUE REFERENCES bookings(id),
    cancellation_reference TEXT    NOT NULL UNIQUE,
    seats_cancelled        INTEGER NOT NULL,
    original_fare          REAL    NOT NULL,
    cancellation_charge    REAL    NOT NULL CHECK(cancellation_charge >= 0),
    refund_amount          REAL    NOT NULL CHECK(refund_amount >= 0),
    refund_status          TEXT    NOT NULL DEFAULT 'INITIATED'
                           CHECK(refund_status IN ('INITIATED','PROCESSED','FAILED')),
    cancelled_at           TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- WAITING LIST QUEUE (ordered promotion queue)
-- ============================================================
CREATE TABLE IF NOT EXISTS waiting_list_queue (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id           INTEGER NOT NULL REFERENCES schedules(id),
    class_code            TEXT    NOT NULL,
    booking_passenger_id  INTEGER NOT NULL UNIQUE REFERENCES booking_passengers(id),
    queue_position        INTEGER NOT NULL,
    status                TEXT    NOT NULL DEFAULT 'WAITING'
                          CHECK(status IN ('WAITING','PROMOTED','CANCELLED')),
    created_at            TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(schedule_id, class_code, queue_position)
);
CREATE INDEX IF NOT EXISTS idx_wlq_schedule ON waiting_list_queue(schedule_id, class_code, queue_position);

-- ============================================================
-- AUDIT LOGS (non-sensitive event trail)
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
    ip_address  TEXT,
    timestamp   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- ADMIN USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL DEFAULT 'ADMIN'
                  CHECK(role IN ('ADMIN','SUPERADMIN')),
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

---

## 4. Seed Data Strategy

The seed data provides five demonstration scenarios required by the course:

| Scenario | Train | Route | Class | Inventory State |
| :--- | :--- | :--- | :--- | :--- |
| **CNF seats available** | 12028 Shatabdi Express | SBC → MAS | CC | 40 available |
| **WL only (CNF exhausted)** | 56501 Bengaluru Passenger | SBC → MYS | SL | 0 CNF, WL-3 queued |
| **Multiple classes** | 12027 Intercity SF | SBC → HYB | 2A, 3A, SL | Various fares |
| **Overnight journey** | 12601 Mangala Express | MAS → TVC | 3A | Departs 22:15, arrives 08:45+1 |
| **Cancellable booking** | Pre-seeded booking | SBC → MAS | CC | 1 CONFIRMED booking with future date |

---

## 5. Refund Calculation Rules (Documented Policy)

> **Disclaimer:** These are demonstration rules for academic purposes. They do not represent official Indian Railways cancellation policy.

| Cancellation Window | Charge | Refund |
| :--- | :--- | :--- |
| $> 48$ hours before departure | Flat ₹60/passenger | Total Fare − (₹60 × pax) |
| $12$–$48$ hours before departure | 25% of total fare | 75% of total fare |
| $< 12$ hours before departure | 50% of total fare | 50% of total fare |
| Waiting List ticket | Flat ₹30/passenger (clerical) | Total Fare − (₹30 × pax) |
