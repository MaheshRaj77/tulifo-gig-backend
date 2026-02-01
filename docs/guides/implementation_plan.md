# FlexWork Platform - Implementation Plan (Microservices Architecture)

This plan outlines the initialization and Phase 1 implementation of the FlexWork Unified Gig Platform, adopting a scalable microservices architecture as specified.

## User Review Required

> [!IMPORTANT]
> **Architecture Shift**: We are moving from a monolithic Backend to a **Microservices Architecture** hosted in a Monorepo (`tulifo-gig-backend`).
>
> **Technology Stack Confirmation**:
> - **Frontend**: Next.js 14 (App Router), TypeScript, TailwindCSS.
> - **Backend Frameworks**:
>   - **Node.js (TypeScript)**: For User, Auth, Payment, Notification services.
>   - **Go**: For high-performance Booking Service.
>   - **Python (FastAPI)**: For AI Matching Service.
> - **Infrastructure**: Kubernetes (Production), Docker Compose (Local), API Gateway (Kong/AWS).
> - **Data**: PostgreSQL (Transactional), MongoDB (Profiles), Redis (Cache), RabbitMQ (Messaging).
>
> **Monorepo Strategy for Backend**:
> I propose using **TurboRepo** or **Nx** to manage the multi-language backend repository. This simplifies dependency management and build pipelines for multiple services. We will use **pnpm** for package management.

## Proposed Changes - Phase 1: Foundation & MVP

### 1. Frontend Repository (`tulifo-gig`)
Initialize as a standard Next.js 14 application using **pnpm**.

#### [NEW] [package.json](file:///Users/mahesh/Work/tulifo-gig/package.json)
- **Framework**: Next.js 14 (App Router)
- **PackageManager**: pnpm
- **Language**: TypeScript 5.0+
- **Styling**: TailwindCSS 3.4 + `shadcn/ui` integration.
- **State**: Zustand + React Query.
- **Real-time**: `socket.io-client`.

### 2. Backend Repository (`tulifo-gig-backend`)
Initialize as a **Monorepo** to house all microservices using **pnpm workspaces**.

#### [NEW] [pnpm-workspace.yaml](file:///Users/mahesh/Work/tulifo-gig-backend/pnpm-workspace.yaml)
- Define workspace packages: `apps/*`, `packages/*`.

#### [NEW] [Service Initialization - MVP Scope]
We will scaffold the following initial services:

1.  **Auth Service** (`apps/auth-service` - Node.js/Express)
    - Responsibilities: JWT issuance, OAuth, Role management.
2.  **User Service** (`apps/user-service` - Node.js/Express)
    - Responsibilities: User profiles, Worker verification.
3.  **Booking Service** (`apps/booking-service` - **Go**)
    - Responsibilities: Availability slots, Core booking logic.
4.  **API Gateway** (`infrastructure/gateway`)
    - Local setup using **Kong** (via Docker) or a simple Proxy for dev.

### 3. Infrastructure & Development Environment

#### [NEW] [docker-compose.yml](file:///Users/mahesh/Work/tulifo-gig-backend/docker-compose.yml)
Set up the local development stack:
- **PostgreSQL**: Primary transactional DB.
- **MongoDB**: For flexible profile data.
- **Redis**: Caching and session store.
- **RabbitMQ**: Message broker for inter-service communication.
- **Mailhog**: For local email testing.

## Verification Plan

### Automated Verification
- **Frontend**: `pnpm build` succeeds.
- **Backend Monorepo**: `pnpm build` triggers builds for `auth-service` (Node) and `user-service` (Node).
- **Go Compilation**: `go build` succeeds for `booking-service`.

### Manual Verification
1.  **Infrastructure Up**: Run `docker-compose up` in `tulifo-gig-backend`. Verify all containers (Postgres, Redis, Mongo, RabbitMQ) are running (`docker ps`).
2.  **Frontend Launch**: Start Next.js app on `localhost:3000`.
3.  **Service Health**: Curl health endpoints for initialized services:
    - Auth: `http://localhost:3001/health`
    - Booking: `http://localhost:3002/health`
