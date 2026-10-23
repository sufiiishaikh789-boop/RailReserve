# Test Plan — Railway Reservation System (Team 11)
**Course:** CSE 2271 | Presidency University, Bengaluru  
**Test Framework:** Vitest + Supertest (integration testing over HTTP)  
**Total Test Cases:** 27 (TC-01 through TC-27)

---

## 1. Testing Strategy and V-Model Alignment

| V-Model Level | Activity | Corresponding Test Type |
| :--- | :--- | :--- |
| Requirements (SRS) | Functional requirement specification | Acceptance Tests (manual walkthrough) |
| Architecture | Component interface design | Integration Tests (Supertest API tests) |
| Module Design | Individual function/class design | Unit Tests (Vitest function tests) |
| Coding | Implementation | Code review + automated test execution |
| Unit Testing | Verify individual functions | `calculateRefund`, `generatePNR` unit tests |
| Integration Testing | Verify component communication | Supertest API tests (27 test cases) |
| System Testing | Full end-to-end verification | Browser walkthrough + automated test suite |

---

## 2. Test Techniques Applied

| Technique | Test Cases | Description |
| :--- | :--- | :--- |
| **Equivalence Class Partitioning (ECP)** | TC-02, TC-07 | Valid/invalid inputs divided into equivalence classes |
| **Boundary Value Analysis (BVA)** | TC-07 | Age boundaries (0, 1, 120, 121) |
| **State Transition Testing** | TC-10, TC-12, TC-13 | Booking state machine transitions |
| **Concurrency/Race Condition Testing** | TC-11 | 8 simultaneous booking requests |
| **Idempotency Testing** | TC-15 | Duplicate submission prevention |
| **Authorization Testing** | TC-24 | JWT bypass attempts |
| **Boundary condition testing** | TC-02, TC-07 | Past dates, 120-day limit, 6-passenger cap |

---

## 3. Test Case Register

