# Kong API Gateway Setup

## Overview
Kong is a scalable, open-source API Gateway used to manage, protect, and extend microservices. All microservices traffic flows through Kong for centralized management, authentication, rate limiting, and monitoring.

## Access Points

- **Kong Proxy**: http://localhost:8000 (Port 8000)
- **Kong Admin API**: http://localhost:8001 (Port 8001)
- **Kong Admin UI (Konga)**: http://localhost:1337

## Services Configuration

### Adding Services and Routes

```bash
# Add Auth Service upstream
curl -X POST http://localhost:8001/upstreams \
  -d "name=auth-service" \
  -d "algorithm=round-robin"

# Add target to auth-service upstream
curl -X POST http://localhost:8001/upstreams/auth-service/targets \
  -d "target=auth-service:3001"

# Create auth-service service
curl -X POST http://localhost:8001/services \
  -d "name=auth-service" \
  -d "upstream_url=http://auth-service:3001"

# Create route for auth service
curl -X POST http://localhost:8001/services/auth-service/routes \
  -d "paths[]=/auth" \
  -d "strip_path=true"
```

### Enable Plugins

```bash
# Enable JWT authentication
curl -X POST http://localhost:8001/services/auth-service/plugins \
  -d "name=jwt"

# Enable rate limiting
curl -X POST http://localhost:8001/services/auth-service/plugins \
  -d "name=rate-limiting" \
  -d "config.minute=100"

# Enable CORS
curl -X POST http://localhost:8001/plugins \
  -d "name=cors" \
  -d "config.origins=*"

# Enable logging
curl -X POST http://localhost:8001/services/auth-service/plugins \
  -d "name=tcp-log" \
  -d "config.host=logstash" \
  -d "config.port=5000"
```

## Admin UI (Konga)

1. Navigate to http://localhost:1337
2. Create new connection:
   - Name: tulifo-kong
   - Kong Admin URL: http://kong:8001
3. Manage services, routes, consumers, and plugins through UI

## Default Plugins

- **rate-limiting**: Protect services from overload
- **jwt**: Secure endpoints with JWT tokens
- **cors**: Handle cross-origin requests
- **tcp-log**: Send logs to Logstash
- **prometheus**: Export metrics to Prometheus

## Health Check

```bash
curl http://localhost:8001/status
```

Expected response:
```json
{
  "server": {
    "connections_accepted": 123,
    "connections_active": 45,
    "connections_handled": 123,
    "connections_reading": 1,
    "connections_waiting": 2,
    "connections_writing": 2,
    "requests_total": 500
  },
  "database": {
    "reachable": true
  }
}
```

## Common Routes Configuration

All microservices should be added following this pattern:

| Service | Path | Upstream | Port |
|---------|------|----------|------|
| Auth | /auth | auth-service | 3001 |
| Users | /users | user-service | 3002 |
| Projects | /projects | project-service | 3003 |
| Payments | /payments | payment-service | 3004 |
| Notifications | /notifications | notification-service | 3005 |
| Messages | /messages | message-service | 3006 |
| Bookings | /bookings | booking-service | 3007 |
| Matching | /matching | matching-service | 3008 |
| Sessions | /sessions | session-service | 3009 |
| Workers | /workers | worker-service | 3010 |
| Escrow | /escrow | escrow-service | 3011 |
| Disputes | /disputes | dispute-service | 3012 |
| Reviews | /reviews | review-service | 3013 |
| Search | /search | search-service | 3015 |

## Load Balancing

Kong automatically load balances traffic across multiple targets if configured as upstreams. You can scale services and Kong will distribute traffic.

```bash
# Add multiple targets for high availability
curl -X POST http://localhost:8001/upstreams/auth-service/targets \
  -d "target=auth-service-2:3001"
```

## Monitoring

Kong exports metrics to Prometheus on `:8000/metrics`. Monitor:
- Request latency
- Error rates
- Request volume
- Active connections
- Database connection pool status
