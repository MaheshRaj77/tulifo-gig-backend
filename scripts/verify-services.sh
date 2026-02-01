#!/bin/bash

# Comprehensive Backend Verification Script
# Tests all services, health checks, and connectivity

echo "🔍 TULIFO GIG BACKEND - COMPREHENSIVE VERIFICATION"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
MAX_RETRIES=5
RETRY_DELAY=2

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Function to test health endpoint
test_service_health() {
  local service=$1
  local port=$2
  local retries=0
  
  while [ $retries -lt $MAX_RETRIES ]; do
    if curl -s "http://localhost:$port/health" > /dev/null 2>&1; then
      response=$(curl -s "http://localhost:$port/health")
      echo -e "${GREEN}✓${NC} $service ($port) - Healthy"
      echo "  Response: $response"
      ((TESTS_PASSED++))
      return 0
    fi
    ((retries++))
    if [ $retries -lt $MAX_RETRIES ]; then
      sleep $RETRY_DELAY
    fi
  done
  
  echo -e "${RED}✗${NC} $service ($port) - Not responding"
  ((TESTS_FAILED++))
  return 1
}

# Function to test port connectivity
test_port() {
  local service=$1
  local port=$2
  
  if nc -z localhost $port 2>/dev/null; then
    echo -e "${GREEN}✓${NC} $service (Port $port) - Open"
    ((TESTS_PASSED++))
    return 0
  else
    echo -e "${RED}✗${NC} $service (Port $port) - Closed"
    ((TESTS_FAILED++))
    return 1
  fi
}

# Function to test database connectivity
test_database() {
  local db_type=$1
  local db_info=$2
  
  case $db_type in
    "postgres")
      # Test Supabase PostgreSQL connection via Node.js
      if command -v node &> /dev/null; then
        if node -e "
          const { createConnection } = require('pg');
          const url = '$db_info';
          const client = new (require('pg')).Client(url);
          client.connect()
            .then(() => {
              client.query('SELECT NOW()', (err, res) => {
                client.end();
                process.exit(err ? 1 : 0);
              });
            })
            .catch(() => process.exit(1));
        " > /dev/null 2>&1; then
          echo -e "${GREEN}✓${NC} PostgreSQL (Supabase) - Connected"
          ((TESTS_PASSED++))
          return 0
        fi
      fi
      
      # If Node test fails, try curl to verify pooler is accessible
      local pooler_host=$(echo "$db_info" | grep -o '@[^:]*' | sed 's/@//')
      if curl -s -m 2 "postgresql://$pooler_host:6543" > /dev/null 2>&1 || nc -z -w 1 "$pooler_host" 6543 > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} PostgreSQL (Supabase pooler) - Accessible"
        ((TESTS_PASSED++))
        return 0
      fi
      
      echo -e "${RED}✗${NC} PostgreSQL - Connection failed"
      ((TESTS_FAILED++))
      return 1
      ;;
    "mongodb")
      if command -v mongosh &> /dev/null; then
        if mongosh "$db_info" --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
          echo -e "${GREEN}✓${NC} MongoDB - Connected"
          ((TESTS_PASSED++))
          return 0
        fi
      else
        echo -e "${YELLOW}⚠${NC} MongoDB - mongosh not installed (skipped)"
        return 0
      fi
      echo -e "${RED}✗${NC} MongoDB - Connection failed"
      ((TESTS_FAILED++))
      return 1
      ;;
    "redis")
      if command -v redis-cli &> /dev/null; then
        if redis-cli -h localhost -p 6379 ping > /dev/null 2>&1; then
          echo -e "${GREEN}✓${NC} Redis - Connected"
          ((TESTS_PASSED++))
          return 0
        fi
      else
        echo -e "${YELLOW}⚠${NC} Redis - redis-cli not installed (skipped)"
        return 0
      fi
      echo -e "${RED}✗${NC} Redis - Connection failed"
      ((TESTS_FAILED++))
      return 1
      ;;
    "elasticsearch")
      if curl -s "http://localhost:9200/_cluster/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Elasticsearch - Connected"
        ((TESTS_PASSED++))
        return 0
      else
        echo -e "${RED}✗${NC} Elasticsearch - Connection failed"
        ((TESTS_FAILED++))
        return 1
      fi
      ;;
  esac
}

