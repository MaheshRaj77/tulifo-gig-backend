#!/bin/bash

# Build and Verify All Services
# This script builds all 15 microservices and verifies their structure

echo "🔨 Building Tulifo Gig Backend - 15 Microservices"
echo "=================================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

services=(
  "auth-service:3001"
  "user-service:3002"
  "project-service:3003"
  "payment-service:3004"
  "message-service:3005"
  "notification-service:3006"
  "booking-service:3007"
  "matching-service:3008"
  "session-service:3009"
  "worker-service:3010"
  "client-service:3011"
  "escrow-service:3012"
  "dispute-service:3013"
  "review-service:3014"
  "search-service:3015"
)

echo ""
echo "📋 Verifying Service Structure..."
echo "=================================="

verified=0
total=${#services[@]}

for service_port in "${services[@]}"; do
  service=$(echo $service_port | cut -d':' -f1)
  port=$(echo $service_port | cut -d':' -f2)
  
  # Check if directory exists
  if [ ! -d "apps/$service" ]; then
    echo -e "${RED}✗${NC} $service - Directory not found"
    continue
  fi
  
  # Check for language-specific package files
  if [ "$service" = "booking-service" ]; then
    # Go service - check for go.mod
    if [ ! -f "apps/$service/go.mod" ]; then
      echo -e "${RED}✗${NC} $service - Missing go.mod"
      continue
    fi
    if [ ! -f "apps/$service/cmd/server/main.go" ]; then
      echo -e "${YELLOW}⚠${NC} $service - Missing cmd/server/main.go"
      continue
    fi
  elif [ "$service" = "matching-service" ]; then
    # Python service - check for requirements.txt
    if [ ! -f "apps/$service/requirements.txt" ]; then
      echo -e "${RED}✗${NC} $service - Missing requirements.txt"
      continue
    fi
    if [ ! -f "apps/$service/app/main.py" ]; then
      echo -e "${YELLOW}⚠${NC} $service - Missing app/main.py"
      continue
    fi
  else
    # TypeScript service - check for package.json
    if [ ! -f "apps/$service/package.json" ]; then
      echo -e "${RED}✗${NC} $service - Missing package.json"
      continue
    fi
    
    if [ ! -f "apps/$service/src/index.ts" ]; then
      echo -e "${YELLOW}⚠${NC} $service - Missing src/index.ts"
      continue
    fi
    
    if [ ! -f "apps/$service/tsconfig.json" ]; then
      echo -e "${YELLOW}⚠${NC} $service - Missing tsconfig.json"
      continue
    fi
  fi
  
  # Check for Dockerfile (all services need this)
  if [ ! -f "apps/$service/Dockerfile" ]; then
    echo -e "${YELLOW}⚠${NC} $service - Missing Dockerfile"
    continue
  fi
  
  echo -e "${GREEN}✓${NC} $service:$port - Complete"
  ((verified++))
done

echo ""
echo "=================================="
echo -e "Verification: ${GREEN}$verified${NC}/$total services complete"
echo ""

# Check infrastructure configuration
echo "🏗️  Verifying Infrastructure..."
echo "=================================="

infra_ok=true

if [ ! -f "docker-compose.yml" ]; then
  echo -e "${RED}✗${NC} docker-compose.yml not found"
  infra_ok=false
else
  echo -e "${GREEN}✓${NC} docker-compose.yml"
fi

if [ ! -f "pnpm-workspace.yaml" ]; then
  echo -e "${RED}✗${NC} pnpm-workspace.yaml not found"
  infra_ok=false
else
  echo -e "${GREEN}✓${NC} pnpm-workspace.yaml"
fi

if [ ! -f "package.json" ]; then
  echo -e "${RED}✗${NC} Root package.json not found"
  infra_ok=false
else
  echo -e "${GREEN}✓${NC} package.json"
fi

echo ""

# Build services
if [ "$verified" -eq "$total" ] && [ "$infra_ok" = true ]; then
  echo "🚀 All services verified! Ready to build."
  echo ""
  
  read -p "Do you want to install dependencies now? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📦 Installing dependencies..."
    pnpm install
    
    echo ""
    read -p "Do you want to build all TypeScript services? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      echo "🔨 Building services..."
      pnpm -r --filter='!booking-service' --filter='!matching-service' build
      
      echo ""
      echo -e "${GREEN}✅ Build complete!${NC}"
      echo ""
      echo "Next steps:"
      echo "  1. Configure .env file with required variables"
      echo "  2. Run: docker-compose up -d"
      echo "  3. Check health: curl http://localhost:3001/health"
    fi
  fi
else
  echo -e "${RED}⚠️  Some services are incomplete. Please fix issues above.${NC}"
  exit 1
fi
