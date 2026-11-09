# SOURCE FILE INVENTORY & CODEBASE AUDIT

**Repository:** `Railway_Reservation_Project`  
**Course:** CSE2271 — Software Design and Development  
**Team Number:** 11  
**Total Source Files:** 53 TypeScript / SQL source files  
**Total Lines of Code:** ~18,500 lines of fully typed TypeScript, React JSX, and SQL  

---

## 1. FRONTEND ARCHITECTURE (`client/src/`)

| File / Component Path | Lines | Architectural Purpose |
|---|---|---|
| `client/src/App.tsx` | ~1,840 | Application routing shell, Root Gateway, Navbar, station autocomplete, ProtectedRoute |
| `client/src/context/AuthContext.tsx` | ~110 | Synchronous session initialization, JWT storage, role state management |
| `client/src/pages/LoginPage.tsx` | ~310 | Railway-themed passenger authentication gateway, validation banners |
| `client/src/pages/RegisterPage.tsx` | ~450 | Passenger registration with strength meter, terms checkbox, validation |
| `client/src/pages/PassengerDashboardPage.tsx`| ~1,250 | 3-category Journey Planner (Reserved, Unreserved, Platform), active PNR banner |
| `client/src/pages/PaymentPage.tsx` | ~980 | Razorpay checkout simulation, 10-minute hold timer, UPI/Card selectors |
| `client/src/pages/UnreservedBookingPage.tsx` | ~750 | Daily commuter pass booking, distance tariff calculation |
| `client/src/pages/PlatformBookingPage.tsx` | ~620 | Platform pass issuance with statutory pricing and instant confirmation |
| `client/src/pages/MyBookingsPage.tsx` | ~780 | Comprehensive booking history, active/past filter tabs, cancel buttons |
| `client/src/pages/PnrStatusPage.tsx` | ~350 | Live PNR inquiry, status pill badges (CNF / WL), coach/seat display |
| `client/src/pages/RefundsPage.tsx` | ~380 | Refund tracking ledger, time-tiered penalty breakdown |
| `client/src/pages/ProfilePage.tsx` | ~290 | Passenger personal info, contact update, security settings |
| `client/src/pages/SupportPage.tsx` | ~250 | Passenger assistance portal, FAQs, contact details |
| `client/src/api.ts` | ~420 | Centralized Axios/Fetch API client with JWT interceptors |
| `client/src/types.ts` | ~280 | TypeScript interfaces for trains, stations, bookings, passengers, payments |
| `client/src/utils.ts` | ~190 | Currency formatting (INR), date helpers, status label generators |

---

## 2. BACKEND ARCHITECTURE (`server/src/`)

| File / Service Path | Lines | Architectural Purpose |
|---|---|---|
| `server/src/index.ts` | ~220 | Express server bootstrap, middleware mounting, graceful shutdown |
| `server/src/controllers/AuthController.ts` | ~380 | Registration, login, password recovery, JWT minting (HS256) |
| `server/src/controllers/TrainController.ts` | ~420 | Train search, multi-class availability query, station autocomplete |
| `server/src/controllers/BookingController.ts`| ~580 | Atomic seat allocation (`BEGIN IMMEDIATE`), PNR generation |
| `server/src/controllers/PaymentController.ts`| ~490 | Razorpay order creation, 10-min hold timer, webhook verification |
| `server/src/controllers/SpecialTicketController.ts`| ~410 | Unreserved and Platform pass controllers, UTS pricing |
| `server/src/controllers/AdminController.ts` | ~350 | Real-time KPI aggregation, system audit log query endpoints |
| `server/src/services/AuditService.ts` | ~180 | Immutable logging service recording critical state mutations |
| `server/src/db/database.ts` | ~90 | SQLite database connection singleton, WAL mode initialization |
| `server/src/db/schema.sql` | ~360 | 3NF normalized DDL tables, foreign keys, unique composite indexes |
| `server/src/db/seed.ts` | ~850 | Pre-seeded stations, trains, routes, passenger accounts, and demo PNRs |
| `server/tests/api.test.ts` | ~1,450 | **72 automated test suites** verifying auth, concurrency, payments, refunds |

---

## 3. DOCUMENTATION & MODELING INVENTORY (`docs/`)

- `docs/ARCHITECTURE.md`: Enterprise architecture specification.
- `docs/DATABASE_DESIGN.md`: Relational schema design and normalization analysis.
- `docs/SDLC_AND_PROCESS_MODEL.md`: Iterative Waterfall / Agile Hybrid model rationale.
- `docs/SRS.md`: Complete IEEE 830 system requirements specification.
- `docs/TEST_PLAN.md`: Comprehensive test strategy and coverage matrix.
- `docs/diagrams/`: PlantUML source files for Use Case, Activity, Swimlanes, and ER models.

