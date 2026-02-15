#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

echo -e "${MAGENTA}════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}          🔍 SERVICE DIAGNOSIS REPORT${NC}"
echo -e "${MAGENTA}════════════════════════════════════════════════════════${NC}\n"

# Check each service's health
check_service_health() {
    local service=$1
    local port=$2
    
    echo -e "${BLUE}Checking $service (port $port)...${NC}"
    
    # Get last 30 lines of logs
    logs=$(docker-compose logs --tail=30 $service 2>&1)
    
    if echo "$logs" | grep -qi "error"; then
        echo -e "${RED}✗ Errors found:${NC}"
        echo "$logs" | grep -i "error" | head -5
    fi
    
    if echo "$logs" | grep -qi "connection"; then
        echo -e "${YELLOW}⚠ Connection issues:${NC}"
        echo "$logs" | grep -i "connection" | head -3
    fi
    
    if echo "$logs" | grep -qi "running\|started\|listening"; then
        echo -e "${GREEN}✓ Service appears healthy${NC}"
    fi
    
    echo ""
}

echo -e "${CYAN}Infrastructure Services:${NC}\n"
check_service_health "redis" "6379"
check_service_health "mongodb" "27017"
check_service_health "rabbitmq" "5672"

echo -e "${CYAN}Microservices:${NC}\n"
check_service_health "auth-service" "3001"
check_service_health "user-service" "3002"
check_service_health "matching-service" "3008"

echo -e "${MAGENTA}════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}          🛠️  COMMON ISSUES & SOLUTIONS${NC}"
echo -e "${MAGENTA}════════════════════════════════════════════════════════${NC}\n"

echo -e "${YELLOW}1. Missing Environment Variables${NC}"
echo "   - Create a .env file from .env.example"
echo "   - Update with your Supabase credentials"
echo "   - Update with your Stripe keys"
echo ""

echo -e "${YELLOW}2. Database Connection Errors${NC}"
echo "   - Ensure DATABASE_URL is set correctly"
echo "   - Check PostgreSQL is running"
echo ""

echo -e "${YELLOW}3. Services Still Starting${NC}"
echo "   - Wait 30-60 seconds for all services to become healthy"
echo "   - Run: docker-compose logs -f [service-name]"
echo ""

echo -e "${YELLOW}4. Unhealthy Health Checks${NC}"
echo "   - Services need env vars to pass health checks"
echo "   - Set .env file with required configuration"
echo ""

echo -e "${BLUE}Current .env Status:${NC}"
if [ -f .env ]; then
    lines=$(wc -l < .env)
    echo -e "${GREEN}✓ .env file exists ($lines lines)${NC}"
else
    echo -e "${RED}✗ .env file NOT found${NC}"
    echo "   Run: cp .env.example .env"
    echo "   Then: update .env with your credentials"
fi
