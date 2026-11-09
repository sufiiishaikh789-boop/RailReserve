# SLIDE-BY-SLIDE PRESENTATION CONTENT (19 SLIDES)
## PRESIDENCY UNIVERSITY — SCHOOL OF COMPUTER SCIENCE & ENGINEERING
### COURSE: CSE2271 — SOFTWARE DESIGN AND DEVELOPMENT | CA-3 REVIEW

---

### SLIDE 1: TITLE SLIDE
- **Official Slide Title:** CA-3 Mini Project Presentation
- **Project Title:** RailReserve — Modern Full-Stack Railway Reservation & Concurrency-Safe Ticketing System
- **Subtitle:** High-Throughput Transit Architecture with ACID Transaction Isolation & 3-Category Journey Planner
- **Course Code & Title:** CSE2271 — Software Design and Development
- **Program & School:** B.Tech Computer Science and Engineering, School of CSE
- **Institution:** Presidency University, Bengaluru
- **Team Number:** Team 11
- **Team Members:**
  - `[Student 1 Name - Roll Number]` (Team Lead & Backend Systems Architect)
  - `[Student 2 Name - Roll Number]` (Frontend Lead & UI/UX Specialist)
  - `[Student 3 Name - Roll Number]` (Security & Payment Systems Engineer)
  - `[Student 4 Name - Roll Number]` (QA, Testing & Verification Specialist)
- **Visual Asset:** Official Presidency University crest / logo centered at top.

---

### SLIDE 2: INTRODUCTION
- **Official Slide Title:** Introduction
- **Header:** Modernizing Railway Passenger Transit Infrastructures
- **Key Bullet Points:**
  - **The Rail Transit Reality:** National railway networks handle over 20 million daily passenger journeys, requiring mission-critical reliability and millisecond-level responsiveness.
  - **Legacy Infrastructure Bottlenecks:** Existing public reservation platforms suffer from high bounce rates, cognitive clutter, and catastrophic seat contention during peak Tatkal booking windows.
  - **The RailReserve Paradigm:** A full-stack, component-driven web platform designed to eliminate user friction via a segmented 3-category Journey Planner and guarantee zero double-allocation via ACID concurrency locks.
  - **Technology Highlights:** React 18 SPA, Node.js v22+ Express backend, SQLite 3 in WAL mode, JWT stateless authentication, and 100% TypeScript type safety.
- **Presenter Note:** Frame the project as a software engineering response to real-world national ticketing challenges.

---

### SLIDE 3: PROBLEM STATEMENT
- **Official Slide Title:** Problem Statement
- **Header:** Identifying Structural & Concurrency Flaws in Legacy Ticketing Systems
- **Key Bullet Points:**
  - **Cognitive Overload & Cluttered Navigation:** Unauthenticated users are thrust directly into complex search grids without clear separation of passenger intent (Reserved vs. Commuter vs. Platform).
  - **Concurrency Race Conditions:** Simultaneous booking requests for the final seat in a coach cause "phantom allocations" and database contention.
  - **Fragmented Checkout & Indeterminate Holds:** Payment drops leave unconfirmed seats in limbo, while repeated submissions risk duplicate customer debits.
  - **Inefficient Waitlist Reconciliations:** Manual or delayed seat reallocation when confirmed tickets cancel, causing suboptimal coach occupancy.
- **Visual Callout:** Comparative graphic showing "Legacy UX Friction" vs. "RailReserve Structured Journey Pipeline".

---

### SLIDE 4: PROJECT OUTCOMES
- **Official Slide Title:** Project Outcomes
- **Header:** Measurable Engineering Objectives & Functional Deliverables
- **Key Bullet Points:**
  - **PO-01 (Modern Identity Architecture):** Re-engineered authentication gateway with BCrypt hashing and signed JWT sessions.
  - **PO-02 (Zero Double-Allocation):** Atomic SQLite transaction isolation (`BEGIN IMMEDIATE`) verified under concurrent load.
  - **PO-03 (3-Category Journey Planner):** Intuitive, one-click access to Reserved Long-Distance, Unreserved Express, and Station Platform ticketing.
  - **PO-04 (Idempotent Financial Checkout):** 10-minute inventory hold countdown with automatic rollback on timeout.
  - **PO-05 (Automated FIFO Waitlist Promotion):** Real-time promotion of WL passengers to CNF status upon cancellation with audit logging.
  - **PO-06 (100% Quality Verification):** 72 passing automated test suites across all core modules.

