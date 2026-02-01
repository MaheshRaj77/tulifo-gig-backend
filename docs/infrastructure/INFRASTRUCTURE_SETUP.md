# Infrastructure & DevOps Complete Setup

## Overview

Complete infrastructure stack including API Gateway, email testing, monitoring, and observability.

## Components Added

### 1. **Kong API Gateway** (Port 8000, 8001)
- Centralized API management
- Request routing and rate limiting
- Authentication and authorization
- Request/response transformation
- Built-in load balancing
- Admin UI (Konga) at port 1337

### 2. **Email Testing** (Port 1025, 8025)
- Mailhog for development email testing
- Web UI at http://localhost:8025
- SMTP server at localhost:1025
- Intercepts all outbound emails

### 3. **Monitoring Stack**

#### Prometheus (Port 9090)
- Metrics collection
- Time-series database
- Alert evaluation
- 30-day retention

#### Grafana (Port 3000)
- Visualization dashboards
- Pre-configured datasources
- Custom alerting
- Admin: admin/admin

#### Elasticsearch (Port 9200)
- Centralized log storage
- Full-text search
- Index management
- Auto-indexing with daily rotation

#### Logstash (Port 5000)
- Log processing pipeline
- JSON parsing
- Data enrichment
- Routing to Elasticsearch

#### Kibana (Port 5601)
- Log visualization
- Search and analytics
- Dashboard creation
- Alert configuration

## Full Service Stack

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT / API                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              Kong API Gateway (8000)                         │
│  - Request routing                                           │
│  - Rate limiting                                             │
│  - Authentication                                            │
│  - Load balancing                                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
    ┌───▼────┐   ┌────▼────┐   ┌────▼────┐
    │   Auth │   │  User   │   │ Project │  ... (14 services)
    │ Service│   │ Service │   │Service  │
    └───┬────┘   └────┬────┘   └────┬────┘
        │              │              │
        └──────────────┼──────────────┘
                       │
        ┌──────────────┼──────────────────────┐
        │              │                      │
    ┌───▼────┐   ┌────▼────┐   ┌────▼─────┐ ┌────▼─────┐
    │PostgreSQL│   │ MongoDB │   │  Redis   │ │RabbitMQ  │
    │          │   │          │   │  Cache   │ │  Queue   │
    └──────────┘   └──────────┘   └──────────┘ └──────────┘

Logging & Monitoring:
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Logstash    │───▶│Elasticsearch │◀───│   Kibana     │
│  (5000)      │    │  (9200)      │    │   (5601)     │
└──────────────┘    └──────────────┘    └──────────────┘

Metrics & Dashboards:
┌──────────────┐    ┌──────────────┐
│ Prometheus   │◀───│   Services   │
│  (9090)      │    │   (:9000)    │
└──────┬───────┘    └──────────────┘
       │
    ┌──▼────────┐
    │  Grafana   │
    │  (3000)    │
    └────────────┘

Email (Development):
┌──────────────┐
│   Mailhog    │
│ SMTP (1025)  │
│  Web (8025)  │
└──────────────┘
```

## Quick Start Commands

### Start All Services

```bash
# Start all services
docker-compose up -d

# Start specific monitoring services
docker-compose up -d prometheus grafana elasticsearch kibana logstash mailhog kong

# View logs
docker-compose logs -f [service-name]

# Check status
docker-compose ps
```

### Stop Services

```bash
# Stop all
docker-compose down

# Stop with volume cleanup
docker-compose down -v

# Stop specific service
docker-compose stop [service-name]
```

## Access Points

| Service | URL | Port | Purpose |
|---------|-----|------|---------|
| Kong Proxy | http://localhost:8000 | 8000 | API Gateway proxy |
| Kong Admin | http://localhost:8001 | 8001 | Gateway management |
| Konga UI | http://localhost:1337 | 1337 | Kong Admin UI |
| Grafana | http://localhost:3000 | 3000 | Dashboards |
| Prometheus | http://localhost:9090 | 9090 | Metrics |
| Kibana | http://localhost:5601 | 5601 | Logs |
| Elasticsearch | http://localhost:9200 | 9200 | Log storage |
| Mailhog Web | http://localhost:8025 | 8025 | Email testing |
| SMTP | localhost:1025 | 1025 | Email SMTP |

## Configuration Files

```
infrastructure/
├── db/
│   └── postgres-schema.sql       # Database schema
├── docker/
├── scripts/
└── monitoring/
    ├── prometheus.yml             # Prometheus config
    ├── alert_rules.yml           # Alert rules
    ├── logstash.conf             # Logstash pipeline
    └── grafana/
        └── provisioning/
            ├── datasources/
            │   └── prometheus.yml # Datasource config
            └── dashboards/
                └── dashboards.yml # Dashboard provisioning
