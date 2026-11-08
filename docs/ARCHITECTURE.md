# Architecture — Railway Reservation System (Team 11)
**Course:** CSE 2271 | Presidency University, Bengaluru

---

## 1. Architectural Pattern: Layered (N-Tier) Architecture

The system adopts a **strict 4-tier layered architecture**. Each tier may only communicate with the tier immediately below it, enforcing separation of concerns and preventing business logic leakage into data access or presentation layers.

```
┌─────────────────────────────────────────────────────────────┐
│                   TIER 1: PRESENTATION                       │
│   React 18 + TypeScript + Vite + Tailwind CSS               │
│   Routing: Login-First Gateway (RootGateway, ProtectedRoute) │
│   Pages: LoginPage, RegisterPage, ForgotPasswordPage,       │
│          ResetPasswordPage, PassengerDashboardPage,         │
│          ReservedSearchPage, UnreservedBookingPage,         │
│          PlatformBookingPage, MyBookingsPage, PnrStatusPage, │
│          RefundsPage, SupportPage, AdminPanel               │
│   Components: CategoryCards, TrainCard, ETicket, UtcPass    │
│   State: React AuthContext (JWT + user session in memory)   │
│   HTTP: fetch() via typed API client (client/src/api/)       │
└─────────────────────────────┬───────────────────────────────┘
                              │ REST JSON over HTTP
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               TIER 2: API / CONTROLLER LAYER                 │
│   Express.js + TypeScript                                    │
│   Routes: /api/trains, /api/bookings, /api/admin/*,          │
│           /api/auth/*, /api/payments/*,                      │
│           /api/unreserved/*, /api/platform/*                 │
│   Middleware: requirePassengerAuth, optionalPassengerAuth,   │
│               requireAdminAuth, rateLimiters, errorHandler   │
│   Controllers: TrainController, BookingController,           │
│                AuthController, PaymentController,            │
│                SpecialTicketController, AdminController      │
│   Responsibilities: Parse & validate HTTP, call services,    │
│                     return typed JSON responses              │
└─────────────────────────────┬───────────────────────────────┘
                              │ Typed function calls
                              ▼
┌─────────────────────────────────────────────────────────────┐
│             TIER 3: BUSINESS LOGIC / SERVICE LAYER           │
│   Services: PaymentService (Razorpay Sandbox + Demo),        │
│             HoldExpiryScheduler (2-min interval cleaner),    │
│             RefundCalculator, FareEngine, PNRGenerator,      │
│             UTS Distance Engine, PlatformPassService,        │
│             QRCodeService (Base64 PNG ticket verification)   │
│   Responsibilities: Domain rules, state machine transitions, │
│                     concurrency control, refund formulas     │
└─────────────────────────────┬───────────────────────────────┘
                              │ Repository calls
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              TIER 4: DATA ACCESS / REPOSITORY LAYER          │
│   Repositories: TrainRepository, BookingRepository,          │
│                 SpecialTicketRepository, InventoryRepository,│
│                 AuditRepository                              │
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
- `PENDING_PAYMENT` → `CONFIRMED` (payment succeeds via gateway/demo, CNF seats allocated)
- `PENDING_PAYMENT` → `WAITING_LIST` (payment succeeds, assigned to WL)
- `PENDING_PAYMENT` → `FAILED` (payment declines, seats restored to inventory)
- `PENDING_PAYMENT` → `HOLD_EXPIRED` (10-minute hold window elapses, seats released)
- `CONFIRMED` → `CANCELLED` (passenger requests, pre-departure, triggers auto-refund)
- `WAITING_LIST` → `CONFIRMED` (auto-promotion on cancellation of confirmed ticket)
- `WAITING_LIST` → `CANCELLED` (passenger requests, flat ₹30 deduction)

---

## 4. Payment Gateway Lifecycle Architecture (Dual Mode)

The payment subsystem operates in two mutually exclusive, strictly governed operational modes:

```
                      ┌─────────────────────────────────┐
                      │    GET /api/payments/mode       │
                      └────────────────┬────────────────┘
                                       │ Mode Discovery
                     ┌─────────────────┴─────────────────┐
                     ▼                                   ▼
          Mode B: RAZORPAY SANDBOX               Mode A: ACADEMIC DEMO
     (RAZORPAY_KEY_ID + SECRET set)             (Default / Offline eval)
                     │                                   │
                     ▼                                   ▼
      POST /api/payments/create-order     POST /api/payments/create-order
     - Verifies hold_expires_at > now    - Verifies hold_expires_at > now
     - Calls Razorpay Orders API         - Creates simulated demo_order_*
     - Persists order in payments table   - Returns safe mock parameters
                     │                                   │
                     ▼                                   ▼
        checkout.razorpay.com/v1           Interactive Demo Simulator
     - Card / NetBanking / UPI Modal     - 1-click Success / Decline / Cancel
                     │                                   │
                     ▼                                   ▼
       POST /api/payments/verify           POST /api/bookings/:id/payment
     - HMAC-SHA256 signature check       - Atomic state transition
     - Idempotent booking confirmation   - Inventory restored on decline
                     │                                   │
                     ▼                                   ▼
      POST /api/payments/webhook          Dedicated Result Presentation
     - Raw-body HMAC verification        - SUCCESS / FAILED / EXPIRED /
     - payment.captured confirmation       CANCELLED / PROCESSING
```

### Key Security & Integrity Invariants:
1. **Zero Credential Ingestion:** The RailReserve frontend and backend never accept, process, or store raw card numbers, expiration dates, or CVVs. All cardholder interactions are securely delegated to Razorpay Checkout.
2. **Server-Authoritative Seat Holds:** A 10-minute hold countdown is enforced. If payment is attempted after hold expiration, HTTP 410 Gone is returned and seats are returned to inventory.
3. **Cryptographic Signature Verification:** Razorpay callback payload signatures are verified server-side with HMAC-SHA256 using `RAZORPAY_KEY_SECRET`.
4. **Verbatim Webhook Validation:** Express `rawBody` buffers ensure exact cryptographic verification of incoming `x-razorpay-signature` headers without whitespace tampering.
5. **Inventory Rollback on Failure:** Simulated decline or gateway rejection invokes `failBooking()`, atomically incrementing available seats back to the original count.

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
