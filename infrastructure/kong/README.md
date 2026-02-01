# Kong API Gateway Configuration

## Overview
Kong is a lightweight, fast, and flexible API gateway that manages, secures, and orchestrates all API calls.

## Ports
- **8000**: Kong Proxy (handles API requests)
- **8001**: Kong Admin API (management interface)
- **8443**: Kong Proxy SSL
- **8444**: Kong Admin API SSL
- **1337**: Konga UI (Kong Admin UI)

## Quick Start

### 1. Start Services
```bash
docker-compose up kong kong-db konga
```

### 2. Access Services
- **Admin API**: http://localhost:8001
- **Konga UI**: http://localhost:1337

### 3. Configure Routes

#### Using Kong Admin API

**Add Upstream (Service Backend)**
```bash
curl -X POST http://localhost:8001/upstreams \
  -d name=auth-service \
  -d algorithm=round-robin
```

**Add Target**
```bash
curl -X POST http://localhost:8001/upstreams/auth-service/targets \
  -d target=auth-service:3001 \
  -d weight=100
```

**Add Route**
```bash
curl -X POST http://localhost:8001/routes \
  -d name=auth-api \
  -d paths[]=/auth \
  -d upstream_id=auth-service
```

#### Using Konga UI
1. Navigate to http://localhost:1337
2. Log in (default: admin/admin)
3. Add new Kong node pointing to http://kong:8001
4. Create upstreams and routes through the UI

## Service Routing Examples

### Auth Service Route
```bash
curl -X POST http://localhost:8001/routes \
  -d name=auth-service \
  -d paths[]=/api/auth \
  -d upstream_id=auth-service \
  -d strip_path=true
```

### User Service Route
```bash
curl -X POST http://localhost:8001/routes \
  -d name=user-service \
  -d paths[]=/api/users \
  -d upstream_id=user-service \
  -d strip_path=true
```

## Plugins

### Rate Limiting
```bash
curl -X POST http://localhost:8001/routes/{route_id}/plugins \
  -d name=rate-limiting \
  -d config.minute=100 \
  -d config.policy=local
```

### Authentication (Key Auth)
```bash
curl -X POST http://localhost:8001/routes/{route_id}/plugins \
  -d name=key-auth
```

### CORS
```bash
curl -X POST http://localhost:8001/routes/{route_id}/plugins \
  -d name=cors \
  -d config.origins=* \
  -d config.methods=GET,POST,PUT,DELETE
```

### Logging
```bash
curl -X POST http://localhost:8001/routes/{route_id}/plugins \
  -d name=http-log \
  -d config.http_endpoint=http://logstash:5000 \
  -d config.method=POST
```

## Testing

### Test Kong Proxy
```bash
curl -i http://localhost:8000/api/auth/health
```

### Test Admin API
```bash
curl -i http://localhost:8001/status
```

## Configuration Files

All Kong configuration is stored in PostgreSQL. To backup:
```bash
docker exec kong kong migrations list
docker exec kong kong migrations status
```

## Monitoring

Kong exposes metrics at:
```
http://localhost:8001/metrics
```

Scraped by Prometheus for monitoring and alerting.

## Troubleshooting

### Kong Not Starting
```bash
# Check logs
docker logs kong

# Verify database connectivity
docker exec kong-db psql -U kong -d kong -c "SELECT version();"
```

### Route Not Working
1. Verify route exists: `curl http://localhost:8001/routes`
2. Verify upstream exists: `curl http://localhost:8001/upstreams`
3. Verify target health: `curl http://localhost:8001/upstreams/{upstream_id}/health`

## Production Considerations

1. **Enable SSL/TLS** for 8443 and 8444
2. **Implement authentication** using Key Auth or OAuth2
3. **Set up rate limiting** to prevent abuse
4. **Enable logging** to centralized logging system
5. **Configure backups** of Kong configuration
6. **Use Konga** for admin UI access control
7. **Monitor** Kong metrics and health

## Documentation
- Kong Docs: https://docs.konghq.com/
- Kong Admin API: https://docs.konghq.com/admin-api/
- Konga: https://pantsel.github.io/konga/
