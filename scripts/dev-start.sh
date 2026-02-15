#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║       🚀 TULIFO GIG BACKEND - DEVELOPMENT ENVIRONMENT 🚀        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if Docker is running
echo -e "${BLUE}[1/4] Checking Docker status...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}✗ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker is running${NC}"

# Check if .env file exists
echo -e "${BLUE}[2/4] Checking environment configuration...${NC}"
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠ .env file not found. Creating from .env.example (if exists)${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${YELLOW}⚠ Created .env from .env.example - please update with your values${NC}"
    else
        echo -e "${YELLOW}⚠ No .env file found. Services may not have required environment variables.${NC}"
    fi
fi
echo -e "${GREEN}✓ Environment check complete${NC}"

# Stop existing containers (optional)
echo -e "${BLUE}[3/4] Starting Docker containers...${NC}"
echo -e "${CYAN}Stopping any existing containers...${NC}"
docker-compose down --remove-orphans 2>/dev/null || true

# Start Docker containers in the background
echo -e "${CYAN}Starting Docker services...${NC}"
docker-compose up -d

# Wait for containers to start
sleep 3

# Display service status
echo -e "${MAGENTA}"
echo "════════════════════════════════════════════════════════════════"
echo "               📊 SERVICE STARTUP STATUS"
echo "════════════════════════════════════════════════════════════════"
echo -e "${NC}"

# Function to check if service is healthy
check_service() {
    local service=$1
    local port=$2
    local timeout=45
    local elapsed=0
    
    while [ $elapsed -lt $timeout ]; do
        status=$(docker-compose ps $service 2>/dev/null | grep "$service" | awk '{print $4}')
        
        if [[ $status == "Up"* ]]; then
            echo -e "${GREEN}✓${NC} $service is ${GREEN}RUNNING${NC} on port ${BLUE}$port${NC}"
            return 0
        elif [[ $status == *"Exited"* ]] || [[ $status == *"error"* ]]; then
            echo -e "${RED}✗${NC} $service ${RED}FAILED${NC}"
            return 1
        fi
        
        sleep 1
        elapsed=$((elapsed + 1))
    done
    
    echo -e "${YELLOW}⏳${NC} $service still ${YELLOW}STARTING${NC}..."
    return 0
}

# Check core infrastructure services
echo -e "${CYAN}Infrastructure Services:${NC}"
check_service "redis" "6379"
check_service "mongodb" "27017"
check_service "rabbitmq" "5672 (UI: 15672)"
check_service "elasticsearch" "9200"
check_service "kong" "8000"
check_service "mailhog" "1025 (UI: 8025)"

# Check microservices
echo ""
echo -e "${CYAN}Microservices:${NC}"
check_service "auth-service" "3001"
check_service "user-service" "3002"
check_service "project-service" "3003"
check_service "payment-service" "3004"
check_service "message-service" "3005"
check_service "notification-service" "3006"
check_service "booking-service" "3007"
check_service "matching-service" "3008"
check_service "session-service" "3009"
check_service "worker-service" "3010"
check_service "client-service" "3011"
check_service "escrow-service" "3012"
check_service "dispute-service" "3013"
check_service "review-service" "3014"
check_service "search-service" "3015"

# Check monitoring services
echo ""
echo -e "${CYAN}Monitoring & Management:${NC}"
check_service "prometheus" "9090"
check_service "grafana" "3000"
check_service "kibana" "5601"
check_service "konga" "1337"

# Display environment variables
echo ""
echo -e "${MAGENTA}"
echo "════════════════════════════════════════════════════════════════"
echo "            🔧 ENVIRONMENT VARIABLES & CONFIGURATION"
echo "════════════════════════════════════════════════════════════════"
echo -e "${NC}"

if [ -f .env ]; then
    echo -e "${CYAN}Loaded environment variables from .env:${NC}"
    grep -v '^#' .env | grep -v '^$' | while IFS='=' read -r key value; do
        # Mask sensitive values
        if [[ $key == *"SECRET"* ]] || [[ $key == *"KEY"* ]] || [[ $key == *"PASSWORD"* ]] || [[ $key == *"TOKEN"* ]]; then
            echo -e "  ${BLUE}${key}${NC}=${YELLOW}***${NC} (masked)"
        else
            echo -e "  ${BLUE}${key}${NC}=${CYAN}${value}${NC}"
        fi
    done
else
    echo -e "${YELLOW}⚠ No .env file loaded${NC}"
fi

# Display service URLs
echo ""
echo -e "${MAGENTA}"
echo "════════════════════════════════════════════════════════════════"
echo "                    🌐 SERVICE ENDPOINTS"
echo "════════════════════════════════════════════════════════════════"
echo -e "${NC}"

echo -e "${CYAN}Microservices:${NC}"
echo -e "  ${BLUE}Auth Service${NC}           http://localhost:3001"
echo -e "  ${BLUE}User Service${NC}           http://localhost:3002"
echo -e "  ${BLUE}Project Service${NC}        http://localhost:3003"
echo -e "  ${BLUE}Payment Service${NC}        http://localhost:3004"
echo -e "  ${BLUE}Message Service${NC}        http://localhost:3005"
echo -e "  ${BLUE}Notification Service${NC}   http://localhost:3006"
echo -e "  ${BLUE}Booking Service${NC}        http://localhost:3007"
echo -e "  ${BLUE}Matching Service${NC}       http://localhost:3008"
echo -e "  ${BLUE}Session Service${NC}        http://localhost:3009"
echo -e "  ${BLUE}Worker Service${NC}         http://localhost:3010"
echo -e "  ${BLUE}Client Service${NC}         http://localhost:3011"
echo -e "  ${BLUE}Escrow Service${NC}         http://localhost:3012"
echo -e "  ${BLUE}Dispute Service${NC}        http://localhost:3013"
echo -e "  ${BLUE}Review Service${NC}         http://localhost:3014"
echo -e "  ${BLUE}Search Service${NC}         http://localhost:3015"

echo ""
echo -e "${CYAN}Infrastructure:${NC}"
echo -e "  ${BLUE}Redis${NC}                 redis://localhost:6379"
echo -e "  ${BLUE}MongoDB${NC}               mongodb://localhost:27017"
echo -e "  ${BLUE}RabbitMQ${NC}              amqp://localhost:5672 (UI: http://localhost:15672)"
echo -e "  ${BLUE}Elasticsearch${NC}         http://localhost:9200"
echo -e "  ${BLUE}Kong API Gateway${NC}      http://localhost:8000 (Admin: http://localhost:8001)"
echo -e "  ${BLUE}Mailhog${NC}               smtp://localhost:1025 (UI: http://localhost:8025)"

echo ""
echo -e "${CYAN}Monitoring & Management:${NC}"
echo -e "  ${BLUE}Prometheus${NC}            http://localhost:9090"
echo -e "  ${BLUE}Grafana${NC}               http://localhost:3000 (admin/admin)"
echo -e "  ${BLUE}Kibana${NC}                http://localhost:5601"
echo -e "  ${BLUE}Konga (Kong Admin)${NC}    http://localhost:1337"

# # Docker logs streaming section
# echo ""
# echo -e "${MAGENTA}"
# echo "════════════════════════════════════════════════════════════════"
# echo "                   📋 DOCKER LOGS (STREAMING)"
# echo "════════════════════════════════════════════════════════════════"
# echo -e "${NC}"
# echo -e "${YELLOW}Tip: Press Ctrl+C to stop log streaming${NC}"
# echo ""

# # Stream logs from all containers
# docker-compose logs -f
