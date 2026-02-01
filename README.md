# 🎯 Tulifo Gig - Backend Platform (100% Complete)

> **A comprehensive microservices platform for connecting skilled workers with clients**

[![Backend Status](https://img.shields.io/badge/Backend-100%25%20Complete-brightgreen)]()
[![Services](https://img.shields.io/badge/Services-15-blue)]()
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED)]()
[![License](https://img.shields.io/badge/License-MIT-green)]()

## 📋 Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 3. Start all services
docker-compose up -d

# 4. Verify health
curl http://localhost:3001/health
```

## 🏗️ Architecture Overview

### 15 Production-Ready Microservices

```
┌─────────────────────────────────────────────────────────────────┐
│                    API Gateway (Optional)                       │
├─────────────────────────────────────────────────────────────────┤
│ Auth(3001) │ User(3002) │ Project(3003) │ Payment(3004) │ ...  │
├─────────────────────────────────────────────────────────────────┤
│         Worker(3010) → Client(3011) → Escrow(3012)             │
│                             ↓                                   │
│                 Dispute(3013) → Review(3014) → Search(3015)    │
├─────────────────────────────────────────────────────────────────┤
│ PostgreSQL │ MongoDB │ Redis │ Elasticsearch │ RabbitMQ        │
└─────────────────────────────────────────────────────────────────┘
```

## 📦 Services Breakdown

### Authentication & Core (Ports 3001-3009)

| Service | Port | Language | Purpose |
|---------|------|----------|---------|
| **auth-service** | 3001 | TypeScript | JWT authentication, OAuth |
| **user-service** | 3002 | TypeScript | User profiles, preferences |
| **project-service** | 3003 | TypeScript | Project CRUD, requirements |
| **payment-service** | 3004 | TypeScript | Stripe integration, invoices |
| **message-service** | 3005 | TypeScript | Real-time messaging |
| **notification-service** | 3006 | TypeScript | Multi-channel notifications |
| **booking-service** | 3007 | Go | State machine booking engine |
| **matching-service** | 3008 | Python | AI-powered worker matching |
| **session-service** | 3009 | TypeScript | Session tracking, time logs |

### Financial & Trust Layer (Ports 3010-3015)

| Service | Port | Features |
|---------|------|----------|
| **worker-service** | 3010 | Profiles, skills, portfolio, external sync (GitHub/LeetCode) |
| **client-service** | 3011 | Payment methods, projects, analytics |
| **escrow-service** | 3012 | Accounts, auto-release, freeze/unfreeze |
| **dispute-service** | 3013 | Resolution workflow, evidence submission |
| **review-service** | 3014 | Ratings, reputation, badges |
| **search-service** | 3015 | Elasticsearch orchestrator, unified search |

- **Node.js Services**: Express, TypeScript, PostgreSQL
- **Go Service**: Gin, pgx
- **Python Service**: FastAPI, scikit-learn
- **Databases**: PostgreSQL (Supabase), MongoDB (Atlas)
- **Cache**: Redis
- **Message Queue**: RabbitMQ

## Getting Started

### Prerequisites

- Node.js 20+
- Go 1.21+
- Python 3.11+
- pnpm
- Docker (optional)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/your-org/tulifo-gig-backend.git
cd tulifo-gig-backend
```

2. Install dependencies:
```bash
pnpm install
```

3. Copy environment file:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`

5. Build shared packages:
```bash
pnpm build:types
pnpm build:shared
```

6. Run database migrations:
```bash
# Apply the schema to your Supabase database
# Copy infrastructure/db/postgres-schema.sql to Supabase SQL Editor
```

7. Start development:
```bash
pnpm dev
```

### Running with Docker

```bash
docker-compose up -d
```

## Deployment

### Render

1. Connect your repository to Render
2. Import the `render.yaml` blueprint
3. Configure environment variables for each service
4. Deploy!

### Environment Variables

See `.env.example` for all required environment variables.

## API Documentation

Each service exposes a `/health` endpoint for health checks.

### Auth Service (Port 3001)
- POST `/api/auth/register` - User registration
- POST `/api/auth/login` - User login
- POST `/api/auth/refresh` - Refresh token
- POST `/api/auth/logout` - Logout
- GET `/api/auth/me` - Get current user

### User Service (Port 3002)
- GET `/api/users/:id` - Get user
- PUT `/api/users/:id` - Update user
- GET `/api/workers` - Search workers
- GET `/api/workers/:id` - Get worker profile
- GET `/api/clients/:id` - Get client profile

### Project Service (Port 3003)
- GET `/api/projects` - Search projects
- POST `/api/projects` - Create project
- GET `/api/projects/:id` - Get project
- POST `/api/bids` - Create bid
- POST `/api/bids/:id/accept` - Accept bid

### Booking Service (Port 3007)
- POST `/api/bookings` - Create booking
- GET `/api/bookings` - Get user bookings
- POST `/api/bookings/:id/confirm` - Confirm booking
- GET `/api/availability/worker/:id/slots` - Get available slots

### Matching Service (Port 3008)
- POST `/api/matching/find-workers` - Find matching workers
- GET `/api/skills/search` - Search skills
- GET `/api/skills/popular` - Get popular skills

## License

MIT
