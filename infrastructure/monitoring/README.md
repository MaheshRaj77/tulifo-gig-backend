# Tulifo Monitoring Stack

Complete monitoring solution with Prometheus, Grafana, ELK Stack, and alerting.

## Components

### 1. Prometheus (Port 9090)
**Time-series metrics database and alerting engine**

- Scrapes metrics from all services
- Stores time-series data
- Evaluates alert rules
- Web UI at http://localhost:9090

### 2. Grafana (Port 3000)
**Data visualization and dashboarding**

- Beautiful dashboards for metrics
- Multiple data source support
- Alert management
- User authentication
- Admin: http://localhost:3000 (admin/admin)

### 3. Logstash
**Log processing and enrichment**

- Collects logs from Docker containers
- Parses and transforms log data
- Ships logs to Elasticsearch
- Runs on port 5000 (TCP input)

### 4. Elasticsearch (Port 9200)
**Distributed search and analytics engine**

- Stores centralized logs
- Full-text search capabilities
- Real-time analytics
- Clusterable for scale

### 5. Kibana (Port 5601)
**Log visualization and exploration**

- Search and filter logs
- Create visualizations
- Build dashboards
- Discover patterns

## Quick Start

### 1. Start All Monitoring Services
```bash
docker-compose up prometheus grafana logstash elasticsearch kibana
```

### 2. Access Services

| Service | URL | Credentials |
|---------|-----|-------------|
| Prometheus | http://localhost:9090 | None |
| Grafana | http://localhost:3000 | admin/admin |
| Kibana | http://localhost:5601 | elastic/changeme |
| Elasticsearch | http://localhost:9200 | elastic/changeme |

## Architecture

```
Services → Prometheus ← (scrapes metrics)
                ↓
            Grafana
         (visualizes)

Services → Logstash ← (collects logs)
                ↓
          Elasticsearch
                ↓
            Kibana
        (visualizes logs)
```

## Key Metrics Monitored

### Service Health
- `up` - Service availability (1=up, 0=down)
- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request latency
- `http_requests_total{status=~"5.."}` - Error rates

### Resource Usage
- `process_resident_memory_bytes` - Memory usage
- `process_cpu_seconds_total` - CPU usage
- `go_goroutines` - Goroutine count

### Database
- Connection pool usage
- Query latency
- Transaction rates

### Message Queue
- Queue depth
- Message processing rate
- Failed message count

## Alert Rules

Alerts are triggered for:

1. **Service Availability**
   - Service down for > 1 minute → **CRITICAL**
   - Kong down for > 1 minute → **CRITICAL**

2. **Error Rates**
   - 5xx error rate > 5% for 5 min → **WARNING**
   - 5xx error rate > 10% for 2 min → **CRITICAL**

3. **Latency**
   - p95 latency > 1s for 5 min → **WARNING**
   - p95 latency > 5s for 2 min → **CRITICAL**

4. **Resource Usage**
   - Memory usage > 80% → **WARNING**
   - Memory usage > 90% → **CRITICAL**
   - CPU usage > 80% → **WARNING**

5. **Database**
   - Connection pool exhausted → **CRITICAL**
   - Query latency spike → **WARNING**

6. **Message Queue**
   - Queue backup > 1000 messages → **WARNING**
   - Queue backup > 10000 messages → **CRITICAL**

## Creating Custom Dashboards

### In Grafana
1. Click "+" → "Dashboard"
2. Click "Add new panel"
3. Select data source (Prometheus or Elasticsearch)
4. Enter queries:
   - **Prometheus**: `rate(http_requests_total[5m])`
   - **Elasticsearch**: Filter on `@timestamp` and fields
5. Customize visualization
6. Save dashboard

### Example Queries

**Request Rate (last 5 minutes)**
```promql
rate(http_requests_total[5m])
```

**Error Rate Percentage**
```promql
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) * 100
```

**95th Percentile Latency**
```promql
histogram_quantile(0.95, http_request_duration_seconds_bucket)
```

**Service Availability**
```promql
up{job="microservices"}
```

## Searching Logs in Kibana

1. Go to Kibana → Discover
2. Select index pattern (e.g., `logs-*`)
3. Search examples:
   - `level: ERROR` - Find all errors
   - `service: auth-service` - Filter by service
   - `@timestamp: [now-1h TO now]` - Last hour
   - `message: "connection refused"` - Text search

## Alert Notifications

Configure alert notifications in Grafana:

1. Go to Alerting → Notification channels
2. Add channel (Email, Slack, PagerDuty, etc.)
3. Create alert rules
4. Set notification channel for alerts

### Example: Slack Notification
1. Create Slack webhook: https://api.slack.com/messaging/webhooks
2. Add Slack channel in Grafana
3. Configure alerts to send to Slack

## Performance Tips

### Prometheus
- Adjust `scrape_interval` based on resolution needed (default 15s)
- Use `external_labels` for environment tagging
- Implement retention policy: `--storage.tsdb.retention.time=30d`

### Grafana
- Use dashboard refresh intervals (avoid real-time on dashboards)
- Create dashboard for different audiences
- Use variables for dynamic filtering

### ELK Stack
- Use index lifecycle management for old logs
- Configure sharding for large log volumes
- Set up log parsing rules in Logstash

### Scaling
For production:
```bash
# Prometheus HA
- Multiple Prometheus instances
- Centralized Alertmanager

# Elasticsearch
- Multi-node cluster
- Shard strategy planning
- Index rotation

# Grafana
- Multiple replicas
- Centralized provisioning
```

## Troubleshooting

### Prometheus Not Scraping Metrics
```bash
# Check targets
curl http://localhost:9090/api/v1/targets

# Verify service exposes metrics
curl http://service:port/metrics
```

### Grafana Dashboard Not Loading
1. Check data source connection
2. Verify query syntax
3. Check metric availability in Prometheus

### Logs Not Appearing in Kibana
1. Verify Logstash is running: `docker logs logstash`
2. Check Elasticsearch has indices: `curl http://localhost:9200/_cat/indices`
3. Verify application logging configuration

### High Memory Usage
```bash
# Reduce retention
docker exec prometheus prometheus --storage.tsdb.retention.time=7d

# Disable unused metrics scraping
# Edit prometheus.yml and remove unused jobs
```

## Maintenance

### Regular Tasks
- Review alert rules monthly
- Clean up old dashboards
- Monitor disk space for logs
- Test alert notification channels
- Review and update thresholds based on baselines

### Backup
```bash
# Backup Grafana dashboards
docker exec grafana grafana-cli admin export-dashboard

# Backup alert rules
cp infrastructure/monitoring/alert_rules.yml prometheus_backup/
```

## References

- [Prometheus Docs](https://prometheus.io/docs/)
- [Grafana Docs](https://grafana.com/docs/)
- [Logstash Docs](https://www.elastic.co/guide/en/logstash/current/)
- [Elasticsearch Docs](https://www.elastic.co/guide/en/elasticsearch/reference/)
- [Kibana Docs](https://www.elastic.co/guide/en/kibana/current/)

## Next Steps

1. Configure service metrics exporters
2. Create custom dashboards for your services
3. Set up alert notifications
4. Implement log aggregation from all services
5. Create runbooks for common alerts
6. Train team on monitoring tools
