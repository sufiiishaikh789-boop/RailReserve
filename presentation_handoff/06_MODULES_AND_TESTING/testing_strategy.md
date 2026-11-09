# TESTING STRATEGY & QUALITY ASSURANCE METHODOLOGY

## 1. QUALITY ASSURANCE PHILOSOPHY
Software quality for **RailReserve** is established through a multi-tiered verification hierarchy designed to guarantee zero regressions, concurrency safety, and transaction consistency.

```
+---------------------------------------------------------------------------------------------------------+
|                                    TESTING PYRAMID & QA METHODOLOGY                                     |
+---------------------------------------------------------------------------------------------------------+
|                                  [TIER 3: END-TO-END SYSTEM TESTS]                                      |
|                             - Multi-Step Passenger Booking & Checkout Flows                             |
|                             - Headless Chrome UI Validation & Screenshot Audit                          |
|                                                  ▲                                                      |
|                                                  │                                                      |
|                             [TIER 2: INTEGRATION & API TESTS (SUPERTEST)]                               |
|                             - REST API Contracts, JWT Bearer Token Header Checks                        |
|                             - Concurrency Locking & Race-Condition Simulation                           |
|                             - Cancellation Penalty & Automatic FIFO Waitlist Promotion                  |
|                                                  ▲                                                      |
|                                                  │                                                      |
|                             [TIER 1: UNIT & TRANSACTION TESTS (VITEST)]                                 |
|                             - BCrypt Password Hashing & Salt Verification                               |
|                             - Dynamic Distance & 5% GST Tariff Mathematics                              |
|                             - PNR Formatting & Idempotency Key Validation                               |
+---------------------------------------------------------------------------------------------------------+
```

---

## 2. TEST TYPES & SCOPE OF COVERAGE

### A. Unit Testing (Vitest)
- **Scope:** Pure functional algorithms and standalone calculation modules.
- **Coverage Areas:**
  - Fare computation formulas across all 5 classes (`1A`, `2A`, `3A`, `SL`, `2S`).
  - Base fare calculations, dynamic distance bands, superfast surcharges, and 5% GST rounding.
  - Password complexity validation rules (alphanumeric, length >= 8, special characters).
  - Cryptographically secure PNR generation format (`PNR-XXXXXX`).

### B. Integration Testing (Supertest + In-Memory SQLite)
- **Scope:** HTTP REST request-response cycles, database transactions, and middleware chains.
- **Coverage Areas:**
  - `/api/auth/register`, `/api/auth/login`, and `/api/auth/me` with valid/invalid JWTs.
  - Station autocomplete debounced query filtering and error handling.
  - Booking creation with `idempotency_key` headers preventing duplicate records.
  - Payment simulation state machine transitions (`PENDING` -> `SUCCESS` -> `CONFIRMED`).

### C. Concurrency & Race Condition Verification
- **Scope:** Verifying the zero double-allocation guarantee under simultaneous booking requests for the final seat.
- **Methodology:** Asynchronous Promise.all execution of 10 concurrent requests targeting the same train and class with only 1 remaining seat.
- **Pass Criteria:** Exactly 1 request acquires `CONFIRMED` status; remaining 9 requests are assigned sequential `WAITING_LIST` ranks or rejected; total seat count never drops below zero.

### D. Time-Tiered Cancellation & FIFO Waitlist Promotion
- **Scope:** Verifying automated reallocation of released seats upon cancellation.
- **Methodology:** Booking seat 1 to Passenger A (CNF) and seat 2 to Passenger B (WL 1). Cancelling Passenger A's booking.
- **Pass Criteria:** Passenger A's booking updates to `CANCELLED` with correct refund calculation; Passenger B automatically promotes to `CONFIRMED` with coach and berth assigned; WL count decrements; audit event created.

