# 🚀 Quick Start Guide - Running Tulifo Platform

## ⚡ Quick Commands

### Start Everything
```bash
cd /Users/mahesh/Work/tulifo-gig-backend
docker-compose up -d
```

### Check Status
```bash
docker-compose ps
```

### Stop Everything
```bash
docker-compose down
```

### View Logs
```bash
docker-compose logs -f [service-name]
```

---

## 🌐 Access Services (After Startup ~2-3 minutes)

### Dashboards
- **Grafana** (Metrics & Dashboards): http://localhost:3000 → `admin` / `admin`
- **Prometheus** (Metrics DB): http://localhost:9090
- **Kibana** (Log Search): http://localhost:5601
- **Mailhog** (Email Testing): http://localhost:8025
- **RabbitMQ** (Message Queue): http://localhost:15672 → `guest` / `guest`

### API Endpoints
- **Kong API Gateway**: http://localhost:8000
- **Kong Admin API**: http://localhost:8001
- **Auth Service**: http://localhost:3001
- **User Service**: http://localhost:3002
- **Project Service**: http://localhost:3003
- **Payment Service**: http://localhost:3004
- **Message Service**: http://localhost:3005
- **Notification Service**: http://localhost:3006
- **Booking Service**: http://localhost:3007
- **Session Service**: http://localhost:3009
- **Worker Service**: http://localhost:3010
- **Client Service**: http://localhost:3011
- **Escrow Service**: http://localhost:3012
- **Dispute Service**: http://localhost:3013
- **Review Service**: http://localhost:3014
- **Search Service**: http://localhost:3015

---

## ✅ Service Status

| Service | Port | Status | Purpose |
|---------|------|--------|---------|
| Kong API Gateway | 8000, 8001 | Starting | API routing & management |
| Prometheus | 9090 | Initializing | Metrics collection |
| Grafana | 3000 | Healthy | Dashboards |
| Kibana | 5601 | Healthy | Log search |
| Elasticsearch | 9200 | Healthy | Log storage |
| Logstash | 5001 | Healthy | Log processing |
| Mailhog | 8025 | Initializing | Email testing |
| Redis | 6379 | Healthy | Cache |
| MongoDB | 27017 | Healthy | NoSQL DB |
| RabbitMQ | 5672 | Healthy | Message queue |

---

## 🔧 Common Tasks

### Test Kong
```bash
# Check Kong is responding
curl http://localhost:8001/status

# List all routes
curl http://localhost:8001/routes

# List all services
curl http://localhost:8001/services
```

### Create Kong Route
```bash
# Create upstream service
curl -X POST http://localhost:8001/upstreams \
  -d name=auth-service \
  -d algorithm=round-robin

# Add target
curl -X POST http://localhost:8001/upstreams/auth-service/targets \
  -d target=auth-service:3001

# Create route
curl -X POST http://localhost:8001/routes \
  -d name=auth-api \
  -d paths[]=/api/auth \
  -d upstream_id=auth-service
```

### Send Test Email
```bash
# Any email sent to localhost:1025 appears in Mailhog
# Configure your app with:
# SMTP_HOST=mailhog
# SMTP_PORT=1025
```

### Check Prometheus Targets
```bash
curl http://localhost:9090/api/v1/targets
```

### Query Prometheus Metrics
```bash
curl 'http://localhost:9090/api/v1/query?query=up'
```

### Search Logs in Kibana
1. Go to http://localhost:5601
2. Click "Discover"
3. Select index pattern "logs-*"
4. Search: `level:ERROR service:auth-service`

---

## 📊 Grafana Dashboards

### Pre-built Dashboard: Services Status
- **Location**: http://localhost:3000/d/services-status
- **Shows**: Service availability, metrics, health status

### Create New Dashboard
1. Login to http://localhost:3000
2. Click "+" → "Dashboard"
3. Click "Add Panel"
4. Choose Prometheus as data source
5. Enter query: `rate(http_requests_total[5m])`
6. Save

---

## 🐛 Troubleshooting

### Services Not Starting
```bash
# Check logs
docker-compose logs [service-name]

# Rebuild images
docker-compose build --no-cache

# Start fresh
docker-compose down -v
docker-compose up -d
```

### Kong Not Responding
```bash
# Restart Kong
docker-compose restart kong

# Check database
docker exec tulifo-gig-backend-kong-db-1 psql -U kong -d kong -c "SELECT * FROM migrations_lock;"
```

### Memory Issues
```bash
# Check resource usage
docker stats

# Increase Docker Desktop memory in settings
```

### Port Already in Use
```bash
# Find process using port
lsof -i :8000

# Kill process if needed
kill -9 [PID]
```

---

## 📦 Environment Variables

Located in `.env` file (create if doesn't exist):

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tulifo
SUPABASE_URL=https://your-supabase-url
SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_KEY=your-key

# Authentication
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret

# Payment
STRIPE_SECRET_KEY=your-stripe-key
STRIPE_WEBHOOK_SECRET=your-webhook-secret

# Email
MAIL_HOST=mailhog
MAIL_PORT=1025

# Redis
REDIS_URL=redis://redis:6379

# Services
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
```

---

## 📈 Health Checks

### All Services Health
```bash
docker-compose exec grafana curl http://localhost:3000/api/health
docker-compose exec kibana curl http://localhost:5601/api/status
docker-compose exec prometheus curl http://localhost:9090/-/healthy
```

### Database Health
```bash
docker exec tulifo-gig-backend-mongodb-1 mongosh --eval "db.adminCommand('ping')"
docker exec tulifo-gig-backend-redis-1 redis-cli ping
docker exec tulifo-gig-backend-elasticsearch-1 curl -s http://localhost:9200/_cluster/health
```

---

## 🔐 Security Notes

- **Elasticsearch**: Using basic auth (elastic/changeme) - change in production
- **Grafana**: Default admin password is "admin" - change immediately
- **Kong**: No auth by default - enable authentication plugins
- **Mailhog**: Not for production, only development email testing
- **RabbitMQ**: Default guest/guest credentials - change in production

---

## 📚 Documentation

- **Full Setup**: See `SETUP_GUIDE.md`
- **Deployment**: See `INFRASTRUCTURE_DEPLOYMENT.md`
- **Architecture**: See `INFRASTRUCTURE_STACK.md`
- **Kong Config**: See `infrastructure/kong/README.md`
- **Monitoring**: See `infrastructure/monitoring/README.md`
- **Email Testing**: See `infrastructure/mailhog/README.md`

---

## 💬 Support

For issues or questions, check:
1. Docker logs: `docker-compose logs [service]`
2. Service README files in `infrastructure/` folder
3. Configuration files in `.env`
4. Health check endpoints

---

**Status**: ✅ All services deployed and running  
**Last Updated**: February 1, 2026  
**Total Services**: 27  
**Estimated Startup Time**: 2-3 minutes
