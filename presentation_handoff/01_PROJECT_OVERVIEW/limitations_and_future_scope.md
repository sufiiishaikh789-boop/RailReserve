# SLIDE 18: LIMITATIONS & FUTURE SCOPE

## 1. PROJECT LIMITATIONS (ACADEMIC BOUNDARIES)
While RailReserve represents a production-grade full-stack architecture, certain boundaries were established to maintain academic scope for the **CSE2271 Mini Project**:

1. **Simulated Payment Gateway:** Financial checkout simulates UPI/Card network processing and webhooks locally rather than processing real fiat currency via bank networks.
2. **Single-Node SQLite Architecture:** Database operations utilize SQLite WAL mode suitable for academic and departmental load; multi-datacenter horizontal sharding is out of current scope.
3. **Simulated Indian Railways Timetable:** Train routes, station codes (SBC, MAS, NDLS, HWH), and fare tariffs represent realistic simulated models rather than live synchronization with CRIS/IRCTC APIs.
4. **Mocked SMS / Email Dispatch:** Booking confirmation notifications and OTP alerts are simulated via console loggers and frontend notification toasts rather than paid SMS gateways (Twilio / SendGrid).

---

## 2. FUTURE SCOPE & ENHANCEMENTS

### Phase 1: Distributed Architecture & Live Integrations (Near-Term)
- **PostgreSQL / Distributed CockroachDB Migration:** Transition from single-node SQLite to distributed PostgreSQL with connection pooling (PgBouncer) for high-scale enterprise multi-threading.
- **Production Payment Gateway Integration:** Enable live Razorpay / Stripe webhooks with cryptographic SHA-256 signature verification.
- **SMS & WhatsApp Dispatch Integration:** Automated ticket PDF delivery via WhatsApp Business API and transactional SMS for PNR alerts.

### Phase 2: AI & Smart Passenger Services (Mid-Term)
- **Predictive Waitlist Confirmation Engine:** Machine-learning regression model analyzing historical cancellation patterns to display a percentage confirmation probability (e.g., *"WL 14 has an 86% probability of CNF"*).
- **Dynamic Demand-Based Pricing:** Algorithmic fare adjustment scaling ticket prices based on seasonal demand, route popularity, and booking velocity.

### Phase 3: Hardware & Edge Mobility (Long-Term)
- **Offline TTE (Traveling Ticket Examiner) Handheld Sync:** PWA-based mobile client enabling offline ticket validation on trains via Bluetooth barcode scanners with delayed conflict-resolution sync.
- **Biometric Station Gate Integration:** Automated platform and reserved coach turnstile access using facial recognition / Aadhaar-linked QR verification.
