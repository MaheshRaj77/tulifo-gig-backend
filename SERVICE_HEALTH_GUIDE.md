# Service Status & Troubleshooting Guide

## Current Status Summary

**Date:** February 1, 2026

### 🟢 Healthy Services (Infrastructure)
- ✓ Redis (6379)
- ✓ MongoDB (27017) 
- ✓ RabbitMQ (5672)
- ✓ Elasticsearch (9200)
- ✓ Kong DB (5433)
- ✓ Grafana (3000)
- ✓ Kibana (5601)
- ✓ Logstash (5001)

### 🟡 Unhealthy Services (Missing Configuration)
Most microservices are running but marked "unhealthy" because:
1. Missing `.env` file with environment variables
2. Services can't connect to Supabase/PostgreSQL
3. Health checks are timing out

**Services Affected:**
- auth-service (3001)
- user-service (3002)
- project-service (3003)
- payment-service (3004)
- message-service (3005)
- notification-service (3006)
- booking-service (3007)
- matching-service (3008)
- session-service (3009)
- worker-service (3010)
- client-service (3011)
- escrow-service (3012)
- dispute-service (3013)
- review-service (3014)
- search-service (3015)
- kong (8000)
- mailhog (8025)
- prometheus (9090)

### 🔴 Disabled Services
- **Konga** (1337) - Moved to optional profile due to DB authentication issues

---

## Quick Start Fix

### 1. Create Environment File
```bash
cp .env.example .env
```

### 2. Update .env with your credentials
Edit `.env` and add:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_KEY` - Your Supabase service key
- `JWT_SECRET` - Change to your own secret
- `STRIPE_SECRET_KEY` - Your Stripe test key
- `DATABASE_URL` - Your PostgreSQL connection string

### 3. Restart Services
```bash
pnpm run dev:restart
```

Wait 30-60 seconds for all services to become healthy.

---

## Available Commands

| Command | Purpose |
|---------|---------|
| `pnpm run dev` | Start all services with full diagnostics |
| `pnpm run dev:stop` | Stop all containers |
| `pnpm run dev:restart` | Restart all services |
| `pnpm run dev:status` | Show current service status |
| `pnpm run dev:logs` | Stream Docker logs |
| `pnpm run dev:clean` | Remove orphaned containers |
| `pnpm run dev:apps` | Run only Node.js apps (no Docker) |
| `bash scripts/diagnose-services.sh` | Run diagnostics |

---

## Service Endpoints

### Microservices
- Auth: http://localhost:3001
- User: http://localhost:3002
- Project: http://localhost:3003
- Payment: http://localhost:3004
- Message: http://localhost:3005
- Notification: http://localhost:3006
- Booking: http://localhost:3007
- Matching: http://localhost:3008

### Infrastructure
- Redis: localhost:6379
- MongoDB: localhost:27017
- RabbitMQ: http://localhost:15672 (guest/guest)
- Elasticsearch: http://localhost:9200

### Monitoring
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (admin/admin)
- Kibana: http://localhost:5601

---

## Troubleshooting

### Services show "unhealthy" status
**Solution:** Create and configure `.env` file with required credentials

### Services keep restarting
**Solution:** Check logs with `docker-compose logs [service-name]`

### Can't connect to database
**Solution:** Verify `DATABASE_URL` in `.env` and ensure PostgreSQL is running

### Health checks timing out
**Solution:** Give services 60+ seconds to start up and initialize

### Port already in use
**Solution:** 
```bash
# Find what's using the port
lsof -i :3001

# Kill the process
kill -9 <PID>
```

---

## Next Steps

1. **Create .env file** - Add your actual credentials
2. **Run diagnostics** - `bash scripts/diagnose-services.sh`
3. **Restart services** - `pnpm run dev:restart`
4. **Monitor logs** - `pnpm run dev:logs`
5. **Verify endpoints** - Check service health endpoints at their respective URLs
