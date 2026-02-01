#!/bin/bash

##############################################################################
# API Service-to-Service Communication Examples
# Demonstrates how different services interact with each other
##############################################################################

set -e

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

BASE_URL="http://localhost"

print_section() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

print_example() {
  echo -e "${GREEN}$1${NC}"
}

print_description() {
  echo -e "${YELLOW}$1${NC}"
}

##############################################################################
# 1. Authentication & Token Flow
##############################################################################

example_1_auth_flow() {
  print_section "1. Authentication Flow (Auth Service → User Service)"
  
  print_description "Step 1: User registers with Auth Service"
  print_example "curl -X POST $BASE_URL:3001/api/auth/register \\"
  echo "  -H 'Content-Type: application/json' \\"
  echo "  -d '{
    \"email\": \"user@example.com\",
    \"password\": \"SecurePassword123\",
    \"role\": \"worker\"
  }'"
  
  print_description "Response includes:"
  echo "{
  \"accessToken\": \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\",
  \"refreshToken\": \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\",
  \"user\": {
    \"id\": \"550e8400-e29b-41d4-a716-446655440000\",
    \"email\": \"user@example.com\",
    \"role\": \"worker\"
  }
}"
  
  print_description "Step 2: User calls User Service with Bearer token"
  print_example "curl -X GET $BASE_URL:3002/api/users/550e8400-e29b-41d4-a716-446655440000 \\"
  echo "  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'"
  
  print_description "Step 3: User Service verifies token with Auth Service"
  print_example "# Internal call (service-to-service)"
  echo "curl -X POST $BASE_URL:3001/api/auth/verify-token \\"
  echo "  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'"
  
  print_description "Response:"
  echo "{
  \"valid\": true,
  \"userId\": \"550e8400-e29b-41d4-a716-446655440000\",
  \"role\": \"worker\"
}"
}

##############################################################################
# 2. Project Creation Flow
##############################################################################

example_2_project_creation() {
  print_section "2. Project Creation Flow (Multiple Services)"
  
  print_description "Flow: Client → Project Service → Payment Service → Notification Service"
  
  print_example "Step 1: Client creates project"
  echo "curl -X POST $BASE_URL:3003/api/projects \\"
  echo "  -H 'Authorization: Bearer <token>' \\"
  echo "  -H 'Content-Type: application/json' \\"
  echo "  -d '{
    \"title\": \"Build a mobile app\",
    \"description\": \"iOS app for task management\",
    \"budget\": 5000,
    \"skills\": [\"iOS\", \"Swift\", \"UI/UX\"],
    \"deadline\": \"2026-03-01\"
  }'"
  
  print_description "Project Service Response:"
  echo "{
  \"id\": \"proj-550e8400-e29b-41d4-a716-446655440000\",
  \"title\": \"Build a mobile app\",
  \"clientId\": \"user-550e8400-e29b-41d4-a716-446655440000\",
  \"status\": \"open\",
  \"budget\": 5000,
  \"createdAt\": \"2026-02-01T10:00:00Z\"
}"
  
  print_description "Step 2: Project Service publishes event to RabbitMQ"
  echo "Topic: platform.events"
  echo "Routing Key: project.created"
  echo "Message: {
  \"projectId\": \"proj-550e8400-e29b-41d4-a716-446655440000\",
  \"clientId\": \"user-550e8400-e29b-41d4-a716-446655440000\",
  \"title\": \"Build a mobile app\",
  \"budget\": 5000,
  \"timestamp\": \"2026-02-01T10:00:00Z\"
}"
  
  print_description "Step 3: Notification Service receives event"
  echo "# RabbitMQ Consumer: notification-queue"
  echo "Event received: project.created"
  echo "→ Sends project creation email to client"
}

##############################################################################
# 3. Worker Search & Matching
##############################################################################

