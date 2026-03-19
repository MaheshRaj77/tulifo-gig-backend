#!/bin/bash

# ============================================
# RAILWAY DEPLOYMENT AUTOMATION SCRIPT
# Deploy all services to Railway with URL capture
# ============================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICES_DIR="$PROJECT_ROOT/apps"
DEPLOYMENT_LOG="$PROJECT_ROOT/railway-deployment.log"

# Service configuration: SERVICE_NAME:LANGUAGE:PORT
declare -a SERVICES=(
    "auth-service:typescript:3001"
    "user-service:typescript:3002"
    "project-service:typescript:3003"
    "payment-service:typescript:3004"
    "message-service:typescript:3005"
    "notification-service:typescript:3006"
    "booking-service:go:3007"
    "matching-service:python:3008"
    "session-service:typescript:3009"
    "worker-service:typescript:3010"
    "client-service:typescript:3011"
    "escrow-service:typescript:3012"
    "dispute-service:typescript:3013"
    "review-service:typescript:3014"
    "search-service:typescript:3015"
)

echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   🚀 RAILWAY DEPLOYMENT AUTOMATION - TULIFO GIG BACKEND 🚀      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ============================================
# PREREQUISITES CHECK
# ============================================

echo -e "${BLUE}[SETUP] Checking prerequisites...${NC}"

# Check Railway CLI
if ! command -v railway &> /dev/null; then
    echo -e "${RED}✗ Railway CLI not found${NC}"
    echo -e "${YELLOW}Install with: npm install -g @railway/cli${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Railway CLI installed${NC}"

# Check Git
if ! command -v git &> /dev/null; then
    echo -e "${RED}✗ Git not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Git installed${NC}"

# Check if logged in to Railway
echo -e "${BLUE}[SETUP] Checking Railway authentication...${NC}"
if ! railway whoami &> /dev/null; then
    echo -e "${RED}✗ Not logged in to Railway${NC}"
    echo -e "${YELLOW}Run: railway login${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Logged in to Railway${NC}"

# Check if Railway project exists
echo -e "${BLUE}[SETUP] Checking Railway project...${NC}"
cd "$PROJECT_ROOT"

if ! railway status &> /dev/null; then
    echo -e "${YELLOW}⚠ No Railway project found${NC}"
    echo -e "${BLUE}[SETUP] Initializing Railway project...${NC}"
    if railway init -n "tulifo-gig-backend" &> /dev/null; then
        echo -e "${GREEN}✓ Railway project initialized${NC}"
    else
        echo -e "${YELLOW}⚠ Could not auto-initialize. Please run: railway init${NC}"
    fi
fi

# ============================================
# DEPLOYMENT PHASE
# ============================================

echo -e "${MAGENTA}"
echo "════════════════════════════════════════════════════════════════"
echo "               🔧 DEPLOYING SERVICES TO RAILWAY"
echo "════════════════════════════════════════════════════════════════"
echo -e "${NC}"

> "$DEPLOYMENT_LOG"
DEPLOYED_SERVICES=()
FAILED_SERVICES=()
SKIPPED_SERVICES=()

for service_info in "${SERVICES[@]}"; do
    IFS=':' read -r SERVICE_NAME LANGUAGE PORT <<< "$service_info"
    SERVICE_PATH="$SERVICES_DIR/$SERVICE_NAME"
    
    echo -e "${CYAN}[$(date '+%H:%M:%S')] Deploying $SERVICE_NAME ($LANGUAGE on port $PORT)...${NC}"
    
    # Check if service directory exists
    if [ ! -d "$SERVICE_PATH" ]; then
        echo -e "${YELLOW}⚠ Skipping $SERVICE_NAME (directory not found)${NC}"
        SKIPPED_SERVICES+=("$SERVICE_NAME")
        continue
    fi
    
    # Check for Dockerfile
    if [ ! -f "$SERVICE_PATH/../$SERVICE_NAME/Dockerfile" ] && [ ! -f "$SERVICE_PATH/Dockerfile" ]; then
        echo -e "${YELLOW}⚠ Skipping $SERVICE_NAME (no Dockerfile found)${NC}"
        SKIPPED_SERVICES+=("$SERVICE_NAME")
        continue
    fi
    
    # Deploy to Railway from the project root rather than cd'ing into the directory
    # so we can use the directory as the path argument
    cd "$PROJECT_ROOT" || continue

    # Ensure service exists before deploying
    echo -e "${BLUE}Ensuring service $SERVICE_NAME exists...${NC}"
    if ! railway service "$SERVICE_NAME" &> /dev/null; then
        echo -e "${YELLOW}Service $SERVICE_NAME not found. Creating it...${NC}"
        "$PROJECT_ROOT/scripts/create-railway-service.exp" "$SERVICE_NAME"
        sleep 2
    fi

    echo -e "${CYAN}Running railway up for $SERVICE_NAME...${NC}"
    if railway up --service "$SERVICE_NAME" "$SERVICE_PATH" -d 2>> "$DEPLOYMENT_LOG"; then
        echo -e "${GREEN}✓ $SERVICE_NAME deployed successfully${NC}"
        DEPLOYED_SERVICES+=("$SERVICE_NAME")
        sleep 2  # Brief delay between deployments
    else
        echo -e "${RED}✗ Failed to deploy $SERVICE_NAME${NC}"
        FAILED_SERVICES+=("$SERVICE_NAME")
    fi