---

### SLIDE 5: SOFTWARE & HARDWARE SPECIFICATIONS
- **Official Slide Title:** Software & Hardware Specifications
- **Header:** Host Environment, Tools & Development Infrastructure
- **Hardware Specifications:**
  - Processor: 8-Core / 16-Thread Modern CPU (3.2+ GHz)
  - Memory: 16 GB RAM (Host) / 4 GB RAM (Client Devices)
  - Storage: PCIe NVMe Solid State Drive
  - Target Clients: Desktop & Mobile Web Browsers (Chrome 110+, Edge, Safari)
- **Software Stack:**
  - Front-End Tier: React 18.3, TypeScript 5.7, Tailwind CSS 3.4, Vite 6.0
  - Application Tier: Node.js v22.9, Express.js 4.21, TSX Runtime
  - Security & Auth: BCrypt 5.1, JSON Web Tokens 9.0, Helmet 8.3, Rate-Limit
  - Persistence Tier: SQLite 3.45 (WAL Mode, Native Integration)
  - Testing & QA: Vitest 2.1, Supertest 7.0, StarUML 6.0

---

### SLIDE 6: SDLC MODEL
- **Official Slide Title:** SDLC Model
- **Header:** Iterative Waterfall / Agile Hybrid Methodology
- **Key Bullet Points:**
  - **Why Hybrid?** Blends rigorous upfront requirements (IEEE 830 SRS, 3NF schema design) with agile 2-week development sprints.
  - **Phase Progression:**
    1. *Phase 1:* Requirements Analysis & Formal SRS Formulation.
    2. *Phase 2:* System Architecture, StarUML Modeling & Relational Normalization.
    3. *Phase 3:* Agile Sprint Execution (Auth -> Search -> Concurrency -> Payment).
    4. *Phase 4:* Verification & Testing (Vitest, Supertest, Concurrency Stress).
    5. *Phase 5:* Deployment, Auditing & Evaluation.
- **Embedded Asset:** `SDLC_lifecycle.png` (or `.svg`).

---

### SLIDE 7: SYSTEM ARCHITECTURE
- **Official Slide Title:** System Architecture
- **Header:** 3-Tier Layered Client-Server Pattern
- **Key Bullet Points:**
  - **Presentation Layer (React 18 SPA):** Modular components, custom state hooks, and responsive Tailwind styling.
  - **Application Layer (Node/Express):** RESTful controllers, security middleware (Helmet, CORS, Rate Limiters), and business logic engines.
  - **Data Persistence Layer (SQLite WAL):** Embedded ACID database executing serialized writes and concurrent sub-50ms reads.
  - **Security & Idempotency Layer:** Stateless JWT tokens and unique transaction UUIDs safeguarding integrity.
- **Embedded Asset:** `architecture_diagram.png` (or `.svg`).

---

### SLIDE 8: FUNCTIONAL REQUIREMENTS
- **Official Slide Title:** Functional Requirements
- **Header:** Core Operational Capabilities (FR-01 to FR-10)
- **Key Bullet Points:**
  - **FR-01 (Auth):** Secure registration, login, and JWT session minting.
  - **FR-02 (Autocomplete):** Debounced station prefix search (<50ms).
  - **FR-03 (Train Search):** Dynamic multi-class query (1A, 2A, 3A, SL, 2S).
  - **FR-04 (Dashboard):** 3-category Journey Planner interface.
  - **FR-05 (Fare Engine):** Transparent base fare, surcharge, and 5% GST computation.
  - **FR-06 (Atomic Booking):** Exclusive transaction locks preventing seat collisions.
  - **FR-07 (Checkout):** 10-minute hold timer with simulated payment processing.
  - **FR-08 (Digital Ticket):** Boarding pass with scannable 2D QR verification code.
  - **FR-09 (FIFO Promotion):** Automated waitlist reallocation upon cancellation.
  - **FR-10 (Admin Oversight):** Real-time revenue analytics and audit trails.

