# SLIDE 13: MODULES DECOMPOSITION & FUNCTIONAL ARCHITECTURE

The **RailReserve** application is engineered as a modular system organized into five loosely coupled, highly cohesive functional modules:

```
+---------------------------------------------------------------------------------------------------------+
|                                  RAILRESERVE MODULE DECOMPOSITION                                       |
+-------------------+--------------------+--------------------+--------------------+----------------------+
|     MODULE 1      |      MODULE 2      |      MODULE 3      |      MODULE 4      |       MODULE 5       |
|  AUTHENTICATION   |  JOURNEY DISCOVERY | ATOMIC RESERVATION | PAYMENT CHECKOUT   | DIGITAL TICKETING    |
|    & IDENTITY     |   & FARE ENGINE    | & CONCURRENCY LOCK | & HOLD LIFECYCLE   |    & ADMIN PORTAL    |
+-------------------+--------------------+--------------------+--------------------+----------------------+
```

---

## 1. MODULE 1: AUTHENTICATION & IDENTITY LIFECYCLE
- **Primary Actors:** Passenger, System Administrator
- **Key Files:** `AuthController.ts`, `AuthContext.tsx`, `LoginPage.tsx`, `RegisterPage.tsx`
- **Core Functionality:**
  - Secure passenger sign-up and credential validation.
  - BCrypt password salting and hashing (10 work factor rounds).
  - Stateless JSON Web Token (JWT) issuance with HS256 signature and 24-hour TTL.
  - Role-Based Access Control (RBAC) segregating Passenger vs. Admin route access.
  - Remember-me persistence and password recovery workflow.

---

## 2. MODULE 2: JOURNEY DISCOVERY & DYNAMIC PRICING ENGINE
- **Primary Actors:** Passenger
- **Key Files:** `TrainController.ts`, `StationAutocomplete.tsx`, `PassengerDashboardPage.tsx`, `ResultsPage`
- **Core Functionality:**
  - 3-Category Journey Planner routing (Reserved, Unreserved Express, Platform Pass).
  - Debounced prefix autocomplete for station codes (SBC, MAS, NDLS) and city names (<50ms).
  - Dynamic tariff computation factoring distance in kilometers, class multiplier (`1A: 3.5x`, `2A: 2.5x`, `3A: 1.8x`, `SL: 1.0x`, `2S: 0.6x`), reservation fee, superfast surcharge, and statutory 5% GST.
  - Real-time seat inventory query across all scheduled trains and classes.

---

## 3. MODULE 3: ATOMIC RESERVATION & CONCURRENCY ENGINE
- **Primary Actors:** Passenger, Persistence Tier
- **Key Files:** `BookingController.ts`, `SpecialTicketController.ts`, `PassengerPage.tsx`
- **Core Functionality:**
  - ACID transaction isolation using SQLite `BEGIN IMMEDIATE` exclusive write locks.
  - Absolute prevention of double-allocation under simultaneous multi-client booking requests.
  - Automated berth allocation algorithm (Coach number + Window / Lower / Middle / Upper berth).
  - Automatic FIFO Waiting List (WL) queue assignment if confirmed capacity is exhausted.
  - Generation of globally unique, cryptographically random 10-digit PNR numbers.

---

## 4. MODULE 4: PAYMENT CHECKOUT & INVENTORY HOLD LIFECYCLE
- **Primary Actors:** Passenger, Payment Simulator Gateway
- **Key Files:** `PaymentController.ts`, `PaymentPage.tsx`, `api.ts`
- **Core Functionality:**
  - 10-minute active inventory hold timer preventing abandoned seats from permanent lockup.
  - Idempotency key tracking preventing duplicate debits on user browser reload or network retries.
  - Simulated payment gateway supporting UPI (VPA), Credit/Debit Card, and Net Banking flows.
  - Two-phase commit: Verification -> Payment Webhook -> Database Finalization.
  - Automated inventory release and audit log creation upon payment decline or cancellation.

---

## 5. MODULE 5: DIGITAL BOARDING PASS & ADMINISTRATIVE OVERSIGHT
- **Primary Actors:** Passenger, System Administrator
- **Key Files:** `TicketPage`, `AdminDashboard`, `AuditService.ts`, `qrcode`
- **Core Functionality:**
  - Issuance of printable digital e-tickets featuring high-density 2D QR verification barcodes.
  - Real-time PNR status inquiry showing current status (CNF vs WL queue rank).
  - Automated time-tiered cancellation engine (>48h = 75% refund, 12–48h = 50%, <12h = 0%).
  - Immediate promotion of next FIFO waiting list passenger to Confirmed upon ticket cancellation.
  - High-privilege Admin Portal visualizing platform revenue, active bookings, seat inventory, and immutable audit trails.

