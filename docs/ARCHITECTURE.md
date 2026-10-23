# Architecture — Railway Reservation System (Team 11)
**Course:** CSE 2271 | Presidency University, Bengaluru

---

## 1. Architectural Pattern: Layered (N-Tier) Architecture

The system adopts a **strict 4-tier layered architecture**. Each tier may only communicate with the tier immediately below it, enforcing separation of concerns and preventing business logic leakage into data access or presentation layers.

```
┌─────────────────────────────────────────────────────────────┐
│                   TIER 1: PRESENTATION                       │
│   React 18 + TypeScript + Vite + Tailwind CSS               │
│   Pages: Search, Results, Passenger, Payment, Ticket, Admin  │
│   Components: TrainCard, BookingWizard, ETicket, AdminPanel  │
│   State: React useState / useContext (lightweight)           │
│   HTTP: fetch() via typed API client (client/src/api/)       │
└─────────────────────────────┬───────────────────────────────┘
                              │ REST JSON over HTTP
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               TIER 2: API / CONTROLLER LAYER                 │
│   Express.js + TypeScript                                    │
│   Routes: /api/trains, /api/bookings, /api/admin/*          │
│   Middleware: validateRequest, requireAuth, errorHandler     │
│   Controllers: TrainController, BookingController,           │
│                PaymentController, CancellationController,    │
│                AdminController                               │
│   Responsibilities: Parse & validate HTTP, call services,    │
│                     return typed JSON responses              │
└─────────────────────────────┬───────────────────────────────┘
                              │ Typed function calls
                              ▼
┌─────────────────────────────────────────────────────────────┐
│             TIER 3: BUSINESS LOGIC / SERVICE LAYER           │
│   Services: TrainService, BookingService, PaymentService,    │
│             CancellationService, RefundService,              │
│             WaitingListService, FareService, AuditService   │
│   Responsibilities: Domain rules, state machine transitions, │
│                     concurrency control, refund formulas     │
└─────────────────────────────┬───────────────────────────────┘
                              │ Repository calls
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              TIER 4: DATA ACCESS / REPOSITORY LAYER          │
│   Repositories: TrainRepository, BookingRepository,          │
│                 InventoryRepository, AuditRepository         │
│   DB Driver: node:sqlite (Node.js v24 built-in)             │
│   Responsibilities: SQL queries, transactions, constraints   │
└─────────────────────────────┬───────────────────────────────┘
                              │ File I/O
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              PERSISTENT STORAGE: SQLite 3 Database           │
│   File: server/data/railway.db                              │
│   Schema: schema.sql (migrations/seed scripts)              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure

```
Railway_Reservation_Project/
├── client/                         # React + Vite frontend
│   ├── public/
│   ├── src/
│   │   ├── api/                    # Typed HTTP client functions
│   │   ├── components/             # Reusable UI components
│   │   │   ├── ui/                 # Primitive design-system components
│   │   │   ├── TrainCard.tsx
│   │   │   ├── BookingWizard.tsx
│   │   │   ├── ETicket.tsx
│   │   │   ├── PaymentModal.tsx
│   │   │   └── WaitingListBadge.tsx
│   │   ├── pages/                  # Route-level page components
│   │   │   ├── SearchPage.tsx
│   │   │   ├── ResultsPage.tsx
│   │   │   ├── PassengerPage.tsx
│   │   │   ├── TicketPage.tsx
│   │   │   ├── BookingLookupPage.tsx
│   │   │   ├── AdminPage.tsx
│   │   │   └── NotFoundPage.tsx
│   │   ├── types/                  # Shared TypeScript types/interfaces
│   │   ├── utils/                  # Date formatters, validators
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── server/                         # Node.js + Express backend
│   ├── src/
│   │   ├── controllers/            # HTTP layer (Express handlers)
│   │   ├── services/               # Business logic
│   │   ├── repositories/           # Data access layer
│   │   ├── middleware/             # Auth, validation, error handlers
│   │   ├── db/                     # DB connection, schema, seed
│   │   │   ├── database.ts         # Singleton DatabaseSync instance
│   │   │   ├── schema.sql          # CREATE TABLE definitions
│   │   │   └── seed.sql            # Fictional demo data
│   │   ├── types/                  # Backend-specific DTOs
│   │   ├── utils/                  # PNR generator, refund calculator
│   │   └── index.ts                # Express app entry point
│   ├── data/                       # SQLite .db file (gitignored)
│   ├── tests/                      # Vitest + Supertest suites
│   ├── package.json
│   └── tsconfig.json
├── docs/                           # All academic documentation
├── .github/workflows/ci.yml        # GitHub Actions CI
├── .env.example
├── .gitignore
└── README.md
```

---

## 3. Booking State Machine

The booking entity follows a deterministic finite state machine. Invalid transitions are rejected at the service layer.

```
                    ┌──────────────────┐
          ┌─────── │  PENDING_PAYMENT  │ ──────────────────┐
          │         └──────────────────┘                    │
          │ Payment           │ Payment                     │ User
          │ Success           │ Failure                     │ Cancels
          ▼                   ▼                             ▼
   ┌──────────────┐  ┌─────────────────┐         ┌──────────────────┐
   │  CONFIRMED   │  │     FAILED      │         │   PAYMENT_FAILED  │
   └──────┬───────┘  └─────────────────┘         └──────────────────┘
          │ Passenger requests cancellation
          ▼
   ┌──────────────┐
   │  CANCELLED   │  (triggers WL promotion if applicable)
   └──────────────┘

   WAITING_LIST (parallel path - when CNF unavailable + WL paid)
   └── After cancellation of a CONFIRMED ticket →
       WAITING_LIST → CONFIRMED (auto-promotion)
