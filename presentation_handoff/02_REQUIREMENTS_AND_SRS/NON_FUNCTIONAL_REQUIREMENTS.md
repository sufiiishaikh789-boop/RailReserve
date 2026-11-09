# SLIDE 9: NON-FUNCTIONAL REQUIREMENTS SPECIFICATION

Non-functional requirements (NFRs) delineate the quality attributes, performance envelopes, security standards, and architectural constraints governing **RailReserve**:

```
+----------------------------------------------------------------------------------------------------+
|                              NON-FUNCTIONAL REQUIREMENTS MATRIX (NFR-01 to NFR-07)                 |
+--------+------------------------+------------------------------------------------------------------+
| ID     | Quality Dimension      | Specification Metric & Verification Benchmark                    |
+--------+------------------------+------------------------------------------------------------------+
| NFR-01 | Performance & Latency  | Train search & availability queries resolve in < 150ms at 95th   |
|        |                        | percentile; autocomplete queries return in < 50ms.               |
+--------+------------------------+------------------------------------------------------------------+
| NFR-02 | Concurrency & Data     | Strict ACID transaction isolation via SQLite WAL mode; zero seat |
|        | Integrity              | over-allocation under 50 simultaneous booking threads.           |
+--------+------------------------+------------------------------------------------------------------+
| NFR-03 | Security & Access      | BCrypt password hashing (10 rounds); signed HS256 JWT auth;      |
|        | Control                | Helmet security headers; parameterized queries preventing SQLi.  |
+--------+------------------------+------------------------------------------------------------------+
| NFR-04 | Reliability & Fault    | Automatic transaction rollback on checkout failures; automatic   |
|        | Tolerance              | release of unconfirmed seat holds after 10-minute timeout.       |
+--------+------------------------+------------------------------------------------------------------+
| NFR-05 | Usability & UX Design  | Maximum 3 clicks from dashboard to payment checkout; WCAG 2.1 AA |
|        |                        | contrast compliance; mobile-responsive layout (375px to 1920px). |
+--------+------------------------+------------------------------------------------------------------+
| NFR-06 | Maintainability & Code | 100% TypeScript type safety; modular 3-tier layering; 72 passing |
|        | Quality                | automated Vitest suites with zero compiler/linter warnings.      |
+--------+------------------------+------------------------------------------------------------------+
| NFR-07 | Auditability & Logging | Immutable logging of all reservation state transitions, waitlist |
|        |                        | promotions, and refund events with ISO-8601 timestamps.          |
+--------+------------------------+------------------------------------------------------------------+
```

---

## DETAILED ENGINEERING ANALYSIS

### NFR-01: Performance & Response Time Benchmarks
- Autocomplete searches leverage debounced API calls (180ms debounce delay) with indexed SQL queries over station codes and city names, delivering roundtrip response times under 50ms.
- Multi-class train availability calculations execute in a single SQL join query combining `train_schedules`, `routes`, `stations`, and `seat_inventory`, achieving p95 latency under 120ms.

### NFR-02: Concurrency & Transaction Isolation
- Uses SQLite with `PRAGMA journal_mode = WAL` (Write-Ahead Logging) and `PRAGMA synchronous = NORMAL`.
- Transactions modifying seat inventory invoke `BEGIN IMMEDIATE`, ensuring that write transactions acquire an exclusive reservation lock immediately, preventing concurrent write collisions and dirty reads.

### NFR-03: Security & Cryptographic Integrity
- **Password Protection:** Plaintext passwords are never persisted. Passwords undergo salt generation and cryptographic key stretching via `bcrypt` with a cost factor of 10.
- **Stateless Tokens:** Authentication sessions utilize JSON Web Tokens containing passenger ID and role, signed with an environment-configured 256-bit secret key.
- **SQL Injection Defense:** All database queries utilize parameterized SQL prepared statements; string concatenation in SQL queries is strictly prohibited.
- **HTTP Hardening:** Helmet middleware enforces `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`, and cross-site scripting filters.

### NFR-05: Usability & Accessibility Standards
- High contrast color palette: Navy Blue (`#0f172a`), Deep Orange (`#ea580c`), and Clean White (`#ffffff`), meeting WCAG 2.1 Level AA color contrast ratios (>4.5:1).
- Clear visual hierarchy: 3 distinct illustrated category cards on the dashboard reducing decision fatigue for first-time passengers.