done

# ============================================
# URL COLLECTION PHASE
# ============================================

echo -e "${MAGENTA}"
echo "════════════════════════════════════════════════════════════════"
echo "               📍 COLLECTING SERVICE URLs"
echo "════════════════════════════════════════════════════════════════"
echo -e "${NC}"

cd "$PROJECT_ROOT"

# Create service URLs file
URLS_FILE="$PROJECT_ROOT/railway-service-urls.json"
> "$URLS_FILE"
echo "{" >> "$URLS_FILE"
echo '  "generated": "'$(date -u +'%Y-%m-%dT%H:%M:%SZ')'", ' >> "$URLS_FILE"
echo '  "services": {' >> "$URLS_FILE"

FIRST=true
URLS_FOUND=0

for service_info in "${SERVICES[@]}"; do
    IFS=':' read -r SERVICE_NAME LANGUAGE PORT <<< "$service_info"
    
    # Try to get URL from Railway
    SERVICE_URL=""
    
    # Method 1: Query Railway service
    if SERVICE_QUERY=$(railway service "$SERVICE_NAME" --json 2>/dev/null); then
        SERVICE_URL=$(echo "$SERVICE_QUERY" | grep -o '"environmentId":"[^"]*"' | head -1 | cut -d'"' -f4)
        if [ -z "$SERVICE_URL" ]; then
            # Try alternate format
            SERVICE_URL=$(echo "$SERVICE_QUERY" | jq -r '.url // empty' 2>/dev/null)
        fi
    fi
    
    # Method 2: Construct Railway app URL if we have the service
    if [ -z "$SERVICE_URL" ]; then
        # Railway format: https://SERVICE-NAME-up.railway.app (approximate)
        SERVICE_URL="https://${SERVICE_NAME}-up.railway.app"
    fi
    
    if [ "$FIRST" = false ]; then
        echo "," >> "$URLS_FILE"
    fi
    
    echo -n "    \"${SERVICE_NAME}_URL\": \"$SERVICE_URL\"" >> "$URLS_FILE"
    echo -e "${GREEN}✓${NC} $SERVICE_NAME: ${BLUE}$SERVICE_URL${NC}"
    FIRST=false
    ((URLS_FOUND++))
done

echo "" >> "$URLS_FILE"
echo '  }' >> "$URLS_FILE"
echo "}" >> "$URLS_FILE"

# ============================================
# DEPLOYMENT SUMMARY
# ============================================

echo -e "${MAGENTA}"
echo "════════════════════════════════════════════════════════════════"
echo "               📊 DEPLOYMENT SUMMARY"
echo "════════════════════════════════════════════════════════════════"
echo -e "${NC}"

echo -e "${GREEN}✓ Deployed Services (${#DEPLOYED_SERVICES[@]}):${NC}"
for service in "${DEPLOYED_SERVICES[@]}"; do
    echo -e "  ${GREEN}✓${NC} $service"
done

if [ ${#FAILED_SERVICES[@]} -gt 0 ]; then
    echo -e "${RED}✗ Failed Services (${#FAILED_SERVICES[@]}):${NC}"
    for service in "${FAILED_SERVICES[@]}"; do
        echo -e "  ${RED}✗${NC} $service"
    done
fi

if [ ${#SKIPPED_SERVICES[@]} -gt 0 ]; then
    echo -e "${YELLOW}⊘ Skipped Services (${#SKIPPED_SERVICES[@]}):${NC}"
    for service in "${SKIPPED_SERVICES[@]}"; do
        echo -e "  ${YELLOW}⊘${NC} $service"
    done
fi

echo ""
echo -e "${MAGENTA}"
echo "════════════════════════════════════════════════════════════════"
echo "                  🎯 NEXT STEPS"
echo "════════════════════════════════════════════════════════════════"
echo -e "${NC}"

echo "1️⃣  Verify service URLs were captured:"
echo -e "   ${BLUE}cat railway-service-urls.json${NC}"
echo ""

echo "2️⃣  Verify all services are running:"
echo -e "   ${BLUE}bash scripts/verify-railway.sh${NC}"
echo ""

echo "3️⃣  Configure Vercel environment variables:"
echo -e "   ${BLUE}bash scripts/prepare-vercel.sh${NC}"
echo ""

echo "4️⃣  Deploy API Gateway to Vercel:"
echo -e "   ${BLUE}vercel deploy --prod${NC}"
echo ""

echo -e "${CYAN}For detailed logs:${NC}"
echo -e "   ${BLUE}cat railway-deployment.log${NC}"
echo ""

echo -e "${CYAN}"
echo "════════════════════════════════════════════════════════════════"
echo "           ✨ RAILWAY DEPLOYMENT INITIATED! ✨"
echo "           Services will continue building on Railway..."
echo "════════════════════════════════════════════════════════════════"
echo -e "${NC}"