```

Valid transitions:
- `PENDING_PAYMENT` → `CONFIRMED` (payment succeeds, CNF seats)
- `PENDING_PAYMENT` → `WAITING_LIST` (payment succeeds, WL only)
- `PENDING_PAYMENT` → `FAILED` (payment fails)
- `CONFIRMED` → `CANCELLED` (passenger requests, pre-departure)
- `WAITING_LIST` → `CONFIRMED` (auto-promotion on cancellation)
- `WAITING_LIST` → `CANCELLED` (passenger requests)

---

## 4. Request Flow (Train Search Example)

```
Browser → GET /api/trains/search?from=SBC&to=MAS&date=2026-11-15
    │
    └─→ TrainController.search(req, res)
            │
            └─→ validateSearchParams(req.query)  [middleware]
                    │
                    └─→ TrainService.searchTrains({ from, to, date })
                                │
                                └─→ TrainRepository.findTrainsForRoute(from, to, date)
                                            │
                                            └─→ SQL: JOIN train_routes, schedules, seat_inventory
                                            │         WHERE origin.code = ? AND dest.code = ?
                                            │           AND origin.stop_seq < dest.stop_seq
                                            │           AND schedule.journey_date = ?
                                            │
                                            └─→ [{ trainNumber, departure, arrival, dayOffset,
                                                   classes: [{ code, fare, available, wlCount }] }]
                                │
                    └─→ Response: HTTP 200, JSON array of train results
```

---

## 5. Concurrency Control Strategy

The most critical engineering concern is preventing two simultaneous booking requests from each seeing "1 seat available" and both successfully allocating it (phantom read / write-write conflict).

**Solution: SQLite `BEGIN IMMEDIATE` transaction locking**

```sql
BEGIN IMMEDIATE;
-- Acquires write lock immediately. All other writers must wait.
SELECT available_seats FROM seat_inventory
  WHERE schedule_id = ? AND class_code = ? FOR UPDATE;
-- (Check > 0, then decrement atomically within same transaction)
UPDATE seat_inventory SET available_seats = available_seats - 1
  WHERE schedule_id = ? AND class_code = ? AND available_seats > 0;
-- Check rows_affected = 1 (guards against TOCTOU race)
COMMIT;
```

SQLite's file-level write lock ensures serialized access. `UPDATE ... WHERE available_seats > 0` + rows-affected check provides an atomic check-and-decrement.

---

## 6. Security Architecture

| Concern | Implementation |
| :--- | :--- |
| Admin Route Protection | `requireAdminAuth` middleware validates JWT from `Authorization: Bearer` header |
| Password Storage | bcrypt hash (cost factor 12) — never plaintext |
| SQL Injection | Parameterized queries only — zero string concatenation in SQL |
| XSS | React escapes all rendered content by default; no `dangerouslySetInnerHTML` |
| Data Scoping | Booking lookup requires matching contact email/phone — prevents cross-user access |
| Sensitive Data | No real card numbers, PINs, CVVs, or government IDs collected |
| Audit Logging | All critical mutations logged with event type, booking ID, IP (no passwords/tokens) |

---

## 7. Design Patterns Used

| Pattern | Where Applied | Justification |
| :--- | :--- | :--- |
| **Repository** | `server/src/repositories/` | Decouples SQL from business logic; enables swap of DB engine |
| **Service Layer** | `server/src/services/` | Consolidates domain rules in one testable location |
| **Middleware Chain** | Express middleware stack | Composable cross-cutting concerns (auth, validation, error) |
| **State Machine** | Booking status transitions | Prevents invalid state transitions at service boundary |
| **Singleton** | `Database.ts` connection | Single shared DB connection prevents resource exhaustion |
| **Factory** | `PNRGenerator.generate()` | Encapsulates unique ID creation algorithm |
