# SLIDE 2: INTRODUCTION & PROJECT BACKGROUND

## 1. EXECUTIVE SUMMARY
**RailReserve** is an industrial-grade, full-stack web application designed to overcome the critical architectural, usability, and concurrency flaws prevalent in legacy national railway reservation platforms. Developed for the **CSE2271 Software Design and Development** curriculum at **Presidency University**, the system demonstrates modern software engineering principles including ACID transaction isolation, idempotent financial checkouts, tokenized role-based access control (RBAC), and responsive component-driven interface design.

---

## 2. INDUSTRY CONTEXT & BACKGROUND
Modern railway networks cater to millions of passengers daily. However, existing public reservation infrastructures typically suffer from:
1. **Severe UX Friction & Clutter:** Overcrowded booking portals forcing users into dense train-search grids before establishing identity or intent.
2. **Concurrency Race Conditions:** The "Tatkal / High-Demand Phenomenon" where simultaneous checkout attempts for the same seat cause double-allocations or phantom booking states.
3. **Opaque Financial Failures:** High drop-off rates during payment gateway roundtrips due to absent inventory hold timers and non-idempotent re-tries.
4. **Rigid Waitlist & Cancellation Workflows:** Manual reconciliation of waitlisted passengers when higher-priority bookings cancel.

---

## 3. PROPOSED SOLUTION & ARCHITECTURAL HIGHLIGHTS
RailReserve re-engineers the passenger experience from the ground up:
- **Passenger-First Authentication:** Secure gateway verifying identity via JWT and bcrypt password hashing prior to booking workflows.
- **Three-Category Journey Planner:** A dedicated, illustrated dashboard categorizing rail transit into:
  - **Reserved Travel:** Full sleeper, 3AC, 2AC, and 1AC long-distance reservations with coach and seat number allocations.
  - **Unreserved Express:** Quick paperless day-pass booking with zero seat reservation overhead.
  - **Platform Pass:** Station entry permits with automated timestamp expiration.
- **ACID-Compliant Concurrency Engine:** Strict SQLite Write-Ahead Logging (WAL) and atomic transactions preventing double-booking under concurrent load.
- **Idempotent Payment Simulation:** Enterprise checkout with a 10-minute inventory lock countdown, UPI/Card simulation, and automated rollback upon failure.
- **Automated FIFO Waitlist Promotion:** Immediate promotion of Waitlist (WL) passengers to Confirmed (CNF) status upon ticket cancellation with automated audit logging.

---

## 4. KEY METRICS & PROJECT HIGHLIGHTS
- **Architecture:** 3-Tier Layered Client-Server Architecture (React 18 + Node.js Express + SQLite3).
- **Code Quality:** 100% TypeScript typed across both client and server codebases.
- **Test Coverage:** **72 automated test suites** passing with 0 failures across authentication, scheduling, bookings, payments, and admin audits.
- **Performance:** Sub-100ms API response latency for search and availability checks.
