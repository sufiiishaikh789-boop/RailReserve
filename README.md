# Railway Reservation System — Team 11
**Course:** Software Design and Development (CSE 2271)  
**Institution:** Presidency University, Bengaluru  
**Team:** Team 11

> ⚠️ **Academic Demonstration** — All trains, stations, schedules, passengers, and payments are fictional. No real tickets or payments are processed. This system has no connection to Indian Railways, IRCTC, or any real railway operator.

---

## Quick Start

### Prerequisites
- Node.js v22.5+ (v24.18+ recommended — uses built-in `node:sqlite`)
- npm v9+

### 1 — Backend Setup

```bash
cd server
npm install
npm run db:seed        # Seed fictional demo data (42 trains, 55 stations, 1,470 schedules)
npm run dev            # Starts on http://localhost:5000
```

### 2 — Frontend Setup

```bash
cd client
npm install
npm run dev            # Starts on http://localhost:5173
```

### Demo Credentials

| Role | Detail |
| :--- | :--- |
| **Admin login** | username: `admin`, password: `PresidencyAdmin2026!` (set via `ADMIN_PASSWORD` env var) |
| **Demo PNR lookup** | PNR: `PNR-DEMO01`, email: `demo.passenger@example.com` |
| **Passenger registration** | Self-serve registration via UI `/register` or login `/login` |

### Demo Train Services (Fictional Academic Data)

| Train | Name | Route | Type | Demo Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `D0002` | Demo Shatabdi Express | SBC → MAS | SUPERFAST | Standard confirmed seat booking flow |
| `D0005` | Demo Passenger Local | SBC → TK | PASSENGER | Waiting-list allocation demo (always WL) |
| `D0006` | Demo Night Express | SBC → HYB | SUPERFAST | Multi-class overnight journey |
| `D0007` | Demo Garib Rath Express | MAS → TVC | EXPRESS | 11-stop Kerala coastal corridor |
| `D0023` | Demo Delhi-Howrah Rajdhani | NDLS → HWH | SUPERFAST | Long-distance East-North corridor |
| `D0038` | Demo Nilgiri SF Express | MAS → CBE | SUPERFAST | Daytime intercity express |

---

## Available npm Scripts

### Backend (`server/`)

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start development server with hot-reload (tsx watch) |
| `npm run build` | TypeScript compile to `dist/` |
| `npm start` | Run compiled production server |
| `npm run db:seed` | Seed fictional demo data (clears existing) |
| `npm run db:reset` | Drop and recreate schema only |
| `npm test` | Run all 55 automated integration test cases |
| `npm run test:coverage` | Run tests with coverage report |

### Frontend (`client/`)

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start Vite dev server on port 5173 |
| `npm run build` | Build production bundle |
| `npm run preview` | Preview production build |

---

## Project Structure

```
Railway_Reservation_Project/
├── docs/                         # Academic documentation
│   ├── SRS.md                    # Software Requirements Specification
│   ├── ARCHITECTURE.md           # System architecture
│   ├── DATABASE_DESIGN.md        # Schema design and normalization
│   ├── UML_DIAGRAMS.md           # Use case, activity, ER diagrams
│   ├── SDLC_AND_PROCESS_MODEL.md # Agile process model
│   ├── PROJECT_PLAN.md           # WBS, Gantt, milestones
│   ├── RISK_REGISTER.md          # Risk identification and mitigation
│   ├── TEST_PLAN.md              # 27 test cases with BVA/ECP
│   ├── COURSE_CONCEPT_MAPPING.md # Maps code to course concepts
│   └── VIVA_GUIDE.md             # Faculty Q&A preparation guide
│
├── server/                       # Node.js + Express + TypeScript backend
│   ├── src/
│   │   ├── db/
│   │   │   ├── database.ts       # SQLite singleton (node:sqlite, WAL mode)
│   │   │   ├── schema.sql        # 13 normalized tables
│   │   │   ├── seed.ts           # Fictional demo data
│   │   │   ├── init.ts           # Idempotent schema initializer
│   │   │   └── reset.ts          # Database reset utility
│   │   ├── types/index.ts        # Shared TypeScript interfaces
│   │   ├── utils/
│   │   │   ├── pnr.ts            # PNR and transaction ID generators
│   │   │   ├── refund.ts         # Tiered cancellation refund calculator
│   │   │   └── validators.ts     # Server-side input validation
│   │   ├── repositories/
│   │   │   ├── TrainRepository.ts   # Train search, schedule, inventory queries
│   │   │   └── BookingRepository.ts # Atomic booking, payment, cancellation, WL
│   │   ├── controllers/
│   │   │   ├── TrainController.ts   # GET /api/trains/search, /api/stations
│   │   │   ├── BookingController.ts # POST /api/bookings, payment, ticket, cancel
│   │   │   └── AdminController.ts   # POST /api/admin/login, dashboard
│   │   ├── middleware/index.ts   # Error handler, JWT auth, 404 handler
│   │   └── index.ts              # Express app entry + all routes
│   ├── tests/
│   │   ├── setup.ts              # Test DB initialization
│   │   └── api.test.ts           # 27 integration test cases (Vitest + Supertest)
│   ├── data/railway.db           # SQLite database (git-ignored)
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
│
├── client/                       # React + TypeScript + Vite + Tailwind frontend
│   ├── src/
│   │   ├── api/index.ts          # Typed HTTP client for all API calls
│   │   ├── types/index.ts        # Shared TypeScript types
│   │   ├── utils/index.ts        # Date/time/currency formatters
│   │   ├── App.tsx               # All pages + routing (React Router v6)
│   │   ├── main.tsx              # React root
│   │   └── index.css             # Design system (glassmorphism, tokens)
│   ├── index.html
│   ├── vite.config.ts            # Vite + Tailwind + API proxy
│   └── package.json
│
├── .env.example                  # Environment variable template
├── .gitignore
└── README.md
```

