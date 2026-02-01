# Infrastructure Deployment Guide

Complete guide for deploying Kong API Gateway, Mailhog, and Monitoring Stack.

## Prerequisites

- Docker & Docker Compose
- 8GB RAM minimum
- 10GB disk space
- Ports available: 1025, 1337, 3000, 5000, 5601, 8000-8001, 8025, 8443-8444, 9090, 9200, 9600

## Quick Deploy

### All Services (Production-Ready)
```bash
# Start all services
docker-compose up -d

# Verify all are running
docker-compose ps

# Check health
curl http://localhost:8001/status
curl http://localhost:3000/api/health
curl http://localhost:9090/-/healthy
curl http://localhost:5601/api/status
curl http://localhost:8025
```

### Development (Monitoring Only)
```bash
docker-compose up -d prometheus grafana elasticsearch kibana logstash
```

### Production (Full Stack)
```bash
docker-compose -f docker-compose.yml up -d
```

## Service Configuration

### 1. Kong Setup (5 minutes)

```bash
# Verify Kong is running
curl http://localhost:8001/status

# Create upstream for Auth Service
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
  -d upstream_id=auth-service \
  -d strip_path=true
```

Or use **Konga UI** at http://localhost:1337

### 2. Mailhog Setup (1 minute)

```bash
# No setup needed!
# Access at http://localhost:8025
# SMTP: localhost:1025

# Configure your apps with:
MAIL_HOST=mailhog
MAIL_PORT=1025
```

### 3. Prometheus Setup (2 minutes)

**Already configured!** Check:
- http://localhost:9090/targets - View scraped services
- http://localhost:9090/alerts - View alert status

### 4. Grafana Setup (5 minutes)

```bash
# Access at http://localhost:3000
# Login: admin/admin

# Add datasources (auto-provisioned):
# - Prometheus: http://prometheus:9090
# - Elasticsearch: http://elasticsearch:9200

# Import dashboards:
# - Services Status (included)
# - Create custom dashboards
```

### 5. ELK Stack Setup (3 minutes)

```bash
# Kibana at http://localhost:5601
# Elasticsearch at http://localhost:9200
# Logstash processing on port 5000

# Verify Elasticsearch
curl -u elastic:changeme http://localhost:9200

# View indices
curl -u elastic:changeme http://localhost:9200/_cat/indices

# Create index pattern in Kibana
# Pattern: logs-*
# Timestamp field: @timestamp
```

## Monitoring Configuration

### Add Metrics to Your Services

#### Node.js (Express)
```bash
npm install prom-client
```

```javascript
const prometheus = require('prom-client');

// Create metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

// Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration.labels(req.method, req.route.path, res.statusCode).observe(duration);
  });
  next();
});

// Export metrics
app.get('/metrics', (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(prometheus.register.metrics());
});
```

#### Go (Booking Service)
```go
import "github.com/prometheus/client_golang/prometheus"
import "github.com/prometheus/client_golang/prometheus/promhttp"

// Create metric
httpRequestsTotal := prometheus.NewCounterVec(
    prometheus.CounterOpts{
        Name: "http_requests_total",
        Help: "Total HTTP requests",
    },
    []string{"method", "path", "status"},
)

// Register
prometheus.MustRegister(httpRequestsTotal)

// Expose metrics
http.Handle("/metrics", promhttp.Handler())
```

#### Python (Matching Service)
```bash
pip install prometheus-client
```

```python
from prometheus_client import Counter, Histogram, generate_latest
from fastapi import FastAPI
from fastapi.responses import Response

request_count = Counter('http_requests_total', 'Total requests', ['method', 'endpoint'])
request_duration = Histogram('http_request_duration_seconds', 'Request duration')

@app.get('/metrics')
async def metrics():
    return Response(generate_latest(), media_type='text/plain')
```

## Alerting Setup

### 1. Email Alerts

```yaml
# In alert_rules.yml
alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']
```

### 2. Slack Alerts

1. Create webhook: https://api.slack.com/messaging/webhooks
2. Add to Grafana:
   - Settings → Notification channels
   - Type: Slack
   - Paste webhook URL

### 3. PagerDuty Alerts

1. Create integration key in PagerDuty
2. Add to Grafana notification channels
3. Configure incident escalation

## Backup & Recovery

