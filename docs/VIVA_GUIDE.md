# Viva Guide — Railway Reservation System (Team 11)
**Course:** CSE 2271 — Software Design and Development  
**Institution:** Presidency University, Bengaluru

> Prepare these questions and answers thoroughly. Expect the faculty to ask you to:  
> (a) explain a specific code file, (b) draw a diagram on the whiteboard, (c) run a feature and explain it.

---

## MODULE 1: Requirements Engineering

**Q: What is the difference between functional and non-functional requirements?**  
> Functional requirements describe **what the system does** — e.g., FR-09: "A passenger shall be able to create a booking by selecting train, class, and providing passenger details." Non-functional requirements describe **how well** it does it — e.g., NFR-01: Zero overbooking (concurrency invariant), NFR-02: Search response < 2 seconds. Our `docs/SRS.md` lists 20 FRs and 7 NFRs.

**Q: What is a use case? Explain one from your system.**  
> A use case describes an interaction between an actor and the system to achieve a goal. Example: **UC-02 "Book Ticket"** — Actor: Passenger. Steps: Select train → Select class → Enter passengers → Make payment → Receive e-ticket. Extensions: class full → WL assigned; payment fails → booking cancelled.

**Q: What is the purpose of a Software Requirements Specification (SRS)?**  
> The SRS is the contract between stakeholders and developers. It must be complete, consistent, verifiable, and unambiguous. Our SRS uses MoSCoW prioritisation (Must/Should/Could/Won't) for each requirement.

---

## MODULE 2: SDLC and Process Models

**Q: Which process model did you use and why?**  
> We used an **Iterative Agile model** (similar to Scrum), divided into 4 sprints:
> - Sprint 1: Requirements + DB schema design
> - Sprint 2: Core backend (booking, payment, cancellation)  
> - Sprint 3: Test suite + concurrency fixes  
> - Sprint 4: Frontend UI + integration + documentation  
> We chose Agile because requirements evolved (e.g., WL promotion was added in Sprint 2). See `docs/SDLC_AND_PROCESS_MODEL.md`.

**Q: What is the difference between Waterfall and Agile?**  
> Waterfall is sequential — each phase must complete before the next starts. Agile is iterative — features are developed in short cycles with customer feedback. Waterfall suits stable requirements; Agile suits evolving ones like our system.

**Q: What is a Gantt chart? Did you use one?**  
> A Gantt chart shows project tasks on a timeline with start/end dates and dependencies. Yes — see `docs/PROJECT_PLAN.md` for our 6-week Gantt chart showing the 4 sprints and milestones.

---

## MODULE 3: UML Diagrams

**Q: Explain your Use Case diagram.**  
> Our Use Case diagram (in `docs/UML_DIAGRAMS.md`) shows 2 actors:  
> - **Passenger**: Search trains, Book ticket, View e-ticket, Cancel booking  
> - **Admin**: Login, View dashboard, Update inventory  
> Relationships: `<<include>>` (Book → Payment, always happens), `<<extend>>` (Book → WL, conditional).

**Q: What is the difference between Activity and Sequence diagrams?**  
> **Activity diagram** shows the flow of control/data — parallel activities, decisions, forks. We used it to show the booking workflow.  
> **Sequence diagram** shows the time-ordered messages between objects — useful for protocol design. We used it to show the Client → API → Repository → DB interaction.

**Q: Draw the ER diagram for your booking system.**  
> Key entities: `bookings` (PNR, status, fare) — has many → `booking_passengers` (name, age, seat). `bookings` belongs to → `schedules` (train + date). `schedules` belongs to → `trains`. `seat_inventory` tracks available/WL counts per schedule per class. See `docs/UML_DIAGRAMS.md` Mermaid ER diagram.

---

## MODULE 4: System Architecture

**Q: Describe your system architecture.**  
> **4-layer architecture:**
> 1. **Presentation layer**: React/TypeScript SPA (Vite, Tailwind CSS, port 5173)  
> 2. **API layer**: Express.js REST controllers (port 5000)  
> 3. **Business/Repository layer**: TypeScript classes with all SQL logic  
> 4. **Data layer**: SQLite with WAL mode (`node:sqlite` built-in module)  
> The frontend talks to the backend via JSON over HTTP. No direct DB access from the browser.

**Q: What design patterns did you use?**  
> - **Repository Pattern**: `TrainRepository`, `BookingRepository` encapsulate all SQL  
> - **Singleton Pattern**: `getDatabase()` returns one shared DB connection  
> - **MVC Pattern**: Controllers (C) call Repositories (M) and return JSON (V=React)  
> - **Middleware Chain**: Express middleware for error handling, JWT auth, 404  

**Q: Why did you use SQLite instead of PostgreSQL/MySQL?**  
> SQLite is serverless (no separate process), zero-configuration, portable, and sufficient for a single-instance academic project. Node.js v24 has built-in `node:sqlite` (DatabaseSync), so we avoided native addon compilation. For production at scale, we would migrate to PostgreSQL using the Repository pattern (only the DB layer changes).

---

## MODULE 5: Database Design

**Q: What is normalisation? What normal form is your schema in?**  
> Normalisation eliminates data redundancy and dependency anomalies:  
> - **1NF**: Atomic values, no repeating groups ✓  
> - **2NF**: No partial dependencies on composite keys ✓  
> - **3NF**: No transitive dependencies ✓  
> Our schema is in **3NF**. Example: station data is not repeated in `bookings`; instead, `source_station_id` is a FK to the `stations` table.

**Q: How did you prevent overbooking?**  
> Using **`BEGIN IMMEDIATE` transactions** in SQLite. When a booking is created:
> ```sql
> BEGIN IMMEDIATE;    -- acquires write lock immediately
> SELECT * FROM seat_inventory ...;  -- recheck inside transaction
> INSERT INTO bookings ...;
> UPDATE seat_inventory SET available_seats = available_seats - 1;
> COMMIT;
> ```
> Any concurrent transaction attempting to write must wait for this one to commit. This is the **serialization** concurrency control technique.

**Q: What is a foreign key constraint? Where do you use it?**  
> A FK constraint enforces referential integrity — a row in the child table must reference a valid row in the parent table. Example: `bookings.schedule_id` → `schedules.id`. We enable `PRAGMA foreign_keys = ON` in SQLite to enforce this (it's off by default).

---

## MODULE 6: Testing

**Q: What testing techniques did you use?**  
> - **Equivalence Class Partitioning (ECP)**: Divided passenger age input into valid (1–120) and invalid (<1, >120) classes. TC-07.  
> - **Boundary Value Analysis (BVA)**: Tested age 0 (fail), 1 (pass), 120 (pass), 121 (fail). TC-07a–c.  
> - **State Transition Testing**: Tested booking state machine: PENDING_PAYMENT → CONFIRMED/FAILED/CANCELLED. TC-12, TC-13.  
> - **Concurrency Testing**: Sent 8 simultaneous booking requests to verify overbooking prevention. TC-11.

**Q: What is the difference between unit testing and integration testing?**  
> **Unit testing** tests a single function/class in isolation (e.g., `calculateRefund()` with mocked inputs — TC-23).  
> **Integration testing** tests multiple components working together (e.g., Supertest sends an HTTP POST to `/api/bookings`, which calls Controller → Repository → SQLite — TC-10).

**Q: What is V-model testing?**  
> The V-model maps each development phase to a corresponding test phase:
> - Requirements → Acceptance Tests  
> - Architecture → Integration Tests  
> - Module Design → Unit Tests  
> See `docs/TEST_PLAN.md` for the full V-model alignment table.

**Q: How many test cases did you write? Show one.**  
> 27 automated test cases in `server/tests/api.test.ts`. Example — TC-11 (Concurrency):
> ```typescript
> // Send 8 booking requests simultaneously
> const results = await Promise.all(
>   Array.from({ length: 8 }, (_, i) =>
>     request(app).post('/api/bookings').send({...})
>   )
> );
> // All PNRs must be unique — proves no phantom reads
> const uniquePNRs = new Set(results.map(r => r.body.pnr_number));
> expect(uniquePNRs.size).toBe(results.filter(r=>r.status===201).length);
> ```

---

## MODULE 7: Key Implementation Questions

**Q: How does the PNR number work?**  
> PNR (Passenger Name Record) is a unique booking reference. Ours is generated as: `PNR` + Base36 timestamp + random suffix. See `server/src/utils/pnr.ts`. It's guaranteed unique because it's checked for collisions via DB unique constraint.

**Q: How does the Waiting List work?**  
> When `seat_inventory.available_seats = 0` and WL capacity remains, a booking gets status `WAITING_LIST`. When a confirmed booking is **cancelled**, the `cancelBooking()` method:
> 1. Increments `available_seats` by 1  
> 2. Finds the first WL booking (FIFO order by `created_at`)  
> 3. Promotes it to `CONFIRMED` status  
> This is automated WL seat promotion — see `BookingRepository.cancelBooking()`.

**Q: How does the cancellation refund work?**  
> Tiered policy in `server/src/utils/refund.ts`:
> | Hours before departure | Deduction |
> |:---|:---|
> | > 48 hours | ₹60 flat per passenger |
> | 12–48 hours | 25% of fare |
> | < 12 hours | 50% of fare |
> | WL ticket | ₹30 flat per passenger |

**Q: How is the admin login secured?**  
> We use **JSON Web Tokens (JWT)**. The admin POSTs credentials to `/api/admin/login`. The server verifies the password against a bcrypt hash (cost factor 10) stored in the `admin_users` table. On success, it returns a signed JWT (8-hour expiry, HS256). All admin routes check the `Authorization: Bearer <token>` header via `requireAdminAuth` middleware.

**Q: What is idempotency and how did you implement it?**  
> Idempotency means the same request executed multiple times has the same effect as executing it once. We generate a unique `idempotency_key` on the client before each booking POST. If the same key arrives twice (e.g., network retry), the server returns the existing booking instead of creating a duplicate. This prevents double-booking on form re-submission.

---

## MODULE 8: Risk Management

**Q: What risks did you identify? How did you mitigate them?**  
> Top risks from `docs/RISK_REGISTER.md`:
> | Risk | Probability | Impact | Mitigation |
> |:---|:---|:---|:---|
> | Overbooking due to concurrency | High | Critical | `BEGIN IMMEDIATE` transactions |
> | Data loss on crash | Medium | High | WAL mode auto-recovery |
> | SQL injection | Low | Critical | Parameterised queries everywhere |
> | Double-booking on retry | Medium | High | Idempotency key |
> | Scope creep | High | Medium | MoSCoW prioritisation |

---

## DEMO SCRIPT (for live faculty demo)

1. **Open** `http://localhost:5173`
2. **Search**: SBC → MAS, any future date → Show 2 trains with classes
3. **Book**: Click Shatabdi, select CC → Fill 2 passengers → Submit
4. **Payment**: Choose "Simulate Successful Payment"
5. **Ticket**: Show PNR, passenger list, disclaimer, transaction ID
6. **Cancel**: Click "Cancel Ticket" → Show refund preview → Confirm
7. **Admin**: Navigate to `/admin/login` → Login as `admin/PresidencyAdmin2026!` → Show dashboard stats
8. **PNR Lookup**: Navigate to `/lookup` → Enter `PNR-DEMO01`, email `demo.passenger@example.com`

> Keep terminal open showing backend logs to demonstrate server-side processing in real time.
