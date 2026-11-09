# SOFTWARE REQUIREMENTS SPECIFICATION (SRS) SUMMARY
**Course:** CSE2271 — Software Design and Development  
**Academic Component:** CA-3 Presentation Package  
**System:** RailReserve — Modern Railway Reservation System  
**Standard:** Aligned with IEEE Std 830-1998 (Recommended Practice for Software Requirements Specifications)

---

## 1. PURPOSE & SCOPE
The purpose of this document is to specify the complete functional, behavioral, and architectural requirements for **RailReserve**, an end-to-end railway reservation and ticketing web platform developed for academic evaluation under CSE2271 at Presidency University.

RailReserve encompasses:
- Passenger identity management, credential encryption, and role-based access control.
- An interactive Journey Planner offering Reserved, Unreserved, and Platform booking pipelines.
- An atomic inventory reservation engine guaranteeing zero double-allocations.
- An idempotent payment checkout system with live countdown reservation holds.
- Digital e-ticket issuance featuring high-density QR verification codes.
- An automated FIFO waitlist promotion and time-tiered refund calculation engine.
- An administrative oversight suite for schedule monitoring and immutable audit trails.

---

## 2. USER CLASSES & OPERATIONAL PROFILES

```
+----------------------------------------------------------------------------------------------------+
|                                    USER CLASSES & ACCESS PRIVILEGES                                |
+------------------------+-------------------------------------+-------------------------------------+
| Role Class             | Authentication Mechanism            | Permitted System Operations         |
+------------------------+-------------------------------------+-------------------------------------+
| **Guest Passenger**    | Unauthenticated (Public)            | View login/register, lookup PNR,    |
|                        |                                     | view academic project disclaimer.   |
+------------------------+-------------------------------------+-------------------------------------+
| **Registered User**    | Signed JWT (HS256) via Email/Phone  | Access Journey Planner dashboard,   |
|                        | and BCrypt Password Verification    | book tickets, cancel reservations,  |
|                        |                                     | track refunds, download e-tickets.  |
+------------------------+-------------------------------------+-------------------------------------+
| **System Admin**       | Administrator JWT via Scoped        | View global booking statistics,     |
|                        | Administrative Credentials          | inspect system audit log entries,   |
|                        |                                     | manage train inventory & schedules. |
+------------------------+-------------------------------------+-------------------------------------+
```

---

## 3. REQUIREMENTS TRACEABILITY MATRIX (RTM)

| Requirement ID | Module Mapping | Course Outcome (CO) | Verification Method |
|---|---|---|---|
| **FR-01** (Auth & Session) | Module 1 (Auth & Profile) | CO-1, CO-3 | Automated Supertest JWT validation |
| **FR-02** (Autocomplete) | Module 2 (Discovery) | CO-2 | Debounced REST benchmark (<50ms) |
| **FR-03** (Multi-Class Search) | Module 2 (Discovery) | CO-2 | Integration query tests across 5 classes |
| **FR-04** (3-Category Dashboard) | Module 2 (Journey Planner) | CO-1, CO-4 | React component UI inspection |
| **FR-05** (Fare Calculation) | Module 3 (Reservation) | CO-2 | Unit test verifying GST & base fare logic |
| **FR-06** (Atomic Concurrency) | Module 3 (Reservation) | CO-3, CO-4 | Concurrency race-condition test suite |
| **FR-07** (Payment Hold) | Module 4 (Checkout) | CO-3 | 10-minute timeout & rollback test |
| **FR-08** (QR Digital E-Ticket) | Module 5 (Ticket & Admin) | CO-2 | QR matrix generation & PNR lookup test |
| **FR-09** (FIFO Waitlist Promotion) | Module 3 (Reservation) | CO-3, CO-4 | Cancellation promotion test suite |
| **FR-10** (Admin Auditing) | Module 5 (Ticket & Admin) | CO-3 | Audit trail event inspection test |
