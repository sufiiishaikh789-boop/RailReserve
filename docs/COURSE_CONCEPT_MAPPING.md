# Course Concept Mapping: Software Design & Development (CSE 2271)
**Academic Institution:** Presidency University, Bengaluru  
**Department:** Computer Science and Engineering  
**Project:** Team 11 — Railway Reservation System  
**Primary Reference:** Rajib Mall, *Fundamentals of Software Engineering*, 5th Ed., PHI Learning; Course Lecture Notes for CSE 2271.

---

## 1. Executive Summary

This document establishes the formal traceability between the academic software engineering principles taught in CSE 2271 (Modules 1, 2, 3, and textbook references) and their practical implementation within the Team 11 Railway Reservation System. 

For each academic concept, five dimensions are explicitly documented:
1. **Academic Meaning:** The theoretical definition as presented in course modules.
2. **Railway Problem Application:** How the concept specifically governs the railway domain.
3. **Design/Implementation Artifact:** The exact files, classes, or documentation implementing it.
4. **Demonstrable Evidence:** The concrete code mechanism or test demonstrating execution.
5. **Viva Voce Examination Question & Model Answer:** Expected faculty defense question and response.

---

## 2. Module 1: Introduction to Software Engineering & Process Models

### 1.1 Need for Software Engineering
- **Academic Meaning:** Software engineering addresses the "software crisis" by applying systematic, disciplined, and quantifiable approaches to software development, ensuring delivery of reliable, maintainable, and cost-effective software within schedule constraints.
- **Railway Problem Application:** Ad-hoc train reservation logic results in overbooking, race conditions in seat allocation, duplicate payments, and uncoordinated state management during cancellations.
- **Design/Implementation Artifact:** Layered architecture (`server/src/services/BookingService.ts`, `server/src/db/`), ACID database transactions, and deterministic state transitions.
- **Demonstrable Evidence:** Zero-seat overbooking test under simulated concurrent load (`server/src/tests/booking.test.ts`).
- **Viva Question:** *Why is ad-hoc programming inadequate for a railway reservation system?*  
  *Answer:* Railway ticketing requires strict atomic transactions, concurrency control, and predictable state transitions. Without systematic engineering, concurrent booking attempts cause phantom availability, race conditions, and corrupted seat inventories.

### 1.2 Professional Software Development & Ethics
- **Academic Meaning:** The responsibility of software engineers to adhere to standards of honesty, competence, confidentiality, data protection, and computer misuse prevention (ACM/IEEE Code of Ethics).
- **Railway Problem Application:** Clear differentiation between demonstration data and live railway booking; protection of passenger contact information; avoidance of harvesting real payment credentials.
- **Design/Implementation Artifact:** `docs/ETHICS_AND_PRIVACY.md`, simulated payment provider banner in UI, and sanitized audit logging (`server/src/services/AuditService.ts`).
- **Demonstrable Evidence:** Clear visual indicator on all screens and e-tickets stating: *"Academic Demonstration System - Fictional Data Only - No Real Tickets or Payments Processed"*.
- **Viva Question:** *How does your system implement software ethics regarding simulated transactions?*  
  *Answer:* The system explicitly informs users that payments are simulated, never collects real card PINs/CVVs or government identity numbers, and prevents fraudulent confirmation of failed transactions.

### 1.3 Software Engineering Practice & Essence of Practice
- **Academic Meaning:** The 4-stage engineering problem-solving essence: (1) Understand the problem, (2) Plan a solution, (3) Carry out the plan, (4) Examine the result for accuracy.
- **Railway Problem Application:** 
  1. *Understand:* Passenger booking journeys, peak load, quota allocation, cancellation rules.
  2. *Plan:* UML use cases, ER diagrams, layered architecture.
  3. *Carry out:* Node.js/Express TypeScript backend with React/Vite frontend.
  4. *Examine:* Vitest test suites, boundary testing on quotas, cancellation refund verification.
