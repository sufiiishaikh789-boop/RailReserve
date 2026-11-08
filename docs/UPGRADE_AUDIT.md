# Upgrade Audit — Railway Reservation System
**Version Audited:** v1.0-baseline (tag `v1.0-baseline`)
**Audit Date:** 2026-10-23
**Auditor:** Upgrade Agent (Stage A)

---

## 1. Existing Architecture

| Layer | Technology | Status |
|:---|:---|:---|
| Frontend | React 18 + TypeScript + Vite 8 + Tailwind v4 | ✅ Working |
| Backend | Express 4 + TypeScript + tsx watch | ✅ Working |
| Database | SQLite via Node.js v24 built-in `node:sqlite` (WAL) | ✅ Working |
| Auth | JWT (jsonwebtoken + bcrypt) for admin only | ✅ Working |
| Tests | Vitest + Supertest (27 test cases) | ✅ Passing |
| Frontend Routing | React Router v6 (BrowserRouter) | ✅ Working |
| API Proxy | Vite `/api` → `localhost:5000` | ✅ Working |

---

## 2. Implemented Features (Working)

| Feature | Location | Notes |
|:---|:---|:---|
| Station listing | `GET /api/stations` | Returns all stations |
| Train search (origin→dest, date) | `GET /api/trains/search` | Respects stop order |
| Booking creation | `POST /api/bookings` | Atomic BEGIN IMMEDIATE |
| Payment simulation | `POST /api/bookings/:id/payment` | SIM/SUCCESS/FAIL modes |
| E-ticket retrieval | `GET /api/bookings/pnr/:pnr` | Contact auth required |
| Booking history | `GET /api/bookings` | By email/phone |
| Cancellation preview | `GET /api/bookings/:pnr/cancellation-preview` | Refund calc |
| Booking cancellation | `POST /api/bookings/:pnr/cancel` | WL promotion |
| Admin login (JWT) | `POST /api/admin/login` | bcrypt verify |
| Admin dashboard | `GET /api/admin/dashboard` | Stats |
| Admin inventory | `PATCH /api/admin/inventory/:id/:class` | Seat update |
| Idempotency keys | Booking deduplication | Works correctly |
| WL promotion on cancel | BookingRepository | FIFO implemented |
| PNR lookup page | `/lookup` | Frontend page |
| Multi-step booking wizard | Frontend | 5 steps |

---

## 3. Incomplete / Weak Features

| Feature | Gap | Priority |
|:---|:---|:---|
| **Station autocomplete** | Simple `<select>` dropdowns with 8 stations | 🔴 HIGH |
| **Station dataset** | Only 8 stations total | 🔴 HIGH |
| **Train dataset** | Only 5 trains, no intermediates on most routes | 🔴 HIGH |
| **Filters/sorting** | No search result filtering | 🔴 HIGH |
| **Train detail page** | No intermediate stop display | 🟡 MEDIUM |
| **Real payment gateway** | Simulate-only, no Razorpay SDK | 🟡 MEDIUM |
| **Hold expiry** | No time-limited inventory holds | 🟡 MEDIUM |
| **Admin: train management** | Read-only, no CRUD | 🟡 MEDIUM |
| **Admin: booking search** | No pagination or filtering | 🟡 MEDIUM |
| **Responsive design** | Grid breaks on mobile | 🟡 MEDIUM |
| **Popular routes** | Hard-coded, not data-driven | 🟡 MEDIUM |
| **Email notifications** | Not implemented | 🟢 LOW |
| **PDF ticket** | Browser print only | 🟢 LOW |
| **QR code on ticket** | Not implemented | 🟢 LOW |

---

## 4. Known Defects

| Defect | Severity | Fix |
|:---|:---|:---|
| `FOR NO ACTION` SQL syntax — SQLite incompatibility (already fixed in v1.0) | Fixed | ✅ |
| Seed DB path was 3 levels up (already fixed) | Fixed | ✅ |
| Server doesn't see seed data until restart (WAL visibility) — requires `wal_checkpoint` in seed | Fixed | ✅ |
| `<select>` shows all 8 stations unfiltered — no autocomplete | UX defect | Upgrade |
| No rate limiting on booking endpoints | Security gap | Upgrade |
| No CORS allowlist (allows any origin) | Security gap | Upgrade |
| Admin token stored in localStorage (XSS risk) | Security risk | Document |
| No `helmet` security headers | Security gap | Upgrade |

---

## 5. Existing Schema (13 tables)

```
stations, trains, train_routes, train_classes, schedules,
seat_inventory, bookings, booking_passengers, payments,
cancellations, waiting_list_queue, audit_logs, admin_users
```

**Schema strengths:**
- 3NF normalization
- FK constraints with ON DELETE CASCADE
- CHECK constraints enforce valid enum values
- `available_seats <= total_seats` DB-level guarantee
- `idempotency_key UNIQUE` prevents double-booking
- WAL mode, busy_timeout = 5000 ms