---

### SLIDE 9: NON-FUNCTIONAL REQUIREMENTS
- **Official Slide Title:** Non-Functional Requirements
- **Header:** Performance, Security & Usability Quality Attributes
- **Key Bullet Points:**
  - **NFR-01 (Performance):** Sub-150ms p95 latency on search; sub-50ms on autocomplete.
  - **NFR-02 (ACID Integrity):** Zero seat over-allocation under concurrent load.
  - **NFR-03 (Security):** BCrypt password hashing (10 rounds); parameterized queries; Helmet HTTP headers.
  - **NFR-04 (Reliability):** Automated release of unconfirmed seat holds; zero orphaned records.
  - **NFR-05 (Usability):** 3-click booking journey; WCAG 2.1 AA contrast compliance.
  - **NFR-06 (Code Quality):** 100% TypeScript typed; zero compiler warnings.
  - **NFR-07 (Auditability):** Append-only immutable logging of all critical mutations.

---

### SLIDE 10: USE CASE DIAGRAM
- **Official Slide Title:** Use Case Diagram
- **Header:** Behavioral Modeling & Actor Interactivity
- **Key Bullet Points:**
  - **Primary Actors:** Passenger, System Administrator, Payment Simulator Gateway.
  - **Core Use Cases:** 15 defined use cases across discovery, booking, cancellation, and admin oversight.
  - **Structural Relationships:**
    - `Book Ticket` <<include>> `Check Availability`, `Process Payment`, `Receive E-Ticket`.
    - `Book Ticket` <.. `Opt for Waiting List` <<extend>>.
    - `Cancel Ticket` <<include>> `Process Refund`, `Promote FIFO WL`.
- **Embedded Asset:** `use_case_diagram.png` (or `.svg`).

---

### SLIDE 11: ACTIVITY DIAGRAM
- **Official Slide Title:** Activity Diagram
- **Header:** End-to-End Passenger Booking & Cancellation Swimlanes
- **Key Bullet Points:**
  - **Three Parallel Swimlanes:** Passenger UI, Reservation Engine, ACID Persistence.
  - **Core Milestones:** Parameter validation -> Real-time inventory check -> 10-minute hold initiation -> Payment webhook execution.
  - **Atomic Branch:** `BEGIN IMMEDIATE` transaction committing seat decrement, coach/berth assignment, and 10-digit PNR minting in one step.
  - **Cancellation Lifecycle:** Time-tiered refund deduction followed by instant FIFO waitlist seat promotion.
- **Embedded Asset:** `activity_diagram.png` (or `.svg`).

---

### SLIDE 12: DATABASE / ER DIAGRAM
- **Official Slide Title:** Database / ER Diagram
- **Header:** Third Normal Form (3NF) Relational Architecture
- **Key Bullet Points:**
  - **Normalization:** 11 distinct relational entities fully normalized to 3NF eliminating update anomalies.
  - **Core Entities:** `users`, `stations`, `trains`, `routes`, `train_schedules`, `seat_inventory`, `bookings`, `passengers`, `transactions`, `refunds`, `audit_logs`.
  - **Concurrency Optimizations:** Separate row-level `seat_inventory` tracking per class; Write-Ahead Logging (WAL) for lock-free parallel reads.
- **Embedded Asset:** `ER_diagram.png` (or `.svg`).

---

### SLIDE 13: MODULES DESCRIPTION
- **Official Slide Title:** Modules Description
- **Header:** System Functional Decomposition (5 Modules)
- **Key Bullet Points:**
  - **Module 1 (Auth & Profile):** JWT token lifecycle, BCrypt hashing, RBAC.
  - **Module 2 (Discovery & Fare):** 3-category Journey Planner, autocomplete, dynamic pricing.
  - **Module 3 (Atomic Reservation):** Concurrency lock engine, PNR minting, berth allocation.
  - **Module 4 (Payment & Hold):** 10-min countdown timer, idempotency keys, UPI/Card simulation.
  - **Module 5 (Ticketing & Admin):** Digital QR passes, FIFO waitlist promotion, audit logging.

