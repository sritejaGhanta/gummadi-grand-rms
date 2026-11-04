# Enterprise Restaurant Management System (RMS) - Architecture

## System Overview
The Restaurant Management System (RMS) is an enterprise-grade, intranet-optimized solution engineered for high-concurrency food service operations. Designed for zero-internet operational dependency, it facilitates seamless coordination between dining floor staff, kitchen line cooks, cashiers, and restaurant management across local area network (LAN) / Wi-Fi.

```
                     +---------------------------------------+
                     |         Local Area Network (Wi-Fi)     |
                     +---------------------------------------+
                                         |
     +-------------------+---------------+------------------+-------------------+
     |                   |                                  |                   |
+----+----+         +----+----+                        +----+----+         +----+----+
| Admin   |         | Manager |                        | Kitchen |         | Waiter  |
| Browser |         | Browser |                        | Tablet  |         | Mobile  |
+----+----+         +----+----+                        +----+----+         +----+----+
     |                   |                                  |                   |
     +-------------------+---------------+------------------+-------------------+
                                         |
                                         v
                         +-------------------------------+
                         |   Nginx / Reverse Proxy LAN   |
                         +---------------+---------------+
                                         |
                     +-------------------+-------------------+
                     | HTTP REST (3000)  | WebSocket Gateway |
                     v                   v                   v
              +-------------------------------------------------+
              |        NestJS Modular Enterprise Engine         |
              |  - Dynamic RBAC Guard   - Validation Pipes      |
              |  - Real-time Gateway    - Audit Interceptor     |
              |  - Financial Engine     - Business Rule Logic   |
              +-------------------------+-----------------------+
                                        |
                                        v
                       +---------------------------------+
                       |   PostgreSQL Normalized DB      |
                       |  - UUID PKs     - ACID Engine   |
                       |  - Views        - Functions     |
                       +---------------------------------+
```

---

## 1. Technology Stack
- **Backend**: NestJS, Node.js 20+, TypeScript, TypeORM, Socket.IO Gateway, Swagger / OpenAPI 3.0.
- **Database**: PostgreSQL 16 with normalized relational schema, transactional isolation, UUID v4 primary keys, real-time views, and financial stored functions.
- **Web Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Glassmorphic Dashboard Design System.
- **Mobile Application**: React Native (Android APK standalone bundle) with LAN IP autodetection and real-time order sync.
- **Deployment**: Docker, Docker Compose, Linux systemd support.

---

## 2. Core Architectural Pillars

### A. Intranet Resilience & Zero-Cloud Dependency
All computational workflows, authentication token verifications, database transactions, and real-time socket events operate within the restaurant's local subnet. Internet outages do not disrupt restaurant order taking, kitchen prep, or customer billing.

### B. Dynamic Role-Based Access Control (RBAC)
Granular, database-driven permissions (`roles`, `permissions`, `role_permissions`). Modifying a role's permissions immediately takes effect without requiring code deployment or server restart.

### C. State Machine & Event-Driven Concurrency
- **Tables**: `AVAILABLE` -> `OCCUPIED` -> `BILLING` -> `AVAILABLE`
- **Order Items**: `PENDING` -> `ACCEPTED` -> `PREPARING` -> `READY` -> `DELIVERED`
- **Bills**: `UNPAID` -> `PAID` / `CANCELLED`
- Real-time socket rooms (`role:admin`, `role:manager`, `role:chef`, `role:staff`, `kitchen`, `orders`, `tables`) broadcast state changes instantaneously.

### D. Financial Precision & Idempotency
Double-entry accounting safety:
- Grand total calculation uses PostgreSQL stored functions and transactional locks.
- Idempotent bill generation returns existing active bill for table order to prevent duplicate invoicing.
- Duplicate payments on closed bills are strictly rejected at both application and database layers.
