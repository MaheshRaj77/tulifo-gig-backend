# FlexWork Backend

Microservices backend for the FlexWork gig platform.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Auth Service  │     │   User Service  │     │ Project Service │
│   (Node.js)     │     │    (Node.js)    │     │   (Node.js)     │
│   Port: 3001    │     │   Port: 3002    │     │   Port: 3003    │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                        ┌────────┴────────┐
                        │   API Gateway   │
                        │  (Load Balancer)│
                        └────────┬────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌────────┴────────┐     ┌────────┴────────┐     ┌────────┴────────┐
│ Payment Service │     │ Booking Service │     │ Matching Service│
│   (Node.js)     │     │     (Go)        │     │   (Python)      │
│   Port: 3004    │     │   Port: 3007    │     │   Port: 3008    │
└─────────────────┘     └─────────────────┘     └─────────────────┘

┌─────────────────┐     ┌─────────────────┐
│ Message Service │     │ Notification Svc│
│   (Node.js)     │     │   (Node.js)     │
│   Port: 3005    │     │   Port: 3006    │
└─────────────────┘     └─────────────────┘
```

## Services

| Service | Language | Port | Description |
|---------|----------|------|-------------|
| Auth Service | Node.js | 3001 | Authentication, JWT tokens, OAuth |
| User Service | Node.js | 3002 | User profiles, workers, clients |
| Project Service | Node.js | 3003 | Projects, bids, contracts |
| Payment Service | Node.js | 3004 | Stripe payments, escrow |
| Message Service | Node.js | 3005 | Real-time chat, WebSocket |
| Notification Service | Node.js | 3006 | Push, email, SMS notifications |
| Booking Service | Go | 3007 | Availability, scheduling |
| Matching Service | Python | 3008 | AI-powered worker matching |

## Tech Stack

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