- **Design/Implementation Artifact:** `docs/SOFTWARE_ENGINEERING_CONCEPTS.md`, `docs/TEST_PLAN.md`.
- **Demonstrable Evidence:** Automated test run report matching requirements traceability matrix (RTM).
- **Viva Question:** *Trace how the four stages of engineering practice were executed in Team 11's project.*  
  *Answer:* We analyzed passenger ticketing workflows (Stage 1), drafted SRS and PlantUML diagrams (Stage 2), developed the modular TypeScript stack (Stage 3), and verified automated test suites across all 20 functional requirements (Stage 4).

### 1.4 General Principles of Software Engineering (David Hooker's 7 Principles)
- **Academic Meaning:** Seven universal principles: (1) Reason it exists, (2) KISS (Keep It Simple, Stupid), (3) Maintain the vision, (4) What you produce others will consume, (5) Be open to the future, (6) Plan ahead for reuse, (7) Think!
- **Railway Problem Application:** 
  - *Reason it exists:* Enable passengers to find and book valid train journeys safely.
  - *KISS:* Use clean SQLite transactions rather than distributed microservices for an academic demo.
  - *Open to future:* Abstract payment gateway behind an interface (`IPaymentGateway`) for easy plug-in of real payment providers.
- **Design/Implementation Artifact:** `server/src/services/PaymentService.ts`, `server/src/db/Database.ts`.
- **Demonstrable Evidence:** Decoupled `IPaymentService` interface enabling unit testing with mocked payment failures.
- **Viva Question:** *Explain how Hooker's principle 'What you produce, others will consume' is evidenced in your code.*  
  *Answer:* All backend APIs follow OpenAPI/REST specifications with explicit TypeScript interfaces, and codebase modules are documented with self-explanatory JSDoc annotations and clean layered boundaries.

### 1.5 Process Models: Classical Waterfall, Iterative Waterfall, Prototyping, Spiral, V-Model, and Agile
- **Academic Meaning:** 
  - *Classical Waterfall:* Linear, sequential, no feedback loops between phases.
  - *Iterative Waterfall:* Phase-wise development with feedback paths to immediately preceding phases.
  - *Prototyping:* Rapid mockups to resolve user-interface and requirement ambiguities.
  - *Spiral Model:* Risk-driven meta-model cycling through Objective Setting, Risk Assessment, Development/Validation, and Planning.
  - *V-Model:* Explicit pairing of each development phase with a corresponding verification/testing phase.
  - *Agile/Scrum:* Incremental iterations yielding working software with continuous stakeholder collaboration.
- **Railway Problem Application:** 
  - *Primary Model:* Iterative & Incremental Scrum-inspired model across 6 sprints.
  - *Supporting Prototyping:* Early Figma/React UI mockups for train search and seat selection.
  - *Supporting Spiral:* Risk-driven cycles targeting concurrent seat booking and cancellation refunds.
  - *Supporting V-Model:* SRS requirements directly paired with Acceptance Test cases in `docs/TEST_PLAN.md`.
- **Design/Implementation Artifact:** `docs/SDLC_AND_PROCESS_MODEL.md`, `docs/PROJECT_PLAN.md`.
- **Demonstrable Evidence:** Sprint backlogs with documented verification criteria and regression test runs.
- **Viva Question:** *Why is the Classical Waterfall model unsuited for this project, and how did you hybridize supporting techniques?*  
  *Answer:* Classical Waterfall forbids feedback loops and delays testing until the very end. We used an iterative Scrum backbone, supplemented by early UI prototyping and V-Model phase-testing alignment to contain defects early.

---

## 3. Module 2: Software Requirements, Analysis, and Design

### 2.1 Requirements Elicitation & Analysis
- **Academic Meaning:** Identifying stakeholder needs, discovering boundaries, and resolving ambiguities. Analysis identifies Christel & Kang's three elicitation pitfalls: *Problems of Scope*, *Problems of Understanding*, and *Problems of Volatility*.
- **Railway Problem Application:**
  - *Scope:* Drawing the boundary between academic simulation and live railway systems.
  - *Understanding:* Formulating strict definitions for Waiting List (WL) vs. Confirmed (CNF) allocation.
  - *Volatility:* Accommodating changing refund calculation rules based on cancellation time thresholds.