example_3_worker_matching() {
  print_section "3. Worker Search & Matching Flow"
  
  print_description "Flow: Client → Search Service → Worker Service → Matching Service → Elasticsearch"
  
  print_example "Step 1: Client searches for workers with specific skills"
  echo "curl -X GET '$BASE_URL:3015/api/search/workers?skills=iOS,Swift&experience=3+' \\"
  echo "  -H 'Authorization: Bearer <token>'"
  
  print_description "Step 2: Search Service queries Elasticsearch"
  echo "GET /workers/_search"
  echo "{
  \"query\": {
    \"bool\": {
      \"must\": [
        {\"match_phrase\": {\"skills\": \"iOS\"}},
        {\"match_phrase\": {\"skills\": \"Swift\"}}
      ]
    }
  },
  \"sort\": [{\"rating\": {\"order\": \"desc\"}}]
}"
  
  print_description "Step 3: Search Service enriches results from Worker Service"
  echo "curl -X GET $BASE_URL:3010/api/v1/workers/worker-xyz/profile \\"
  echo "  -H 'Internal-Service: search-service'"
  
  print_description "Step 4: Matching Service provides AI-powered scoring"
  echo "curl -X POST $BASE_URL:3008/api/matching/score \\"
  echo "  -H 'Content-Type: application/json' \\"
  echo "  -d '{
    \"projectId\": \"proj-xyz\",
    \"workerId\": \"worker-abc\",
    \"projectSkills\": [\"iOS\", \"Swift\"],
    \"workerSkills\": [\"iOS\", \"Swift\", \"Android\"]
  }'"
  
  print_description "Response: Ranked list of matching workers"
  echo "{
  \"matches\": [
    {
      \"workerId\": \"worker-abc\",
      \"name\": \"John Doe\",
      \"rating\": 4.9,
      \"hourlyRate\": 75,
      \"matchScore\": 0.98,
      \"skills\": [\"iOS\", \"Swift\", \"UI/UX\"]
    },
    {
      \"workerId\": \"worker-def\",
      \"name\": \"Jane Smith\",
      \"rating\": 4.7,
      \"hourlyRate\": 65,
      \"matchScore\": 0.92,
      \"skills\": [\"iOS\", \"Swift\"]
    }
  ]
}"
}

##############################################################################
# 4. Booking & Payment Flow
##############################################################################

example_4_booking_payment() {
  print_section "4. Booking & Payment Processing Flow"
  
  print_description "Flow: Booking Service → Payment Service → Stripe → Escrow Service"
  
  print_example "Step 1: Worker accepts project (create booking)"
  echo "curl -X POST $BASE_URL:3007/api/bookings \\"
  echo "  -H 'Authorization: Bearer <worker-token>' \\"
  echo "  -H 'Content-Type: application/json' \\"
  echo "  -d '{
    \"projectId\": \"proj-xyz\",
    \"amount\": 5000,
    \"startDate\": \"2026-02-05\",
    \"endDate\": \"2026-02-20\"
  }'"
  
  print_description "Step 2: Booking Service calls Payment Service to process payment"
  echo "curl -X POST $BASE_URL:3004/api/payments/create \\"
  echo "  -H 'Internal-Service: booking-service' \\"
  echo "  -H 'Content-Type: application/json' \\"
  echo "  -d '{
    \"bookingId\": \"booking-xyz\",
    \"amount\": 5000,
    \"currency\": \"USD\",
    \"customerId\": \"user-abc\",
    \"description\": \"Project: Build a mobile app\"
  }'"
  
  print_description "Step 3: Payment Service processes with Stripe"
  echo "Stripe API Call:"
  echo "POST https://api.stripe.com/v1/payment_intents"
  echo "amount: 500000 (cents)"
  echo "currency: usd"
  
  print_description "Step 4: Payment Service publishes event"
  echo "Topic: platform.events"
  echo "Routing Key: payment.created"
  echo "Message: {
  \"bookingId\": \"booking-xyz\",
  \"amount\": 5000,
  \"status\": \"pending_escrow\",
  \"timestamp\": \"2026-02-01T10:30:00Z\"
}"
  
  print_description "Step 5: Escrow Service holds funds"
  echo "curl -X POST $BASE_URL:3012/api/escrow/hold \\"
  echo "  -H 'Internal-Service: payment-service' \\"
  echo "  -H 'Content-Type: application/json' \\"
  echo "  -d '{
    \"bookingId\": \"booking-xyz\",
    \"amount\": 5000,
    \"clientId\": \"user-abc\",
    \"workerId\": \"worker-xyz\",
    \"milestones\": [
      {\"description\": \"Design phase\", \"amount\": 1500, \"date\": \"2026-02-10\"},
      {\"description\": \"Development phase\", \"amount\": 2500, \"date\": \"2026-02-15\"},
      {\"description\": \"Testing & QA\", \"amount\": 1000, \"date\": \"2026-02-20\"}
    ]
  }'"
}

##############################################################################
# 5. Real-Time Messaging
##############################################################################