**Schema gaps for upgrade:**
- No `hold_expiry` on bookings (to release unpaid reservations)
- No `payment_method` enum for Razorpay (currently SIM/CARD/UPI)
- No `razorpay_order_id`, `razorpay_payment_id` fields on payments
- No `region` or `aliases` on stations for autocomplete

---

## 6. Integration Status

| Integration | Status | Notes |
|:---|:---|:---|
| Payment (Razorpay) | ❌ Not configured | No credentials in .env.example |
| Payment (Simulation) | ✅ Working | SIM mode with outcome param |
| Email (Nodemailer) | ❌ Not implemented | Not in codebase |
| IRCTC / Indian Railways API | ❌ Not integrated | Demonstration data only |

---

## 7. Security Findings

| Finding | Risk | Action |
|:---|:---|:---|
| No `helmet` headers | Medium | Add helmet middleware |
| No rate limiting on POST /bookings | Medium | Add express-rate-limit |
| CORS allows all origins | Low | Add allowlist in production |
| Admin JWT in localStorage | Low-Medium | Accept for academic demo; document |
| Contact email/phone visible in GET params | Low | Use POST for history |
| No input sanitization beyond validation | Low | Parameterized queries cover SQL injection |

---

## 8. Proposed Upgrades (in priority order)

1. **Expand to 50+ stations, 20+ trains** with multi-stop routes
2. **Station autocomplete** replacing `<select>` dropdowns  
3. **Search result filters** (departure time, class, availability, fare range)
4. **Razorpay integration** in demo/sandbox mode with proper order lifecycle
5. **Schema additions** — Razorpay fields, hold_expiry, station aliases
6. **Admin CRUD** — add/edit trains, manage schedules
7. **Security hardening** — helmet, rate limiting, CORS allowlist
8. **Responsive layout improvements**
9. **QR code on e-ticket**
10. **PDF download**

---

## 9. Files Expected to Change

| File | Change Type |
|:---|:---|
| `server/src/db/schema.sql` | ADD columns (razorpay_order_id, hold_expiry, aliases) |
| `server/src/db/seed.ts` | EXPAND (50 stations, 20+ trains, 500+ routes) |
| `server/src/controllers/BookingController.ts` | ADD Razorpay order creation + verification |
| `server/src/controllers/TrainController.ts` | ADD station autocomplete endpoint |
| `server/src/controllers/AdminController.ts` | ADD CRUD train/schedule management |
| `server/src/middleware/index.ts` | ADD helmet, rate-limit |
| `server/src/index.ts` | ADD security headers, CORS config |
| `client/src/App.tsx` | MAJOR: autocomplete, filters, payment UI, QR |
| `client/src/index.css` | ADD responsive breakpoints, new components |
| `client/src/api/index.ts` | ADD Razorpay methods, autocomplete endpoint |
| `docs/*` | NEW documents per Phase 16 |

---

## 10. Compatibility and Migration Risks

| Risk | Mitigation |
|:---|:---|
| Schema changes break existing seed data | Run `npm run db:seed` after schema update |
| Razorpay SDK requires npm install | Graceful fallback to SIM mode if not configured |
| Expanded seed data slows startup | Seed is run once manually, not on every start |
| 50-station list breaks `<select>` UX | Replaced by autocomplete in upgrade |

---

## 11. Upgrade Verification & Resolution (v3.0 Final Release)

**Upgrade Completion Date:** 2026-11-07  
**Team:** Team 11 | CSE 2271 | Presidency University, Bengaluru  
**Overall Status:** ✅ ALL UPGRADES SUCCESSFULLY DELIVERED & VERIFIED  