- **Design/Implementation Artifact:** `docs/SRS.md` Section 1.2 and Section 4.
- **Demonstrable Evidence:** Formal requirement specification clauses FR-01 through FR-20 with explicit input validations.
- **Viva Question:** *How did you resolve Christel and Kang's 'Problems of Understanding' in your railway reservation requirements?*  
  *Answer:* We defined precise domain glossary terms (PNR, Quota, Berth Preferences, Day Offset) and created state-transition diagrams for ticket lifecycles to eliminate ambiguity between passenger expectations and backend processing.

### 2.2 Functional vs. Non-Functional Requirements
- **Academic Meaning:** Functional requirements specify system behaviors and operations (inputs $\to$ outputs). Non-functional requirements specify behavioral attributes and quality constraints (performance, reliability, security, usability).
- **Railway Problem Application:**
  - *FR:* Searching trains by station code, checking availability, allocating seats, issuing PNRs, processing cancellations.
  - *NFR:* Response time $< 300$ ms for train search, ACID transaction isolation, zero seat overbooking, WCAG-compliant contrast.
- **Design/Implementation Artifact:** `docs/SRS.md` Sections 3 (Functional) and 7 (Non-Functional).
- **Demonstrable Evidence:** Integration tests asserting search response times under local load and data integrity constraints.
- **Viva Question:** *Give an example of a Functional Requirement and an associated Non-Functional Requirement in your system.*  
  *Answer:* FR-09 mandates atomic seat allocation without overbooking; its associated NFR-03 (Data Integrity) mandates that concurrent database transactions maintain serializable isolation so that the seat count never drops below zero.

### 2.3 Software Requirements Specification (SRS) Quality Characteristics
- **Academic Meaning:** IEEE 830 / ISO/IEC/IEEE 29148 standards: Correctness, Unambiguity, Completeness, Consistency, Stability, Verifiability, Modifiability, Traceability.
- **Railway Problem Application:** Every functional requirement has a unique identifier (FR-01 to FR-20), clear acceptance criteria, and mapping to test cases.
- **Design/Implementation Artifact:** `docs/SRS.md`, `docs/REQUIREMENTS_TRACEABILITY.md`.
- **Demonstrable Evidence:** 100% bidirectional traceability matrix linking FRs to Architecture modules and Vitest test IDs.
- **Viva Question:** *How is 'Verifiability' satisfied in your SRS?*  
  *Answer:* Every requirement has quantified acceptance criteria (e.g., "Returns HTTP 200 with JSON array of matching trains sorted by departure time within 300 ms") that can be automatically asserted in automated tests.

### 2.4 Use Case, Activity, and Swimlane Modelling (UML)
- **Academic Meaning:** 
  - *Use Case Diagram:* Captures external actors and functional goals with `<<include>>` and `<<extend>>` relationships.
  - *Activity Diagram:* Models operational step-by-step control flows, decision diamonds, and concurrency forks/joins.
  - *Swimlane Activity Diagram:* Partitions activity steps across architectural layers/roles to show organizational and boundary handoffs.
- **Railway Problem Application:**
  - *Use Cases:* Passenger books ticket (`<<include>>` Check Availability, `<<include>>` Process Payment, `<<extend>>` Opt for Waiting List).
  - *Activity Diagram:* Search $\to$ Selection $\to$ Availability Decision $\to$ Passenger Input $\to$ Payment Decision $\to$ E-Ticket Generation.
  - *Swimlanes:* Passenger $\to$ React Client $\to$ Express Backend $\to$ SQLite Database $\to$ Payment Simulator.
- **Design/Implementation Artifact:** `docs/UML_DIAGRAMS.md`, `docs/diagrams/use-case-diagram.puml`, `docs/diagrams/swimlane-diagram.puml`.
- **Demonstrable Evidence:** PlantUML and Mermaid renderings reflecting actual system state transitions and API endpoints.
- **Viva Question:** *When did you use <<include>> versus <<extend>> in your Use Case diagram?*  
  *Answer:* `<<include>>` was used for mandatory steps like 'Check Seat Availability' during 'Book Ticket', whereas `<<extend>>` was used for optional/conditional flows like 'Opt for Waiting List' which triggers only when confirmed seats are exhausted.

