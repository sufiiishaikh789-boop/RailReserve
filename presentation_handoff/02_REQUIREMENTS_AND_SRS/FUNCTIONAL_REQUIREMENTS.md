# SLIDE 8: FUNCTIONAL REQUIREMENTS SPECIFICATION

The functional requirements define the explicit behavioral capabilities implemented in the **RailReserve** application, categorized across the end-to-end railway passenger lifecycle:

```
+----------------------------------------------------------------------------------------------------+
|                                FUNCTIONAL REQUIREMENTS MATRIX (FR-01 to FR-10)                     |
+-------+--------------------------+-----------------------------------------------------------------+
| ID    | Requirement Name         | Operational Description & Behavioral Specification              |
+-------+--------------------------+-----------------------------------------------------------------+
| FR-01 | Passenger Authentication | Secure registration, login, logout, and password recovery via   |
|       | & Authorization          | bcrypt password hashing and 24-hour signed JWT tokens.          |
+-------+--------------------------+-----------------------------------------------------------------+
| FR-02 | Station Autocomplete     | Fast prefix-search matching station codes (SBC, MAS, NDLS) and  |
|       | & Route Discovery        | city names with debounced REST queries (<50ms response).        |
+-------+--------------------------+-----------------------------------------------------------------+
| FR-03 | Multi-Class Train Search | Filtering trains by source, destination, date, class (1A, 2A,   |
|       | & Availability Check     | 3A, SL, 2S), and quota with real-time seat counts.              |
+-------+--------------------------+-----------------------------------------------------------------+
| FR-04 | 3-Category Journey       | Dedicated segmented workflows: Reserved Long-Distance,          |
|       | Planner Dashboard        | Unreserved Commuter Pass, and Station Platform Pass.            |
+-------+--------------------------+-----------------------------------------------------------------+
| FR-05 | Transparent Fare Engine  | Dynamic fare computation factoring base fare, class multiplier, |
|       | & Tax Breakdown          | reservation charge, superfast fee, and 5% GST breakdown.        |
+-------+--------------------------+-----------------------------------------------------------------+
| FR-06 | Atomic Seat Allocation   | Concurrency-safe reservation using SQLite `BEGIN IMMEDIATE`     |
|       | & Double-Booking Guard   | transactions, preventing over-allocation under race conditions. |
+-------+--------------------------+-----------------------------------------------------------------+
| FR-07 | Idempotent Payment       | 10-minute inventory hold countdown timer with simulated UPI and |
|       | Checkout Lifecycle       | Card gateways, idempotency keys, and auto-release on abort.     |
+-------+--------------------------+-----------------------------------------------------------------+
| FR-08 | Digital E-Ticket &       | Issuance of confirmed boarding passes with globally unique PNR  |
|       | Cryptographic QR Pass    | (10 digits), coach/berth details, and scannable QR verification.|
+-------+--------------------------+-----------------------------------------------------------------+
| FR-09 | Automated FIFO Waitlist  | Queue-based FIFO waiting list tracking with automatic promotion |
|       | Reallocation on Cancel   | of next-in-line WL passenger to CNF upon ticket cancellation.   |
+-------+--------------------------+-----------------------------------------------------------------+
| FR-10 | Administrative Auditing  | Protected admin portal to monitor live inventory, manage train  |
|       | & Revenue Oversight      | schedules, view bookings, and inspect immutable audit logs.     |
+-------+--------------------------+-----------------------------------------------------------------+
```

---

## DETAILED SPECIFICATIONS

### FR-01: Passenger Authentication & Access Control
- **Input:** User email, mobile number, full name, plaintext password.
- **Processing:** Validates password complexity (minimum 8 characters, alphanumeric + special symbol). Salting and hashing via `bcrypt` (work factor 10). Issues signed HS256 JWT token with 24-hour expiration.
- **Output:** Authorized session object containing passenger profile and bearer token.

### FR-03: Real-Time Seat Availability
- **Input:** Source station code, destination station code, date of travel (YYYY-MM-DD), class code.
- **Processing:** Checks `train_schedules` and `seat_inventory` tables. Computes remaining confirmed capacity (`available_seats = total_capacity - booked_seats`). If zero, checks waiting list capacity.
- **Output:** Categorized status: `AVAILABLE [Count]`, `WL [Queue Position]`, or `REGRET` (Fully booked).

### FR-06: Atomic Seat Allocation & Concurrency Guard
- **Constraint:** Multiple simultaneous requests for the final seat on Train #12658 must never succeed for more than one passenger.
- **Implementation:** Executes inside an atomic SQLite transaction with `BEGIN IMMEDIATE`. The seat counter is decremented and berth assigned in the exact same database commit.
- **Rollback:** If any constraint fails, the entire transaction rolls back, throwing HTTP 409 Conflict.

### FR-09: Automated Waiting List Promotion Engine
- **Trigger:** Cancellation of an existing `CONFIRMED` booking.
- **Logic:**
  1. Computes cancellation refund based on departure time window (>48h = 75% refund, 12–48h = 50%, <12h = 0%).
  2. Sets cancelled booking status to `CANCELLED`.
  3. Queries waiting list for that train and class in ascending order of `booking_date` (FIFO).
  4. If a waiting list passenger exists: promotes first WL passenger to `CONFIRMED`, allocates released coach and berth, decrements WL count, and logs an audit trail event.
