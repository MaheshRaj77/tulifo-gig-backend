# Tulifo Backend Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT APPLICATIONS                      │
│                   (Web, Mobile, Desktop, etc.)                   │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                    HTTPS / REST / GraphQL
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VERCEL (API GATEWAY LAYER)                    │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Serverless Functions (Node.js)              │  │
│  │                                                           │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐   │  │
│  │  │ Home Page   │  │    Status    │  │    Health     │   │  │
│  │  │  (index.ts) │  │ (status.ts)  │  │  (gateway.ts) │   │  │
│  │  └─────────────┘  └──────────────┘  └───────────────┘   │  │
│  │                                                           │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │          API Gateway (gateway.ts)                   │  │  │
│  │  │  Routes /api/* requests to microservices            │  │  │
│  │  │  - Request routing & proxying                       │  │  │
│  │  │  - Error handling                                   │  │  │
│  │  │  - Response formatting                              │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Environment Variables ← Connect to microservices               │
└─────────────────────────────────────────────────────────────────┘
        │             │             │             │
   HTTP/HTTPS Routes to Microservices on Render/Railway
        │             │             │             │
        ▼             ▼             ▼             ▼
   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
   │  Auth    │ │  User    │ │ Project  │ │ Payment  │
   │Service   │ │ Service  │ │ Service  │ │ Service  │
   └──────────┘ └──────────┘ └──────────┘ └──────────┘
        │             │             │             │
   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
   │ Message  │ │Notif.    │ │ Booking  │ │Matching  │
   │ Service  │ │ Service  │ │ Service  │ │ Service  │
   └──────────┘ └──────────┘ └──────────┘ └──────────┘
        │             │             │             │
   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
   │ Session  │ │ Worker   │ │ Escrow   │ │ Dispute  │
   │ Service  │ │ Service  │ │ Service  │ │ Service  │
   └──────────┘ └──────────┘ └──────────┘ └──────────┘
        │             │             │
   ┌──────────┐ ┌──────────┐ ┌──────────┐
   │ Review   │ │ Search   │ │   ...    │
   │ Service  │ │ Service  │ │          │
   └──────────┘ └──────────┘ └──────────┘
        │             │             │
        └─────────────┴─────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
   ┌──────────┐ ┌──────────┐ ┌──────────┐
   │PostgreSQL│ │ MongoDB  │ │ Redis    │
   │          │ │          │ │          │
   └──────────┘ └──────────┘ └──────────┘
```

## Services Overview

### Core Services (PostgreSQL)
| Service | Port | Purpose | Tech |
|---------|------|---------|------|
| Auth Service | 3001 | Authentication & JWT tokens | Node.js/Express |
| User Service | 3002 | User profile & management | Node.js/Express |
| Project Service | 3003 | Project management | Node.js/Express |
| Payment Service | 3004 | Payment processing | Node.js/Express |
| Escrow Service | 3012 | Escrow fund management | Node.js/Express |
| Dispute Service | 3013 | Dispute resolution | Node.js/Express |
| Review Service | 3014 | Reviews & ratings | Node.js/Express |
| Client Service | 3011 | Client data | Node.js/Express |

### Document Services (MongoDB)
| Service | Port | Purpose | Tech |
|---------|------|---------|------|
| Message Service | 3005 | Real-time messaging | Node.js/Express |
| Notification Service | 3006 | Notifications & emails | Node.js/Express |
| Worker Service | 3010 | Background jobs | Node.js/Express |

### Special Services
| Service | Port | Purpose | Tech |
|---------|------|---------|------|
| Booking Service | 3007 | Booking management | Go/Gin |
| Matching Service | 3008 | ML-based matching | Python/FastAPI |
| Session Service | 3009 | Session management | Node.js/Express |
| Search Service | 3015 | Elasticsearch integration | Node.js/Express |

## Data Flow

### User Authentication Flow
```
Client → Vercel Gateway → Auth Service → PostgreSQL
                              ↓
                         JWT Token Generated
                              ↓
                         Return to Client
```

### API Request Flow
```
Client
   ↓
Vercel Gateway (api/gateway.ts)
   ↓ (Route based on /api/*)
Microservice Instance
   ↓
Database (PostgreSQL/MongoDB)
   ↓
Return Response → Vercel Gateway → Client
```

### Status Monitoring Flow
```
Vercel Status Endpoint (api/status.ts)
   ↓
Parallel Health Checks to all 14 services
   ↓
Aggregate Status Information
   ↓
Return Dashboard/JSON
```

## Request Routing

### Gateway Routes (`/api/*`)

```
GET  /api/auth/login          → Auth Service
POST /api/auth/register       → Auth Service
GET  /api/users/:id           → User Service
POST /api/projects            → Project Service
GET  /api/payments/:id        → Payment Service
POST /api/messages            → Message Service
POST /api/notifications/send  → Notification Service
GET  /api/bookings            → Booking Service
POST /api/matching/find       → Matching Service
GET  /api/sessions            → Session Service
POST /api/workers/job         → Worker Service
GET  /api/escrow/:id          → Escrow Service
POST /api/disputes/create     → Dispute Service
GET  /api/reviews/:id         → Review Service
GET  /api/search/workers      → Search Service
```

## Environment Configuration

### Required Env Vars

```yaml
# Service URLs (Render/Railway)
AUTH_SERVICE_URL: https://auth-service.onrender.com
USER_SERVICE_URL: https://user-service.onrender.com
PROJECT_SERVICE_URL: https://project-service.onrender.com
PAYMENT_SERVICE_URL: https://payment-service.onrender.com
# ... (more service URLs)

# Database Connections
DATABASE_URL: postgresql://user:pass@host/db
MONGODB_URI: mongodb+srv://user:pass@host/db

# Security
JWT_SECRET: your-secret-key
JWT_REFRESH_SECRET: your-refresh-key

# Optional Services
REDIS_URL: redis://host:6379
STRIPE_SECRET_KEY: sk_live_...
ELASTICSEARCH_URL: https://host:9200
```

## Monitoring & Observability

### Status Dashboard (`/status`)
- Real-time health checks
- Response time tracking
- Error reporting
- Auto-refresh every 60 seconds

### Health Endpoint (`/health`)
- Service availability check
- Uptime monitoring
- Programmatic access for monitoring tools

### Logging
- Vercel logs: Real-time function logs
- Render logs: Service-specific logs
- Custom error tracking (Sentry, LogRocket, etc.)

## Security Architecture

```
Internet
   ↓
Cloudflare (DDoS Protection)
   ↓
Vercel (HTTPS/TLS)
   ↓
API Gateway (Request validation)
   ↓
Microservices
   ↓
Databases (with SSL/TLS)
```

### Security Layers
1. **HTTPS/TLS** - All traffic encrypted
2. **CORS** - Cross-origin request control
3. **JWT** - Token-based authentication
4. **Database** - Connection pooling & SSL
5. **Env Vars** - Secrets never in code

## Scaling Strategy

### Current: Single Deployment
```
Vercel (1 instance) → All requests → 14 Services on Render
```

### Future: Multi-Region
```
Region 1: Vercel (US East)
Region 2: Vercel (EU)
Region 3: Vercel (Asia)
    ↓
    All → Load Balancer → Microservices
```

### Future: Service Scaling
```
API Gateway (Vercel)
    ↓
Load Balancer
    ├→ Auth Service (3 instances)
    ├→ User Service (2 instances)
    └→ Payment Service (5 instances)
```

## Deployment Workflow

```
Code Push to GitHub
    ↓
GitHub Actions (CI/CD)
    ├→ Run tests
    ├→ Lint code
    └→ Build
        ↓
    Deploy to Vercel
        ↓
    Automatic deployment
        ↓
    Status dashboard shows live
```

## Disaster Recovery

### Service Failure Scenario
```
1. Service goes down
2. Status dashboard detects (automatic health check)
3. Alert triggered (if configured)
4. Admin gets notified
5. Can restart service or switch to backup
```

### Database Failure Scenario
```
1. Database connection fails
2. Services continue (may return errors)
3. Status dashboard shows affected services
4. Database team restores from backup
5. Services reconnect automatically
```

## Performance Considerations

### Latency Optimization
- Vercel edge caching
- Service response caching
- Database query optimization
- Connection pooling

### Throughput
- Vercel auto-scaling
- Load balancing on Render
- Horizontal service scaling
- Database indexing

### Cost Optimization
- Serverless on Vercel (pay per invocation)
- Render free tier for services
- Auto-scaling to reduce resources
- Caching to reduce database calls