---

### SLIDE 14: MODULE 1 & 2 SNAPSHOTS
- **Official Slide Title:** Module 1 & 2 Snapshots
- **Header:** Passenger Authentication & Journey Planner Dashboard
- **Visuals to Embed:**
  - Left: `01_login_or_register.png` (Login / Registration Portal)
  - Right: `02_passenger_dashboard.png` (Journey Planner 3-Category Dashboard)
- **Key Features Highlighted:**
  - Clean brand identity, password toggle, remember-me.
  - Personalized passenger greeting, PNR tracking banner, 3 illustrated category cards (Reserved, Unreserved, Platform).

---

### SLIDE 15: MODULE 3 SNAPSHOTS
- **Official Slide Title:** Module 3 Snapshots
- **Header:** Train Discovery, Route Filtering & Class Tariffs
- **Visual to Embed:** `03_train_search_results.png` (Search & Results Interface)
- **Key Features Highlighted:**
  - Instant station autocomplete with SBC / MAS / NDLS presets.
  - Interactive multi-class filter pills (1A, 2A, 3A, SL, 2S).
  - Real-time seat availability indicators and transparent fare summaries.

---

### SLIDE 16: MODULE 4 & 5 SNAPSHOTS
- **Official Slide Title:** Module 4 & 5 Snapshots
- **Header:** Booking Checkout, Payment Execution & Admin Oversight
- **Visuals to Embed:**
  - Left: `04_booking_payment.png` (Booking Checkout Interface)
  - Right: `05_ticket_or_admin.png` (Admin Oversight Dashboard)
- **Key Features Highlighted:**
  - Checkout summary, statutory fee calculations, instant payment trigger.
  - Admin KPIs (Total Bookings, Revenue, Waiting List Queue, Cancellations) and master reservation ledger.

---

### SLIDE 17: TESTING & RESULTS
- **Official Slide Title:** Testing & Results
- **Header:** Automated Test Automation Suite (72/72 Tests Passing)
- **Key Bullet Points:**
  - **Test Framework:** Vitest + Supertest executing automated integration suites.
  - **Verified Test Categories:**
    - Authentication & RBAC Access Tokens (100% Pass)
    - Concurrency & Double-Booking Stress (100% Pass)
    - Dynamic Fare & GST Rounding Algorithms (100% Pass)
    - Payment Simulation & Timeout Rollbacks (100% Pass)
    - Cancellation Refunds & FIFO Waitlist Auto-Promotion (100% Pass)
- **Metrics Table:** Total Tests: 72 | Passing: 72 | Failing: 0 | Execution Time: <2.5s.

---

### SLIDE 18: LIMITATIONS & FUTURE SCOPE
- **Official Slide Title:** Limitations & Future Scope
- **Header:** Academic Boundaries & Production Roadmap
- **Academic Limitations:**
  - Simulated payment gateway (no live fiat bank switches).
  - Single-node embedded SQLite persistence (suitable for academic evaluation).
  - Simulated national railway timetable.
- **Future Enhancements:**
  - Live IRCTC / CRIS API synchronization.
  - Machine learning waitlist confirmation probability predictor.
  - Biometric station turnstile integration and offline TTE handheld scanner sync.

---

### SLIDE 19: CONCLUSION & Q&A
- **Official Slide Title:** Conclusion & Q&A
- **Header:** Summary of Project Milestones & Live Demonstration Invite
- **Key Summary Points:**
  - Successfully designed, implemented, and verified a modern, concurrency-safe railway reservation system.
  - Resolved legacy UX bottlenecks via the 3-category Journey Planner.
  - Guaranteed transactional data consistency through ACID SQLite transaction locks.
  - 100% automated test suite passing (72 test suites).
- **Interactive Callout:** *"Thank you! We invite the Review Panel for questions, architectural defense, and live application demonstration."*
- **Demo Credentials:** Passenger (`passenger.demo@railreserve.in` / `Passenger@123`), Admin (`admin` / `Admin@1234`).

