# SLIDE 5: SOFTWARE AND HARDWARE SPECIFICATIONS

## 1. HARDWARE SPECIFICATIONS

### Development & Host Environment (Workstation)
- **Processor:** Intel Core i7 / AMD Ryzen 7 (8 Cores, 16 Threads, 3.2 GHz base clock or higher)
- **System Memory (RAM):** 16 GB DDR4 / DDR5 (8 GB minimum required for full-stack concurrent execution)
- **Storage:** 512 GB PCIe NVMe M.2 Solid State Drive (Minimum 10 GB free space for Node modules, SQLite database, and build artifacts)
- **Display Resolution:** 1920 × 1080 (Full HD) or higher, 16:9 aspect ratio (optimized for 1440 × 900 desktop viewport testing)
- **Network Interface:** Gigabit Ethernet / Wi-Fi 6 (802.11ax) for simulated multi-client concurrency tests

### Target Deployment / Client Devices
- **Desktop Clients:** Modern workstation or laptop running Chrome 110+, Edge 110+, Firefox 110+, or Safari 16+
- **Mobile / Responsive Viewports:** Android / iOS modern web browsers (375px to 768px responsive viewport breakpoints)
- **Client RAM Requirement:** 4 GB minimum

---

## 2. SOFTWARE SPECIFICATIONS & TECHNOLOGY STACK

```
+----------------------------------------------------------------------------------------------------+
|                                      FULL-STACK SOFTWARE STACK                                     |
+--------------------------+-------------------------------------+-----------------------------------+
|  FRONTEND PRESENTATION   |  BACKEND SERVICES & RUNTIME         |  DATA PERSISTENCE & QA            |
|  - React 18.3.1          |  - Node.js Runtime (v22.9.0+)       |  - SQLite 3 (Node built-in/WAL)   |
|  - TypeScript 5.7        |  - Express.js 4.21.1 Framework      |  - Vitest 2.1.5 Test Harness      |
|  - Tailwind CSS 3.4      |  - TSX 4.19 (TypeScript execution)  |  - Supertest 7.0 Integration Tests|
|  - Vite 6.0 Build Tool   |  - JWT 9.0 (Token Authentication)   |  - StarUML 6.0 UML Modeling       |
|  - Lucide React Icons    |  - BCrypt 5.1 (Password Hashing)    |  - Git & GitHub Version Control   |
+--------------------------+-------------------------------------+-----------------------------------+
```

### Detailed Component Inventory:

| Layer / Subsystem | Technology / Package | Version | Justification & Architectural Role |
|---|---|---|---|
| **Client Framework** | React | `^18.3.1` | Declarative, component-driven UI with state hooks and virtual DOM reconciliation |
| **Type Safety** | TypeScript | `^5.7.2` | Compile-time type checking eliminating runtime undefined exceptions across tiers |
| **Bundler & Dev Server**| Vite | `^6.0.0` | Sub-second Hot Module Replacement (HMR) and optimized Rollup tree-shaking |
| **Styling & Theme** | Tailwind CSS | `^3.4.15` | Utility-first CSS ensuring cohesive railway color palette and zero style pollution |
| **Backend Framework** | Express.js | `^4.21.1` | Lightweight, un-opinionated HTTP REST middleware engine |
| **Execution Runtime** | Node.js | `v22.9.0` | High-throughput asynchronous event loop with native `node:sqlite` support |
| **Authentication** | JSON Web Tokens (`jsonwebtoken`) | `^9.0.2` | Stateless, cryptographically signed bearer tokens for role-based passenger access |
| **Credential Security**| `bcrypt` | `^5.1.1` | Salted 10-round key derivation function guarding user passwords against rainbow tables |
| **Security Headers** | `helmet` | `^8.3.0` | Automated protection against XSS, clickjacking, MIME sniffing, and CSP exploits |
| **Traffic Throttling** | `express-rate-limit` | `^8.7.1` | DoS and brute-force mitigation on authentication and payment checkout endpoints |
| **Database Engine** | SQLite3 (WAL Mode) | `3.45+` | ACID-compliant embedded relational engine with zero-config zero-latency disk I/O |
| **Barcode / QR Engine**| `qrcode` | `^1.5.4` | Generation of 2D high-density verification matrices for e-ticket boarding passes |
| **Test Automation** | `vitest` + `supertest` | `^2.1.5` | Fast multi-threaded test runner executing 72 end-to-end integration test suites |
