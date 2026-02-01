#!/bin/bash

# Backend Troubleshooting & Diagnostic Report
# Identifies issues and provides fix commands

echo "🔧 TULIFO GIG BACKEND - TROUBLESHOOTING REPORT"
echo "=============================================="
echo ""

# Load environment
export $(cat .env | grep -v '#' | xargs)

ISSUES=()
FIXES=()

echo "📋 Running Diagnostics..."
echo ""

# Check 1: Docker daemon
if ! docker info > /dev/null 2>&1; then
  ISSUES+=("Docker daemon not running")
  FIXES+=("Start Docker Desktop")
fi

# Check 2: Environment variables
if [ -z "$VAPID_PUBLIC_KEY" ] || [ "$VAPID_PUBLIC_KEY" = "your-vapid-public-key" ]; then
  ISSUES+=("VAPID keys invalid/missing - notification-service will fail")
  FIXES+=("Generate VAPID keys: npx web-push generate-vapid-keys")
fi

if [ -z "$DATABASE_URL" ] || [ "$DATABASE_URL" = "" ]; then
  ISSUES+=("DATABASE_URL not set - PostgreSQL services will fail")
  FIXES+=("Set DATABASE_URL in .env")
fi

# Check 3: Missing services in docker-compose
services_in_docker=$(docker-compose config 2>/dev/null | grep "services:" -A 100 | grep "^  [a-z]" | wc -l)
expected_services=15

if [ $services_in_docker -lt 12 ]; then
  ISSUES+=("Missing services in docker-compose.yml (found $services_in_docker, expected ~15)")
  FIXES+=("Run: docker-compose up -d to recreate all services")
fi

# Check 4: Container health
unhealthy=$(docker ps | grep "unhealthy" | wc -l)
exited=$(docker ps -a | grep "Exited" | wc -l)

if [ $unhealthy -gt 0 ]; then
  ISSUES+=("$unhealthy containers showing unhealthy status")
  FIXES+=("Check service logs: docker-compose logs -f [service-name]")
fi

if [ $exited -gt 0 ]; then
  ISSUES+=("$exited containers exited with errors")
  FIXES+=("Fix issues and restart: docker-compose restart")
fi

# Print issues
if [ ${#ISSUES[@]} -gt 0 ]; then
  echo "⚠️  ISSUES FOUND:"
  echo "==================="
  for i in "${!ISSUES[@]}"; do
    echo "$(($i + 1)). ${ISSUES[$i]}"
    echo "   Fix: ${FIXES[$i]}"
    echo ""
  done
else
  echo "✅ No major issues detected!"
fi

# Service-specific issues
echo "🔍 SERVICE-SPECIFIC CHECKS:"
echo "=========================="
echo ""

# Check notification-service
if docker-compose logs notification-service 2>/dev/null | grep -q "Vapid public key"; then
  echo "❌ notification-service: Invalid VAPID keys"
  echo "   Fix: Generate valid VAPID keys with:"
  echo "   npx web-push generate-vapid-keys"
  echo ""
fi

# Check booking-service  
if docker ps -a | grep "booking-service" | grep -q "Exited"; then
  error=$(docker-compose logs booking-service 2>/dev/null | tail -3)
  echo "❌ booking-service: Exited with error"
  echo "   Last error: $error"
  echo ""
fi

# Check matching-service
if docker ps -a | grep "matching-service" | grep -q "Exited"; then
  echo "❌ matching-service: Exited (Python dependencies?)"
  echo ""
fi

# Health check details
echo "❤️  DETAILED HEALTH STATUS:"
echo "========================="
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(auth|user|project|payment|message|notification|session)" || echo "No services running"

echo ""
echo "📊 Summary:"
echo "==========="
docker ps --format "{{.Status}}" | grep -c "healthy" | xargs echo "Healthy containers:"
docker ps --format "{{.Status}}" | grep -c "unhealthy" | xargs echo "Unhealthy containers:"
docker ps -a --format "{{.Status}}" | grep -c "Exited" | xargs echo "Exited containers:"

echo ""
echo "💡 QUICK FIX COMMANDS:"
echo "===================="
echo ""
echo "1. Restart all services:"
echo "   docker-compose restart"
echo ""
echo "2. Rebuild and restart everything:"
echo "   docker-compose down && docker-compose up -d"
echo ""
echo "3. Check specific service logs:"
echo "   docker-compose logs -f [service-name]"
echo ""
echo "4. Generate VAPID keys:"
echo "   npx web-push generate-vapid-keys"
echo ""
echo "5. Fix DATABASE_URL special characters:"
echo "   # Ensure Ç and other special chars are properly escaped"
echo ""
