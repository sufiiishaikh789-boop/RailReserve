# UI SCREENSHOTS & FEATURE WALKTHROUGH CAPTIONS

This document provides academic captions, functional descriptions, and oral narration cues for the 5 genuine high-resolution screenshots captured directly from the running **RailReserve** application for the **CSE2271 Mini Project** presentation.

---

## SCREENSHOT 1: PASSENGER AUTHENTICATION GATEWAY
- **File Name:** `01_login_or_register.png`
- **Application URL:** `http://localhost:5173/login`
- **Target Slide:** Slide 14 (Module 1 & 2 Snapshots)
- **Visual Description:**
  - Full-screen railway-themed authentication portal.
  - Left panel: High-contrast RailReserve branding, feature bullets (real-time availability, instant PNR tracking, instant cancellations).
  - Right panel: Secure login card featuring email/mobile input fields, password visibility toggle, "Remember me" option, "Forgot Password?" link, and "Sign In to RailReserve" primary action button.
  - Quick-switch link to Passenger Registration (`/register`) and Administrator Portal (`/admin/login`).
- **Oral Narration Script for Presenter:**
  > *"As demonstrated on screen, RailReserve replaces the cluttered public train search entry point with a modern, secure Passenger Authentication Gateway. Passwords undergo client-side validation and server-side salting via bcrypt (10 rounds). Upon successful credential verification, an HS256-signed JWT token is issued, establishing a secure 24-hour authenticated session."*

---

## SCREENSHOT 2: PASSENGER DASHBOARD & 3-CATEGORY JOURNEY PLANNER
- **File Name:** `02_passenger_dashboard.png`
- **Application URL:** `http://localhost:5173/app`
- **Target Slide:** Slide 14 (Module 1 & 2 Snapshots)
- **Visual Description:**
  - Modern passenger home screen showing personalized greeting ("Welcome back, Passenger"), active PNR summary banner, and navigation header.
  - **Journey Planner Section:** Three large, illustrated booking category cards:
    1. **Reserved Booking:** Full sleeper & AC coaches with coach and berth number allocations.
    2. **Unreserved Express:** Instant day-commute ticketing without seat reservations.
    3. **Platform Pass:** Station entry permits with automated timestamp validity.
  - **More Offerings Grid:** Quick-action tiles for PNR Status Lookup, Booking History, Instant Refunds, and Customer Support.
- **Oral Narration Script for Presenter:**
  > *"Once logged in, passengers enter the centralized Journey Planner dashboard. In direct alignment with modern transit architectures, travel is categorized into three distinct operational pipelines: Reserved Long-Distance, Unreserved Daily Commute, and Platform Access. This eliminates cognitive overload and routes passengers directly to their intended workflow within one click."*

---

## SCREENSHOT 3: TRAIN DISCOVERY & MULTI-CLASS AVAILABILITY
- **File Name:** `03_train_search_results.png`
- **Application URL:** `http://localhost:5173/search` (and `/results`)
- **Target Slide:** Slide 15 (Module 3 Snapshots)
- **Visual Description:**
  - Interactive search card with station autocomplete (SBC — KSR Bengaluru, MAS — MGR Chennai Central, NDLS, HWH), date picker, and swap button.
  - Multi-class travel filter pills: All Classes, 1A (First AC), 2A (Second AC), 3A (Third AC), SL (Sleeper), and 2S (Second Sitting).
  - Search trigger initiating debounced REST queries returning live train schedules, departure/arrival timestamps, journey durations, dynamic fare breakdowns, and real-time seat availability badges.
- **Oral Narration Script for Presenter:**
  > *"The Train Discovery engine performs sub-50ms prefix search over our normalized SQLite database. When passengers query routes, the backend executes an atomic multi-table join computing live seat inventory across all coach classes, transparently displaying base fares, superfast surcharges, and statutory GST."*

---

## SCREENSHOT 4: REAL-TIME BOOKING & CHECKOUT ENGINE
- **File Name:** `04_booking_payment.png`
- **Application URL:** `http://localhost:5173/app/platform` (and `/payment`)
- **Target Slide:** Slide 16 (Module 4 & 5 Snapshots)
- **Visual Description:**
  - Dedicated booking checkout interface with dynamic passenger/ticket counters, statutory fee breakdowns, and real-time total payable amount.
  - Prominent "Pay & Issue Pass" checkout button integrated with the payment simulation state machine.
  - Includes academic demonstration security badge, idempotency protection notice, and instantaneous receipt generation upon confirmation.
- **Oral Narration Script for Presenter:**
  > *"Shown here is our checkout and reservation execution layer. When a reservation is triggered, our backend engages an atomic inventory hold lock with an active countdown timer. Under the hood, payments are processed via an idempotent state machine preventing duplicate charges or race conditions before final ticket issuance."*

---

## SCREENSHOT 5: ADMINISTRATIVE OVERSIGHT & AUDIT PORTAL
- **File Name:** `05_ticket_or_admin.png`
- **Application URL:** `http://localhost:5173/admin`
- **Target Slide:** Slide 16 (Module 4 & 5 Snapshots)
- **Visual Description:**
  - High-privilege administrative oversight dashboard accessible solely to administrators.
  - Real-time KPI summary metric cards: Total Reservations, Confirmed Bookings, Active Waiting List Queue Depth, Total Cancellations, and Gross Platform Revenue.
  - Master reservation ledger displaying PNR numbers, journey dates, passenger contacts, booking statuses, and live action triggers.
- **Oral Narration Script for Presenter:**
  > *"To ensure operational transparency and auditability, RailReserve provides an Administrative Oversight Portal. System administrators have real-time visibility into overall bookings, revenue metrics, and waitlist queues, backed by immutable audit logs that trace every seat allocation, cancellation penalty, and refund."*

