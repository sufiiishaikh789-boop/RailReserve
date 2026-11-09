# SOFTWARE REQUIREMENTS SPECIFICATION (IEEE 830 COMPLIANT)
## RAILRESERVE — MODERN RAILWAY RESERVATION SYSTEM

**Document Reference:** SRS-CSE2271-T11-2026-V1.0  
**Course:** CSE2271 — Software Design and Development  
**Academic Component:** CA-3 Mini Project  
**Team Number:** 11  
**Institution:** Presidency University, Bengaluru  
**Status:** Approved for Presentation & Demonstration  

---

## 1. INTRODUCTION

### 1.1 Purpose
This Software Requirements Specification (SRS) establishes the complete functional and non-functional requirements for the **RailReserve** application. It specifies the behavioral, interface, transactional, and quality constraints for academic evaluation in the School of Computer Science and Engineering at Presidency University.

### 1.2 Document Conventions
- Requirements are tagged using distinct identifiers: `FR-XX` for Functional Requirements and `NFR-XX` for Non-Functional Requirements.
- Priority levels follow the MoSCoW convention (Must Have, Should Have, Could Have).

### 1.3 Intended Audience
- Course Faculty & Project Evaluators (CSE2271 Review Panel).
- Development & QA Engineering Team (Team 11).
- Autonomous AI Presentation Agents (Claude PPT Builder).

### 1.4 Product Scope
RailReserve is an enterprise-grade full-stack web application delivering:
- A secure login-first passenger portal with BCrypt and JWT security.
- An interactive Journey Planner with three distinct transit categories (Reserved, Unreserved, Platform).
- Real-time train timetable search and multi-class availability discovery.
- Concurrency-safe seat allocation under ACID SQLite transaction isolation.
- An idempotent payment checkout system with live countdown hold timers.
- Automated FIFO waitlist promotion upon ticket cancellation.
- Administrative auditing and analytics dashboard.

---

## 2. OVERALL DESCRIPTION

### 2.1 Product Perspective
RailReserve operates as an independent, self-contained 3-tier client-server system. It integrates a React 18 Single Page Application front-end with an Express.js / Node.js application server and an embedded ACID-compliant SQLite 3 persistence tier in Write-Ahead Logging (WAL) mode.

```
[React 18 SPA] <--- REST/JSON (JWT) ---> [Express Application Tier] <--- SQL/WAL ---> [SQLite Database]
```

### 2.2 User Classes & Characteristics
1. **Unauthenticated Passenger:** Can view authentication screens, look up public PNR status, and review the academic demonstration disclaimer.
2. **Authenticated Passenger:** Can plan journeys across all 3 categories, search trains, lock seats, complete simulated checkout, download scannable QR e-tickets, cancel bookings, and monitor refunds.
3. **System Administrator:** High-privilege operator capable of viewing real-time platform KPIs, managing train schedules, inspecting passenger manifests, and reviewing immutable system audit logs.

### 2.3 Operating Environment
- **Server Platform:** Node.js v22.9.0+ running on Windows / Linux / macOS.
- **Client Browsers:** Google Chrome 110+, Mozilla Firefox 110+, Apple Safari 16+, Microsoft Edge 110+.
- **Database Storage:** Embedded SQLite 3.45+ engine using persistent WAL mode (`railway.db`).

---

## 3. SPECIFIC FUNCTIONAL REQUIREMENTS (FR-01 to FR-10)

### FR-01: Passenger Authentication & Session Management
- **MANDATORY (Must Have)**
- The system shall securely register and authenticate passengers using email or mobile number with passwords encrypted using bcrypt with 10 salt rounds.
- Upon successful authentication, the system shall return an HTTP Bearer JWT token signed with HMAC-SHA256 valid for 24 hours.

### FR-02: Debounced Station Autocomplete & Route Traversal
- **MANDATORY (Must Have)**
- The search input shall debounce user keystrokes (180ms) and execute prefix searches over both 3-to-4 letter station codes (e.g., SBC, MAS, NDLS, HWH) and city names, resolving in <50ms.

### FR-03: Multi-Class Train Search & Seat Inventory Inquiry
- **MANDATORY (Must Have)**
- The system shall query schedules between origin and destination stations, returning available trains, timings, duration, distance, and real-time seat availability across five distinct classes (`1A`, `2A`, `3A`, `SL`, `2S`).

### FR-04: 3-Category Journey Planner
- **MANDATORY (Must Have)**
- The system shall provide a visual dashboard routing passengers to:
  1. *Reserved Travel:* Advance booking with coach and berth allocation.
  2. *Unreserved Express:* Instant commuter passes without seat reservations.
  3. *Platform Pass:* Single-entry station access with timestamp validity.

### FR-05: Dynamic Transparent Fare Calculation
- **MANDATORY (Must Have)**
- The system shall dynamically compute total payable fare factoring base distance fare, class multiplier, reservation surcharge, superfast surcharge, and statutory 5% GST.

### FR-06: Atomic Seat Allocation & Double-Booking Guard
- **MANDATORY (Must Have)**
- Booking attempts shall execute within an atomic SQLite transaction (`BEGIN IMMEDIATE`). If the available seat count is greater than zero, the system shall decrement the count, assign coach and berth numbers, and generate a globally unique 10-digit PNR. Under concurrent attempts for the final seat, only one transaction shall commit; the second shall gracefully fail or offer Waiting List.

### FR-07: Idempotent Payment Simulation & Hold Countdown Timer
- **MANDATORY (Must Have)**
- During checkout, the system shall establish a 10-minute inventory hold with a live browser countdown timer. Re-submission or network retries bearing the same `idempotency_key` shall return the cached transaction rather than executing duplicate debits.

### FR-08: Digital E-Ticket & Scannable QR Boarding Pass
- **MANDATORY (Must Have)**
- Upon successful checkout, the system shall generate an e-ticket featuring passenger details, journey timings, fare breakdown, and a scannable 2D QR matrix encoding verification metadata.

### FR-09: Automated FIFO Waiting List Promotion on Cancellation
- **MANDATORY (Must Have)**
- Cancellation of confirmed tickets shall calculate time-tiered refunds (>48h = 75%, 12–48h = 50%, <12h = 0%).
- The released berth shall automatically promote the first passenger in the Waiting List queue (FIFO order) to `CONFIRMED` status, automatically renumbering remaining positions and appending an audit record.

### FR-10: Administrative Auditing & Platform Oversight
- **MANDATORY (Must Have)**
- The administrator dashboard shall display real-time metrics for total revenue, confirmed bookings, waitlist depth, and cancellations, with an immutable audit log detailing every state mutation.

---

## 4. NON-FUNCTIONAL REQUIREMENTS (NFR-01 to NFR-07)

- **NFR-01 (Performance):** 95% of train search queries must respond in under 150 milliseconds.
- **NFR-02 (ACID Concurrency):** Database operations must achieve Serializable/Immediate transaction isolation preventing dirty reads and lost updates.
- **NFR-03 (Security):** All passwords stored as bcrypt hashes; JWT secrets stored in environment configuration; SQL injection prevented via parameterized statements; Helmet security headers active.
- **NFR-04 (Reliability):** Failed checkout operations must automatically release held inventory without manual intervention.
- **NFR-05 (Usability):** Responsive layouts supporting viewport widths from 375px (mobile) to 1920px (desktop), adhering to WCAG 2.1 AA contrast standards.
- **NFR-06 (Maintainability):** Fully typed TypeScript on client and server with zero compiler errors.
- **NFR-07 (Quality Assurance):** 100% passing automated test suite (72/72 test suites) covering core unit, integration, and concurrency scenarios.

