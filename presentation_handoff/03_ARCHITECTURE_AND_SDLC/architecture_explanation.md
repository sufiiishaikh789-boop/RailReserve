# SLIDE 7: SYSTEM ARCHITECTURE SPECIFICATION

## 1. ARCHITECTURAL OVERVIEW: 3-TIER LAYERED CLIENT-SERVER PATTERN
**RailReserve** implements an enterprise **3-Tier Layered Client-Server Architecture** designed to maximize separation of concerns, high throughput, and data consistency under concurrent transaction loads.

```
+---------------------------------------------------------------------------------------------------------+
|                                  RAILRESERVE SYSTEM ARCHITECTURE                                        |
+---------------------------------------------------------------------------------------------------------+
|                                    PRESENTATION TIER (CLIENT)                                           |
|  - Single Page Application (SPA) built with React 18 & TypeScript                                       |
|  - Tailwind CSS 3.4 Design System & Lucide Icons                                                        |
|  - Client-Side State: React Context (AuthContext) & LocalStorage Token Persistence                      |
|  - View Layer: Passenger Dashboard, 3-Category Journey Planner, Checkout Modal, Admin Portal            |
+--------------------------------------------------┬------------------------------------------------------+
                                                   │ HTTPS / JSON REST APIs (Bearer JWT)
+--------------------------------------------------▼------------------------------------------------------+
|                                    APPLICATION TIER (BACKEND SERVICES)                                 |
|  - Node.js High-Throughput Asynchronous Event Loop Runtime                                             |
|  - Express.js 4.21 Application Framework                                                                |
|                                                                                                         |
|  [SECURITY & MIDDLEWARE LAYER]                                                                          |
|  - Helmet HTTP Headers, CORS Whitelisting, Express Rate-Limiting, Idempotency Guard Middleware          |
|                                                                                                         |
|  [SERVICE CONTROLLERS & BUSINESS LOGIC]                                                                 |
|  - AuthController: BCrypt Password Hashing, JWT Minting & Verification                                  |
|  - TrainController: Station Autocomplete, Route Traversal & Multi-Class Pricing Engine                  |
|  - BookingController: Concurrency Seat Lock Engine (BEGIN IMMEDIATE), PNR Minting                      |
|  - PaymentController: 10-Minute Hold Countdown, Razorpay Simulator Webhook & State Machine             |
|  - CancellationEngine: Refund Penalty Computation, FIFO Waitlist Promotion Algorithm                   |
|  - AdminController: Real-Time Inventory Metrics, System Audit Trail Aggregation                        |
+--------------------------------------------------┬------------------------------------------------------+
                                                   │ Parameterized SQL Queries / ACID Transactions
+--------------------------------------------------▼------------------------------------------------------+
|                                    DATA PERSISTENCE TIER (STORAGE)                                      |
|  - Embedded SQLite 3 Relational Database Engine                                                         |
|  - Write-Ahead Logging (WAL) Mode enabled (PRAGMA journal_mode = WAL) for High Read/Write Concurrency   |
|  - 3NF Normalized Relational Schema:                                                                    |
|    users, stations, trains, routes, train_schedules, seat_inventory, bookings, passengers, payments,   |
|    refunds, audit_logs                                                                                 |
+---------------------------------------------------------------------------------------------------------+
```

---

## 2. KEY ARCHITECTURAL SUBSYSTEMS & DESIGN PATTERNS

### A. Presentation Layer (React 18 SPA)
- **Component Decomposition:** Stateless functional presentation components bound via custom hooks (`useAuth`, `useCallback`, `useRef`).
- **Synchronous Auth Initialization:** Token extraction executed synchronously inside `useState` initialization to eliminate race conditions and screen flicker on page reload.
- **Fail-Safe UI Boundaries:** Top-level React `ErrorBoundary` isolating runtime exceptions and rendering a fallback recovery screen.

### B. Security & Middleware Tier
- **Stateless JWT Authorization:** Every sensitive endpoint validates the `Authorization: Bearer <token>` header, decoding user role and ID without server-side session memory overhead.
- **Idempotency Protection:** Payment and reservation requests carry an `idempotency_key` header preventing duplicate seat allocations during client re-submissions or network drops.
- **HTTP Hardening:** Helmet enforces strict CSP, HSTS, and frame protections; rate limiters restrict brute-force attacks to 20 attempts per 15-minute window on auth endpoints.

### C. Concurrency Isolation & ACID Storage Layer
- **Write-Ahead Logging (WAL):** Allows simultaneous readers while write operations acquire atomic database locks, guaranteeing sub-50ms reads even during booking commits.
- **Atomic Concurrency Guard:** Booking commits execute within a `BEGIN IMMEDIATE` transaction block:
  1. Inspects `seat_inventory` for available seats in requested class.
  2. If seats >= requested: decrements count, assigns coach and berth numbers, generates unique 10-digit PNR, commits transaction.
  3. If seats == 0: checks waiting list ceiling; assigns FIFO waitlist rank if user opts in.
  4. If constraints violated: rolls back immediately, releasing locks and returning HTTP 409 Conflict.
