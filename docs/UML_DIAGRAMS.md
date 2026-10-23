# UML Diagrams — Railway Reservation System (Team 11)
**Course:** Software Design and Development (CSE 2271) | Presidency University, Bengaluru  
**Tool:** PlantUML source files in `docs/diagrams/` — render at https://www.plantuml.com/plantuml/uml/ or via VS Code PlantUML extension.

---

## 1. Use Case Diagram

> The Use Case Diagram captures the external actors and the functional goals they pursue within the system boundary. It uses `<<include>>` for mandatory sub-goals, `<<extend>>` for conditional optional paths, and directed associations for actor-to-use-case relationships. (Source: Ivar Jacobson's use-case methodology, as covered in Module 2 course notes.)

```mermaid
graph LR
    subgraph "Railway Reservation System"
        UC1["Search Trains"]
        UC2["View Train Details"]
        UC3["Check Seat Availability"]
        UC4["Select Train and Class"]
        UC5["Enter Passenger Details"]
        UC6["Book Ticket"]
        UC7["Opt for Waiting List"]
        UC8["Make Simulated Payment"]
        UC9["Receive E-Ticket"]
        UC10["View Booking History"]
        UC11["View Ticket Details"]
        UC12["Cancel Ticket"]
        UC13["View Refund Status"]
        UC14["Log In as Administrator"]
        UC15["Manage Demo Trains"]
        UC16["Manage Routes & Schedules"]
        UC17["Manage Fare & Seat Inventory"]
        UC18["View Reservations"]
        UC19["View System Dashboard"]
        UC20["Process Simulated Payment"]
        UC21["Return Payment Result"]
        UC22["Process Simulated Refund"]
    end

    Passenger --> UC1
    Passenger --> UC2
    Passenger --> UC4
    Passenger --> UC5
    Passenger --> UC6
    Passenger --> UC10
    Passenger --> UC11
    Passenger --> UC12

    UC1 -->|includes| UC3
    UC6 -->|includes| UC3
    UC6 -->|includes| UC8
    UC6 -->|includes| UC9
    UC6 -.->|extends| UC7
    UC12 -->|includes| UC22
    UC12 -->|includes| UC13

    Admin --> UC14
    Admin --> UC15
    Admin --> UC16
    Admin --> UC17
    Admin --> UC18
    Admin --> UC19
    UC15 -->|includes| UC14
    UC16 -->|includes| UC14

    PaySim["Payment Simulator"] --> UC20
    PaySim --> UC21
    PaySim --> UC22
    UC8 --> PaySim
```

> **Semantic Notes:**
> - `<<include>>` is used for mandatory sub-behaviours that always execute as part of the parent use case (e.g., `Check Seat Availability` is always executed when `Book Ticket` runs).
> - `<<extend>>` is used for optional/conditional additions (e.g., `Opt for Waiting List` only extends `Book Ticket` when confirmed seats are unavailable).
> - All administrative actions include `Log In as Administrator` because they require prior authorization.

---

## 2. Activity Diagram — Complete Booking & Cancellation Workflow

> The Activity Diagram models the sequential control flow of the booking and cancellation lifecycle, showing decision branches, action states, and final outcomes. Fork/join bars are intentionally NOT used for booking commit because seat allocation, payment recording, and ticket generation must occur sequentially within a single database transaction — not in parallel.

```mermaid
flowchart TD
    Start([🟢 Start]) --> A[Enter Source, Destination, Travel Date]
    A --> B{Valid Parameters?}
    B -- No --> C[Display Validation Error\nSame Station or Past Date]
    C --> End1([🔴 Stop])
    B -- Yes --> D[Query Train Routes & Schedules]
    D --> E{Matching Trains Found?}
    E -- No --> F[Display: No Direct Trains Found]
    F --> End2([🔴 Stop])
    E -- Yes --> G[Display Trains, Times, Fares, Availability]
    G --> H[Select Train and Travel Class]
    H --> I[Enter Passenger Details]
    I --> J{Details Valid?}
    J -- No --> K[Display Passenger Validation Errors]
    K --> End3([🔴 Stop])
    J -- Yes --> L[Calculate Fare Breakdown]
    L --> M[Recheck Real-Time Seat Availability]
    M --> N{CNF Seats Available?}
    N -- Yes --> O[Set Status: CONFIRMED]
    N -- No --> P{WL Capacity Available?}
    P -- No --> Q[Display: Train Fully Booked]
    Q --> End4([🔴 Stop])
    P -- Yes --> R{Accept Waiting List?}
    R -- No --> S[Booking Aborted by User]
    S --> End5([🔴 Stop])
    R -- Yes --> T[Set Status: WAITING_LIST]
    O --> U[Open Simulated Payment Modal]
    T --> U
    U --> V{Payment Outcome?}
    V -- Failure/Decline --> W[Display Payment Failed\nRelease Held Inventory\nLog Audit Event]
    W --> End6([🔴 Stop: No Ticket Created])
    V -- User Cancelled --> X[Display Cancelled\nRelease Held State]
    X --> End7([🔴 Stop])
    V -- Payment Success --> Y[BEGIN IMMEDIATE Transaction]
    Y --> Z{Booking Type?}
    Z -- Confirmed --> AA[Decrement Available Seats\nAssign Coach & Berth Numbers]
    Z -- Waiting List --> AB[Increment WL Count\nAssign FIFO Queue Position]
    AA --> AC[Generate Unique PNR Number]
    AB --> AC
    AC --> AD[Save Booking & Passenger Records]
    AD --> AE[Record Successful Payment]
    AE --> AF[Log Audit Event]
    AF --> AG[Render Digital E-Ticket]
    AG --> AH[User Views / Prints E-Ticket]
    AH --> AI{Cancel Ticket?}
    AI -- No --> End8([🟢 Journey Completed])
    AI -- Yes --> AJ[Verify PNR & Check Eligibility]
    AJ --> AK{Eligible for Cancellation?}
    AK -- No --> AL[Display: Ineligible / Past Journey]
    AL --> End9([🔴 Stop])
    AK -- Yes --> AM[Calculate Refund by Time Window]
    AM --> AN[Display Refund Summary & Deductions]
    AN --> AO{Confirm Cancellation?}
    AO -- No --> AP[Cancellation Aborted]
    AP --> End10([🔴 Stop])
    AO -- Yes --> AQ[Mark Booking CANCELLED]
    AQ --> AR{Was CNF Ticket?}
    AR -- Yes --> AS[Release Seat to Inventory]
    AS --> AT{WL Passengers Queued?}
    AT -- Yes --> AU[Promote WL-1 to CONFIRMED\nAssign Freed Seat\nRenumber Remaining WL]
    AT -- No --> AV[Process Simulated Refund]
    AU --> AV
    AR -- WL Ticket --> AW[Decrement WL Count & Renumber]
    AW --> AV
    AV --> AX[Display Refund Reference & Confirmation]
    AX --> End11([🟢 Stop])
```

---

## 3. Swimlane Activity Diagram — Responsibility Handoffs

> A Swimlane Activity Diagram augments the Activity Diagram by explicitly partitioning actions across organizational roles or system boundaries. It shows **who** is responsible for each action, making architectural boundaries and handoffs immediately visible to reviewers.

```mermaid
flowchart TD
    subgraph Passenger["🧍 Passenger"]
        P1[Submit Search\nSource, Dest, Date]
        P2[Select Train & Class]
        P3[Enter Passenger Details]
        P4[View Fare Breakdown]
        P5[Choose Payment Outcome]
        P6[View/Print E-Ticket]
        P7[Request Cancellation\nEnter PNR + Contact]
        P8[Confirm Cancellation]
        P9[View Refund Confirmation]
    end

    subgraph System["⚙️ Railway Reservation System"]
        S1[Validate Station & Date]
        S2[Execute Route Query]
        S3[Render Train Cards]
        S4[Validate Passenger Data]
        S5[Calculate Fare Summary]
        S6[BEGIN IMMEDIATE Transaction]
        S7[Allocate Seat / WL Position]
        S8[Generate PNR & E-Ticket]
        S9[Verify PNR & Eligibility]
        S10[Calculate Refund Tiers]
        S11[Execute Cancellation Transaction]
        S12[Promote WL Passenger]
        S13[Log Audit Events]
    end

    subgraph Payment["💳 Payment Simulator"]
        PAY1[Present Payment Interface]
        PAY2[Return Simulation Result]
        PAY3[Process Simulated Refund]
        PAY4[Return Refund Reference]
    end

    subgraph Admin["🔐 Administrator"]
        A1[Login with Admin Credentials]
        A2[View Analytics Dashboard]
        A3[Adjust Seat Quotas]
        A4[Add/Modify Train Schedules]
    end

    P1 --> S1
    S1 --> S2
    S2 --> S3
    S3 --> P2
    P2 --> P3
    P3 --> S4
    S4 --> S5
    S5 --> P4
    P4 --> PAY1
    PAY1 --> P5
    P5 --> PAY2
    PAY2 --> S6
    S6 --> S7
    S7 --> S8
    S8 --> P6
    P6 --> P7
    P7 --> S9
    S9 --> S10
    S10 --> P8
    P8 --> S11
    S11 --> S12
    S12 --> PAY3
    PAY3 --> PAY4
    PAY4 --> S13
    S13 --> P9
    A1 --> A2
    A2 --> A3
    A3 --> S13
    A2 --> A4
    A4 --> S13
```

---

## 4. Entity-Relationship (ER) Diagram

> The ER Diagram maps the normalized relational schema of the SQLite database. Each entity corresponds directly to a database table defined in `server/src/db/schema.sql`.

```mermaid
erDiagram
    stations {
        INTEGER id PK
        TEXT code UK
        TEXT name
        TEXT city
        TEXT state
    }

    trains {
        INTEGER id PK
        TEXT train_number UK
        TEXT name
        TEXT type
        INTEGER active
    }

    train_routes {
        INTEGER id PK
        INTEGER train_id FK
        INTEGER station_id FK
        INTEGER stop_sequence
        TEXT arrival_time
        TEXT departure_time
        INTEGER day_offset
        INTEGER distance_km
    }

    train_classes {
        INTEGER id PK
        INTEGER train_id FK
        TEXT class_code
        TEXT class_name
        REAL base_fare
        INTEGER total_seats
        INTEGER max_waiting_list
    }

    schedules {
        INTEGER id PK
        INTEGER train_id FK
        TEXT journey_date
        TEXT status
    }

    seat_inventory {
        INTEGER id PK
        INTEGER schedule_id FK
        TEXT class_code
        INTEGER total_seats
        INTEGER available_seats
        INTEGER waiting_list_count
        INTEGER max_waiting_list
    }

    bookings {
        INTEGER id PK
        TEXT pnr_number UK
        INTEGER schedule_id FK
        INTEGER source_station_id FK
        INTEGER dest_station_id FK
        TEXT journey_date
        TEXT class_code
        INTEGER total_passengers
        REAL total_fare
        TEXT booking_status
        TEXT payment_status
        TEXT contact_email
        TEXT contact_phone
        TEXT idempotency_key UK
        TEXT created_at
        TEXT updated_at
    }

    booking_passengers {
        INTEGER id PK
        INTEGER booking_id FK
        TEXT passenger_name
        INTEGER age
        TEXT gender
        TEXT berth_preference
        TEXT allocated_seat
        TEXT status
        INTEGER wl_number
    }

    payments {
        INTEGER id PK
        INTEGER booking_id FK
        TEXT transaction_id UK
        REAL amount
        TEXT payment_method
        TEXT status
        TEXT failure_reason
        TEXT created_at
    }

    cancellations {
        INTEGER id PK
        INTEGER booking_id FK
        TEXT cancellation_reference UK
        INTEGER seats_cancelled
        REAL original_fare
        REAL cancellation_charge
        REAL refund_amount
        TEXT refund_status
        TEXT cancelled_at
    }

    waiting_list_queue {
        INTEGER id PK
        INTEGER schedule_id FK
        TEXT class_code
        INTEGER booking_passenger_id FK
        INTEGER queue_position
        TEXT status
        TEXT created_at
    }

    audit_logs {
        INTEGER id PK
        TEXT event_type
        INTEGER booking_id FK
        TEXT description
        TEXT ip_address
        TEXT timestamp
    }

    admin_users {
        INTEGER id PK
        TEXT username UK
        TEXT password_hash
        TEXT role
        TEXT created_at
    }

    trains ||--o{ train_routes : "has stops"
    stations ||--o{ train_routes : "part of"
    trains ||--o{ train_classes : "offers"
    trains ||--o{ schedules : "runs on"
    schedules ||--o{ seat_inventory : "tracks"
    schedules ||--o{ bookings : "booked for"
    stations ||--o{ bookings : "source of"
    stations ||--o{ bookings : "destination of"
    bookings ||--|{ booking_passengers : "contains"
    bookings ||--o| payments : "paid via"
    bookings ||--o| cancellations : "cancelled by"
    bookings ||--o{ audit_logs : "audited in"
    booking_passengers ||--o| waiting_list_queue : "queued in"
    schedules ||--o{ waiting_list_queue : "queues for"
```

---

## 5. Diagram Rendering Instructions

| Diagram | Source File | Render Method |
| :--- | :--- | :--- |
| Use Case Diagram | `docs/diagrams/use-case-diagram.puml` | PlantUML Online Server or VS Code Extension |
| Activity Diagram | `docs/diagrams/activity-diagram.puml` | PlantUML Online Server or VS Code Extension |
| Swimlane Diagram | `docs/diagrams/swimlane-diagram.puml` | PlantUML Online Server or VS Code Extension |
| ER Diagram | `docs/diagrams/er-diagram.puml` | PlantUML Online Server or VS Code Extension |

**PlantUML Online:** Paste `.puml` content at https://www.plantuml.com/plantuml/uml/  
**VS Code:** Install *PlantUML* extension by jebbs, then use `Alt+D` to preview.
