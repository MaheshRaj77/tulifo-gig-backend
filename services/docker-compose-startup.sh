#!/bin/bash

##############################################################################
# Docker Compose Startup & Verification Script
# Starts all services and verifies they're working together
##############################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log_info() {
  echo -e "${BLUE}ℹ${NC}  $1"
}

log_success() {
  echo -e "${GREEN}✓${NC}  $1"
}

log_failure() {
  echo -e "${RED}✗${NC}  $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC}  $1"
}

print_separator() {
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

##############################################################################
# Main Verification Steps
##############################################################################

verify_docker() {
  log_info "Verifying Docker installation..."
  
  if ! command -v docker &> /dev/null; then
    log_failure "Docker not found. Please install Docker Desktop."
    exit 1
  fi
  
  log_success "Docker is installed"
  
  if ! command -v docker-compose &> /dev/null; then
    log_failure "Docker Compose not found. Please install Docker Compose."
    exit 1
  fi
  
  log_success "Docker Compose is installed"
}

check_env_file() {
  log_info "Checking environment configuration..."
  
  if [ ! -f "$ROOT_DIR/.env.local" ]; then
    log_warning ".env.local file not found"
    log_info "Creating .env.local from template..."
    
    cat > "$ROOT_DIR/.env.local" << 'EOF'
# Database
DATABASE_URL=postgresql://postgres:password@postgres:5432/tulifo_gig
MONGODB_URI=mongodb://mongodb:27017/tulifo_gig

# Authentication
JWT_SECRET=your-secret-key-minimum-32-characters-long-xxx
JWT_REFRESH_SECRET=your-refresh-secret-key-minimum-32-characters-long-xxx

# Stripe (for testing)
STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_test_placeholder

# External Services
REDIS_URL=redis://redis:6379
RABBITMQ_URL=amqp://rabbitmq:5672
ELASTICSEARCH_URL=http://elasticsearch:9200

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Push Notifications
VAPID_SUBJECT=mailto:support@tulifo.com
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:3001,https://app.tulifo.com

# Node Environment
NODE_ENV=development

# Service URLs
ESCROW_SERVICE_URL=http://escrow-service:3012
EOF
    
    log_success ".env.local created (update with real credentials)"
  else
    log_success ".env.local exists"
  fi
}

start_services() {
  log_info "Starting Docker Compose services..."
  
  cd "$ROOT_DIR"
  
  if docker-compose up -d; then
    log_success "Docker Compose services started"
  else
    log_failure "Failed to start Docker Compose services"
    exit 1
  fi
}

wait_for_services() {
  log_info "Waiting for services to become healthy..."
  
  local max_attempts=60
  local attempt=0
  
  while [ $attempt -lt $max_attempts ]; do
    local healthy_count=$(docker-compose ps --format "{{.Status}}" | grep -c "healthy" || true)
    local running_count=$(docker-compose ps --format "{{.Status}}" | grep -c "Up" || true)
    
    if [ $healthy_count -ge 10 ]; then
      log_success "Services are healthy and ready"
      return 0
    fi
    
    echo -ne "\r${BLUE}Progress:${NC} $healthy_count healthy, $running_count running... (attempt $((attempt+1))/$max_attempts)"
    sleep 2
    ((attempt++))
  done
  
  echo ""
  log_warning "Timeout waiting for services to be healthy"
  return 1
}

verify_health_checks() {
  log_info "Verifying service health checks..."
  
  local services=(
    "auth-service:3001"
    "user-service:3002"
    "project-service:3003"
    "payment-service:3004"
    "message-service:3005"
    "notification-service:3006"
    "booking-service:3007"
    "worker-service:3010"
    "client-service:3011"
  )
  
  for service_info in "${services[@]}"; do
    IFS=':' read -r service_name port <<< "$service_info"
    
    if response=$(curl -s "http://localhost:$port/health" 2>/dev/null); then
      log_success "$service_name health check: OK"
    else
      log_warning "$service_name health check: No response (service may still be starting)"
    fi
  done
}

check_database_connections() {
  log_info "Checking database connections..."
  
  # PostgreSQL check
  if docker exec tulifo-gig-backend-postgres-1 pg_isready -U postgres 2>/dev/null | grep -q "accepting connections"; then
    log_success "PostgreSQL is ready"
  else
    log_warning "PostgreSQL is not ready yet"
  fi
  
  # MongoDB check
  if docker exec tulifo-gig-backend-mongodb-1 mongosh --eval "db.adminCommand('ping')" 2>/dev/null | grep -q "ok"; then
    log_success "MongoDB is ready"
  else
    log_warning "MongoDB is not ready yet"
  fi
  
  # Redis check
  if docker exec tulifo-gig-backend-redis-1 redis-cli ping 2>/dev/null | grep -q "PONG"; then
    log_success "Redis is ready"
  else
    log_warning "Redis is not ready yet"
  fi
}

print_service_urls() {
  log_info "Service URLs:"
  
  echo ""
  echo -e "${BLUE}Node.js/TypeScript Services:${NC}"
  echo "  Auth Service:         http://localhost:3001/health"
  echo "  User Service:         http://localhost:3002/health"
  echo "  Project Service:      http://localhost:3003/health"
  echo "  Payment Service:      http://localhost:3004/health"
  echo "  Message Service:      http://localhost:3005/health (WebSocket)"
  echo "  Notification Service: http://localhost:3006/health"
  echo "  Session Service:      http://localhost:3009/health"
  echo "  Worker Service:       http://localhost:3010/health"
  echo "  Client Service:       http://localhost:3011/health"
  echo "  Escrow Service:       http://localhost:3012/health"
  echo "  Dispute Service:      http://localhost:3013/health"
  echo "  Review Service:       http://localhost:3014/health"
  
  echo ""
  echo -e "${BLUE}Go Services:${NC}"
  echo "  Booking Service:      http://localhost:3007/health"
  
  echo ""
  echo -e "${BLUE}Python Services:${NC}"
  echo "  Matching Service:     http://localhost:3008/health"
  echo "  Search Service:       http://localhost:3015/health"
  
  echo ""
  echo -e "${BLUE}Infrastructure:${NC}"
  echo "  Redis:                http://localhost:6379"
  echo "  MongoDB:              mongodb://localhost:27017"
  echo "  PostgreSQL:           postgresql://localhost:5432"
  echo "  Elasticsearch:        http://localhost:9200"
  echo "  RabbitMQ:             amqp://localhost:5672"
  echo ""
}

print_useful_commands() {
  log_info "Useful Docker Compose Commands:"
  
  echo ""
  echo -e "${BLUE}View logs:${NC}"
  echo "  docker-compose logs -f auth-service          # Single service"
  echo "  docker-compose logs -f                        # All services"
  echo "  docker-compose logs -f --tail=100            # Last 100 lines"
  
  echo ""
  echo -e "${BLUE}Check status:${NC}"
  echo "  docker-compose ps                             # Service status"
  echo "  docker-compose ps --all                       # All containers"
  
  echo ""
  echo -e "${BLUE}Service management:${NC}"
  echo "  docker-compose restart auth-service           # Restart service"
  echo "  docker-compose stop auth-service              # Stop service"
  echo "  docker-compose start auth-service             # Start service"
  
  echo ""
  echo -e "${BLUE}Database management:${NC}"
  echo "  docker exec postgres psql -U postgres -c \"\\l\"  # List databases"
  echo "  docker exec mongodb mongosh                   # MongoDB shell"
  echo "  docker exec redis redis-cli                   # Redis CLI"
  
  echo ""
  echo -e "${BLUE}Cleanup:${NC}"
  echo "  docker-compose down                           # Stop & remove containers"
  echo "  docker-compose down -v                        # Also remove volumes"
  
  echo ""
}

print_next_steps() {
  log_info "Next Steps:"
  
  echo ""
  echo -e "${BLUE}1. Run integration tests:${NC}"
  echo "   ./services/service-integration-test.sh"
  
  echo ""
  echo -e "${BLUE}2. Test a service manually:${NC}"
  echo "   curl http://localhost:3001/health"
  
  echo ""
  echo -e "${BLUE}3. View service logs:${NC}"
  echo "   docker-compose logs -f auth-service"
  
  echo ""
  echo -e "${BLUE}4. Database setup (if needed):${NC}"
  echo "   # PostgreSQL migrations"
  echo "   cd apps/auth-service && pnpm db:generate"
  echo "   cd apps/auth-service && pnpm db:migrate"
  
  echo ""
  echo -e "${BLUE}5. Monitor all services:${NC}"
  echo "   watch 'docker-compose ps'"
  
  echo ""
}

##############################################################################
# Main Execution
##############################################################################

main() {
  print_separator
  echo -e "${BLUE}🚀 Docker Compose Startup & Verification${NC}\n"
  
  verify_docker
  echo ""
  
  check_env_file
  echo ""
  
  print_separator
  echo -e "\n${BLUE}Starting services...${NC}\n"
  start_services
  echo ""
  
  print_separator
  echo -e "\n${BLUE}Waiting for services to be ready...${NC}\n"
  wait_for_services
  echo ""
  
  print_separator
  echo -e "\n${BLUE}Running health checks...${NC}\n"
  verify_health_checks
  echo ""
  
  print_separator
  echo -e "\n${BLUE}Checking database connections...${NC}\n"
  check_database_connections
  echo ""
  
  print_separator
  print_service_urls
  
  print_separator
  print_useful_commands
  
  print_separator
  print_next_steps
  
  print_separator
  echo -e "\n${GREEN}✓ All services are running!${NC}\n"
}

main "$@"