### 2.5 Architectural Design & Layered Pattern
- **Academic Meaning:** High-level structural organization into distinct layers where each layer depends only on lower layers, fostering separation of concerns, high cohesion, and low coupling.
- **Railway Problem Application:**
  - *Layer 1 (Presentation):* React 18, Tailwind CSS, React Router.
  - *Layer 2 (API/Controllers):* Express routing, request validation, authentication middleware.
  - *Layer 3 (Application/Business Logic):* `TrainService`, `BookingService`, `PaymentService`, `RefundService`.
  - *Layer 4 (Data Access/Storage):* SQLite database repository using transaction-safe queries.
- **Design/Implementation Artifact:** `docs/ARCHITECTURE.md`, `server/src/controllers/`, `server/src/services/`.
- **Demonstrable Evidence:** Clean separation where controllers handle HTTP status codes, services execute business logic, and repositories execute SQL statements.
- **Viva Question:** *How does your architecture achieve High Cohesion and Low Coupling?*  
  *Answer:* Cohesion is high because each service class (e.g., `RefundService`) encapsulates only domain logic related to fare calculations and deductions. Coupling is low because presentation components interact with backend services exclusively via standard REST JSON contracts.

### 2.6 User Interface Design Principles (Shneiderman & Mandel)
- **Academic Meaning:** 
  - *Theo Mandel's 3 Golden Rules:* Place user in control, reduce memory load, make interface consistent.
  - *Ben Shneiderman's 8 Golden Rules:* Consistency, shortcuts, informative feedback, closure, simple error handling, action reversal, internal locus of control, reduced short-term memory load.
- **Railway Problem Application:**
  - Station code search with autocomplete and source/destination swap button.
  - Multi-step booking wizard with visual breadcrumbs (Search $\to$ Review $\to$ Passenger Info $\to$ Payment $\to$ E-Ticket).
  - Explicit confirmation modal before ticket cancellation with computed refund preview.
- **Design/Implementation Artifact:** `docs/UI_DESIGN.md`, `client/src/components/`, `client/src/pages/`.
- **Demonstrable Evidence:** Interactive swap station button, clear inline validation errors, and breadcrumb navigation.
- **Viva Question:** *How does your UI implement Shneiderman's rule of 'Design dialogs to yield closure'?*  
  *Answer:* After payment simulation, the user is transitioned to a distinct Confirmation & E-Ticket screen displaying a green checkmark, generated PNR, journey summary, and 'Print/Download Ticket' action, providing definitive psychological closure to the booking task.

---

## 4. Module 3: Agile Principles, Scrum, and DevOps

### 3.1 Agile Principles & Manifesto Alignment
- **Academic Meaning:** Individuals and interactions over processes and tools; working software over comprehensive documentation; customer collaboration over contract negotiation; responding to change over following a plan.
- **Railway Problem Application:** Deploying demonstrable working software at the end of each sprint; rapid adjustments to cancellation policies based on test feedback; modular code structure permitting iterative refinement.
- **Design/Implementation Artifact:** `docs/AGILE_BACKLOG.md`.
- **Demonstrable Evidence:** Incremental commit history reflecting sprint-based feature delivery (Foundation $\to$ Core Booking $\to$ Waiting List $\to$ Cancellation).
- **Viva Question:** *How did you balance Agile's 'Working software over comprehensive documentation' in an academic course that requires extensive documentation?*  
  *Answer:* We maintained living documentation synchronized with code. Every requirement in our SRS and Agile backlog is backed by functioning code and passing automated tests, ensuring documentation reflects reality rather than unverified aspirations.

