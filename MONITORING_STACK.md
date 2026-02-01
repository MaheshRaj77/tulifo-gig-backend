# Complete Monitoring & Observability Stack

## Overview

The Tulifo Gig Platform includes a complete monitoring, logging, and observability stack:

- **Prometheus**: Metrics collection and time-series database
- **Grafana**: Visualization and dashboards
- **Elasticsearch**: Log storage and search
- **Logstash**: Log processing and transformation
- **Kibana**: Log visualization and analysis
- **Kong Metrics**: API Gateway request/response metrics

## Architecture

```
Microservices
     ↓
┌─────────────────┐
│  Metrics (:9000)│ → Prometheus → Grafana (Port 3000)
└─────────────────┘
┌─────────────────┐
│  Logs (:5000)   │ → Logstash → Elasticsearch → Kibana (Port 5601)
└─────────────────┘
```

## Services & Ports

| Service | Port | URL |
|---------|------|-----|
| Prometheus | 9090 | http://localhost:9090 |
| Grafana | 3000 | http://localhost:3000 |
| Elasticsearch | 9200 | http://localhost:9200 |
| Logstash | 5000 | :5000 (TCP/UDP) |
| Kibana | 5601 | http://localhost:5601 |

## Quick Start

### 1. Start All Services

```bash
docker-compose up -d prometheus grafana logstash elasticsearch kibana
```

### 2. Access Grafana

- URL: http://localhost:3000
- Default Credentials:
  - Username: `admin`
  - Password: `admin`

- Pre-configured Datasources:
  - Prometheus (http://prometheus:9090)
  - Elasticsearch (http://elasticsearch:9200)

### 3. Access Kibana

- URL: http://localhost:5601
- Create Index Pattern:
  1. Navigate to Stack Management
  2. Index Patterns → Create Index Pattern
  3. Pattern: `logs-*`
  4. Time field: `@timestamp`

### 4. Send Logs from Microservices

Configure your Node.js services to send logs to Logstash:

```javascript
// Using winston-logstash
const winston = require('winston');
const LogstashTransport = require('winston-logstash/lib/winston-logstash-latest').LogstashTransport;

const logger = winston.createLogger({
  transports: [
    new LogstashTransport({
      host: 'logstash',
      port: 5000,
      transport_type: 'tcp'
    })
  ]
});

logger.info('Application started', { service: 'auth-service' });
```

Or using simple fetch:

```javascript
const logData = {
  timestamp: new Date().toISOString(),
  service: 'auth-service',
  level: 'info',
  message: 'User authentication successful'
};

fetch('http://logstash:5000', {
  method: 'POST',
  body: JSON.stringify(logData)
});
```

## Grafana Dashboards

Pre-built dashboards for monitoring:

### Available Metrics

1. **API Gateway (Kong)**
   - Requests/sec
   - Latency (p50, p95, p99)
   - Error rate
   - Active connections
   - Upstream availability

2. **Microservices**
   - Request count by service
   - Response time
   - Error count
   - Database connection pool
   - Redis cache hit rate

3. **Infrastructure**
   - CPU usage
   - Memory usage
   - Disk I/O
   - Network I/O
   - Container status

4. **Database**
   - Query performance
   - Connection pool status
   - Transaction rate
   - Slow queries

### Creating Custom Dashboards

1. Click "+" → "Create Dashboard"
2. Add panels:
   - Select Prometheus datasource
   - Enter PromQL queries
   - Configure visualization type
   - Save dashboard

### Sample Queries

```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m])

# Response time (95th percentile)
histogram_quantile(0.95, http_request_duration_seconds_bucket)

# Kong request latency
histogram_quantile(0.95, kong_upstream_latency_ms_bucket)
```

## Kibana Log Analysis

### Creating Visualizations

1. Navigate to Analytics → Discover
2. Select `logs-*` index pattern
3. Filter and search logs:
   - By service: `service_name: "auth-service"`
   - By level: `log_level: "ERROR"`
   - By timeframe: Select in date picker

### Sample Searches

```
service_name: "auth-service" AND log_level: "ERROR" AND @timestamp: [now-1h TO now]
```

```
status: 500 AND service_name: *
```

### Creating Alerts

1. Create a saved search
2. Click "Create alert"
3. Define conditions and notifications
4. Receive alerts via webhook/email

## Alerting Setup

### Configure Alert Rules (Prometheus)

Edit `infrastructure/monitoring/alert_rules.yml`:

```yaml
groups:
  - name: tulifo-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate > 5% for 5 minutes"

      - alert: ServiceDown
        expr: up{job="microservices"} == 0
        for: 1m
        annotations:
          summary: "Service is down"
          description: "{{ $labels.instance }} is unreachable"
```

### Alertmanager Setup

Configure alerts to:
- Slack
- Email
- PagerDuty
- Webhook

## Log Retention

- **Elasticsearch**: 30 days (configurable in Logstash)
- **Prometheus**: 30 days (configurable in prometheus.yml)

To change:
```yaml
# prometheus.yml
--storage.tsdb.retention.time=90d
```

## Performance Tuning

### Elasticsearch
```bash
# Increase heap size
ES_JAVA_OPTS=-Xms1g -Xmx1g
```

### Logstash
```bash
# Adjust batch size and timeout
output {
  elasticsearch {
    batch_size => 500
    batch_delay => 1000
  }
}
```

### Prometheus
```yaml
# Adjust scrape intervals
global:
  scrape_interval: 15s  # Default is 1m
  evaluation_interval: 15s
```

## Troubleshooting

### Kibana can't connect to Elasticsearch

```bash
curl http://localhost:9200/_cluster/health
# Should return: {"status":"green",...}
```

### Logstash not receiving logs

```bash
# Check if port is listening
lsof -i :5000
netstat -tlnp | grep 5000
```

### Prometheus can't scrape metrics

```bash
# Check targets at http://localhost:9090/targets
# Verify service is running and metrics endpoint exists
curl http://localhost:3001/metrics
```

## Backup & Recovery

### Backup Elasticsearch

```bash
curl -X PUT "localhost:9200/_snapshot/backup"
curl -X PUT "localhost:9200/_snapshot/backup/snapshot_1?wait_for_completion=true"
```

### Backup Grafana

```bash
docker exec grafana grafana-cli admin export-dashboard > dashboard_backup.json
```

## Documentation Links

- Prometheus: https://prometheus.io/docs/
- Grafana: https://grafana.com/docs/grafana/latest/
- Elasticsearch: https://www.elastic.co/guide/en/elasticsearch/reference/
- Kibana: https://www.elastic.co/guide/en/kibana/current/
- Logstash: https://www.elastic.co/guide/en/logstash/current/