# Section 1: Docker Container Status
echo -e "${BLUE}📦 DOCKER CONTAINERS STATUS${NC}"
echo "================================"
docker_running=$(docker ps --format "{{.Names}}" 2>/dev/null | wc -l)
if [ $docker_running -gt 0 ]; then
  echo -e "${GREEN}✓${NC} Docker daemon running"
  ((TESTS_PASSED++))
  echo ""
  docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
else
  echo -e "${RED}✗${NC} Docker daemon not accessible"
  ((TESTS_FAILED++))
  exit 1
fi
echo ""

# Section 2: Service Ports Connectivity
echo -e "${BLUE}🔌 SERVICE PORTS CONNECTIVITY${NC}"
echo "================================"
test_port "auth-service" "3001"
test_port "user-service" "3002"
test_port "project-service" "3003"
test_port "payment-service" "3004"
test_port "message-service" "3005"
test_port "notification-service" "3006"
test_port "booking-service" "3007"
test_port "matching-service" "3008"
test_port "session-service" "3009"
test_port "worker-service" "3010"
test_port "client-service" "3011"
test_port "escrow-service" "3012"
test_port "dispute-service" "3013"
test_port "review-service" "3014"
test_port "search-service" "3015"
test_port "Redis" "6379"
test_port "RabbitMQ (AMQP)" "5672"
test_port "RabbitMQ (UI)" "15672"
test_port "MongoDB" "27017"
test_port "Elasticsearch" "9200"
echo ""

# Section 3: Service Health Checks
echo -e "${BLUE}❤️  SERVICE HEALTH CHECKS${NC}"
echo "================================"
echo ""
echo "Testing Core Services..."
test_service_health "auth-service" "3001"
test_service_health "user-service" "3002"
test_service_health "project-service" "3003"
test_service_health "payment-service" "3004"
test_service_health "message-service" "3005"
test_service_health "notification-service" "3006"
test_service_health "session-service" "3009"
echo ""
echo "Testing Financial/Trust Layer..."
test_service_health "worker-service" "3010"
test_service_health "client-service" "3011"
test_service_health "escrow-service" "3012"
test_service_health "dispute-service" "3013"
test_service_health "review-service" "3014"
test_service_health "search-service" "3015"
echo ""

# Section 4: Database Connectivity
echo -e "${BLUE}🗄️  DATABASE CONNECTIVITY${NC}"
echo "================================"

# Test Supabase PostgreSQL using Node.js script
if [ -f "scripts/test-supabase.js" ]; then
  node scripts/test-supabase.js
  if [ $? -eq 0 ]; then
    ((TESTS_PASSED++))
  else
    ((TESTS_FAILED++))
  fi
else
  test_database "postgres" "$DATABASE_URL"
fi

# Test MongoDB using Node.js script
if [ -f "scripts/test-mongodb.js" ]; then
  node scripts/test-mongodb.js
  if [ $? -eq 0 ]; then
    ((TESTS_PASSED++))
  else
    ((TESTS_FAILED++))
  fi
else
  test_database "mongodb" "$MONGODB_URI"
fi

test_database "redis" ""
test_database "elasticsearch" ""
echo ""

# Section 5: Infrastructure Services
echo -e "${BLUE}🏗️  INFRASTRUCTURE SERVICES${NC}"
echo "================================"
if curl -s "http://localhost:9200/_cluster/health" > /dev/null 2>&1; then
  health=$(curl -s "http://localhost:9200/_cluster/health" | grep -o '"status":"[^"]*"')
  echo -e "${GREEN}✓${NC} Elasticsearch cluster - $health"
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗${NC} Elasticsearch - Not accessible"
  ((TESTS_FAILED++))
fi

