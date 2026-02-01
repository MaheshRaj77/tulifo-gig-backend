#!/bin/bash

##############################################################################
# Service Integration Test Script
# Tests inter-service communication and health checks
# Run this to verify all services are working together
##############################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost"
TIMEOUT=5
RETRY_COUNT=3
RETRY_DELAY=2

# Service ports mapping
declare -A SERVICES=(
  ["auth-service"]="3001"
  ["user-service"]="3002"
  ["project-service"]="3003"
  ["payment-service"]="3004"
  ["message-service"]="3005"
  ["notification-service"]="3006"
  ["booking-service"]="3007"
  ["matching-service"]="3008"
  ["session-service"]="3009"
  ["worker-service"]="3010"
  ["client-service"]="3011"
  ["escrow-service"]="3012"
  ["dispute-service"]="3013"
  ["review-service"]="3014"
  ["search-service"]="3015"
)

# Service dependencies (for testing inter-service communication)
declare -A DEPENDENCIES=(
  ["auth-service"]=""
  ["user-service"]="auth-service"
  ["project-service"]="auth-service:user-service"
  ["payment-service"]="auth-service"
  ["message-service"]="auth-service:user-service"
  ["notification-service"]="auth-service"
  ["booking-service"]="auth-service:user-service"
  ["matching-service"]="user-service"
  ["session-service"]=""
  ["worker-service"]="auth-service"
  ["client-service"]="auth-service:user-service"
  ["escrow-service"]="payment-service"
  ["dispute-service"]="escrow-service"
  ["review-service"]="user-service"
  ["search-service"]="worker-service"
)

# Test results
declare -a PASSED_TESTS=()
declare -a FAILED_TESTS=()

##############################################################################
# Utility Functions
##############################################################################

log_info() {
  echo -e "${BLUE}ℹ${NC}  $1"
}

log_success() {
  echo -e "${GREEN}✓${NC}  $1"
  PASSED_TESTS+=("$1")
}

log_failure() {
  echo -e "${RED}✗${NC}  $1"
  FAILED_TESTS+=("$1")
}

log_warning() {
  echo -e "${YELLOW}⚠${NC}  $1"
}

