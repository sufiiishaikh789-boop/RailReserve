# SLIDE 12: DATABASE ARCHITECTURE & RELATIONAL SCHEMA (3NF)

## 1. DATABASE DESIGN PHILOSOPHY
The **RailReserve** persistence layer is designed to achieve maximum data integrity, zero redundancy, and strict transactional isolation. The schema is normalized to **Third Normal Form (3NF)** with explicit foreign key constraints, composite unique indexes, and Write-Ahead Logging (WAL) configuration.

---

## 2. RELATIONAL ENTITY-RELATIONSHIP STRUCTURE

```
+---------------------------------------------------------------------------------------------------------+
|                                    ENTITY RELATIONSHIP DATA MODEL                                       |
+---------------------------------------------------------------------------------------------------------+
|                                                                                                         |
|   +-------------------+        1:N         +-------------------+       1:N       +-------------------+  |
|   |      STATIONS     |------------------->|      ROUTES       |<----------------|      TRAINS       |  |
|   +-------------------+                    +-------------------+                 +-------------------+  |
|   | PK station_code   |                    | PK route_id       |                 | PK train_id       |  |
|   |    station_name   |                    | FK train_id       |                 |    train_number   |  |
|   |    city, state    |                    | FK station_code   |                 |    train_name     |  |
|   |    zone           |                    |    stop_sequence  |                 |    train_type     |  |
|   +-------------------+                    |    distance_km    |                 |    total_coaches  |  |
|             │                              +-------------------+                 +-------------------+  |
|             │                                                                              │            |
|             │ 1:N                                                                          │ 1:N        |
|             ▼                                                                              ▼            |
|   +-------------------+                    +-------------------+                 +-------------------+  |
|   |  TRAIN_SCHEDULES  |------------------->|   SEAT_INVENTORY  |                 |    TRAIN_CLASSES  |  |
|   +-------------------+    1:N             +-------------------+                 +-------------------+  |
|   | PK schedule_id    |                    | PK inventory_id   |                 | PK class_id       |  |
|   | FK train_id       |                    | FK schedule_id    |                 | FK train_id       |  |
|   |    journey_date   |                    |    class_code     |                 |    class_code     |  |
|   |    departure_time |                    |    total_seats    |                 |    fare_multiplier|  |
|   |    arrival_time   |                    |    available_seats|                 |    base_seats     |  |
|   +-------------------+                    |    waiting_list   |                 +-------------------+  |
|             │                              +-------------------+                                        |
|             │ 1:N                                                                                       |
|             ▼                                                                                           |
|   +-------------------+                    +-------------------+                 +-------------------+  |
|   |     BOOKINGS      |                    |    PASSENGERS     |                 |       USERS       |  |
|   +-------------------+                    +-------------------+                 +-------------------+  |
|   | PK booking_id     |        1:N         | PK passenger_id   |       N:1       | PK user_id        |  |
|   |    pnr_number(UK) |------------------->| FK booking_id     |<----------------|    full_name      |  |
|   | FK schedule_id    |                    |    passenger_name |                 |    email (UK)     |  |
|   | FK user_id        |                    |    age, gender    |                 |    phone (UK)     |  |
|   |    booking_status |                    |    coach_number   |                 |    password_hash  |  |
|   |    total_fare     |                    |    seat_number    |                 |    role           |  |
|   |    idempotency_key|                    |    berth_preference|                +-------------------+  |
|   +-------------------+                    +-------------------+                           │            |
|             │                                                                              │ 1:N        |
|             │ 1:1                                                                          ▼            |
|             ▼                                                                    +-------------------+  |
|   +-------------------+        1:N         +-------------------+                 |    AUDIT_LOGS     |  |
|   |   TRANSACTIONS    |------------------->|      REFUNDS      |                 +-------------------+  |
|   +-------------------+                    +-------------------+                 | PK log_id         |  |
|   | PK txn_id         |                    | PK refund_id      |                 | FK user_id        |  |
|   | FK booking_id     |                    | FK txn_id         |                 |    action_type    |  |
|   |    payment_method |                    |    refund_amount  |                 |    entity_type    |  |
|   |    amount         |                    |    penalty_deduct |                 |    entity_id      |  |
|   |    gateway_ref    |                    |    refund_status  |                 |    details_json   |  |
|   |    status         |                    |    processed_at   |                 |    created_at     |  |
|   +-------------------+                    +-------------------+                 +-------------------+  |
+---------------------------------------------------------------------------------------------------------+
```

---

## 3. TABLE DEFINITIONS & NORMALIZATION DETAILS

### 1. `users` Table
- Stores passenger and administrative user credentials.
- **Constraints:** `email` UNIQUE, `phone` UNIQUE, `password_hash` non-null bcrypt digest.

### 2. `train_schedules` & `seat_inventory`
- Normalized separation between static route metadata and dynamic, date-partitioned inventory records.
- `seat_inventory` holds isolated row counts for each class (`1A`, `2A`, `3A`, `SL`, `2S`) for each scheduled run, enabling row-level lock concurrency.

### 3. `bookings` & `passengers`
- `bookings` holds header-level reservation metadata: globally unique 10-digit PNR, timestamps, total fare, contact details, and state machine (`CONFIRMED`, `WAITING_LIST`, `CANCELLED`).
- `passengers` implements 1-to-many child records maintaining individual coach, seat/berth allocations, and passenger demographics.

### 4. `transactions` & `refunds`
- Dedicated ledger of financial events.
- Tracks simulated payment reference, transaction status (`SUCCESS`, `FAILED`, `PENDING`), and time-tiered refund penalties computed upon booking cancellation.

### 5. `audit_logs`
- Append-only immutable log recording critical state mutations (e.g., ticket creation, cancellation, waitlist promotion) for administrative compliance.
