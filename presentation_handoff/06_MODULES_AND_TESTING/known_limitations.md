# KNOWN SYSTEM LIMITATIONS & ARCHITECTURAL BOUNDARIES

To ensure academic rigor and transparent software engineering defense, this document explicitly records the design boundaries, operational assumptions, and architectural constraints of **RailReserve (Team 11, CSE2271)**.

---

## 1. ACADEMIC DEMONSTRATION BOUNDARIES

| Dimension | Real-World Railway System (IRCTC / CRIS) | RailReserve Academic Prototype | Engineering Justification |
|---|---|---|---|
| **Payment Gateway** | Live RBI-regulated banking switch (Visa, Mastercard, UPI, RuPay) | Deterministic in-memory payment simulator with Razorpay-compliant API contracts | Academic evaluation cannot process real financial transactions; simulation validates all states (`PENDING`, `SUCCESS`, `FAILURE`, `TIMEOUT`). |
| **Database Architecture** | Distributed multi-datacenter clusters (Oracle RAC / PostgreSQL sharded) | Embedded SQLite 3 with Write-Ahead Logging (WAL) and exclusive reservation locks | SQLite provides sub-50ms query latency, zero external network dependencies, and true ACID transaction isolation suitable for review demonstration. |
| **Train Timetables** | National dynamic scheduling over 12,000 passenger trains | High-fidelity simulated network across major junctions (SBC, MAS, NDLS, HWH, BCT, CSTM) | Focuses engineering evaluation on core reservation algorithms and concurrency locks rather than massive static data ingestion. |
| **Notification Services** | Telecom-integrated SMS gateways and automated WhatsApp push | In-app notification center, UI alerts, and console audit dispatch | Prevents external telecom API costs and carrier delays during live academic demonstrations. |

---

## 2. RUNTIME CONSTRAINTS & GRACEFUL DEGRADATION

1. **Client Viewport Constraints:** The user interface is responsive from mobile (375px) through full desktop (1920px). Viewports narrower than 320px are not formally supported.
2. **Offline Resilience:** While session tokens persist locally in `localStorage`, active booking and seat lock operations require an active network connection to the Express API server.
3. **Session Expiration:** JWT bearer tokens expire automatically after 24 hours. Expired tokens trigger graceful redirection to the passenger authentication gateway with a renewal prompt.

