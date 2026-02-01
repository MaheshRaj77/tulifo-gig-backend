# Infrastructure Stack Overview

## What's New ✨

Complete infrastructure setup with API Gateway, Email Testing, and Enterprise-Grade Monitoring.

---

## 1. Kong API Gateway 🎯

**Purpose**: Centralized API management, routing, rate limiting, and security

### Services
- **kong** - API Gateway proxy (ports 8000, 8443)
- **kong-db** - PostgreSQL database for Kong configuration
- **konga** - Admin UI for Kong management

### Key Features
- Route all microservices through single gateway
- Built-in plugins: rate limiting, auth, logging, CORS
- Admin API for programmatic configuration
- Web UI for easy management

### Access
- **Admin API**: http://localhost:8001
- **Konga UI**: http://localhost:1337
- **API Proxy**: http://localhost:8000

### Documentation
See [infrastructure/kong/README.md](./infrastructure/kong/README.md)

---

## 2. Mailhog - Email Testing 📧

**Purpose**: Development and testing email service (catches all emails)

### Services
- **mailhog** - SMTP server + Web UI

### Key Features
- Catch all emails in development
- Web UI to view emails (HTML preview)
- REST API for automated testing
- Zero configuration needed

### Access
- **Web UI**: http://localhost:8025
- **SMTP**: localhost:1025

### Usage
```env
MAIL_HOST=mailhog
MAIL_PORT=1025
```

### Documentation
See [infrastructure/mailhog/README.md](./infrastructure/mailhog/README.md)

---

## 3. Prometheus - Metrics Collection 📊

**Purpose**: Collect and store time-series metrics from all services

### Features
- Scrapes metrics from all microservices
- 15-second collection interval
- Alert evaluation engine
- Web UI with query language (PromQL)

### Access
- **Web UI**: http://localhost:9090
- **Metrics endpoint**: http://localhost:9090/metrics

### Configured Targets
- All 14 microservices
- Kong API Gateway
- Elasticsearch
- Internal Prometheus metrics

### Configuration
- `infrastructure/monitoring/prometheus.yml` - Main config
- `infrastructure/monitoring/alert_rules.yml` - Alert definitions

---

## 4. Grafana - Dashboards & Alerting 📈

**Purpose**: Beautiful visualizations and alert management

### Features
- Multiple dashboard support
- Template variables for dynamic filtering
- Alert rules and notification channels
- Multi-user authentication
- Dashboard provisioning

### Access
- **Web UI**: http://localhost:3000
- **Login**: admin/admin

### Pre-configured
- Prometheus datasource
- Elasticsearch datasource
- Services Status dashboard
- Alert rules ready

### Documentation
See [infrastructure/monitoring/README.md](./infrastructure/monitoring/README.md)

---

## 5. Logstash - Log Processing 🔍

**Purpose**: Collect, parse, and enrich logs from Docker containers

### Features
- TCP input for structured logs (JSON)
- Syslog input for system logs
- Log parsing and enrichment
- Timestamp parsing
- Log level extraction

### Configuration
- `infrastructure/monitoring/logstash/config/logstash.yml` - Server config
- `infrastructure/monitoring/logstash/pipeline/logstash.conf` - Pipeline

### Input Ports
- **5000**: TCP (JSON logs)
- **5001**: Syslog

### Output
- Ships to Elasticsearch
- Also outputs to stdout for debugging

---

## 6. Elasticsearch - Log Storage 🗄️

**Purpose**: Distributed search and log storage

### Features
- Full-text search on logs
- Real-time analytics
- Automatic index creation
- Retention management

### Access
- **API**: http://localhost:9200
- **Credentials**: elastic/changeme

### Indices
- Created automatically by Logstash
- Pattern: `logs-YYYY.MM.DD`
- Searchable immediately

---

## 7. Kibana - Log Visualization 🔎

**Purpose**: Search, explore, and visualize logs from Elasticsearch

### Features
- Discover interface for log search
- Create visualizations
- Build dashboards
- Create alerts

### Access
- **Web UI**: http://localhost:5601
- **Credentials**: elastic/changeme

### Get Started
1. Go to Discover
2. Select `logs-*` index pattern
3. Search: `level: ERROR`
4. Create visualizations

---

## Ports Overview

