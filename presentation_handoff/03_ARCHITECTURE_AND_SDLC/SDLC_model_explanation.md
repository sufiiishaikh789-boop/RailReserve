# SLIDE 6: SOFTWARE DEVELOPMENT LIFE CYCLE (SDLC) MODEL

## 1. SELECTED SDLC MODEL: ITERATIVE WATERFALL / AGILE HYBRID
For the design and development of **RailReserve (Team 11, CSE2271)**, an **Iterative Waterfall / Agile Hybrid Model** was selected as the optimal software engineering methodology.

```
+---------------------------------------------------------------------------------------------------------+
|                                  RAILRESERVE SDLC PHASE PROGRESSION                                     |
+---------------------------------------------------------------------------------------------------------+
|  [PHASE 1] REQUIREMENTS & SRS                                                                           |
|  - Stakeholder & Domain Analysis (Railway Ticketing Bottlenecks)                                        |
|  - Formal IEEE 830 SRS Specification (FR-01 to FR-10, NFR-01 to NFR-07)                                 |
|  - Requirements Traceability Matrix (RTM) Formulation                                                   |
|                                       │                                                                 |
|                                       ▼                                                                 |
|  [PHASE 2] SYSTEM DESIGN & ARCHITECTURE                                                                 |
|  - 3-Tier Layered Architectural Decomposition                                                           |
|  - Object-Oriented Analysis & UML Modeling (Use Case, Activity Swimlanes, StarUML .mdj)                 |
|  - Relational Database Schema Normalization (3NF) & Concurrency Lock Strategy                           |
|                                       │                                                                 |
|                                       ▼                                                                 |
|  [PHASE 3] SPRINTED IMPLEMENTATION (ITERATIVE DEVELOPMENT)                                              |
|  - Sprint 1: Identity & Authentication (JWT, BCrypt, RBAC, Passenger Dashboard)                         |
|  - Sprint 2: Core Discovery & Pricing Engine (Station Autocomplete, Multi-Class Search)                 |
|  - Sprint 3: Transaction Isolation & Concurrency Engine (SQLite BEGIN IMMEDIATE, Idempotency)           |
|  - Sprint 4: Payment Simulation & FIFO Waitlist Promotion Lifecycle                                    |
|                                       │                                                                 |
|                                       ▼                                                                 |
|  [PHASE 4] TESTING, QA & VERIFICATION                                                                   |
|  - Test-Driven Development (TDD) via Vitest Harness                                                     |
|  - End-to-End RESTful API Integration Tests via Supertest (72 Passing Suites)                            |
|  - Concurrency Race-Condition & Seat Over-Allocation Stress Testing                                     |
|                                       │                                                                 |
|                                       ▼                                                                 |
|  [PHASE 5] DEPLOYMENT, AUDITING & MAINTENANCE                                                           |
|  - Build Optimization via Vite Rollup Bundler & Helmet Security Headers                                 |
|  - Administrative Oversight Dashboard & Immutable Audit Trail Logging                                   |
+---------------------------------------------------------------------------------------------------------+
```

---

## 2. ENGINEERING JUSTIFICATION & RATIONALE

| Methodology Dimension | Why Classical Waterfall Fails | Why Pure Agile (Scrum) is Incomplete | Why Hybrid Model is Optimal for RailReserve |
|---|---|---|---|
| **Data Consistency & Schema** | Inflexible to schema iteration as edge cases emerge. | Frequent schema changes destabilize ACID transaction boundaries. | Establishes a rigorous upfront relational schema (3NF) while allowing sprint-level query tuning. |
| **Safety-Critical Concurrency** | Postpones integration testing until the final phase. | Tends to defer formal concurrency race-condition validation. | Mandates formal transaction lock design upfront with sprint-by-sprint automated regression testing. |
| **Academic & Review Milestones**| Does not accommodate iterative sprint demos for evaluators. | Lacks formal SRS and architectural documentation gates. | Aligns strict phase-gate documentation (SRS, UML) with demonstrable sprint outcomes. |

---

## 3. PHASE GATE CRITERIA & QUALITY CONTROLS
1. **SRS Approval Gate:** 100% of functional requirements categorized with unambiguous verification criteria and input/output contracts before backend coding.
2. **Architecture Review Gate:** Database schema normalized to 3NF; ACID isolation mechanics documented; StarUML model verified.
3. **Continuous Integration (CI) Gate:** Every pull request requires **72/72 tests passing** with zero TypeScript errors before merging to `main`.
4. **Final Demo Gate:** High-resolution screenshots captured directly from the running deployment for evaluator review.