```

## Service Configuration in Kong

### Example: Add Auth Service

```bash
# Create service
curl -X POST http://localhost:8001/services \
  -d "name=auth-service" \
  -d "url=http://auth-service:3001"

# Add route
curl -X POST http://localhost:8001/services/auth-service/routes \
  -d "paths[]=/auth" \
  -d "strip_path=true"

# Enable JWT plugin
curl -X POST http://localhost:8001/services/auth-service/plugins \
  -d "name=jwt"

# Enable rate limiting
curl -X POST http://localhost:8001/services/auth-service/plugins \
  -d "name=rate-limiting" \
  -d "config.minute=1000"
```

## Monitoring Microservices

### Expose Metrics Endpoint

Each microservice should expose `/metrics`:

```javascript
// Express.js example
import promClient from 'prom-client';

app.get('/metrics', (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(promClient.register.metrics());
});
```

### Send Logs to Logstash

```javascript
// Winston transport example
import LogstashTransport from 'winston-logstash';

logger.add(new LogstashTransport({
  host: 'logstash',
  port: 5000,
  transport_type: 'tcp'
}));
```

## Production Deployment

### Scale Kong

```yaml
# docker-compose.yml
kong:
  deploy:
    replicas: 3
    update_config:
      parallelism: 1
      delay: 10s
```

### Persistent Volumes

```yaml
volumes:
  prometheus_data:
    driver: local
  grafana_data:
    driver: local
  elasticsearch_data:
    driver: local
```

### Environment Variables

Create `.env`:

```env
# Kong
KONG_DATABASE=postgres
KONG_PG_HOST=kong-database
KONG_PG_USER=kong
KONG_PG_PASSWORD=secure_password

# Grafana
GF_SECURITY_ADMIN_PASSWORD=secure_password

# Prometheus retention
PROMETHEUS_RETENTION=30d

# Elasticsearch
ES_JAVA_OPTS=-Xms1g -Xmx1g
```

## Troubleshooting

### Kong not starting

```bash
# Check database
docker-compose logs kong-database

# Verify migrations
docker-compose logs kong-migrations

# Check admin API
curl http://localhost:8001/status
```

### Logstash not receiving logs

```bash
# Check port
docker ps | grep logstash
netstat -tlnp | grep 5000

# Send test log
echo '{"message":"test"}' | nc localhost 5000
```

### Elasticsearch not indexing

```bash
# Check cluster health
curl http://localhost:9200/_cluster/health

# List indices
curl http://localhost:9200/_cat/indices

# Create test index
curl -X PUT http://localhost:9200/test-index
```

## Monitoring Checklist

- [ ] All services showing healthy in Kong admin
- [ ] Prometheus scraping all targets
- [ ] Grafana dashboards populated with data
- [ ] Logstash receiving logs
- [ ] Kibana showing recent logs
- [ ] Alerts configured in Prometheus
- [ ] Email sending to Mailhog

## Performance Tips

1. **Kong**: Cache enabled, connection pool tuning
2. **Prometheus**: Adjust scrape intervals, retention
3. **Elasticsearch**: Heap size, shard allocation
4. **Grafana**: Cache dashboards, batch queries
5. **Logstash**: Batch size, pipeline parallelism

## Security

### Production Setup

- Use TLS/SSL for all services
- Enable Kong authentication plugins
- Set secure admin passwords
- Use secrets management (Vault, AWS Secrets)
- Implement network policies
- Enable audit logging

### Kong Security

```bash
# Enable admin SSL
curl -X POST http://localhost:8001/plugins \
  -d "name=acl" \
  -d "config.whitelist=admin"

# Enable rate limiting by IP
curl -X POST http://localhost:8001/plugins \
  -d "name=rate-limiting" \
  -d "config.limit_by=ip"
```

## Documentation

- [Kong Setup](./KONG_SETUP.md)
- [Monitoring Stack](./MONITORING_STACK.md)
- [Mailhog Setup](./MAILHOG_SETUP.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