### 3.2 Scrum Framework Implementation
- **Academic Meaning:** Product Owner (prioritizes backlog), Scrum Master (removes blockers, facilitates process), Development Team (cross-functional implementation). Events: Sprint Planning, Daily Scrum, Sprint Review, Sprint Retrospective. Artifacts: Product Backlog, Sprint Backlog, Increment.
- **Railway Problem Application:** Tailored for a focused student team: Team members rotate Scrum responsibilities, breaking 20 core requirements into 6 focused two-week equivalent sprint cycles.
- **Design/Implementation Artifact:** `docs/AGILE_BACKLOG.md`, `docs/PROJECT_PLAN.md`.
- **Demonstrable Evidence:** Explicit Definition of Done (DoD) applied to each user story (unit tests passing, peer-reviewed TypeScript types, API documentation updated).
- **Viva Question:** *What is your project's Definition of Done (DoD)?*  
  *Answer:* A user story is 'Done' only when: (1) business logic is implemented in TypeScript, (2) automated unit and integration tests pass, (3) UI conforms to accessibility guidelines, (4) database transactions handle edge cases, and (5) traceability matrix is updated.

### 3.3 User Story Engineering
- **Academic Meaning:** Formatted as *"As a [role], I want [feature], so that [business value]"*, accompanied by clear INVEST criteria (Independent, Negotiable, Valuable, Estimable, Small, Testable) and Given-When-Then acceptance criteria.
- **Railway Problem Application:** 15 granular user stories covering passenger search, atomic reservation, simulated payments, waiting list promotion, and admin inventory management.
- **Design/Implementation Artifact:** `docs/AGILE_BACKLOG.md` Section 2.
- **Demonstrable Evidence:** Example User Story US-05: *"As a passenger, I want to book a ticket when seats are available, so that I receive an immediate confirmed reservation with coach and seat number."*
- **Viva Question:** *How do you ensure user stories satisfy the INVEST criteria?*  
  *Answer:* We ensure each story delivers independent value (e.g., train search can be tested independently of payment processing), can be estimated in story points, and has deterministic acceptance criteria verified by automated tests.

### 3.4 Agile Estimation Techniques
- **Academic Meaning:** Collaborative, relative sizing techniques: Planning Poker (Fibonacci sequence), T-shirt sizing (XS-XXL), Bucket System, Affinity Grouping, Dot Voting, Three-Point / PERT estimation.
- **Railway Problem Application:** backlogs sized using Planning Poker Fibonacci story points (1, 2, 3, 5, 8, 13) and calibrated using PERT Three-Point estimates ($T_e = \frac{O + 4M + P}{6}$).
- **Design/Implementation Artifact:** `docs/PROJECT_ESTIMATION.md` Section 3.
- **Demonstrable Evidence:** Worked comparative estimation tables showing story points alongside PERT estimates for core modules.
- **Viva Question:** *Why is relative sizing (Story Points) preferred over absolute hours in Agile?*  
  *Answer:* Humans are significantly better at estimating relative complexity (e.g., feature A is twice as complex as feature B) than predicting absolute clock hours, which vary depending on interruptions, developer familiarity, and unexpected technical hurdles.

