#!/bin/bash
# Kong Gateway Setup — Register all services, routes, and CORS plugin
#
# Kong Admin API: http://localhost:8001
# Kong Proxy:     http://localhost:8000

KONG_ADMIN="http://localhost:8001"

echo "=== Kong Gateway Setup ==="
echo ""

# ─── Helper ─────────────────────────────────────────────────────────
register_service() {
  local name=$1
  local host=$2
  local port=$3
  local path_prefix=$4
  local strip=${5:-false}

  echo "→ Registering service: $name ($host:$port)"

  # Create service
  curl -s -X POST "$KONG_ADMIN/services" \
    -d "name=$name" \
    -d "host=$host" \
    -d "port=$port" \
    -d "protocol=http" > /dev/null

  # Create route
  curl -s -X POST "$KONG_ADMIN/services/$name/routes" \
    -d "name=${name}-route" \
    -d "paths[]=$path_prefix" \
    -d "strip_path=false" \
    -d "preserve_host=false" > /dev/null
}

# ─── Register All Services ──────────────────────────────────────────
# Services use Docker internal hostnames (service name from docker-compose)

register_service "auth-service"         "auth-service"         3001 "/api/auth"
register_service "user-service"         "user-service"         3002 "/api/users"
register_service "project-service"      "project-service"      3003 "/api/projects"
register_service "payment-service"      "payment-service"      3004 "/api/payments"
register_service "message-service"      "message-service"      3005 "/api/messages"
register_service "notification-service" "notification-service"  3006 "/api/notifications"
register_service "booking-service"      "booking-service"      3007 "/api/bookings"
register_service "session-service"      "session-service"      3009 "/api/sessions"
# Point workers/clients to user-service (SQL impl) instead of separate services
register_service "worker-service"       "user-service"         3002 "/api/workers"
register_service "client-service"       "user-service"         3002 "/api/clients"
register_service "escrow-service"       "escrow-service"       3012 "/api/escrow"
register_service "dispute-service"      "dispute-service"      3013 "/api/disputes"
register_service "review-service"       "review-service"       3014 "/api/reviews"
register_service "search-service"       "search-service"       3015 "/api/search"
# Project bids route
register_service "project-bids"         "project-service"      3003 "/api/bids"

echo ""

# ─── Enable Global CORS Plugin ──────────────────────────────────────
echo "→ Enabling global CORS plugin..."
curl -s -X POST "$KONG_ADMIN/plugins" \
  -d "name=cors" \
  -d "config.origins[]=http://localhost:3000" \
  -d "config.origins[]=http://localhost:3001" \
  -d "config.origins[]=https://tulifo-gig.vercel.app" \
  -d "config.methods[]=GET" \
  -d "config.methods[]=POST" \
  -d "config.methods[]=PUT" \
  -d "config.methods[]=PATCH" \
  -d "config.methods[]=DELETE" \
  -d "config.methods[]=OPTIONS" \
  -d "config.headers[]=Content-Type" \
  -d "config.headers[]=Authorization" \
  -d "config.headers[]=X-Request-Id" \
  -d "config.headers[]=Accept" \
  -d "config.credentials=true" \
  -d "config.preflight_continue=false" \
  -d "config.max_age=86400" > /dev/null

echo ""

# ─── Verify ─────────────────────────────────────────────────────────
echo "=== Registered Services ==="
curl -s "$KONG_ADMIN/services" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    for s in data.get('data', []):
        print(f\"  ✓ {s['name']:30s} → {s['host']}:{s['port']}\")
except:
    print('  (failed to parse)')
"

echo ""
echo "=== Registered Routes ==="
curl -s "$KONG_ADMIN/routes" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    for r in data.get('data', []):
        paths = ', '.join(r.get('paths', []))
        print(f\"  ✓ {r['name']:35s} → {paths}\")
except:
    print('  (failed to parse)')
"

echo ""
echo "=== Plugins ==="
curl -s "$KONG_ADMIN/plugins" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    for p in data.get('data', []):
        scope = p.get('service', {}).get('id', 'global') if p.get('service') else 'global'
        print(f\"  ✓ {p['name']:20s} (scope: {scope})\")
except:
    print('  (failed to parse)')
"

echo ""
echo "=== Testing auth-service through Kong ==="
curl -s -i http://localhost:8000/api/auth/health 2>/dev/null | head -5

echo ""
echo "Done! Frontend at http://localhost:3000 can now reach all services through http://localhost:8000"