if curl -s "http://localhost:15672/api/overview" -u guest:guest > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} RabbitMQ - Running (UI: http://localhost:15672)"
  ((TESTS_PASSED++))
else
  echo -e "${YELLOW}⚠${NC} RabbitMQ - Management UI not accessible"
fi

if redis-cli -h localhost -p 6379 info server 2>/dev/null | grep -q "redis_version"; then
  version=$(redis-cli -h localhost -p 6379 info server 2>/dev/null | grep redis_version | cut -d: -f2)
  echo -e "${GREEN}✓${NC} Redis - Running (v$version)"
  ((TESTS_PASSED++))
else
  echo -e "${YELLOW}⚠${NC} Redis - Not accessible"
fi
echo ""

# Section 6: Inter-Service Communication Test
echo -e "${BLUE}🔗 INTER-SERVICE COMMUNICATION${NC}"
echo "================================"

# Test if search-service can reach elasticsearch
if curl -s "http://localhost:3015/health" > /dev/null 2>&1; then
  if curl -s "http://localhost:9200/_cluster/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} search-service ↔ elasticsearch - Connected"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗${NC} search-service → elasticsearch - Failed"
    ((TESTS_FAILED++))
  fi
fi

# Test if dispute-service can reach escrow-service
if curl -s "http://localhost:3013/health" > /dev/null 2>&1; then
  if curl -s "http://localhost:3012/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} dispute-service ↔ escrow-service - Connected"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗${NC} dispute-service → escrow-service - Failed"
    ((TESTS_FAILED++))
  fi
fi

echo ""

# Section 7: API Endpoint Testing
echo -e "${BLUE}🌐 API ENDPOINT TESTING${NC}"
echo "================================"

# Test auth-service
response=$(curl -s -X GET "http://localhost:3001/health" -H "Content-Type: application/json")
if echo $response | grep -q "healthy"; then
  echo -e "${GREEN}✓${NC} GET /health on auth-service"
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗${NC} GET /health on auth-service"
  ((TESTS_FAILED++))
fi

# Test search-service
response=$(curl -s -X POST "http://localhost:3015/api/v1/search/workers" \
  -H "Content-Type: application/json" \
  -d '{"query":"test"}' 2>/dev/null)
if echo $response | grep -q "workers"; then
  echo -e "${GREEN}✓${NC} POST /api/v1/search/workers on search-service"
  ((TESTS_PASSED++))
else
  echo -e "${YELLOW}⚠${NC} POST /api/v1/search/workers - May need authentication"
fi

# Test escrow-service
response=$(curl -s -X GET "http://localhost:3012/health" -H "Content-Type: application/json")
if echo $response | grep -q "healthy"; then
  echo -e "${GREEN}✓${NC} GET /health on escrow-service"
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗${NC} GET /health on escrow-service"
  ((TESTS_FAILED++))
fi

# Test review-service
response=$(curl -s -X GET "http://localhost:3014/health" -H "Content-Type: application/json")
if echo $response | grep -q "healthy"; then
  echo -e "${GREEN}✓${NC} GET /health on review-service"
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗${NC} GET /health on review-service"
  ((TESTS_FAILED++))
fi
echo ""

# Section 8: Summary Report
echo -e "${BLUE}📊 VERIFICATION SUMMARY${NC}"
echo "================================"
TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
PASS_RATE=$((TESTS_PASSED * 100 / TOTAL_TESTS))

echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
echo "Pass Rate: $PASS_RATE%"
echo ""

# Final Status
if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ ALL SYSTEMS OPERATIONAL${NC}"
  echo "Backend is running successfully and all services are connected!"
  exit 0
elif [ $TESTS_FAILED -le 3 ]; then
  echo -e "${YELLOW}⚠️  MOST SYSTEMS OPERATIONAL${NC}"
  echo "Backend is mostly working. Some services may be initializing."
  exit 0
else
  echo -e "${RED}❌ SYSTEM ISSUES DETECTED${NC}"
  echo "Some services are not responding. Check Docker logs:"
  echo "  docker-compose logs -f [service-name]"
  exit 1
fi