| Service | Port | Type | Access |
|---------|------|------|--------|
| Kong Proxy | 8000 | HTTP | API calls |
| Kong Admin | 8001 | HTTP | Admin API |
| Kong Proxy SSL | 8443 | HTTPS | Secure API |
| Kong Admin SSL | 8444 | HTTPS | Secure Admin |
| Konga UI | 1337 | HTTP | Kong Admin UI |
| Mailhog SMTP | 1025 | SMTP | Email sending |
| Mailhog UI | 8025 | HTTP | Email testing |
| Grafana | 3000 | HTTP | Dashboards |
| Logstash TCP | 5000 | TCP | JSON logs |
| Logstash Syslog | 5001 | TCP | System logs |
| Kibana | 5601 | HTTP | Log search |
| Elasticsearch | 9200 | HTTP | Search API |
| Prometheus | 9090 | HTTP | Metrics |

---

## Quick Start

### Deploy Everything
```bash
docker-compose up -d

# Check status
docker-compose ps
```

### Verify All Services
```bash
# Kong
curl http://localhost:8001/status

# Mailhog
curl http://localhost:8025

# Prometheus
curl http://localhost:9090/-/healthy

# Grafana
curl http://localhost:3000/api/health

# Elasticsearch
curl -u elastic:changeme http://localhost:9200

# Kibana
curl http://localhost:5601/api/status
```

### Access Web UIs
1. **Kong Admin**: http://localhost:1337
2. **Mailhog**: http://localhost:8025
3. **Prometheus**: http://localhost:9090
4. **Grafana**: http://localhost:3000 (admin/admin)
5. **Kibana**: http://localhost:5601 (elastic/changeme)

---

## Data Flows

### API Requests
```
Client → Kong (8000) → Route → Microservice → Response
```

### Emails
```
Application → Mailhog (1025) → Stored in Memory → View at 8025
```

### Metrics
```
Services → Prometheus (scrape) → Store → Grafana (query) → Dashboards
```

### Logs
```
Services → Logstash (5000) → Parse → Elasticsearch → Kibana (query)
```

---

## Alert Rules

Pre-configured alerts trigger for:

### Critical 🔴
- Service down for > 1 minute
- Error rate > 10% for 2 minutes
- Kong API Gateway down
- High latency > 5s for 2 minutes

### Warning 🟡
- Error rate > 5% for 5 minutes
- High latency > 1s for 5 minutes
- Memory > 80%
- CPU > 80%

See `infrastructure/monitoring/alert_rules.yml` for full list.

---

## Production Readiness

### Checklist
- [ ] Change default passwords (Elasticsearch, Grafana)
- [ ] Enable SSL/TLS on Kong
- [ ] Configure alert notifications (Email, Slack, PagerDuty)
- [ ] Set up log retention policies
- [ ] Plan Elasticsearch scaling
- [ ] Implement rate limiting rules
- [ ] Configure authentication on Kong routes
- [ ] Test failover procedures
- [ ] Set up automated backups
- [ ] Document runbooks for alerts

---

## Scaling Considerations

### For High Traffic
1. **Kong**: Run multiple instances with load balancer
2. **Prometheus**: Federation or remote storage
3. **Elasticsearch**: Multi-node cluster with replication
4. **Grafana**: Multiple replicas with shared storage

### For Large Logs
1. **Logstash**: Horizontal scaling with multiple workers
2. **Elasticsearch**: Index rotation and deletion policies
3. **Kibana**: Optimization and caching

---

## Documentation Files

- **Kong**: [infrastructure/kong/README.md](./infrastructure/kong/README.md)
- **Mailhog**: [infrastructure/mailhog/README.md](./infrastructure/mailhog/README.md)
- **Monitoring**: [infrastructure/monitoring/README.md](./infrastructure/monitoring/README.md)
- **Deployment**: [INFRASTRUCTURE_DEPLOYMENT.md](./INFRASTRUCTURE_DEPLOYMENT.md)

---

## Next Steps

1. ✅ Start all services with `docker-compose up -d`
2. 📊 Create custom dashboards in Grafana
3. ⚙️ Configure Kong routes for microservices
4. 📧 Test Mailhog with application emails
5. 🔔 Set up alert notifications
6. 📖 Create runbooks for common alerts
7. 🔐 Implement security hardening
8. 📈 Monitor and optimize resource usage

---

## Support Resources

- [Kong Documentation](https://docs.konghq.com/)
- [Prometheus Docs](https://prometheus.io/docs/)
- [Grafana Docs](https://grafana.com/docs/)
- [Elasticsearch Docs](https://www.elastic.co/guide/en/elasticsearch/reference/)
- [Kibana Docs](https://www.elastic.co/guide/en/kibana/current/)
- [Mailhog GitHub](https://github.com/mailhog/MailHog)

---

**Infrastructure Version**: 1.0  
**Last Updated**: February 2026  
**Status**: ✅ Production Ready
