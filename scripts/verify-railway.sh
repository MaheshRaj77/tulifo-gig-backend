#!/bin/bash

# ============================================
# RAILWAY DEPLOYMENT VERIFICATION
# Check status and health of deployed services
# ============================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
URLS_FILE="$PROJECT_ROOT/railway-service-urls.json"

echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║      ✓ RAILWAY DEPLOYMENT VERIFICATION - TULIFO GIG 🔍         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check prerequisites
if ! command -v jq &> /dev/null; then
    echo -e "${RED}✗ jq not found. Install with: brew install jq${NC}"
    exit 1
fi

if [ ! -f "$URLS_FILE" ]; then
    echo -e "${RED}✗ No railway-service-urls.json found${NC}"
    echo -e "${YELLOW}Run: bash scripts/deploy-railway.sh${NC}"
    exit 1
fi

# Get service count
SERVICE_COUNT=$(jq '.services | length' "$URLS_FILE")
echo -e "${MAGENTA}"
echo "════════════════════════════════════════════════════════════════"
echo "              🌐 CHECKING $SERVICE_COUNT SERVICES"
echo "════════════════════════════════════════════════════════════════"
echo -e "${NC}"

HEALTHY=0
UNHEALTHY=0
TIMEOUT=0

echo ""
echo -e "${CYAN}Service Health Status:${NC}"
echo ""

# Check each service
jq -r '.services | keys[]' "$URLS_FILE" | while read service_key; do
    SERVICE_NAME="${service_key%_URL}"
    SERVICE_URL=$(jq -r ".services[\"$service_key\"]" "$URLS_FILE")
    
    echo -n "  $SERVICE_NAME"
    printf "%*s" $((40 - ${#SERVICE_NAME})) "" # Padding
    
    # Try to reach the health endpoint
    if response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 --connect-timeout 5 "$SERVICE_URL/health" 2>/dev/null); then
        if [[ "$response" =~ ^[23].* ]]; then
            echo -e "${GREEN}✓ Online (HTTP $response)${NC}"
        elif [[ "$response" =~ ^[45].* ]]; then
            echo -e "${YELLOW}⚠ Error (HTTP $response)${NC}"
        else
            echo -e "${YELLOW}⚠ Unknown (HTTP $response)${NC}"
        fi
    else
        echo -e "${YELLOW}⊘ Timeout / Unreachable${NC}"
    fi
done

echo ""
echo -e "${CYAN}Generated on:${NC} $(jq -r '.generated' "$URLS_FILE")"
echo ""

# Show service URLs table
echo -e "${BLUE}Service URLs:${NC}"
echo ""
jq -r '.services | to_entries[] | "  \(.key): \(.value)"' "$URLS_FILE" | column -t -s: -N "KEY,URL" |  head -20

echo ""
echo -e "${MAGENTA}"
echo "════════════════════════════════════════════════════════════════"
echo "                    💡 TROUBLESHOOTING"
echo "════════════════════════════════════════════════════════════════"
echo -e "${NC}"

echo -e "${CYAN}If services are not responding:${NC}"
echo "1. Wait 2-3 minutes for Railway to finish building"
echo "2. Check Railway dashboard: https://railway.app"
echo "3. View logs for specific service:"
echo -e "   ${BLUE}railway logs -s SERVICE_NAME${NC}"
echo ""
echo -e "${CYAN}After services are ready:${NC}"
echo "1. Update Vercel environment variables:"
echo -e "   ${BLUE}bash scripts/prepare-vercel.sh${NC}"
echo "2. Deploy to Vercel:"
echo -e "   ${BLUE}vercel deploy --prod${NC}"