### 3.5 Dynamic Systems Development Method (DSDM)
- **Academic Meaning:** Agile framework prioritizing on-time delivery using the MoSCoW prioritization technique (Must have, Should have, Could have, Won't have this time) and fixed timeboxes.
- **Railway Problem Application:**
  - *Must Have:* Search, atomic booking, payment simulation, ticket generation, basic cancellation.
  - *Should Have:* Waiting list automatic promotion, admin train management, printable e-ticket.
  - *Could Have:* Berth preference optimization, dark/light theme toggle.
  - *Won't Have:* Live IRCTC integration, real banking gateway.
- **Design/Implementation Artifact:** `docs/AGILE_BACKLOG.md` Section 4.
- **Demonstrable Evidence:** MoSCoW tags assigned to all backlog items ensuring core academic requirements are delivered within constraints.
- **Viva Question:** *How does MoSCoW prioritization protect project delivery dates?*  
  *Answer:* When time or effort constraints arise, instead of compromising quality or slipping deadlines, the project drops 'Could Have' items while preserving 100% of 'Must Have' core functionalities.

### 3.6 DevOps Workflow & Continuous Integration
- **Academic Meaning:** Unification of software development (Dev) and software operations (Ops) through automated pipelines: Plan $\to$ Code $\to$ Build $\to$ Test $\to$ Release $\to$ Deploy $\to$ Operate $\to$ Monitor.
- **Railway Problem Application:** Automated npm build scripts, TypeScript compilation checks, deterministic SQLite schema migrations/seeding, and Vitest test suites.
- **Design/Implementation Artifact:** `docs/DEVOPS_AND_RELEASE.md`, `package.json`, `.github/workflows/ci.yml`.
- **Demonstrable Evidence:** Single-command execution: `npm test` runs all backend and frontend unit tests; `npm run build` verifies type-safety and builds production assets.
- **Viva Question:** *How does Continuous Integration (CI) facilitate phase containment of defects?*  
  *Answer:* CI triggers automated linters, compilers, and test suites on every commit. If a regression occurs (e.g., a broken foreign key or failing payment check), the build fails immediately, containing the defect to the commit stage before it reaches integration or release.

---

## 5. Reference Book Applications (Rajib Mall)

### 5.1 Software Project Planning & SPMP (IEEE 1058)
- **Academic Meaning:** Formal document detailing project organization, managerial process, technical process, work packages, schedule, and budget.
- **Railway Problem Application:** Comprehensive SPMP defining roles, development schedule, hardware/software requirements, and risk contingencies.
- **Design/Implementation Artifact:** `docs/PROJECT_PLAN.md`.
- **Demonstrable Evidence:** Work Breakdown Structure (WBS) decomposed into 14 distinct work packages with clear dependencies.
- **Viva Question:** *What is the relationship between the WBS and project scheduling in SPMP?*  
  *Answer:* The WBS decomposes the project into leaf-level work packages; these packages become the activity nodes in the PERT/CPM network, allowing calculation of task durations, dependencies, and the critical path.

### 5.2 Project Scheduling: CPM, PERT, and Gantt Charts
- **Academic Meaning:** 
  - *Activity Network:* Directed acyclic graph showing task dependencies.
  - *CPM (Critical Path Method):* Determines the longest path through the network, defining the minimum project duration; tasks on this path have zero slack time ($Float = 0$).
  - *PERT:* Probabilistic scheduling using beta distribution estimates.
- **Railway Problem Application:** Identification of the Critical Path: Requirements $\to$ Database Schema $\to$ Booking Logic & Concurrency Control $\to$ Payment Simulation $\to$ Cancellation & Refund $\to$ Final Verification.
- **Design/Implementation Artifact:** `docs/PROJECT_PLAN.md` Section 3, with Mermaid Gantt charts.
- **Demonstrable Evidence:** Mermaid Gantt chart visualizing the 6 sprints and critical path dependencies.
- **Viva Question:** *What happens if a task on the Critical Path is delayed by 3 days?*  
  *Answer:* Because critical path tasks have zero total float ($TF = LF - EF = 0$), any delay of 3 days directly extends the entire project completion date by exactly 3 days unless crashing or fast-tracking is applied.

### 5.3 Function Point (FP) Estimation (Albrecht's Method)
- **Academic Meaning:** Sizing software based on functional capabilities delivered to users: External Inputs (EI), External Outputs (EO), External Inquiries (EQ), Internal Logical Files (ILF), and External Interface Files (EIF). Unadjusted Function Points (UFP) adjusted by Value Adjustment Factors (VAF).
  $$\text{UFP} = \sum (\text{Count} \times \text{Weight})$$
  $$\text{FP} = \text{UFP} \times (0.65 + 0.01 \times \sum F_i)$$
- **Railway Problem Application:** Detailed functional inventory: 4 EIs (Create Booking, Process Payment, Cancel Ticket, Add Train), 3 EOs (E-Ticket, Refund Receipt, Admin Dashboard), 2 EQs (Search Trains, Check PNR Status), 6 ILFs (Trains, Schedules, Inventory, Bookings, Passengers, Logs), 1 EIF (Simulated Payment Gateway).
- **Design/Implementation Artifact:** `docs/PROJECT_ESTIMATION.md` Section 1.
- **Demonstrable Evidence:** Worked calculation yielding $\text{UFP} = 98$, $\text{VAF} = 1.02$, resulting in $\text{Adjusted FP} \approx 100 \text{ FPs}$.
- **Viva Question:** *Differentiate between an External Inquiry (EQ) and an External Output (EO) in Function Point analysis.*  
  *Answer:* An EQ retrieves and displays data from storage without executing complex algorithms or altering system state (e.g., Search Trains). An EO involves derived calculations, algorithms, or state-dependent transformation before presentation (e.g., Generating an E-Ticket with calculated fares and seat allocation).

### 5.4 COCOMO & COCOMO II Estimation
- **Academic Meaning:** Constructive Cost Model (Boehm): Basic COCOMO uses empirical formulas based on estimated KLOC:
  $$\text{Effort} = a \times (\text{KLOC})^b \quad (\text{Person-Months})$$
  $$\text{Development Time} = c \times (\text{Effort})^d \quad (\text{Months})$$
  Modes: Organic ($a=2.4, b=1.05$), Semi-Detached ($a=3.0, b=1.12$), Embedded ($a=3.6, b=1.20$).
- **Railway Problem Application:** System classified as **Organic** mode ($\approx 4.5$ KLOC of TypeScript, React, and SQL).
- **Design/Implementation Artifact:** `docs/PROJECT_ESTIMATION.md` Section 2.
- **Demonstrable Evidence:** 
  $$\text{Effort} = 2.4 \times (4.5)^{1.05} \approx 11.6 \text{ Person-Months}$$
  $$\text{Tdev} = 2.5 \times (11.6)^{0.38} \approx 6.35 \text{ Months}$$
- **Viva Question:** *Why did you select the Organic mode for COCOMO estimation of this system?*  
  *Answer:* The Organic mode applies to small, experienced teams working in familiar in-house environments with stable, well-understood requirements, which accurately models this academic mini-project.

### 5.5 Modularity, Coupling, and Cohesion
- **Academic Meaning:** 
  - *Cohesion:* Functional strength of a module (Coincidental, Logical, Temporal, Procedural, Communicational, Sequential, Functional). Aim: High / Functional Cohesion.
  - *Coupling:* Degree of interdependence between modules (Content, Common, Control, Stamp, Data). Aim: Low / Data Coupling.
- **Railway Problem Application:** Services in `server/src/services/` exhibit functional cohesion (e.g., `SeatAllocationService` only calculates and allocates berths). Controllers communicate with services via data coupling (passing clean DTO primitives/objects).
- **Design/Implementation Artifact:** `docs/ARCHITECTURE.md`, `docs/DESIGN_DECISIONS.md`.
- **Demonstrable Evidence:** Strict TypeScript interfaces preventing global shared state or content coupling.
- **Viva Question:** *Identify the worst form of coupling and explain how your design avoids it.*  
  *Answer:* Content coupling (where one module directly modifies the internal data or code of another) is the worst form. We avoided it completely through information hiding and encapsulation: services expose public methods with private internal state, and components communicate strictly across REST/JSON contracts.

### 5.6 Software Testing & Quality Assurance
- **Academic Meaning:** 
  - *Black-Box Testing:* Testing functionality without internal code knowledge: Equivalence Class Partitioning (ECP), Boundary Value Analysis (BVA), Cause-Effect Graphing.
  - *White-Box Testing:* Structural testing based on internal logic: Statement Coverage, Branch/Edge Coverage, Condition Coverage, Path Coverage (McCabe's Cyclomatic Complexity).
  - *Levels of Testing:* Unit Testing $\to$ Integration Testing (Top-Down, Bottom-Up, Big Bang) $\to$ System Testing $\to$ Acceptance Testing.
- **Railway Problem Application:**
  - *BVA:* Passenger age validation ($0$, $1$, $12$, $60$, $120$, $121$ years), Journey date validation (today, tomorrow, $+120$ days, past dates).
  - *Integration:* Testing interaction between `BookingService`, `SeatInventory`, and `PaymentService`.
- **Design/Implementation Artifact:** `docs/TEST_PLAN.md`, `server/src/tests/`.
- **Demonstrable Evidence:** Automated test suite containing 27 targeted test scenarios covering all boundary cases and state transitions.
- **Viva Question:** *Demonstrate how you applied Boundary Value Analysis to the journey date selection.*  
  *Answer:* For journey date input, the valid range is $[T, T+120]$ days. We test at the boundaries: $T-1$ (invalid: past date, rejected), $T$ (valid: same-day journey), $T+1$ (valid), $T+120$ (valid: max advance reservation period), and $T+121$ (invalid: beyond advance booking window, rejected).

---

## 6. Verification Summary Table

| Course Concept | Module Reference | Artifact in Repository | Test/Evidence Location |
| :--- | :--- | :--- | :--- |
| **Ethics & Responsibility** | Module 1 | `docs/ETHICS_AND_PRIVACY.md` | UI Disclaimer Banner & Sanitized Logs |
| **Hooker's 7 Principles** | Module 1 | `docs/SOFTWARE_ENGINEERING_CONCEPTS.md` | Decoupled `IPaymentService` Interface |
| **SDLC & Hybrid Agile** | Module 1 | `docs/SDLC_AND_PROCESS_MODEL.md` | 6-Sprint Schedule & Commit History |
| **Christel & Kang Elicitation** | Module 2 | `docs/SRS.md` | Scope boundaries & WL Definitions |
| **Functional Requirements** | Module 2 | `docs/SRS.md` | FR-01 through FR-20 in SRS |
| **UML Diagrams (4 Types)** | Module 2 | `docs/UML_DIAGRAMS.md`, `docs/diagrams/` | PlantUML and Mermaid files |
| **Layered Architecture** | Module 2 | `docs/ARCHITECTURE.md` | `client/`, `server/controllers`, `services`, `db` |
| **UI Golden Rules** | Module 2 | `docs/UI_DESIGN.md` | Station Swap, Step Wizard, Error Prompts |
| **User Stories & DoD** | Module 3 | `docs/AGILE_BACKLOG.md` | 15 INVEST Stories with Acceptance Tests |
| **Agile Estimation** | Module 3 | `docs/PROJECT_ESTIMATION.md` | Planning Poker & PERT Comparisons |
| **DSDM & MoSCoW** | Module 3 | `docs/AGILE_BACKLOG.md` | Backlog MoSCoW tags (Must, Should, Could) |
| **DevOps Pipeline** | Module 3 | `docs/DEVOPS_AND_RELEASE.md` | `package.json` scripts & GitHub Actions CI |
| **SPMP & WBS** | Rajib Mall Ch. 3 | `docs/PROJECT_PLAN.md` | 14 Work Packages and IEEE 1058 sections |
| **CPM & Critical Path** | Rajib Mall Ch. 3 | `docs/PROJECT_PLAN.md` | Gantt chart & Critical Path Analysis |
| **Function Point Analysis** | Rajib Mall Ch. 3 | `docs/PROJECT_ESTIMATION.md` | Detailed UFP/VAF Worked Calculations |
| **COCOMO Estimation** | Rajib Mall Ch. 3 | `docs/PROJECT_ESTIMATION.md` | Organic Mode Equations & Explanations |
| **High Cohesion/Low Coupling** | Rajib Mall Ch. 5 | `docs/DESIGN_DECISIONS.md` | Isolated Services and Clean DTO Contracts |
| **BVA & Equivalence Partitioning**| Rajib Mall Ch. 8 | `docs/TEST_PLAN.md` | Age, Date, Quota Boundary Tests in Vitest |
| **Transaction Integrity (ACID)** | Rajib Mall Ch. 6 | `docs/DATABASE_DESIGN.md` | SQLite `BEGIN IMMEDIATE` Concurrency Test |
