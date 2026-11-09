# LIVE DEMO CHECKLIST & CONTINGENCY PLAN
## PRESIDENCY UNIVERSITY | CSE2271 MINI PROJECT REVIEW
### TEAM 11 — RAILRESERVE: RAILWAY RESERVATION SYSTEM

---

## 1. PRE-DEMO ENVIRONMENT VERIFICATION

Before presenting to the evaluators, ensure the following local services are running:

- [ ] **Backend Server:** Port 5000 (`http://localhost:5000`)
  - Verification: `curl http://localhost:5000/api/health` returns `{"status":"ok","mode":"DEMO"}`.
- [ ] **Frontend Client:** Port 5173 (`http://localhost:5173`)
  - Verification: Open `http://localhost:5173/login` in Google Chrome.
- [ ] **Database Integrity:** SQLite database present at `server/data/railway.db`.
  - Migrations applied: `001_passenger_accounts.sql`, `002_unreserved_and_platform_tickets.sql`.
- [ ] **Automated Test Health:** Run `npm run test` in `server/` to verify **72/72 tests passing**.

---

## 2. OFFICIAL DEMO CREDENTIALS

| Account Type | Identifier / Email | Password | Pre-seeded Test Data |
|---|---|---|---|
| **Passenger Demo** | `passenger.demo@railreserve.in` | `Passenger@123` | Active confirmed booking with PNR: `PNR-DEMO01` |
| **Alternate Passenger** | `rahul.sharma@example.com` | `Passenger@123` | Multiple historical bookings |
| **System Administrator** | `admin` | `Admin@1234` | Full access to KPI metrics and audit logs at `/admin` |

---

## 3. STEP-BY-STEP LIVE DEMO FLOW (2 TO 3 MINUTES)

### Step 1: Passenger Authentication (30 Seconds)
1. Open `http://localhost:5173` -> Notice automatic redirect to `/login` (login-first experience).
2. Point out branding, features list, password visibility toggle, and "Remember me" option.
3. Enter `passenger.demo@railreserve.in` and `Passenger@123`. Click **Sign In**.
4. Observe instantaneous transition to `/app` with zero screen flicker.

### Step 2: Journey Planner Dashboard (30 Seconds)
1. Highlight personalized greeting ("Welcome back, Passenger").
2. Walk evaluators through the **Three Core Categories**:
   - *Reserved Booking:* Coach and berth selection for long journeys.
   - *Unreserved Express:* Instant commuter tickets.
   - *Platform Pass:* Single-entry station access.
3. Show the active PNR banner (`PNR-DEMO01`) and "More Offerings" quick-action grid.

### Step 3: Train Discovery & Real-Time Availability (45 Seconds)
1. Click **Book Reserved Ticket** or navigate to `/search`.
2. Type `SBC` in From station -> point out debounced autocomplete suggestions (<50ms).
3. Select `MAS - MGR Chennai Central` for Destination.
4. Select travel date -> Click **Search Trains**.
5. Display the matching trains list with multi-class cards (1A, 2A, 3A, SL, 2S) and live seat counts.

### Step 4: Checkout & Payment Lifecycle (45 Seconds)
1. Select a train and click **Book Now** on 3A or Sleeper class.
2. Enter passenger name (`Rahul Sharma`, Age: `28`, Gender: `Male`, Berth: `Lower`).
3. Click **Proceed to Payment**.
4. Point out the **10-Minute Hold Countdown Timer** actively ticking down.
5. Review the transparent fare breakdown: Base Fare + Reservation Fee + Superfast Charge + 5% GST.
6. Select **UPI** or **Card** -> Click **Pay** to simulate payment success.
7. Observe immediate rendering of the **Confirmed Digital E-Ticket** with its unique 10-digit PNR and scannable 2D QR Code.

### Step 5: Administrator Oversight Portal (30 Seconds)
1. Open a new incognito window or log out, then navigate to `http://localhost:5173/admin/login`.
2. Enter username `admin` and password `Admin@1234`.
3. Highlight live KPI metric cards: Total Reservations, Confirmed Bookings, Waiting List Queue Depth, Total Cancellations, Gross Revenue.
4. Show the immutable audit trail displaying the exact timestamped entry for the ticket just booked.

---

## 4. CONTINGENCY & BACKUP PLAN
- **Browser State Conflict:** Open a fresh Incognito/Private window to `http://localhost:5173/login`.
- **Database Reset Required:** Run `npm run db:reset && npm run db:seed` in `server/` to restore factory state within 5 seconds.
- **Offline / Network Issues:** RailReserve runs entirely locally on `localhost:5000` and `localhost:5173` without requiring an internet connection.
- **Slide Embedding:** In the unlikely event of a hardware/projector glitch, all 5 UI screens are captured in high resolution within `05_UI_SCREENSHOTS/` and embedded directly in Slides 14, 15, and 16.

