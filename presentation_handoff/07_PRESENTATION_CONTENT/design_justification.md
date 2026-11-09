# ARCHITECTURAL DESIGN JUSTIFICATION & VIVA DEFENSE GUIDE
## PRESIDENCY UNIVERSITY | CSE2271 MINI PROJECT REVIEW
### TEAM 11 — RAILRESERVE: RAILWAY RESERVATION SYSTEM

---

## 1. CRITICAL ARCHITECTURAL DECISIONS & DEFENSE RATIONALE

### Decision 1: Why SQLite instead of MongoDB or PostgreSQL?
- **Evaluator Question:** *"Why did you use SQLite for a system that requires high concurrency instead of PostgreSQL or MongoDB?"*
- **Defense Answer:**
  > *"For an academic prototype evaluated in a live demonstration environment, SQLite configured with **Write-Ahead Logging (WAL mode)** provides significant architectural advantages:
  > 1. It operates embedded in-process, eliminating external network roundtrips and achieving sub-millisecond query latencies.
  > 2. With WAL mode (`PRAGMA journal_mode = WAL`), readers do not block writers and writers do not block readers. Reads execute concurrently across multiple worker threads.
  > 3. Write transactions acquire exclusive immediate locks (`BEGIN IMMEDIATE`), providing strict Serializable transaction isolation. This mathematically guarantees zero double-allocation under race conditions.
  > 4. For cloud production scale, our service layer is strictly separated via repository patterns, enabling migration to PostgreSQL or CockroachDB with minimal refactoring."*

### Decision 2: How do you prevent the "Tatkal" race condition / seat overbooking?
- **Evaluator Question:** *"Explain exactly how your code prevents two concurrent requests from booking the same final seat."*
- **Defense Answer:**
  > *"We avoid the classic 'read-then-write' anti-pattern. Instead, our booking logic is wrapped in an atomic SQLite transaction initialized with `BEGIN IMMEDIATE`. 
  > This immediately claims an exclusive write lock on the database before reading the remaining seat count. If 8 concurrent threads attempt to book the final seat:
  > - The first thread acquires the lock, verifies `available_seats > 0`, decrements the count to 0, assigns the coach/seat, and commits.
  > - Subsequent threads waiting on the queue read `available_seats == 0` once the first commit completes, automatically routing those passengers to Waiting List (WL) or rejecting the transaction.
  > This was empirically verified in our automated test suite (`TC-11: Concurrent Booking Overbooking Prevention`), where 8 simultaneous `Promise.all` requests resulted in exactly 1 confirmed booking."*

### Decision 3: Why a 3-Tier Layered Architecture?
- **Evaluator Question:** *"Why did you choose a 3-tier architecture over microservices?"*
- **Defense Answer:**
  > *"A 3-tier layered client-server architecture provides optimal cohesion, clear separation of concerns, and low operational overhead for the scope of this project. Microservices introduce distributed transaction challenges (e.g., 2-phase commit or Sagas across services), network latency overhead, and deployment complexity that would detract from the core engineering challenge: transactional integrity and user experience. Our modular design separates Auth, Train, Booking, and Payment controllers into distinct services that can be decomposed into microservices in future phases if required."*

### Decision 4: Why use Idempotency Keys during checkout?
- **Evaluator Question:** *"What happens if a user clicks 'Pay' twice or refreshes their browser during payment processing?"*
- **Defense Answer:**
  > *"Every checkout session generates a cryptographically unique `idempotency_key`. The backend maintains a ledger of processed idempotency keys. If a second request arrives bearing the same key, the backend returns the cached confirmation response rather than executing a second debit or double-allocating inventory. Furthermore, our 10-minute hold countdown timer automatically releases reserved seats back to the inventory pool if payment is not finalized within 600 seconds."*

### Decision 5: How does the Waiting List (WL) auto-promotion work?
- **Evaluator Question:** *"What is the algorithm for waitlist promotion upon ticket cancellation?"*
- **Defense Answer:**
  > *"When a confirmed booking is cancelled, our system executes an atomic reallocation:
  > 1. It updates the cancelled booking status to `CANCELLED` and calculates the time-tiered refund.
  > 2. It queries the `bookings` table for the earliest booking in `WAITING_LIST` status for that train, journey date, and class using `ORDER BY booking_date ASC` (FIFO queue discipline).
  > 3. If a waitlisted passenger exists, the system immediately promotes their status to `CONFIRMED`, assigns the released coach and berth number, decrements the active waiting list count, and appends an immutable audit event to `audit_logs`."*

---

## 2. SUMMARY OF COURSE CONCEPT MAPPINGS (CSE2271)

| CSE2271 Curriculum Topic | Implementation in RailReserve | Verification Evidence |
|---|---|---|
| **Software Requirements Engineering (SRS)** | IEEE 830 compliant SRS with MoSCoW prioritization | `02_REQUIREMENTS_AND_SRS/full_SRS.md` |
| **Object-Oriented Analysis & UML** | StarUML models, Use Case diagrams, Activity Swimlanes | `04_UML_AND_DATABASE/use_case_diagram.mdj` |
| **Database Design & Normalization** | 11 relational tables normalized to 3NF | `04_UML_AND_DATABASE/ER_diagram.svg` |
| **Software Architecture Patterns** | 3-Tier Layered Client-Server Pattern | `03_ARCHITECTURE_AND_SDLC/architecture_diagram.svg` |
| **Software Quality & Testing** | Unit, Integration, and Concurrency Testing | `06_MODULES_AND_TESTING/actual_test_results.md` (72 tests) |

