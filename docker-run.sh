#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}===================================${NC}"
echo -e "${BLUE}Tulifo Gig Backend - Docker Setup${NC}"
echo -e "${BLUE}===================================${NC}\n"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo -e "Please copy .env.example to .env and configure your environment variables."
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running!${NC}"
    echo -e "Please start Docker and try again."
    exit 1
fi

echo -e "${GREEN}✓ Docker is running${NC}"
echo -e "${GREEN}✓ Environment file found${NC}\n"

# Function to start services
start_services() {
    echo -e "${BLUE}Starting all services...${NC}\n"
    docker-compose up -d
    
    if [ $? -eq 0 ]; then
        echo -e "\n${GREEN}✓ All services started successfully!${NC}\n"
        echo -e "${BLUE}Services running:${NC}"
        docker-compose ps
        
        echo -e "\n${BLUE}Service URLs:${NC}"
        echo -e "  - Auth Service:         http://localhost:3001"
        echo -e "  - User Service:         http://localhost:3002"
        echo -e "  - Project Service:      http://localhost:3003"
        echo -e "  - Payment Service:      http://localhost:3004"
        echo -e "  - Message Service:      http://localhost:3005"
        echo -e "  - Notification Service: http://localhost:3006"
        echo -e "  - Booking Service:      http://localhost:3007"
        echo -e "  - Matching Service:     http://localhost:3008"
        echo -e "  - Session Service:      http://localhost:3009"
        echo -e "  - Redis:                http://localhost:6379"
        echo -e "  - RabbitMQ Management:  http://localhost:15672"
        echo -e "\n${BLUE}Logs:${NC} docker-compose logs -f [service-name]"
        echo -e "${BLUE}Stop:${NC} docker-compose down"
    else
        echo -e "\n${RED}✗ Failed to start services${NC}"
        exit 1
    fi
}

# Function to stop services
stop_services() {
    echo -e "${BLUE}Stopping all services...${NC}\n"
    docker-compose down
    echo -e "${GREEN}✓ All services stopped${NC}"
}

# Function to rebuild services
rebuild_services() {
    echo -e "${BLUE}Rebuilding all services...${NC}\n"
    docker-compose down
    docker-compose build --no-cache
    docker-compose up -d
    echo -e "${GREEN}✓ Services rebuilt and started${NC}"
}

# Function to show logs
show_logs() {
    if [ -z "$1" ]; then
        docker-compose logs -f
    else
        docker-compose logs -f "$1"
    fi
}

# Parse command
case "$1" in
    start|up)
        start_services
        ;;
    stop|down)
        stop_services
        ;;
    restart)
        stop_services
        start_services
        ;;
    rebuild)
        rebuild_services
        ;;
    logs)
        show_logs "$2"
        ;;
    ps|status)
        docker-compose ps
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|rebuild|logs [service]|status}"
        echo ""
        echo "Commands:"
        echo "  start/up      - Start all services"
        echo "  stop/down     - Stop all services"
        echo "  restart       - Restart all services"
        echo "  rebuild       - Rebuild and restart all services"
        echo "  logs [service]- Show logs (optionally for specific service)"
        echo "  ps/status     - Show running services"
        exit 1
        ;;
esac