| Upgrade Goal | Status | Implementation Details |
|:---|:---|:---|
| **Inventory Leakage Repair** | ✅ Complete | Refactored `failBooking()` and `expireHeldBookings()` to reverse seat decrement and WL count atomic adjustments. Prevents permanent capacity loss. |
| **Idempotency & Concurrent Locks** | ✅ Complete | `BEGIN IMMEDIATE` SQLite write locks; idempotency keys enforced on `POST /api/bookings` preventing duplicate reservations under network retries. |
| **Passenger Auth Architecture** | ✅ Complete | Migration `001_passenger_accounts.sql` with `passenger_users`, `saved_passengers`, `notifications`, `booking_ownership`. JWT tokens with bcrypt salt rounds = 12. |
| **Login-First Routing Gateway** | ✅ Complete | Unauthenticated visitors at `/` automatically route to `/login`. Route guards `ProtectedRoute` protect `/app/*` and `PublicAuthRoute` redirects authenticated users to `/app`. |
| **Personalized Account Suite** | ✅ Complete | Dedicated responsive UI pages: `LoginPage`, `RegisterPage`, `ForgotPasswordPage`, `ResetPasswordPage`, `PassengerDashboardPage`, `MyBookingsPage`. Unread notification counters, 1-click seeded credential button. |
| **Three-Category Journey Planner** | ✅ Complete | Reference Image 2 compliant dashboard with 3 illustrated category cards: **Reserved** (`/app/reserved`), **Unreserved (UTS)** (`/app/unreserved`), and **Platform Pass** (`/app/platform`) with custom SVG coach artwork. |
| **UTS Unreserved Ticket Engine** | ✅ Complete | Distance-based fare calculation (`ORDINARY`, `MAIL_EXPRESS`, `SUPERFAST`), 1–6 passengers, 24h validity, high-contrast digital UTS ticket with Base64 QR code. |
| **Platform Entry Pass Engine** | ✅ Complete | Fixed rate ₹10/pass, 2-hour validity window, 1–10 visitors, instant booking with digital security QR code. |
| **Consolidated Booking Ledger** | ✅ Complete | Unified `/app/bookings` ledger with filtering tabs for All, Reserved (PNR), UTS Unreserved, and Platform Passes. Includes cancellation preview & execution modal. |
| **Payment Gateway Modernization** | ✅ Complete | Hybrid architecture: `PaymentService.ts` integrates official Razorpay SDK for sandbox payments when env keys are present, falling back to an explicitly labelled demo simulator. Webhook verification via HMAC SHA-256. |
| **Dataset & Route Expansion** | ✅ Complete | Expanded from 8 fictional stations to 55 demonstration stations covering 8 regions and 42 multi-stop demonstration train services (121 class fare records, 1,470 schedules across 35 days). |
| **E-Ticket QR Verification** | ✅ Complete | Server-side QR code generator using `qrcode` library encodes cryptographic verification payload in Base64 Data URL, rendered dynamically on e-ticket display and print layouts. |
| **Admin Portal Fixes** | ✅ Complete | Fixed route resolution query in `BookingRepository.findAllBookings` joining stations and train routes. Real-time statistics, inventory adjustments, and audit log inspection. |
| **Automated Testing Suite** | ✅ Complete | Expanded test suite from 27 to **71 comprehensive integration tests** covering concurrency, auth, bookings, cancellations, payments, QR generation, password resets, UTS fare/booking, platform passes, hold expiry, HMAC signature verification, webhooks, and inventory restoration. **100% test pass rate.** |
| **TypeScript Build Integrity** | ✅ Complete | Strict mode enabled. Client build (`tsc -b && vite build`) and Server build (`tsc`) achieve **0 errors**. |

---

## 12. Elite Payment Experience Master Upgrade (v3.1)

**Upgrade Completion Date:** 2026-11-08  
**Scope:** Two-Column Desktop Checkout, Razorpay Sandbox + Academic Demo Dual-Mode, Inventory Hold Expiry Protection, Cryptographic HMAC-SHA256 Signature Verification, Raw-Body Webhooks, and Dedicated Result Screens.

| Feature Area | Implementation Detail | Status |
|:---|:---|:---|
| **Two-Column Checkout UI** | 60% Left column with 4 interactive payment methods (UPI, Card, Net Banking, Wallets) and Primary CTA; 40% Right sticky sidebar with Monospace PNR pill, itinerary, passenger roster, countdown timer, and itemized fare breakdown. | ✅ Verified |
| **Dual Gateway Architecture** | Mode A (Academic Demo): Realistic test simulation with instant verification; Mode B (Razorpay Sandbox): Real SDK checkout popup (`checkout.razorpay.com/v1/checkout.js`), server-side order generation, and HMAC-SHA256 signature verification. | ✅ Verified |
| **Seat Hold Countdown** | Server-authoritative 10-minute hold window. Expired holds trigger 410 Gone on payment/order initiation, re-decrementing inventory and marking booking as `HOLD_EXPIRED`. | ✅ Verified |
| **Cryptographic Webhook Ingestion** | Express configured with `verify` callback preserving verbatim UTF-8 raw body bytes; verifies `x-razorpay-signature` against `RAZORPAY_WEBHOOK_SECRET` before processing `payment.captured` or `payment.failed`. | ✅ Verified |
| **Dedicated Result States** | 5 distinct full-page outcome screens: `Payment Success` (verified badge, transaction reference, PNR, print ticket CTA), `Payment Failed` (retry CTA, inventory release confirmation), `Hold Expired` (capacity release explanation), `Payment Cancelled` (safe resume CTA), and `Payment Processing` (security spinner). | ✅ Verified |
| **Academic Evaluator Panel** | CSE 2271 simulation accordion allowing course evaluators to test instant success, simulated bank decline, or checkout abandonment with a single click. | ✅ Verified |

