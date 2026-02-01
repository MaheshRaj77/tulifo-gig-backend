# Tulifo Backend - Vercel Deployment Guide

## Overview

This is a complete microservices backend deployment on Vercel with 14 services running on Render/Railway with API gateway routing.

## Architecture

```
┌─────────────────────────────────────────────┐
│     Vercel (Frontend & API Gateway)         │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │  API Gateway (Serverless Function)   │  │
│  │  - Routes requests to services       │  │
│  │  - Status dashboard                  │  │
│  │  - Health checks                     │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
          ↓          ↓          ↓
    ┌──────────┬──────────┬──────────┐
    │  Render  │  Render  │  Render  │
    │  Services│  Services│  Services│
    └──────────┴──────────┴──────────┘
```

## Deployed Pages

### 1. **Home Page** (`/`)
Simple landing page with service information and navigation

### 2. **Status Dashboard** (`/status`)
Real-time monitoring dashboard showing:
- Service health status (Healthy/Unhealthy)
- Response times
- Success rate
- Error details
- Auto-refresh every 60 seconds

### 3. **Health Check** (`/health`)
JSON API endpoint for health checks

## Services Deployed

All 14 microservices running on Render:

1. **Auth Service** (3001) - Authentication & JWT
2. **User Service** (3002) - User management
3. **Project Service** (3003) - Project management
4. **Payment Service** (3004) - Payment processing
5. **Message Service** (3005) - Real-time messaging
6. **Notification Service** (3006) - Notifications & emails
7. **Booking Service** (3007) - Booking management (Go)
8. **Matching Service** (3008) - Algorithm matching (Python)
9. **Session Service** (3009) - Session management
10. **Worker Service** (3010) - Background jobs
11. **Escrow Service** (3012) - Escrow handling
12. **Dispute Service** (3013) - Dispute resolution
13. **Review Service** (3014) - Reviews & ratings
14. **Search Service** (3015) - Elasticsearch integration

## Environment Variables

Set these in Vercel project settings:

```
# Service URLs (point to Render services)
AUTH_SERVICE_URL=https://auth-service.onrender.com
USER_SERVICE_URL=https://user-service.onrender.com
PROJECT_SERVICE_URL=https://project-service.onrender.com
PAYMENT_SERVICE_URL=https://payment-service.onrender.com
MESSAGE_SERVICE_URL=https://message-service.onrender.com
NOTIFICATION_SERVICE_URL=https://notification-service.onrender.com
BOOKING_SERVICE_URL=https://booking-service.onrender.com
MATCHING_SERVICE_URL=https://matching-service.onrender.com
SESSION_SERVICE_URL=https://session-service.onrender.com
WORKER_SERVICE_URL=https://worker-service.onrender.com
ESCROW_SERVICE_URL=https://escrow-service.onrender.com
DISPUTE_SERVICE_URL=https://dispute-service.onrender.com
REVIEW_SERVICE_URL=https://review-service.onrender.com
SEARCH_SERVICE_URL=https://search-service.onrender.com

# Database & Auth
DATABASE_URL=postgresql://...
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
REDIS_URL=redis://...
CORS_ORIGIN=*
```

## API Endpoints

### Gateway Routes

```
GET  /                    → Home page
GET  /status              → Status dashboard
GET  /health              → Health check

# Auth Service
POST   /api/auth/login
POST   /api/auth/register
POST   /api/auth/refresh

# User Service
GET    /api/users/:id
PUT    /api/users/:id
GET    /api/users/profile
POST   /api/users/profile

# Project Service
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PUT    /api/projects/:id

# Payment Service
POST   /api/payments/process
GET    /api/payments/:id

# And more... (See service-specific docs)
```

## Deployment Steps

### 1. Prepare Environment
```bash
pnpm install
pnpm build
```

### 2. Deploy to Vercel
```bash
vercel deploy
```

### 3. Configure Environment Variables
- Go to Vercel Project Settings → Environment Variables
- Add all required env vars listed above
- Redeploy after adding env vars

### 4. Deploy Services to Render
- Use `render.yaml` blueprint
- Follow Render deployment guide

### 5. Update Service URLs
- Update `*_SERVICE_URL` env vars in Vercel with actual Render URLs

## Monitoring & Troubleshooting

### Check Service Status
1. Visit `/status` dashboard
2. Look for red indicators (unhealthy services)
3. Check response times and errors

### View Health Check JSON
```bash
curl https://your-domain.vercel.app/health
curl https://your-domain.vercel.app/status -H "Accept: application/json"
```

### Common Issues

| Issue | Solution |
|-------|----------|
| 503 Service Unavailable | Check service URLs in env vars |
| 404 Not Found | Verify endpoint path and service routes |
| High response time | Check service logs on Render |
| All services unhealthy | Verify DATABASE_URL and MONGODB_URI |

## Local Development

### Run Status Dashboard Locally
```bash
vercel dev
# Visit http://localhost:3000
```

### Run All Services Locally
```bash
docker-compose up
# Or use pnpm workspace commands
```

## Production Recommendations

1. **Use proper database credentials** (Supabase, MongoDB Atlas, etc.)
2. **Enable HTTPS** (automatic with Vercel)
3. **Set proper CORS origins** (not `*` in production)
4. **Enable rate limiting** on API Gateway
5. **Use database connection pooling** for PostgreSQL
6. **Set up alerting** for service failures
7. **Regular backups** of production databases

## Support & Documentation

- **API Docs**: `/api/docs`
- **Status**: `/status`
- **Health**: `/health`
- **Logs**: Check Vercel & Render dashboards