example_5_messaging() {
  print_section "5. Real-Time Messaging Flow (WebSocket)"
  
  print_description "Flow: Client ↔ Message Service (Socket.io) ↔ MongoDB"
  
  print_example "Step 1: Client connects to Message Service via WebSocket"
  echo "const socket = io('http://localhost:3005', {
  auth: {
    token: '<jwt-token>'
  }
});"
  
  print_example "Step 2: Client sends message"
  echo "socket.emit('send-message', {
  conversationId: 'conv-xyz',
  content: 'Hi! I am interested in your project',
  messageType: 'text'
});"
  
  print_description "Step 3: Message Service stores in MongoDB"
  echo "Collection: messages"
  echo "Document: {
  _id: ObjectId(...),
  conversationId: 'conv-xyz',
  senderId: 'user-abc',
  content: 'Hi! I am interested in your project',
  messageType: 'text',
  readAt: null,
  createdAt: ISODate('2026-02-01T10:45:00Z')
}"
  
  print_description "Step 4: Message Service broadcasts to recipient"
  echo "socket.emit('receive-message', {
  messageId: 'msg-xyz',
  conversationId: 'conv-xyz',
  senderId: 'user-abc',
  senderName: 'John Doe',
  content: 'Hi! I am interested in your project',
  createdAt: '2026-02-01T10:45:00Z'
});"
}

##############################################################################
# 6. Notifications
##############################################################################

example_6_notifications() {
  print_section "6. Notification Flow (Email & Push)"
  
  print_description "Flow: Any Service → Notification Service → Email/Push APIs"
  
  print_example "Step 1: Any service publishes notification event"
  echo "Topic: platform.events"
  echo "Routing Key: notification.send"
  echo "Message: {
  \"userId\": \"user-abc\",
  \"type\": \"project_assigned\",
  \"title\": \"New Project Assigned\",
  \"message\": \"A new project has been assigned to you\",
  \"data\": {
    \"projectId\": \"proj-xyz\",
    \"projectTitle\": \"Build a mobile app\",
    \"clientName\": \"Jane Smith\"
  }
}"
  
  print_description "Step 2: Notification Service receives event"
  echo "Retrieves user preferences:"
  echo "GET /api/notifications/settings/user-abc"
  echo "Response: {
  \"userId\": \"user-abc\",
  \"emailNotifications\": true,
  \"pushNotifications\": true,
  \"inAppNotifications\": true
}"
  
  print_description "Step 3a: Send Email (via SMTP)"
  echo "To: user@example.com"
  echo "Subject: New Project Assigned"
  echo "Body: A new project 'Build a mobile app' has been assigned to you..."
  
  print_description "Step 3b: Send Push Notification (via Web Push API)"
  echo "curl -X POST https://fcm.googleapis.com/fcm/send \\"
  echo "  -H 'Authorization: key=<FCM_SERVER_KEY>' \\"
  echo "  -d '{
    \"to\": \"<device-token>\",
    \"notification\": {
      \"title\": \"New Project Assigned\",
      \"body\": \"Build a mobile app by Jane Smith\",
      \"icon\": \"https://tulifo.com/logo.png\"
    }
  }'"
  
  print_description "Step 3c: Store In-App Notification (MongoDB)"
  echo "Collection: notifications"
  echo "Document: {
  _id: ObjectId(...),
  userId: 'user-abc',
  type: 'project_assigned',
  title: 'New Project Assigned',
  message: 'A new project has been assigned to you',
  data: {...},
  read: false,
  createdAt: ISODate('2026-02-01T10:50:00Z')
}"
}

##############################################################################
# 7. Dispute Resolution Flow
##############################################################################

example_7_dispute_flow() {
  print_section "7. Dispute Resolution Flow"
  
  print_description "Flow: Client/Worker → Dispute Service → Escrow Service → Payment Service"
  
  print_example "Step 1: Client initiates dispute"
  echo "curl -X POST $BASE_URL:3013/api/disputes \\"
  echo "  -H 'Authorization: Bearer <token>' \\"
  echo "  -H 'Content-Type: application/json' \\"
  echo "  -d '{
    \"bookingId\": \"booking-xyz\",
    \"reason\": \"Work not completed as agreed\",
    \"description\": \"The worker delivered incomplete code\",
    \"evidence\": [\"url-to-file-1\", \"url-to-file-2\"]
  }'"
  
  print_description "Step 2: Dispute Service queries Escrow Service for hold status"
  echo "curl -X GET $BASE_URL:3012/api/escrow/booking-xyz/status \\"
  echo "  -H 'Internal-Service: dispute-service'"
  
  print_description "Step 3: Dispute resolution (admin review)"
  echo "curl -X POST $BASE_URL:3013/api/disputes/dispute-xyz/resolve \\"
  echo "  -H 'Authorization: Bearer <admin-token>' \\"
  echo "  -H 'Content-Type: application/json' \\"
  echo "  -d '{
    \"resolution\": \"refund_client\",
    \"amount\": 5000,
    \"notes\": \"Work quality did not meet standards\"
  }'"
  
  print_description "Step 4: Escrow Service releases funds based on resolution"
  echo "curl -X POST $BASE_URL:3012/api/escrow/release \\"
  echo "  -H 'Internal-Service: dispute-service' \\"
  echo "  -H 'Content-Type: application/json' \\"
  echo "  -d '{
    \"bookingId\": \"booking-xyz\",
    \"action\": \"refund_client\",
    \"amount\": 5000
  }'"
  
  print_description "Step 5: Payment Service processes refund"
  echo "Stripe Refund API Call"
}

