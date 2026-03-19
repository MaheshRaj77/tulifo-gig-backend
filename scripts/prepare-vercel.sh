#!/bin/bash

# ============================================
# PREPARE VERCEL ENVIRONMENT VARIABLES
# Extract Railway service URLs and prepare for Vercel deployment
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
echo "║        📋 PREPARE VERCEL DEPLOYMENT - TULIFO GIG 🚀            ║"
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

echo -e "${MAGENTA}"
echo "════════════════════════════════════════════════════════════════"
echo "    🔐 ENVIRONMENT VARIABLES FOR VERCEL DASHBOARD"
echo "════════════════════════════════════════════════════════════════"
echo -e "${NC}"

SERVICE_COUNT=$(jq '.services | length' "$URLS_FILE")

echo -e "${YELLOW}You have ${CYAN}$SERVICE_COUNT${YELLOW} service URLs to add${NC}"
echo ""
echo -e "${YELLOW}Go to: https://vercel.com/dashboard${NC}"
echo "  → Select project 'tulifo-gig-backend'"
echo "  → Settings → Environment Variables"
echo "  → Scope: Production"
echo "  → Copy and paste each variable below"
echo ""

echo -e "${BLUE}┌────────────────────────────────────────────────────────┐${NC}"
echo -e "${BLUE}│${NC} COPY THESE ENVIRONMENT VARIABLES                        ${BLUE}│${NC}"
echo -e "${BLUE}└────────────────────────────────────────────────────────┘${NC}"
echo ""

jq -r '.services | to_entries[] | "\(.key)=\(.value)"' "$URLS_FILE" | while read line; do
    # Split on first =
    KEY="${line%%=*}"
    VALUE="${line#*=}"
    
    echo -e "${CYAN}Key:${NC}   $KEY"
    echo -e "${GREEN}Value:${NC} $VALUE"
    echo ""
done

echo -e "${BLUE}┌────────────────────────────────────────────────────────┐${NC}"
echo -e "${BLUE}│${NC} OR USE VERCEL CLI AUTOMATION                         ${BLUE}│${NC}"
echo -e "${BLUE}└────────────────────────────────────────────────────────┘${NC}"
echo ""

echo -e "${YELLOW}Run these commands (requires Vercel CLI login):${NC}"
echo ""

jq -r '.services | to_entries[] | .key' "$URLS_FILE" | while read key; do
    value=$(jq -r ".services[\"$key\"]" "$URLS_FILE")
    # Use printf for piping value
    echo -e "  ${BLUE}echo \"$value\" | vercel env add $key production${NC}"
done

echo ""
echo -e "${YELLOW}Or deploy manually with environment file:${NC}"
echo -e "  ${BLUE}vercel env import < railway-service-urls.json${NC}"
echo ""

# Create .env.production file
ENV_PROD_FILE="$PROJECT_ROOT/.env.production"
echo -e "${MAGENTA}Creating .env.production file...${NC}"

> "$ENV_PROD_FILE"
jq -r '.services | to_entries[] | "\(.key)=\(.value)"' "$URLS_FILE" >> "$ENV_PROD_FILE"
jq -r '.services | to_entries[] | .key + "_LONG_TIMEOUT=30000"' "$URLS_FILE" >> "$ENV_PROD_FILE"

echo -e "${GREEN}✓ Created .env.production${NC}"
echo -e "  (File: $ENV_PROD_FILE)"
echo ""

echo -e "${MAGENTA}"
echo "════════════════════════════════════════════════════════════════"
echo "                   ✅ FINAL STEPS"
echo "════════════════════════════════════════════════════════════════"
echo -e "${NC}"

echo -e "${CYAN}1. Check Railway services are running:${NC}"
echo -e "   ${BLUE}bash scripts/verify-railway.sh${NC}"
echo ""

echo -e "${CYAN}2. Add environment variables to Vercel:${NC}"
echo -e "   ${YELLOW}Option A (Web):${NC} https://vercel.com/dashboard → Settings → Environment Variables"
echo -e "   ${YELLOW}Option B (CLI):${NC} Manually add each variable above"
echo ""

echo -e "${CYAN}3. Deploy to Vercel:${NC}"
echo -e "   ${BLUE}vercel deploy --prod${NC}"
echo ""

echo -e "${CYAN}4. Verify gateway is working:${NC}"
echo -e "   ${BLUE}curl https://your-vercel-domain.vercel.app/health${NC}"
echo ""

echo -e "${MAGENTA}"
echo "════════════════════════════════════════════════════════════════"
echo "              📊 DEPLOYMENT CONFIGURATION READY! 📊"
echo "════════════════════════════════════════════════════════════════"
echo -e "${NC}"
