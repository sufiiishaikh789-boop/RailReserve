# SLIDE 3: PROBLEM STATEMENT

## 1. THE PROBLEM CONTEXT
Modern railway ticketing is one of the most demanding transaction-processing domains globally. Systems must service hundreds of thousands of concurrent requests during peak booking periods while guaranteeing absolute data consistency, zero seat over-allocation, and verifiable financial integrity.

---

## 2. CORE SYSTEMIC CHALLENGES & ARCHITECTURAL FLAWS

```
+----------------------------------------------------------------------------------+
|                            LEGACY SYSTEM PAIN POINTS                             |
+--------------------------+-----------------------------------+-------------------+
|  1. CLUTTERED UX & NAV   |  2. CONCURRENCY RACE CONDITIONS   | 3. PAYMENT ERRORS |
|  - Overwhelming form     |  - High-traffic seat collision    | - Ghost bookings  |
|  - No clear journey split|  - "Tatkal" overselling           | - Locked funds    |
|  - Poor mobile readiness |  - Non-atomic database updates    | - Opaque status   |
+--------------------------+-----------------------------------+-------------------+
```

### Problem 1: Unstructured Passenger Experience & Cognitive Overload
- Legacy portals force passengers directly into complex search matrices without first authenticating or determining travel intent (e.g., distinguishing between long-distance reserved berths vs. unreserved local commuters vs. platform visitors).
- High cognitive friction leads to user frustration, misrouted bookings, and lost sessions.

### Problem 2: Concurrency Race Conditions & Double-Allocation
- Under peak load (e.g., holiday rushes, morning Tatkal slots), multiple clients query the same remaining inventory simultaneously.
- Standard read-then-write logic without strict transaction isolation results in **phantom bookings**, where the same coach berth is issued to multiple distinct passengers.

### Problem 3: Fragmented Checkout Lifecycle & Inventory Desynchronization
- Payment failures or gateway drops often leave inventory in an indeterminate state ("zombie holds") where seats are neither booked nor released back into the available pool.
- Lack of idempotency enforcement causes duplicate charges if passengers re-submit or refresh stalled browsers.

### Problem 4: Manual & Inefficient Waiting List / Refund Reconciliations
- When a confirmed passenger cancels a booking, legacy systems frequently delay reallocating released seats to waiting-list passengers, resulting in underutilized coach capacity and delayed customer refunds.

---

## 3. PROJECT OBJECTIVE STATEMENT
> *"To architect, implement, and rigorously test a full-stack Railway Reservation System (**RailReserve**) that eliminates seat double-allocation through ACID transaction locks, provides an intuitive 3-category Journey Planner dashboard, guarantees idempotent financial transactions, and automates real-time FIFO waitlist promotion upon cancellation."*