| TC ID | Test Name | FR/NFR | Technique | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| TC-01 | Valid Train Search | FR-01, FR-03 | Happy path | HTTP 200, array of trains with classes |
| TC-02a | Missing Source Station | FR-02 | ECP (invalid) | HTTP 400 with field error |
| TC-02b | Missing Date | FR-02 | ECP (invalid) | HTTP 400 |
| TC-02c | Past Date | FR-02 | BVA | HTTP 400 "past" message |
| TC-02d | Date >120 days | FR-02 | BVA | HTTP 400 |
| TC-03 | Identical Station | FR-02 | ECP (invalid) | HTTP 400 "same station" |
| TC-04 | No Matching Trains | FR-03 | ECP | HTTP 200, empty array |
| TC-05 | Reverse Route Ordering | FR-01 | State test | Train NOT returned for reversed route |
| TC-06 | Overnight Duration | FR-03 | Calculation | 630 min for 22:15→08:45+1 |
| TC-07a | Age 0 (BVA lower) | FR-06 | BVA invalid | HTTP 400 age error |
| TC-07b | Age 121 (BVA upper) | FR-06 | BVA invalid | HTTP 400 |
| TC-07c | Age 1 (BVA valid lower) | FR-06 | BVA valid | Not rejected for age |
| TC-07d | Name with numbers | FR-06 | ECP invalid | HTTP 400 |
| TC-07e | Invalid phone | FR-06 | ECP invalid | HTTP 400 phone error |
| TC-07f | Invalid email | FR-06 | ECP invalid | HTTP 400 email error |
| TC-07g | >6 passengers | FR-06 | BVA upper | HTTP 400 |
| TC-08 | Fare Calculation | FR-07 | Calculation | 650+60+45=755 for SUPERFAST |
| TC-09a | Seat Availability Status | FR-08 | State test | AVAILABLE/WAITING_LIST/NOT_AVAILABLE |
| TC-09b | WL Status for Full Train | FR-08 | State test | WL status returned correctly |
| TC-10 | Booking Creation | FR-09, FR-11 | Happy path | HTTP 201, PNR starting PNR, PENDING_PAYMENT |
| TC-11 | Concurrent Booking | FR-09, NFR-01 | Concurrency | Unique PNRs, no overbooking |
| TC-12 | Payment Success | FR-10 | State transition | booking_status=CONFIRMED, payment_status=PAID |
| TC-13 | Payment Failure | FR-10 | State transition | booking_status=FAILED, NOT CONFIRMED |
| TC-15 | Idempotency | FR-09 | Duplicate prevention | Same PNR for same idempotency key |
| TC-16 | Unique PNRs | FR-11 | Uniqueness | 3 bookings → 3 distinct PNRs |
| TC-17 | E-Ticket Retrieval | FR-12, FR-13 | Happy path | Ticket with passenger list and disclaimer |
| TC-18a | History Authorization | FR-13 | Security | Only own bookings returned |
| TC-18b | Wrong Contact Rejection | FR-13 | Security | HTTP 403 for mismatched contact |
| TC-19 | WL Assignment | FR-14 | State test | is_waiting_list=true for full train |
| TC-21 | Cancellation Preview | FR-15 | Happy path | Preview with refund_amount |
| TC-22 | Duplicate Cancellation | FR-15 | Idempotency | HTTP 4xx on second cancel attempt |
| TC-23a | Refund >48h | FR-16 | Calculation | charge=60, refund=695, pct=92 |
| TC-23b | Refund 12-48h | FR-16 | Calculation | 25% deduction (750 refund on 1000) |
| TC-23c | Refund <12h | FR-16 | Calculation | 50% deduction |
| TC-23d | WL Refund | FR-16 | Calculation | ₹30 flat fee per passenger |
| TC-24a | No Token | FR-18 | Security | HTTP 401 |
| TC-24b | Invalid Token | FR-18 | Security | HTTP 401 |
| TC-24c | Valid Admin Token | FR-18 | Happy path | HTTP 200 dashboard |
| TC-24d | Admin Login Success | FR-18 | Happy path | JWT token returned |
| TC-24e | Admin Login Failure | FR-18 | Security | HTTP 401 |
| TC-25a | 404 Unknown Route | FR-20 | Error handling | HTTP 404 |
| TC-25b | Malformed Body | FR-20 | Error handling | HTTP 4xx graceful |
| TC-25c | Non-existent PNR | FR-20 | Error handling | HTTP 404 |
| TC-26 | Health Check | NFR-05 | Portability | status=ok, team=Team 11 |
| TC-27 | Stations Listing | FR-03 | Happy path | Array with code, name, city |

---

## 4. Running Tests

```bash
# Install dependencies first
cd server && npm install

# Seed the test database (uses separate test DB automatically via setup.ts)
# No manual seeding needed — setup.ts initializes test DB

# Run all tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

**Expected output:** 27 passing tests (some may skip if inventory is exhausted from concurrent test)

---

## 5. Test Environment

- **Test DB:** `server/data/test_railway.db` (separate from dev DB)
- **Test Port:** `5001` (set via env in `tests/setup.ts`)
- **DB Reset:** `resetTestDatabase()` is called in `tests/setup.ts` `beforeAll`
- **Concurrency:** Tests run sequentially (`singleFork: true`) to avoid SQLite write lock conflicts
- **No external services:** All tests run offline — Payment Simulator is in-process

---

## 6. Test Coverage Goals

| Component | Target Coverage | Technique |
| :--- | :--- | :--- |
| `utils/refund.ts` | 100% | Unit tests (TC-23a–d) |
| `utils/validators.ts` | >90% | ECP + BVA tests (TC-07, TC-02) |
| `/api/trains/*` | >85% | Integration tests |
| `/api/bookings/*` | >90% | Integration tests |
| `/api/admin/*` | >85% | Authorization + integration |
| Booking state machine | 100% | State transition tests |
| Concurrency path | 100% | TC-11 |