### Backup Prometheus Data
```bash
docker exec prometheus tar czf /prometheus/backup.tar.gz /prometheus/wal
docker cp prometheus:/prometheus/backup.tar.gz ./backups/
```

### Backup Grafana Dashboards
```bash
docker exec grafana grafana-cli admin export-dashboard
```

### Backup Elasticsearch Data
```bash
curl -X PUT "localhost:9200/_snapshot/backup?pretty" -H 'Content-Type: application/json' -d'
{
  "type": "fs",
  "settings": {
    "location": "/mnt/backups"
  }
}
'
```

## Scaling for Production

### High Availability
```yaml
# Multiple instances
prometheus:
  replicas: 2
grafana:
  replicas: 2
elasticsearch:
  replicas: 3
```

### Resource Limits
```yaml
prometheus:
  resources:
    limits:
      memory: 2Gi
      cpu: 1000m
grafana:
  resources:
    limits:
      memory: 512Mi
      cpu: 500m
elasticsearch:
  resources:
    limits:
      memory: 4Gi
      cpu: 2000m
```

### Performance Tuning

**Prometheus**
```bash
# Increase retention
--storage.tsdb.retention.time=60d

# Increase samples limit
--storage.tsdb.max-exemplars=100000
```

**Elasticsearch**
```bash
# Increase heap
-Xms2g -Xmx2g

# Adjust shards
PUT logs-*/_settings
{
  "number_of_shards": 3,
  "number_of_replicas": 2
}
```

**Logstash**
```bash
# Increase workers
-w 8

# Adjust batch size
-b 256
```

## Troubleshooting

### Kong Not Starting
```bash
docker logs kong-db
docker exec kong-db psql -U kong -d kong -c "SELECT 1"
```

### Prometheus Targets Down
```bash
# Check service health
curl http://localhost:3001/health

# Verify Prometheus can reach it
curl http://prometheus:9090/api/v1/targets?state=down
```

### Grafana Data Not Loading
```bash
# Verify datasource connection
curl http://prometheus:9090/api/v1/status/config

# Check plugin logs
docker logs grafana
```

### Logstash Not Processing Logs
```bash
# Check Logstash logs
docker logs logstash

# Verify Elasticsearch connection
curl -u elastic:changeme http://elasticsearch:9200
```

### Out of Disk Space
```bash
# Check usage
docker exec elasticsearch du -sh /usr/share/elasticsearch/data

# Delete old indices
curl -X DELETE "localhost:9200/logs-*"
```

## Security Hardening

### 1. Change Default Passwords
```bash
# Elasticsearch
curl -X POST "localhost:9200/_security/user/elastic/_password?pretty" \
  -H 'Content-Type: application/json' \
  -d '{"password" : "strong-password"}'

# Grafana - change admin password on first login
```

### 2. Enable SSL/TLS
```yaml
# Docker-compose
environment:
  - xpack.security.enabled=true
  - xpack.security.enrollment.enabled=true
  - ELASTIC_PASSWORD=changeme
```

### 3. Network Isolation
```yaml
networks:
  monitoring:
    internal: true
  services:
    internal: false
```

### 4. Access Control
```bash
# Kong API key auth
curl -X POST http://localhost:8001/routes/{route_id}/plugins \
  -d name=key-auth

# Grafana RBAC
# Settings → Org → Teams → Permissions
```

## Monitoring the Monitors

### Health Checks
```bash
# All components
docker-compose exec prometheus curl http://prometheus:9090/-/healthy
docker-compose exec grafana curl http://grafana:3000/api/health
docker-compose exec elasticsearch curl -u elastic:changeme http://elasticsearch:9200
```

### Resource Usage
```bash
docker stats
```

### Disk Usage
```bash
docker exec elasticsearch du -sh /usr/share/elasticsearch/data
docker exec prometheus du -sh /prometheus
```

## Documentation Links

- **Kong**: See [infrastructure/kong/README.md](./kong/README.md)
- **Mailhog**: See [infrastructure/mailhog/README.md](./mailhog/README.md)
- **Monitoring**: See [infrastructure/monitoring/README.md](./monitoring/README.md)

## Support

For issues or questions:
1. Check service logs: `docker logs <service>`
2. Review configuration files
3. Consult service documentation
4. Check troubleshooting sections above