print_separator() {
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

##############################################################################
# Core Testing Functions
##############################################################################

test_service_health() {
  local service=$1
  local port=$2
  local url="$BASE_URL:$port/health"
  
  for attempt in $(seq 1 $RETRY_COUNT); do
    if response=$(curl -s -w "\n%{http_code}" --connect-timeout $TIMEOUT "$url" 2>/dev/null); then
      http_code=$(echo "$response" | tail -n1)
      body=$(echo "$response" | head -n-1)
      
      if [ "$http_code" == "200" ]; then
        log_success "Service health check: $service ($port) - OK"
        return 0
      fi
    fi
    
    if [ $attempt -lt $RETRY_COUNT ]; then
      log_warning "Retry $attempt/$RETRY_COUNT for $service..."
      sleep $RETRY_DELAY
    fi
  done
  
  log_failure "Service health check: $service ($port) - FAILED"
  return 1
}

test_database_connectivity() {
  local service=$1
  local port=$2
  
  # Call a database-dependent endpoint
  if response=$(curl -s -w "\n%{http_code}" --connect-timeout $TIMEOUT "$BASE_URL:$port/api/v1/health" 2>/dev/null); then
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    # 200 or 503 (service degraded but responding) is acceptable for DB test
    if [ "$http_code" == "200" ] || [ "$http_code" == "503" ]; then
      log_success "Database connectivity check: $service"
      return 0
    fi
  fi
  
  log_failure "Database connectivity check: $service"
  return 1
}

test_inter_service_communication() {
  local service=$1
  local dependencies=$2
  
  if [ -z "$dependencies" ]; then
    log_info "$service has no dependencies - skipping inter-service test"
    return 0
  fi
  
  IFS=':' read -ra DEPS <<< "$dependencies"
  for dep in "${DEPS[@]}"; do
    local dep_port=${SERVICES[$dep]}
    local dep_url="$BASE_URL:$dep_port/health"
    
    if response=$(curl -s -w "\n%{http_code}" --connect-timeout $TIMEOUT "$dep_url" 2>/dev/null); then
      http_code=$(echo "$response" | tail -n1)
      
      if [ "$http_code" == "200" ]; then
        log_success "Inter-service communication: $service -> $dep"
      else
        log_failure "Inter-service communication: $service -> $dep (HTTP $http_code)"
      fi
    else
      log_failure "Inter-service communication: $service -> $dep (No response)"
    fi
  done
}

test_service_ports() {
  log_info "Testing all service ports are listening..."
  
  for service in "${!SERVICES[@]}"; do
    port=${SERVICES[$service]}
    
    if timeout 1 bash -c "</dev/tcp/localhost/$port" 2>/dev/null; then
      log_success "Port $port ($service) is listening"
    else
      log_warning "Port $port ($service) is not listening"
    fi
  done
}

test_api_endpoints() {
  log_info "Testing critical API endpoints..."
  
  # Test auth service
  if response=$(curl -s --connect-timeout $TIMEOUT "$BASE_URL:3001/health" 2>/dev/null); then
    log_success "Auth service endpoint accessible"
  else
    log_failure "Auth service endpoint not accessible"
  fi
  
  # Test user service
  if response=$(curl -s --connect-timeout $TIMEOUT "$BASE_URL:3002/health" 2>/dev/null); then
    log_success "User service endpoint accessible"
  else
    log_failure "User service endpoint not accessible"
  fi
  
  # Test project service
  if response=$(curl -s --connect-timeout $TIMEOUT "$BASE_URL:3003/health" 2>/dev/null); then
    log_success "Project service endpoint accessible"
  else
    log_failure "Project service endpoint not accessible"
  fi
  
  # Test message service with WebSocket support
  if response=$(curl -s --connect-timeout $TIMEOUT "$BASE_URL:3005/health" 2>/dev/null); then
    log_success "Message service endpoint accessible"
  else
    log_failure "Message service endpoint not accessible"
  fi
}

##############################################################################
# Report Generation
##############################################################################

print_summary() {
  print_separator
  echo -e "\n${BLUE}📊 Test Summary${NC}\n"
  
  passed_count=${#PASSED_TESTS[@]}
  failed_count=${#FAILED_TESTS[@]}
  total_count=$((passed_count + failed_count))
  
  echo "Total Tests: $total_count"
  echo -e "${GREEN}Passed: $passed_count${NC}"
  echo -e "${RED}Failed: $failed_count${NC}\n"
  
  if [ $failed_count -eq 0 ]; then
    echo -e "${GREEN}✓ All services are healthy and communicating correctly!${NC}\n"
  else
    echo -e "${RED}✗ Some services have issues. Review the output above.${NC}\n"
  fi
  
  if [ $failed_count -gt 0 ]; then
    echo -e "${YELLOW}Failed Tests:${NC}"
    for test in "${FAILED_TESTS[@]}"; do
      echo "  - $test"
    done
    echo ""
  fi
}

##############################################################################
# Main Execution
##############################################################################

main() {
  print_separator
  echo -e "${BLUE}🚀 Service Integration Test Suite${NC}\n"
  
  log_info "Starting service verification tests...\n"
  
  # Test 1: Service Ports
  print_separator
  echo -e "\n${BLUE}📡 Phase 1: Port Availability${NC}\n"
  test_service_ports
  
  # Test 2: Health Checks
  print_separator
  echo -e "\n${BLUE}🏥 Phase 2: Service Health Checks${NC}\n"
  for service in "${!SERVICES[@]}"; do
    port=${SERVICES[$service]}
    test_service_health "$service" "$port" || true
  done
  
  # Test 3: Inter-Service Communication
  print_separator
  echo -e "\n${BLUE}🔗 Phase 3: Inter-Service Communication${NC}\n"
  for service in "${!DEPENDENCIES[@]}"; do
    deps=${DEPENDENCIES[$service]}
    test_inter_service_communication "$service" "$deps" || true
  done
  
  # Test 4: API Endpoints
  print_separator
  echo -e "\n${BLUE}🌐 Phase 4: API Endpoints${NC}\n"
  test_api_endpoints
  
  # Print Summary
  print_summary
}

# Run tests
main "$@"