---

## Architecture Overview

```
┌─────────────────────┐     HTTP/JSON     ┌──────────────────────┐
│  React Frontend     │ ◄────────────────► │  Express API Server  │
│  (Port 5173)        │                    │  (Port 5000)         │
│  Vite + Tailwind    │                    │  TypeScript          │
└─────────────────────┘                    └──────────┬───────────┘
                                                      │
                                           ┌──────────▼───────────┐
                                           │  SQLite Database      │
                                           │  (node:sqlite WAL)    │
                                           │  server/data/         │
                                           │  railway.db           │
                                           └──────────────────────┘
```

### Key Design Decisions

| Decision | Rationale |
| :--- | :--- |
| **Node.js v24 built-in `node:sqlite`** | Zero native compilation, ships with Node, no version conflicts |
| **WAL mode** | Allows concurrent reads without blocking writes |
| **`BEGIN IMMEDIATE` transactions** | Prevents overbooking via write serialization |
| **Repository pattern** | Separates SQL from business logic, testable |
| **Idempotency keys** | Prevents duplicate bookings on network retry |
| **JWT for admin** | Stateless authentication, academically demonstrable |

---

## API Endpoints

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service health check | None |
| `GET` | `/api/stations` | List all stations | None |
| `GET` | `/api/trains/search?from&to&date` | Search available trains | None |
| `GET` | `/api/schedules/:id` | Get schedule details | None |
| `POST` | `/api/bookings` | Create new booking | None |
| `POST` | `/api/bookings/:id/payment` | Process payment (simulated) | None |
| `GET` | `/api/bookings/pnr/:pnr` | Retrieve e-ticket by PNR | None |
| `GET` | `/api/bookings` | Booking history by contact | None |
| `GET` | `/api/bookings/:pnr/cancellation-preview` | Cancellation refund preview | None |
| `POST` | `/api/bookings/:pnr/cancel` | Cancel booking | Contact match |
| `POST` | `/api/admin/login` | Admin JWT login | None |
| `GET` | `/api/admin/dashboard` | System statistics | JWT |
| `GET` | `/api/admin/trains` | All trains | JWT |
| `GET` | `/api/admin/bookings` | All bookings | JWT |
| `PATCH` | `/api/admin/inventory/:scheduleId/:classCode` | Update seat inventory | JWT |

---

## Course Concept Mapping

See [`docs/COURSE_CONCEPT_MAPPING.md`](docs/COURSE_CONCEPT_MAPPING.md) for the complete mapping of every implemented feature to the specific CSE 2271 module topic.

| Module | Implemented As |
| :--- | :--- |
| **Requirements Engineering** | 20 FRs + 7 NFRs in `docs/SRS.md` |
| **SDLC / Process Model** | Iterative Agile model in `docs/SDLC_AND_PROCESS_MODEL.md` |
| **UML Diagrams** | Use Case, Activity, Swimlane, ER in `docs/UML_DIAGRAMS.md` |
| **Architecture** | 4-layer architecture in `docs/ARCHITECTURE.md` |
| **Database Design** | 13 tables, 3NF, FK constraints in `docs/DATABASE_DESIGN.md` |
| **Testing** | V-model, BVA, ECP, 27 test cases in `docs/TEST_PLAN.md` |
| **Concurrency** | `BEGIN IMMEDIATE` transactions in `BookingRepository.ts` |
| **Design Patterns** | Repository, MVC, Singleton, Middleware Chain |

---

## License

Academic project — Presidency University, Bengaluru. Not for commercial use.