##############################################################################
# 8. Review & Rating System
##############################################################################

example_8_reviews() {
  print_section "8. Review & Rating Flow"
  
  print_description "Flow: Client/Worker → Review Service → User Service → Search Service"
  
  print_example "Step 1: After project completion, user posts review"
  echo "curl -X POST $BASE_URL:3014/api/reviews \\"
  echo "  -H 'Authorization: Bearer <token>' \\"
  echo "  -H 'Content-Type: application/json' \\"
  echo "  -d '{
    \"bookingId\": \"booking-xyz\",
    \"targetUserId\": \"worker-xyz\",
    \"rating\": 5,
    \"title\": \"Excellent work!\",
    \"comment\": \"The developer delivered high-quality code on time\",
    \"categories\": {
      \"communication\": 5,
      \"quality\": 5,
      \"deadline\": 5,
      \"professionalism\": 5
    }
  }'"
  
  print_description "Step 2: Review Service stores in PostgreSQL"
  echo "Table: reviews"
  echo "Fields: id, booking_id, reviewer_id, target_user_id, rating, title, comment, created_at"
  
  print_description "Step 3: Review Service updates User Service rating"
  echo "curl -X POST $BASE_URL:3002/api/users/worker-xyz/ratings \\"
  echo "  -H 'Internal-Service: review-service' \\"
  echo "  -d '{
    \"reviewId\": \"review-xyz\",
    \"rating\": 5,
    \"category\": \"overall\"
  }'"
  
  print_description "Step 4: Search Service reindexes worker profile"
  echo "curl -X POST $BASE_URL:3015/api/search/reindex-worker \\"
  echo "  -H 'Internal-Service: review-service' \\"
  echo "  -d '{\"workerId\": \"worker-xyz\"}'"
  
  print_description "Updated Elasticsearch document:"
  echo "{
  \"_id\": \"worker-xyz\",
  \"name\": \"John Doe\",
  \"rating\": 4.85,
  \"reviewCount\": 127,
  \"skills\": [\"iOS\", \"Swift\"],
  \"hourlyRate\": 75,
  \"updated_at\": \"2026-02-01T11:00:00Z\"
}"
}

##############################################################################
# Main Menu
##############################################################################

show_menu() {
  print_section "Service-to-Service Communication Examples"
  
  echo "Select an example to view:"
  echo ""
  echo "  1. Authentication & Token Flow"
  echo "  2. Project Creation Flow"
  echo "  3. Worker Search & Matching"
  echo "  4. Booking & Payment Processing"
  echo "  5. Real-Time Messaging (WebSocket)"
  echo "  6. Notifications (Email & Push)"
  echo "  7. Dispute Resolution Flow"
  echo "  8. Review & Rating System"
  echo "  9. View All Examples"
  echo "  0. Exit"
  echo ""
  echo -n "Enter your choice: "
}

run_all_examples() {
  example_1_auth_flow
  example_2_project_creation
  example_3_worker_matching
  example_4_booking_payment
  example_5_messaging
  example_6_notifications
  example_7_dispute_flow
  example_8_reviews
}

##############################################################################
# Main Loop
##############################################################################

main() {
  while true; do
    show_menu
    read -r choice
    
    case $choice in
      1) example_1_auth_flow ;;
      2) example_2_project_creation ;;
      3) example_3_worker_matching ;;
      4) example_4_booking_payment ;;
      5) example_5_messaging ;;
      6) example_6_notifications ;;
      7) example_7_dispute_flow ;;
      8) example_8_reviews ;;
      9) run_all_examples ;;
      0) echo "Goodbye!"; exit 0 ;;
      *) echo "Invalid choice. Please try again." ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
  done
}

main
