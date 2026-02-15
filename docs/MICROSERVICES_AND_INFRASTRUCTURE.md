# Tulifo Gig Platform — Microservices & Infrastructure Documentation

> **Version**: 1.0 &nbsp;|&nbsp; **Last Updated**: February 11, 2026 &nbsp;|&nbsp; **Services**: 15 microservices + 1 blockchain service

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Microservices Reference](#microservices-reference)
4. [Shared Packages](#shared-packages)
5. [Infrastructure Components](#infrastructure-components)
6. [API Gateway (Kong)](#api-gateway-kong)
7. [Monitoring & Observability](#monitoring--observability)
8. [Containerization](#containerization)
9. [Deployment Configurations](#deployment-configurations)
10. [Environment Variables](#environment-variables)
11. [Inter-Service Communication](#inter-service-communication)
12. [Database Architecture](#database-architecture)
13. [Quick Start Guide](#quick-start-guide)

---

## Architecture Overview

```mermaid
graph TB
    subgraph Frontend
        NextJS["Next.js 16<br/>(React 19)"]
    end

    subgraph Gateway["API Gateway"]
        Kong["Kong :8000"]
        Konga["Konga UI :1337"]
    end

    subgraph NodeServices["Node.js Services (TypeScript)"]
        Auth["auth-service :3001"]
        User["user-service :3002"]
        Project["project-service :3003"]
        Payment["payment-service :3004"]
        Message["message-service :3005"]
        Notif["notification-service :3006"]
        Session["session-service :3009"]
        Worker["worker-service :3010"]
        Client["client-service :3011"]
        Escrow["escrow-service :3012"]
        Dispute["dispute-service :3013"]
        Review["review-service :3014"]
        Search["search-service :3015"]
    end

    subgraph GoService["Go Service"]
        Booking["booking-service :3007"]
    end

    subgraph PythonService["Python Service"]
        Matching["matching-service :3008"]
    end

    subgraph DataStores["Data Stores"]
        Postgres["Supabase Postgres"]
        MongoDB["MongoDB :27017"]
        Redis["Redis :6379"]
        ES["Elasticsearch :9200"]
    end

    subgraph MsgQueue["Message Queue"]
        RabbitMQ["RabbitMQ :5672"]
    end

    subgraph Monitoring["Observability Stack"]
        Prom["Prometheus :9090"]
        Grafana["Grafana :3000"]
        Logstash["Logstash :5001"]
        Kibana["Kibana :5601"]
    end

    subgraph External["External Services"]
        Stripe["Stripe API"]
        SMTP["SMTP (MailHog :1025)"]
    end

    NextJS -->|"HTTP/WS"| Kong
    Kong --> Auth & User & Project & Payment & Message & Notif
    Kong --> Booking & Matching & Session & Worker & Client
    Kong --> Escrow & Dispute & Review & Search

    Auth & User & Project & Payment --> Postgres
    Auth & User & Project --> Redis
    Message & Notif & Session --> MongoDB
    Worker --> MongoDB & ES
    Client --> MongoDB & Postgres
    Escrow & Dispute & Review --> Postgres
    Search --> ES
    Matching --> Postgres & MongoDB
    Payment --> Stripe
    Notif --> SMTP
    Prom --> Grafana
    ES --> Kibana & Logstash
```

---

## Technology Stack

| Layer | Technology | Version |
|---|---|---|
| **Languages** | TypeScript, Go, Python, Solidity | TS 5.x, Go 1.23, Python 3.11/12, Solidity 0.8.20 |
| **Node.js Runtime** | Node.js | 20 (Alpine) |
| **Node.js Framework** | Express.js | 4.18+ |
| **Go Framework** | Gin | 1.9.1 |
| **Python Framework** | FastAPI + Uvicorn | 0.109.0 / 0.27.0 |
| **ORM / Query** | Drizzle ORM (Node.js), pgx (Go), asyncpg (Python) | — |
| **Validation** | Zod (Node.js), Gin binding (Go), Pydantic (Python) | — |
| **Auth** | JWT (jsonwebtoken / golang-jwt / python-jose) | — |
| **Password Hashing** | bcryptjs (Node.js), passlib (Python) | — |
| **Relational DB** | PostgreSQL (via Supabase) | 15+ |
| **Document DB** | MongoDB | 7 |
| **Cache / Sessions** | Redis | 7 (Alpine) |
| **Search Engine** | Elasticsearch | 8.11.0 |
| **Message Broker** | RabbitMQ | 3 (Management Alpine) |
| **API Gateway** | Kong + Konga | latest |
| **Monitoring** | Prometheus, Grafana, Logstash, Kibana | Various |
| **Email (Dev)** | MailHog | latest |
| **Payments** | Stripe | API v2023-10-16 |
| **Package Manager** | pnpm (monorepo workspaces) | — |
| **Containerization** | Docker + Docker Compose | v3.8 |

---

## Microservices Reference

### Service 1: `auth-service` — Authentication

| Property | Value |
|---|---|
| **Port** | 3001 |
| **Language** | TypeScript (Express) |
| **Database** | PostgreSQL (Supabase) + Redis |
| **Route Prefix** | `/api/auth` |

**Endpoints:**

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Register new user (worker/client) |
| `POST` | `/api/auth/login` | No | Login with email/password |
| `POST` | `/api/auth/refresh` | No | Refresh access token |
| `GET` | `/api/auth/me` | JWT | Get current user profile |

**Key Implementation Details:**
- Password hashing: `bcryptjs` with 12 salt rounds
- Input validation: `zod` schemas (`registerSchema`, `loginSchema`)
- JWT token pair: access token + refresh token via `generateTokenPair()`
- On registration, creates role-specific profile (`worker_profiles` or `client_profiles`)
- Active/deactivated user check on login

**Database Schema (Drizzle):**
- `users` — id, email, passwordHash, name, role, emailVerified, timestamps
- `sessions` — id, userId (FK→users), token, expiresAt, timestamps

---

### Service 2: `user-service` — User Management

| Property | Value |
|---|---|
| **Port** | 3002 |
| **Language** | TypeScript (Express) |
| **Database** | PostgreSQL (Supabase) + Redis |
| **Route Prefixes** | `/api/users`, `/api/workers`, `/api/clients` |

**Route Groups:**

| Prefix | File | Purpose |
|---|---|---|
| `/api/users` | `user.routes.ts` | General user profile CRUD |
| `/api/workers` | `worker.routes.ts` (5KB) | Worker-specific operations |
| `/api/clients` | `client.routes.ts` | Client-specific operations |

**Database Schema (Drizzle):**
- `user_profiles` — userId, bio, skills (JSON array), experience, location, avatar, portfolio (JSON), socialLinks (JSON)
- `user_settings` — userId, notifications (JSON), privacy (JSON), preferences (JSON)

---

### Service 3: `project-service` — Project & Bid Management

| Property | Value |
|---|---|
| **Port** | 3003 |
| **Language** | TypeScript (Express) |
| **Database** | PostgreSQL (Supabase) + Redis |
| **Route Prefixes** | `/api/projects`, `/api/bids` |

**Route Groups:**

| Prefix | File | Purpose |
|---|---|---|
| `/api/projects` | `project.routes.ts` | Project CRUD (create, list, update, delete) |
| `/api/bids` | `bid.routes.ts` | Bidding system for workers on projects |

---

### Service 4: `payment-service` — Payments (Stripe)

| Property | Value |
|---|---|
| **Port** | 3004 |
| **Language** | TypeScript (Express) |
| **Database** | PostgreSQL (Supabase) |
| **External** | Stripe API (v2023-10-16) |
| **Route Prefix** | `/api/payments` |

**Key Implementation Details:**
- Stripe SDK initialized with `STRIPE_SECRET_KEY`
- Special raw body parser for webhook route: `POST /api/payments/webhook`
- Webhook signature validation via `STRIPE_WEBHOOK_SECRET`
- Standard JSON parser for all other routes

---

### Service 5: `message-service` — Real-Time Messaging

| Property | Value |
|---|---|
| **Port** | 3005 |
| **Language** | TypeScript (Express + Socket.io) |
| **Database** | MongoDB (`flexwork_messages`) |
| **Protocol** | HTTP + WebSocket (Socket.io) |
| **Route Prefix** | `/api/messages` |

**Key Implementation Details:**
- **Socket.io** server running on the same HTTP server
- Socket authentication via JWT token in `handshake.auth.token`
- Authenticated users auto-join `user:{userId}` room
- Supports `join_conversation` / `leave_conversation` events
- Messages stored in MongoDB for persistence

**WebSocket Events:**

| Event | Direction | Description |
|---|---|---|
| `connection` | Client→Server | Auto-joins user room |
| `join_conversation` | Client→Server | Join a conversation room |
| `leave_conversation` | Client→Server | Leave a conversation room |
| `disconnect` | Client→Server | Cleanup on disconnect |

---

### Service 6: `notification-service` — Notifications

| Property | Value |
|---|---|
| **Port** | 3006 |
| **Language** | TypeScript (Express) |
| **Database** | MongoDB (`flexwork_notifications`) |
| **External** | SMTP (MailHog dev), Web Push (VAPID) |
| **Route Prefix** | `/api/notifications` |

**Notification Channels:**
1. **Email** — via `nodemailer` transporter (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
2. **Web Push** — via `web-push` with VAPID keys (VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
3. **In-App** — stored in MongoDB for retrieval

---

### Service 7: `booking-service` — Booking Management (Go)

| Property | Value |
|---|---|
| **Port** | 3007 |
| **Language** | **Go 1.23** (Gin framework) |
| **Database** | PostgreSQL (via pgx v5) |
| **Route Prefix** | `/api/bookings`, `/api/availability` |

> [!IMPORTANT]
> This is the only Go service in the platform. It was chosen for high-performance scheduling and availability computation.

**Endpoints:**

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/bookings` | JWT | Create a booking |
| `GET` | `/api/bookings` | JWT | List user bookings |
| `GET` | `/api/bookings/:id` | JWT | Get booking details |
| `PUT` | `/api/bookings/:id` | JWT | Update booking |
| `POST` | `/api/bookings/:id/confirm` | JWT | Confirm a booking |
| `POST` | `/api/bookings/:id/cancel` | JWT | Cancel a booking |
| `POST` | `/api/bookings/:id/complete` | JWT | Mark booking complete |
| `GET` | `/api/availability/worker/:id` | No | Get worker availability |
| `GET` | `/api/availability/worker/:id/slots` | No | Get available time slots |
| `PUT` | `/api/availability/worker/:id` | JWT | Update availability |
| `POST` | `/api/availability/worker/:id/block` | JWT | Block a time slot |
| `DELETE` | `/api/availability/worker/:id/block/:slotId` | JWT | Unblock a time slot |

**Data Models:**
- `Booking` — ID, WorkerID, ClientID, ProjectID, Title, Description, StartTime, EndTime, Duration, HourlyRate, TotalAmount, Currency, Status, MeetingURL, Notes
- `AvailabilitySlot` — DayOfWeek, StartTime, EndTime, IsRecurring
- `TimeSlot` — StartTime, EndTime, IsAvailable
- `BlockedSlot` — ID, StartTime, EndTime, Reason

**Go Dependencies:** gin-gonic, golang-jwt, google/uuid, jackc/pgx

---

### Service 8: `matching-service` — AI Matching (Python)

| Property | Value |
|---|---|
| **Port** | 3008 |
| **Language** | **Python 3.11** (FastAPI + Uvicorn) |
| **Database** | PostgreSQL (asyncpg) + MongoDB (motor) |
| **Route Prefixes** | `/api/matching`, `/api/skills` |

> [!IMPORTANT]
> This is the only Python service. It uses NumPy for AI-powered matching computations.

**Structure:**
```
app/
├── main.py              # FastAPI app with lifespan events
├── api/
│   ├── matching.py      # Matching endpoints
│   └── skills.py        # Skills endpoints
├── services/
│   ├── auth.py          # JWT auth for Python
│   ├── database.py      # asyncpg + motor connections
│   ├── matching_service.py  # Core matching algorithm (7.5KB)
│   └── skills_service.py    # Skills management
└── models/              # Pydantic models
```

**Key Dependencies:** `fastapi`, `uvicorn`, `pydantic`, `python-jose`, `passlib`, `asyncpg`, `pymongo`, `motor`, `numpy`, `httpx`

---

### Service 9: `session-service` — Session Management

| Property | Value |
|---|---|
| **Port** | 3009 |
| **Language** | TypeScript (Express) |
| **Database** | MongoDB |
| **Status** | ⚠️ **Scaffold only** — routes not yet implemented |

---

### Service 10: `worker-service` — Worker Profiles & Search

| Property | Value |
|---|---|
| **Port** | 3010 |
| **Language** | TypeScript (Express) |
| **Database** | MongoDB + Elasticsearch |
| **Route Prefix** | `/api/v1/workers` |

**Key Implementation Details:**
- Dual database: **MongoDB** for document storage, **Elasticsearch** for full-text search
- Auto-creates Elasticsearch `workers` index on startup with custom mappings
- DB connections injected into request objects via middleware
- Health check validates both MongoDB and Elasticsearch connectivity

**Elasticsearch Index Mapping (`workers`):**

| Field | Type | Notes |
|---|---|---|
| `userId` | keyword | — |
| `title` | text (standard analyzer) | — |
| `tagline` | text | — |
| `hourlyRate` | float | Filterable |
| `currency` | keyword | — |
| `averageRating` | float | Sortable |
| `totalReviews` | integer | — |
| `responseTime` | keyword | — |
| `skills` | nested | name (text), proficiency (int), verified (bool) |
| `location` | geo_point | Geo queries |
| `availability` | nested | date, status |
| `verifiedProfiles` | keyword | — |

---

### Service 11: `client-service` — Client Management

| Property | Value |
|---|---|
| **Port** | 3011 |
| **Language** | TypeScript (Express) |
| **Database** | PostgreSQL (Supabase) + MongoDB |
| **Route Prefix** | `/api/v1/clients` |

**Key Implementation Details:**
- **Dual database** with graceful degradation: PostgreSQL is optional, MongoDB is required
- Service starts in "degraded" mode if PostgreSQL connection fails
- Health check reports per-database status (`connected` / `disconnected`)
- Connection pooling: `max: 20`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 10000`

---

### Service 12: `escrow-service` — Payment Escrow

| Property | Value |
|---|---|
| **Port** | 3012 |
| **Language** | TypeScript (Express) |
| **Database** | PostgreSQL (Supabase) |
| **Route Prefix** | `/api/v1/escrow` |

**Endpoints:**

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/escrow` | Create escrow account |
| `POST` | `/api/v1/escrow/:id/release` | Release funds to worker |
| `POST` | `/api/v1/escrow/:id/freeze` | Freeze escrow (disputes) |

**Key Implementation Details:**
- **Automated cron job** (`node-cron`): runs every 15 minutes to auto-release eligible escrow accounts
- Auto-release criteria: `auto_release_enabled = true`, `auto_release_at <= NOW()`, `status = 'active'`
- Escrow statuses: `active` → `released` | `frozen`

**Database Table (`escrow_accounts`):**
- booking_id, client_id, worker_id, held_amount, released_amount, status, auto_release_enabled, auto_release_at, released_at

---

### Service 13: `dispute-service` — Dispute Resolution

| Property | Value |
|---|---|
| **Port** | 3013 |
| **Language** | TypeScript (Express) |
| **Database** | PostgreSQL (Supabase) |
| **Dependencies** | escrow-service (HTTP) |
| **Route Prefix** | `/api/v1/disputes` |

**Endpoints:**

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/disputes` | Create dispute (auto-freezes escrow) |
| `GET` | `/api/v1/disputes/:id` | Get dispute details |
| `GET` | `/api/v1/disputes/user/:userId` | Get user's disputes |
| `POST` | `/api/v1/disputes/:id/evidence` | Add evidence |
| `PATCH` | `/api/v1/disputes/:id` | Update status/resolution |

**Key Implementation Details:**
- On dispute creation, automatically calls `POST escrow-service/api/v1/escrow/{escrowId}/freeze`
- Uses `ESCROW_SERVICE_URL` env var for inter-service HTTP communication
- Evidence supports attachments (stored as JSON)
- Dispute statuses: `open` → `resolved`

**Database Tables:**
- `disputes` — booking_id, opened_by, respondent_id, reason, description, status, resolution, resolved_by, resolved_at, escrow_id
- `dispute_evidence` — dispute_id, submitted_by, evidence_type, description, attachments (JSON)

---

### Service 14: `review-service` — Ratings & Reviews

| Property | Value |
|---|---|
| **Port** | 3014 |
| **Language** | TypeScript (Express) |
| **Database** | PostgreSQL (Supabase) |
| **Route Prefix** | `/api/v1/reviews`, `/api/v1/badges` |

**Endpoints:**

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/reviews` | Create review (1-5 stars) |
| `GET` | `/api/v1/reviews/user/:userId` | Get reviews (paginated) |
| `GET` | `/api/v1/reviews/stats/:userId` | Get rating statistics breakdown |
| `GET` | `/api/v1/badges/:userId` | Get user badges |

**Key Implementation Details:**
- On review creation, automatically updates `user_profiles.average_rating` and `total_reviews`
- **Badge achievements system** — checks and awards badges after each review:

| Badge | Criteria |
|---|---|
| 🏆 5-Star Achiever | 10+ reviews, 5.0 average |
| 🏆 Top Performer | 50+ reviews, 4.8+ average |
| 🏆 Trusted Professional | 100+ reviews, 4.5+ average |

**Database Tables:**
- `reviews` — booking_id, reviewer_id, reviewee_id, rating, comment, category
- `user_badges` — user_id, badge_type, name, description, earned_at

---

### Service 15: `search-service` — Full-Text Search

| Property | Value |
|---|---|
| **Port** | 3015 |
| **Language** | TypeScript (Express) |
| **Database** | Elasticsearch |
| **Route Prefix** | `/api/v1/search` |

**Endpoints:**

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/search/workers` | Search workers with filters |
| `POST` | `/api/v1/search/projects` | Search projects with filters |
| `GET` | `/api/v1/search/suggest?q=` | Autocomplete suggestions |

**Worker Search Filters:**
- `query` — multi-match across title, tagline, bio, skills (with field boosting)
- `skills` — nested terms filter
- `minRate` / `maxRate` — hourly rate range
- `minRating` — minimum average rating
- `location` — fuzzy city match
- `availability` — status filter
- `categories` — terms filter
- Pagination: `limit` (default 20), `offset`
- Sorting: relevance score → rating → total projects
- Response includes **highlights** for matched fields

**Project Search Filters:**
- `query` — multi-match (title, description, requirements)
- `status`, `minBudget`/`maxBudget`, `skills`
- Sorted by `createdAt` descending

**Autocomplete:**
- Completion suggester on `skillSuggest` field with fuzzy matching

---

## Shared Packages

### `@tulifo/shared` (`packages/shared/src/`)

Reusable utilities shared across all Node.js microservices.

| Module | File | Purpose |
|---|---|---|
| **Errors** | `errors.ts` | Custom error classes (`ValidationError`, `UnauthorizedError`, `ConflictError`, `NotFoundError`) |
| **JWT** | `jwt.ts` | `generateTokenPair()`, `verifyAccessToken()`, `verifyRefreshToken()` |
| **Logger** | `logger.ts` | Structured logging utility |
| **Middleware** | `middleware.ts` | `authenticate` (JWT middleware), `errorHandler` (global error handler) |
| **RabbitMQ** | `rabbitmq.ts` | RabbitMQ client for inter-service messaging (publish/subscribe) |
| **Redis** | `redis.ts` | Redis client wrapper for caching/sessions |
| **Validation** | `validation.ts` | `validate()` helper for Zod schema validation |

### `@tulifo/types` (`packages/types/src/`)

Shared TypeScript type definitions used across all services to ensure type consistency.

---

## Infrastructure Components

### Docker Compose Services

```mermaid
graph LR
    subgraph DataLayer["Data Layer"]
        Redis["Redis 7 Alpine<br/>:6379"]
        MongoDB["MongoDB 7<br/>:27017"]
        ES["Elasticsearch 8.11<br/>:9200"]
        KongDB["PostgreSQL 15<br/>(Kong DB) :5433"]
    end

    subgraph MessageLayer["Message Layer"]
        RabbitMQ["RabbitMQ 3<br/>:5672 / :15672"]
    end

    subgraph GatewayLayer["Gateway Layer"]
        Kong["Kong<br/>:8000 / :8001"]
        Konga["Konga<br/>:1337 (optional)"]
    end

    subgraph DevTools["Dev Tools"]
        MailHog["MailHog<br/>SMTP :1025 / UI :8025"]
    end

    subgraph Observability["Observability"]
        Prometheus["Prometheus<br/>:9090"]
        Grafana["Grafana<br/>:3000"]
        Logstash["Logstash<br/>:5001"]
        Kibana["Kibana<br/>:5601"]
    end

    KongDB --> Kong
    Kong --> Konga
    Prometheus --> Grafana
    ES --> Kibana
    ES --> Logstash
```

### Redis (Cache & Sessions)

| Property | Value |
|---|---|
| **Image** | `redis:7-alpine` |
| **Port** | 6379 |
| **Volume** | `redis_data` |
| **Used By** | auth, user, project, payment, booking, escrow, dispute, review |
| **Purpose** | Session caching, token blacklisting, rate limiting |

### RabbitMQ (Message Broker)

| Property | Value |
|---|---|
| **Image** | `rabbitmq:3-management-alpine` |
| **Ports** | 5672 (AMQP), 15672 (Management UI) |
| **Volume** | `rabbitmq_data` |
| **Purpose** | Async inter-service events (user.created, booking.confirmed, etc.) |

### MongoDB (Document Store)

| Property | Value |
|---|---|
| **Image** | `mongo:7-jammy` |
| **Port** | 27017 |
| **Volume** | `mongodb_data` |
| **Database** | `tulifo_gig` |
| **Used By** | message-service, notification-service, session-service, worker-service, client-service, matching-service |

### Elasticsearch (Search Engine)

| Property | Value |
|---|---|
| **Image** | `elasticsearch:8.11.0` |
| **Ports** | 9200 (HTTP), 9300 (Transport) |
| **Volume** | `elasticsearch_data` |
| **Config** | Single-node, security disabled, 512MB heap |
| **Used By** | search-service, worker-service |
| **Indices** | `workers`, `projects` |

### Supabase (PostgreSQL)

| Property | Value |
|---|---|
| **Type** | Managed PostgreSQL (external) |
| **Used By** | auth, user, project, payment, booking, client, escrow, dispute, review, matching |
| **Features** | Auth, Realtime, Storage, Row Level Security |

---

## API Gateway (Kong)

### Port Mapping

| Port | Purpose |
|---|---|
| **8000** | Proxy — all API traffic routes through here |
| **8001** | Admin API — management/configuration |
| **8443** | Proxy SSL |
| **8444** | Admin API SSL |
| **1337** | Konga UI (optional profile) |

### Service Routing

Kong routes incoming requests from the frontend (`http://localhost:8000/api/*`) to the appropriate backend microservice.

**Route Configuration Pattern:**
```bash
# 1. Create upstream
curl -X POST http://localhost:8001/upstreams \
  -d name=auth-service -d algorithm=round-robin

# 2. Add target
curl -X POST http://localhost:8001/upstreams/auth-service/targets \
  -d target=auth-service:3001 -d weight=100

# 3. Add route
curl -X POST http://localhost:8001/routes \
  -d name=auth-service -d paths[]=/api/auth \
  -d upstream_id=auth-service -d strip_path=true
```

### Available Plugins

| Plugin | Purpose | Example |
|---|---|---|
| **Rate Limiting** | Request throttling | 100 req/min per IP |
| **Key Auth** | API key authentication | Header-based key auth |
| **CORS** | Cross-origin control | Allow specific origins |
| **HTTP Log** | Request logging | Forward to Logstash |

### Kong Database

- Uses a separate PostgreSQL container (`kong-db`) on port **5433**
- Migrations run automatically via `kong-migration` container

---

## Monitoring & Observability

### Prometheus

| Property | Value |
|---|---|
| **Port** | 9090 |
| **Scrape Interval** | 15s (global), 30s (microservices) |
| **Alert Rules** | `infrastructure/monitoring/alert_rules.yml` |

**Scrape Targets:**

| Job Name | Targets |
|---|---|
| `prometheus` | Self (localhost:9090) |
| `kong` | Kong Admin API (:8001/metrics) |
| `microservices` | All 12 Node.js services (:3001–:3013) |
| `elasticsearch` | ES metrics (:9200/_prometheus/metrics) |
| `redis` | Redis exporter (:9121) |
| `mongodb` | MongoDB exporter (:9216) |
| `rabbitmq` | RabbitMQ API (:15672/api/metrics) |

### Grafana

| Property | Value |
|---|---|
| **Port** | 3000 |
| **Default Credentials** | admin / admin |
| **Plugins** | grafana-piechart-panel |
| **Data Source** | Prometheus (auto-provisioned) |
| **Dashboards** | Pre-provisioned via `infrastructure/monitoring/grafana/dashboards/` |

### ELK Stack (Logging)

| Component | Port | Purpose |
|---|---|---|
| **Logstash** | 5001, 9600 | Log ingestion pipeline |
| **Kibana** | 5601 | Log visualization & dashboards |
| **Elasticsearch** | 9200 | Log storage & indexing |

**Log Flow:**
```
Services → Logstash (:5001) → Elasticsearch (:9200) → Kibana (:5601)
                                                    ↗
                              Kong HTTP-Log Plugin ─┘
```

### MailHog (Dev Email)

| Property | Value |
|---|---|
| **SMTP Port** | 1025 |
| **Web UI Port** | 8025 |
| **Purpose** | Captures all outgoing emails in dev for inspection |

---

## Containerization

### 3 Dockerfile Patterns

#### Pattern 1: Node.js Multi-Stage Build

```dockerfile
# Builder stage
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/{service}/package.json ./apps/{service}/
COPY packages/ ./packages/
RUN pnpm install --frozen-lockfile || pnpm install
COPY apps/{service}/ ./apps/{service}/
COPY tsconfig.base.json ./
RUN cd apps/{service} && pnpm build

# Production stage
FROM node:20-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/{service}/package.json ./apps/{service}/
COPY --from=builder /app/packages ./packages
RUN pnpm install --prod --frozen-lockfile || pnpm install --prod
COPY --from=builder /app/apps/{service}/dist ./apps/{service}/dist
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
```

**Used by:** auth, user, project, payment, message, notification, session, worker, client, escrow, dispute, review, search

#### Pattern 2: Go Multi-Stage Build

```dockerfile
FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o booking-service ./cmd/server

FROM alpine:latest
WORKDIR /app
RUN apk --no-cache add ca-certificates
COPY --from=builder /app/booking-service .
CMD ["./booking-service"]
```

**Used by:** booking-service

#### Pattern 3: Python Slim

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3008"]
```

**Used by:** matching-service

---

## Deployment Configurations

| Platform | Config File | Services |
|---|---|---|
| **Docker Compose** | `docker-compose.yml` | All services + infrastructure |
| **Railway** | Per-service `railway.toml` | Individual microservices |
| **Render** | `render.yaml` | Multi-service deployment |
| **Vercel** | `vercel.json` | API routing/rewrites |

### Railway Config (per service)

```toml
[build]
builder = "nixpacks"
buildCommand = "cd apps/{service} && npm run build"

[deploy]
startCommand = "cd apps/{service} && node dist/index.js"
healthcheckPath = "/health"
```

---

## Environment Variables

### Common Variables (All Services)

| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | Environment mode | `development` / `production` |
| `PORT` | Service port | `3001` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db` |
| `JWT_SECRET` | JWT signing secret | `your_secret_key` |
| `CORS_ORIGIN` | Allowed origins | `http://localhost:3000` |
| `REDIS_URL` | Redis connection | `redis://localhost:6379` |

### Service-Specific Variables

| Service | Variable | Description |
|---|---|---|
| **auth** | `JWT_REFRESH_SECRET` | Refresh token secret |
| **payment** | `STRIPE_SECRET_KEY` | Stripe API key |
| **payment** | `STRIPE_WEBHOOK_SECRET` | Webhook signature key |
| **message** | `MONGODB_URI` | MongoDB connection |
| **notification** | `SMTP_HOST/PORT/USER/PASS` | Email SMTP config |
| **notification** | `VAPID_PUBLIC/PRIVATE_KEY` | Web Push keys |
| **worker** | `ELASTICSEARCH_URL` | ES endpoint |
| **worker** | `ELASTICSEARCH_USER/PASSWORD` | ES credentials |
| **dispute** | `ESCROW_SERVICE_URL` | Escrow service URL |
| **matching** | `MONGODB_URI` | MongoDB for matching data |

---

## Inter-Service Communication

### Synchronous (HTTP)

| Source | Target | Endpoint | Purpose |
|---|---|---|---|
| dispute-service | escrow-service | `POST /api/v1/escrow/:id/freeze` | Freeze escrow on dispute |

### Asynchronous (RabbitMQ)

The `@tulifo/shared` package provides a RabbitMQ client for event-driven communication. Typical event patterns:

| Event | Publisher | Subscriber(s) | Description |
|---|---|---|---|
| `user.created` | auth-service | user-service, notification | New user registered |
| `booking.confirmed` | booking-service | payment, notification | Booking confirmed |
| `payment.completed` | payment-service | escrow, notification | Payment processed |
| `review.created` | review-service | user-service, matching | New review added |

### Frontend → Backend

The frontend communicates exclusively through the **Kong API Gateway** on port 8000:
```
Frontend (Next.js) → Kong (:8000) → Microservice (:300X)
```

---

## Database Architecture

```mermaid
graph TD
    subgraph PostgreSQL["Supabase PostgreSQL"]
        users["users"]
        workerProfiles["worker_profiles"]
        clientProfiles["client_profiles"]
        userProfiles["user_profiles"]
        userSettings["user_settings"]
        sessions["sessions"]
        projects["projects"]
        bids["bids"]
        payments["payments"]
        bookings["bookings"]
        escrows["escrow_accounts"]
        disputes["disputes"]
        evidence["dispute_evidence"]
        reviews["reviews"]
        badges["user_badges"]
    end

    subgraph MongoDB
        messages["messages"]
        conversations["conversations"]
        notifications["notifications"]
        workerDocs["worker profiles (docs)"]
        clientDocs["client profiles (docs)"]
    end

    subgraph Elasticsearch
        workersIdx["workers (index)"]
        projectsIdx["projects (index)"]
    end

    subgraph Redis
        sessionCache["session cache"]
        tokenBlacklist["token blacklist"]
        rateLimit["rate limits"]
    end
```

---

## Quick Start Guide

### Prerequisites
- Docker & Docker Compose
- Node.js 20+, pnpm
- Go 1.23+ (for booking-service development)
- Python 3.11+ (for matching-service development)

### 1. Start Infrastructure

```bash
# Start all infrastructure services
docker-compose up -d redis rabbitmq mongodb elasticsearch kong kong-db kong-migration mailhog

# Wait for services to be healthy
docker-compose ps
```

### 2. Start Microservices (Development)

```bash
# Install dependencies
pnpm install

# Build shared packages first
pnpm build:types
pnpm build:shared

# Start all services
pnpm dev:apps
```

### 3. Start Monitoring (Optional)

```bash
docker-compose up -d prometheus grafana logstash kibana
```

### 4. Verify Health

```bash
# Check each service
for port in 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 3011 3012 3013 3014 3015; do
  echo "Port $port: $(curl -s http://localhost:$port/health | head -c 80)"
done

# Check Kong gateway
curl -s http://localhost:8001/status
```

### 5. Full Docker Deployment

```bash
# Start everything
docker-compose up -d

# View logs
docker-compose logs -f

# Stop everything
docker-compose down
```

---

## Port Reference

| Port | Service | Type |
|---|---|---|
| 3001 | auth-service | Node.js |
| 3002 | user-service | Node.js |
| 3003 | project-service | Node.js |
| 3004 | payment-service | Node.js |
| 3005 | message-service | Node.js + Socket.io |
| 3006 | notification-service | Node.js |
| 3007 | booking-service | **Go** |
| 3008 | matching-service | **Python** |
| 3009 | session-service | Node.js (scaffold) |
| 3010 | worker-service | Node.js |
| 3011 | client-service | Node.js |
| 3012 | escrow-service | Node.js |
| 3013 | dispute-service | Node.js |
| 3014 | review-service | Node.js |
| 3015 | search-service | Node.js |
| 5672 | RabbitMQ (AMQP) | Infrastructure |
| 6379 | Redis | Infrastructure |
| 8000 | Kong Proxy | Gateway |
| 8001 | Kong Admin API | Gateway |
| 8025 | MailHog UI | Dev Tool |
| 9090 | Prometheus | Monitoring |
| 9200 | Elasticsearch | Infrastructure |
| 3000 | Grafana | Monitoring |
| 5601 | Kibana | Monitoring |
| 15672 | RabbitMQ Management | Infrastructure |
| 27017 | MongoDB | Infrastructure |
