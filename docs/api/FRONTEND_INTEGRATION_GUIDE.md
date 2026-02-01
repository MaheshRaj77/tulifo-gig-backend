# Tulifo GIG Backend - Frontend Integration Guide

**Document Version:** 1.0  
**Date:** February 1, 2026  
**Status:** ✅ Production Ready (100% Services Operational)

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [API Base URLs](#api-base-urls)
4. [Services Documentation](#services-documentation)
5. [Authentication & Authorization](#authentication--authorization)
6. [Database Models](#database-models)
7. [Common Response Formats](#common-response-formats)
8. [Error Handling](#error-handling)
9. [Integration Examples](#integration-examples)
10. [Development Setup](#development-setup)

---

## Quick Start

### Prerequisites
- Node.js 18+ or latest
- Git
- Docker (optional, for local development)

### Service Status Check

```bash
# Check if all services are healthy
curl http://localhost:3001/health

# For all services at once
for port in 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 3011 3012 3013 3014 3015; do
  echo "Port $port: $(curl -s http://localhost:$port/health | head -c 50)"
done
```

### Running Verification

```bash
bash scripts/verify-services.sh
```

Expected output: **100% Pass Rate (55/55 tests)**

---

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND APPLICATION                │
│            (React/Vue/Angular - Your Framework)        │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│         Kong API Gateway (Port 8000)                    │
│    (Request Routing, Load Balancing, Rate Limiting)    │
└──────────────────────┬──────────────────────────────────┘
                       │
      ┌────────────────┼────────────────┐
      │                │                │
┌─────▼────────┐ ┌─────▼────────┐ ┌─────▼────────┐
│ Microservice1│ │ Microservice2│ │ Microservice3│
│   (Node.js)  │ │   (Node.js)  │ │  (Go/Python) │
└──────────────┘ └──────────────┘ └──────────────┘
      │                │                │
└─────┴────────────────┼────────────────┘
                       │
      ┌────────────────┼────────────────┐
      │                │                │
┌─────▼──────┐ ┌───────▼──────┐ ┌──────▼──────┐
│ PostgreSQL │ │   MongoDB    │ │    Redis    │
│ (Supabase) │ │   (NoSQL)    │ │   (Cache)   │
└────────────┘ └──────────────┘ └─────────────┘
```

### 15 Microservices

| Service | Port | Language | Purpose |
|---------|------|----------|---------|
| **auth-service** | 3001 | Node.js | Authentication, JWT tokens, user login |
| **user-service** | 3002 | Node.js | User profiles, preferences, settings |
| **project-service** | 3003 | Node.js | Project management, CRUD operations |
| **payment-service** | 3004 | Node.js | Payment processing, Stripe integration |
| **message-service** | 3005 | Node.js | Direct messaging between users |
| **notification-service** | 3006 | Node.js | Push notifications, email alerts |
| **booking-service** | 3007 | Go | Booking management, availability |
| **matching-service** | 3008 | Python | Worker-project matching algorithm |
| **session-service** | 3009 | Node.js | Session management, JWT validation |
| **worker-service** | 3010 | Node.js | Worker profiles, skills, ratings |
| **client-service** | 3011 | Node.js | Client profiles, order history |
| **escrow-service** | 3012 | Node.js | Payment escrow, fund management |
| **dispute-service** | 3013 | Node.js | Dispute management, resolution |
| **review-service** | 3014 | Node.js | Reviews, ratings, feedback |
| **search-service** | 3015 | Node.js | Full-text search via Elasticsearch |

---

## API Base URLs

### Local Development

```
Base URL: http://localhost
API Gateway: http://localhost:8000

# Direct service access (if bypassing Kong)
http://localhost:3001  # Auth Service
http://localhost:3002  # User Service
http://localhost:3003  # Project Service
... and so on
```

### Production (Render Deployment)

```
Base URL: https://your-domain.com
API Gateway: https://api.your-domain.com
```

### Environment Variable Setup

Create `.env` file in frontend root:

```env
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_AUTH_SERVICE=http://localhost:3001
REACT_APP_USER_SERVICE=http://localhost:3002
REACT_APP_PROJECT_SERVICE=http://localhost:3003
REACT_APP_PAYMENT_SERVICE=http://localhost:3004
REACT_APP_MESSAGE_SERVICE=http://localhost:3005
REACT_APP_NOTIFICATION_SERVICE=http://localhost:3006
REACT_APP_BOOKING_SERVICE=http://localhost:3007
REACT_APP_MATCHING_SERVICE=http://localhost:3008
REACT_APP_SESSION_SERVICE=http://localhost:3009
REACT_APP_WORKER_SERVICE=http://localhost:3010
REACT_APP_CLIENT_SERVICE=http://localhost:3011
REACT_APP_ESCROW_SERVICE=http://localhost:3012
REACT_APP_DISPUTE_SERVICE=http://localhost:3013
REACT_APP_REVIEW_SERVICE=http://localhost:3014
REACT_APP_SEARCH_SERVICE=http://localhost:3015
```

---

## Services Documentation

### 1. Auth Service (Port 3001)

**Purpose:** User authentication, JWT token generation, session management

#### Endpoints

```bash
# Health Check
GET /health
Response: { "status": "healthy", "service": "auth-service" }

# Login
POST /api/v1/auth/login
Headers: { "Content-Type": "application/json" }
Body: {
  "email": "user@example.com",
  "password": "password123"
}
Response: {
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "role": "worker" | "client" | "admin"
  }
}

# Register
POST /api/v1/auth/register
Body: {
  "email": "newuser@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "userType": "worker" | "client"
}
Response: {
  "success": true,
  "user": { ... },
  "token": "..."
}

# Logout
POST /api/v1/auth/logout
Headers: { "Authorization": "Bearer {token}" }
Response: { "success": true }

# Refresh Token
POST /api/v1/auth/refresh
Headers: { "Authorization": "Bearer {refreshToken}" }
Response: {
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}

# Verify Token
POST /api/v1/auth/verify
Headers: { "Authorization": "Bearer {token}" }
Response: {
  "valid": true,
  "user": { ... }
}
```

---

### 2. User Service (Port 3002)

**Purpose:** User profile management, settings, preferences

#### Endpoints

```bash
# Get User Profile
GET /api/v1/users/:userId
Headers: { "Authorization": "Bearer {token}" }
Response: {
  "id": "user-123",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "avatar": "https://...",
  "bio": "Software developer",
  "location": "San Francisco, CA",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-20T14:25:00Z"
}

# Update User Profile
PUT /api/v1/users/:userId
Headers: { "Authorization": "Bearer {token}" }
Body: {
  "firstName": "Jane",
  "lastName": "Smith",
  "bio": "Updated bio",
  "location": "New York, NY"
}
Response: { "success": true, "user": { ... } }

# Get User Settings
GET /api/v1/users/:userId/settings
Headers: { "Authorization": "Bearer {token}" }
Response: {
  "emailNotifications": true,
  "pushNotifications": true,
  "privacyLevel": "public" | "private",
  "timezone": "UTC",
  "language": "en"
}

# Update User Settings
PUT /api/v1/users/:userId/settings
Headers: { "Authorization": "Bearer {token}" }
Body: { ... same as get response ... }
Response: { "success": true }

# Search Users
GET /api/v1/users/search?q=john&limit=20&offset=0
Response: {
  "users": [ ... ],
  "total": 150,
  "limit": 20,
  "offset": 0
}
```

---

### 3. Project Service (Port 3003)

**Purpose:** Project/gig management, posting, CRUD operations

#### Endpoints

```bash
# Create Project
POST /api/v1/projects
Headers: { "Authorization": "Bearer {token}", "Content-Type": "application/json" }
Body: {
  "title": "Build Mobile App",
  "description": "Need an iOS app for project management",
  "budget": 5000,
  "currency": "USD",
  "category": "mobile-development",
  "skills": ["iOS", "Swift", "React Native"],
  "deadline": "2024-03-15",
  "attachments": ["url1", "url2"]
}
Response: {
  "id": "proj-123",
  "clientId": "client-456",
  "status": "open",
  "createdAt": "2024-02-01T10:00:00Z",
  ...
}

# Get All Projects
GET /api/v1/projects?status=open&category=mobile&limit=20&offset=0
Response: {
  "projects": [ ... ],
  "total": 150,
  "limit": 20,
  "offset": 0
}

# Get Single Project
GET /api/v1/projects/:projectId
Response: { ... project details ... }

# Update Project
PUT /api/v1/projects/:projectId
Headers: { "Authorization": "Bearer {token}" }
Body: { ... fields to update ... }
Response: { "success": true, "project": { ... } }

# Delete Project
DELETE /api/v1/projects/:projectId
Headers: { "Authorization": "Bearer {token}" }
Response: { "success": true }

# Post Bid on Project
POST /api/v1/projects/:projectId/bids
Headers: { "Authorization": "Bearer {token}" }
Body: {
  "amount": 4500,
  "currency": "USD",
  "coverLetter": "I have 5 years of iOS experience...",
  "deliveryDays": 30
}
Response: { "success": true, "bid": { ... } }

# Get Project Bids
GET /api/v1/projects/:projectId/bids
Response: {
  "bids": [ ... ],
  "total": 25
}
```

---

### 4. Payment Service (Port 3004)

**Purpose:** Payment processing, Stripe integration, transactions

#### Endpoints

```bash
# Create Payment Intent
POST /api/v1/payments/intent
Headers: { "Authorization": "Bearer {token}" }
Body: {
  "amount": 5000,
  "currency": "USD",
  "projectId": "proj-123"
}
Response: {
  "clientSecret": "pi_1234_secret_5678",
  "paymentIntentId": "pi_1234",
  "amount": 5000
}

# Get Payment History
GET /api/v1/payments/history?limit=20&offset=0
Headers: { "Authorization": "Bearer {token}" }
Response: {
  "transactions": [ ... ],
  "total": 45
}

# Get Single Transaction
GET /api/v1/payments/:transactionId
Headers: { "Authorization": "Bearer {token}" }
Response: { ... transaction details ... }

# Refund Payment
POST /api/v1/payments/:transactionId/refund
Headers: { "Authorization": "Bearer {token}" }
Body: { "reason": "Refund reason here" }
Response: { "success": true, "refund": { ... } }

# Get Wallet Balance
GET /api/v1/payments/wallet/balance
Headers: { "Authorization": "Bearer {token}" }
Response: {
  "balance": 2500.50,
  "currency": "USD",
  "lastUpdated": "2024-02-01T10:00:00Z"
}
```

---

### 5. Worker Service (Port 3010)

**Purpose:** Worker profiles, skills, ratings, portfolio

#### Endpoints

```bash
# Get Worker Profile
GET /api/v1/workers/:workerId
Response: {
  "id": "worker-123",
  "userId": "user-456",
  "title": "Full Stack Developer",
  "bio": "10+ years of experience",
  "skills": ["JavaScript", "React", "Node.js", "MongoDB"],
  "hourlyRate": 75,
  "averageRating": 4.8,
  "totalReviews": 125,
  "completedProjects": 89,
  "portfolio": [
    { "title": "Project 1", "url": "...", "description": "..." }
  ],
  "availability": "available" | "unavailable",
  "responseTime": "2 hours average"
}

# Search Workers
POST /api/v1/search/workers
Headers: { "Content-Type": "application/json" }
Body: {
  "query": "javascript developer",
  "skills": ["JavaScript", "React"],
  "minRate": 50,
  "maxRate": 150,
  "minRating": 4.0,
  "location": "San Francisco",
  "availability": "available",
  "limit": 20,
  "offset": 0
}
Response: {
  "workers": [ ... ],
  "total": 450,
  "limit": 20,
  "offset": 0
}

# Update Worker Profile
PUT /api/v1/workers/:workerId
Headers: { "Authorization": "Bearer {token}" }
Body: {
  "title": "Senior React Developer",
  "bio": "Updated bio",
  "skills": ["JavaScript", "React", "TypeScript", "Node.js"],
  "hourlyRate": 95,
  "availability": "available"
}
Response: { "success": true }

# Get Worker Portfolio
GET /api/v1/workers/:workerId/portfolio
Response: { "portfolio": [ ... ] }

# Add Portfolio Item
POST /api/v1/workers/:workerId/portfolio
Headers: { "Authorization": "Bearer {token}" }
Body: {
  "title": "E-commerce Platform",
  "description": "Built a full-featured e-commerce platform",
  "imageUrl": "https://...",
  "projectUrl": "https://...",
  "technologies": ["React", "Node.js", "MongoDB"]
}
Response: { "success": true }
```

---

### 6. Booking Service (Port 3007)

**Purpose:** Booking management, availability, scheduling

#### Endpoints

```bash
# Create Booking
POST /api/v1/bookings
Headers: { "Authorization": "Bearer {token}" }
Body: {
  "workerId": "worker-123",
  "projectId": "proj-456",
  "startDate": "2024-02-10",
  "endDate": "2024-02-20",
  "hourlyRate": 75,
  "totalHours": 40,
  "notes": "Additional requirements"
}
Response: {
  "bookingId": "book-789",
  "status": "pending",
  "createdAt": "2024-02-01T10:00:00Z"
}

# Get Worker Availability
GET /api/v1/availability/worker/:workerId
Response: {
  "workerId": "worker-123",
  "slots": [
    { "date": "2024-02-10", "available": true, "bookedHours": 4, "totalHours": 8 },
    { "date": "2024-02-11", "available": true, "bookedHours": 0, "totalHours": 8 }
  ]
}

# Get Available Time Slots
GET /api/v1/availability/worker/:workerId/slots?date=2024-02-10
Response: {
  "availableSlots": [
    { "startTime": "09:00", "endTime": "10:00" },
    { "startTime": "11:00", "endTime": "12:00" }
  ]
}

# Get Booking Details
GET /api/v1/bookings/:bookingId
Headers: { "Authorization": "Bearer {token}" }
Response: { ... booking details ... }

# Confirm Booking
POST /api/v1/bookings/:bookingId/confirm
Headers: { "Authorization": "Bearer {token}" }
Response: { "success": true, "booking": { ... } }

# Cancel Booking
POST /api/v1/bookings/:bookingId/cancel
Headers: { "Authorization": "Bearer {token}" }
Body: { "reason": "Cancellation reason" }
Response: { "success": true }

# Complete Booking
POST /api/v1/bookings/:bookingId/complete
Headers: { "Authorization": "Bearer {token}" }
Response: { "success": true }
```

---

### 7. Message Service (Port 3005)

**Purpose:** Direct messaging between users, conversations

#### Endpoints

```bash
# Send Message
POST /api/v1/messages
Headers: { "Authorization": "Bearer {token}" }
Body: {
  "recipientId": "user-456",
  "content": "Hi, I'm interested in your project!",
  "attachments": []
}
Response: {
  "messageId": "msg-123",
  "senderId": "user-789",
  "recipientId": "user-456",
  "content": "Hi, I'm interested in your project!",
  "timestamp": "2024-02-01T10:30:00Z",
  "read": false
}

# Get Conversations
GET /api/v1/messages/conversations?limit=20&offset=0
Headers: { "Authorization": "Bearer {token}" }
Response: {
  "conversations": [
    {
      "conversationId": "conv-123",
      "participantId": "user-456",
      "lastMessage": "...",
      "lastMessageTime": "2024-02-01T10:30:00Z",
      "unreadCount": 3
    }
  ]
}

# Get Conversation Messages
GET /api/v1/messages/conversations/:conversationId?limit=50&offset=0
Headers: { "Authorization": "Bearer {token}" }
Response: {
  "messages": [ ... ],
  "total": 150,
  "limit": 50,
  "offset": 0
}

# Mark Message as Read
PUT /api/v1/messages/:messageId/read
Headers: { "Authorization": "Bearer {token}" }
Response: { "success": true }

# Delete Message
DELETE /api/v1/messages/:messageId
Headers: { "Authorization": "Bearer {token}" }
Response: { "success": true }
```

---

### 8. Review Service (Port 3014)

**Purpose:** Reviews, ratings, feedback

#### Endpoints

```bash
# Create Review
POST /api/v1/reviews
Headers: { "Authorization": "Bearer {token}" }
Body: {
  "bookingId": "book-123",
  "revieweeId": "user-456",
  "rating": 5,
  "comment": "Excellent work! Very professional.",
  "category": "communication" | "quality" | "timeliness"
}
Response: {
  "reviewId": "review-789",
  "rating": 5,
  "createdAt": "2024-02-01T10:00:00Z"
}

# Get Reviews for User
GET /api/v1/reviews/user/:userId?limit=20&offset=0
Response: {
  "reviews": [ ... ],
  "total": 45,
  "averageRating": 4.8,
  "ratingDistribution": {
    "5": 40,
    "4": 3,
    "3": 2,
    "2": 0,
    "1": 0
  }
}

# Get Single Review
GET /api/v1/reviews/:reviewId
Response: { ... review details ... }

# Update Review
PUT /api/v1/reviews/:reviewId
Headers: { "Authorization": "Bearer {token}" }
Body: { "rating": 4, "comment": "Updated comment" }
Response: { "success": true }

# Get Review Statistics
GET /api/v1/reviews/stats/:userId
Response: {
  "averageRating": 4.8,
  "totalReviews": 45,
  "fiveStarCount": 40,
  "fourStarCount": 3,
  "threeStarCount": 2,
  "twoStarCount": 0,
  "oneStarCount": 0
}
```

---

### 9. Search Service (Port 3015)

**Purpose:** Full-text search via Elasticsearch

#### Endpoints

```bash
# Search Workers
POST /api/v1/search/workers
Body: {
  "query": "javascript",
  "skills": ["JavaScript", "React"],
  "minRate": 50,
  "maxRate": 150,
  "minRating": 4.0,
  "location": "San Francisco",
  "availability": "available",
  "limit": 20,
  "offset": 0
}
Response: {
  "workers": [
    {
      "id": "worker-123",
      "name": "John Doe",
      "title": "Full Stack Developer",
      "skills": ["JavaScript", "React", "Node.js"],
      "rating": 4.8,
      "hourlyRate": 75,
      "_score": 9.5
    }
  ],
  "total": 450,
  "limit": 20,
  "offset": 0
}

# Search Projects
POST /api/v1/search/projects
Body: {
  "query": "mobile app",
  "category": "mobile-development",
  "minBudget": 1000,
  "maxBudget": 10000,
  "skills": ["React Native", "iOS"],
  "limit": 20,
  "offset": 0
}
Response: {
  "projects": [ ... ],
  "total": 125
}

# Get Search Suggestions
GET /api/v1/search/suggest?q=java&field=skills
Response: {
  "suggestions": [
    "java",
    "javascript",
    "java spring boot",
    "java microservices"
  ]
}
```

---

### 10. Dispute Service (Port 3013)

**Purpose:** Dispute management and resolution

#### Endpoints

```bash
# Create Dispute
POST /api/v1/disputes
Headers: { "Authorization": "Bearer {token}" }
Body: {
  "bookingId": "book-123",
  "reason": "Work not completed as agreed",
  "description": "Detailed description of the dispute",
  "evidence": ["url1", "url2"]
}
Response: {
  "disputeId": "dispute-456",
  "status": "open",
  "createdAt": "2024-02-01T10:00:00Z"
}

# Get Dispute
GET /api/v1/disputes/:disputeId
Headers: { "Authorization": "Bearer {token}" }
Response: {
  "id": "dispute-456",
  "bookingId": "book-123",
  "initiatorId": "user-789",
  "respondentId": "user-456",
  "reason": "Work not completed as agreed",
  "status": "open" | "resolved" | "closed",
  "evidence": [ ... ],
  "createdAt": "2024-02-01T10:00:00Z"
}

# Add Evidence to Dispute
POST /api/v1/disputes/:disputeId/evidence
Headers: { "Authorization": "Bearer {token}" }
Body: {
  "type": "image" | "document" | "text",
  "content": "url or text content",
  "description": "What this evidence shows"
}
Response: { "success": true }

# Resolve Dispute
POST /api/v1/disputes/:disputeId/resolve
Headers: { "Authorization": "Bearer {token}" }
Body: {
  "resolution": "full_refund" | "partial_refund" | "no_refund",
  "refundAmount": 2500,
  "notes": "Resolution notes"
}
Response: { "success": true }
```

---

### 11. Notification Service (Port 3006)

**Purpose:** Push notifications, alerts, email

#### Endpoints

```bash
# Get Notifications
GET /api/v1/notifications?limit=20&offset=0&unreadOnly=false
Headers: { "Authorization": "Bearer {token}" }
Response: {
  "notifications": [
    {
      "id": "notif-123",
      "type": "booking_confirmed" | "message" | "payment" | "review",
      "title": "Booking Confirmed",
      "message": "Your booking with John has been confirmed",
      "data": { ... },
      "read": false,
      "createdAt": "2024-02-01T10:00:00Z"
    }
  ],
  "total": 45,
  "unreadCount": 3
}

# Mark Notification as Read
PUT /api/v1/notifications/:notificationId/read
Headers: { "Authorization": "Bearer {token}" }
Response: { "success": true }

# Mark All as Read
PUT /api/v1/notifications/read-all
Headers: { "Authorization": "Bearer {token}" }
Response: { "success": true }

# Delete Notification
DELETE /api/v1/notifications/:notificationId
Headers: { "Authorization": "Bearer {token}" }
Response: { "success": true }

# Update Notification Preferences
PUT /api/v1/notifications/preferences
Headers: { "Authorization": "Bearer {token}" }
Body: {
  "emailNotifications": true,
  "pushNotifications": true,
  "bookingNotifications": true,
  "messageNotifications": true,
  "paymentNotifications": true,
  "reviewNotifications": true
}
Response: { "success": true }
```

---

### 12. Escrow Service (Port 3012)

**Purpose:** Payment escrow, fund management

#### Endpoints

```bash
# Create Escrow Account
POST /api/v1/escrow
Headers: { "Authorization": "Bearer {token}" }
Body: {
  "bookingId": "book-123",
  "clientId": "user-456",
  "workerId": "worker-789",
  "amount": 5000,
  "currency": "USD"
}
Response: {
  "escrowId": "escrow-101",
  "status": "active",
  "createdAt": "2024-02-01T10:00:00Z"
}

# Get Escrow Account
GET /api/v1/escrow/:escrowId
Headers: { "Authorization": "Bearer {token}" }
Response: {
  "id": "escrow-101",
  "bookingId": "book-123",
  "amount": 5000,
  "status": "active" | "released" | "refunded" | "frozen",
  "createdAt": "2024-02-01T10:00:00Z"
}

# Release Escrow Funds
POST /api/v1/escrow/:escrowId/release
Headers: { "Authorization": "Bearer {token}" }
Body: { "reason": "Work completed successfully" }
Response: { "success": true, "transaction": { ... } }

# Freeze Escrow (for Dispute)
POST /api/v1/escrow/:escrowId/freeze
Headers: { "Authorization": "Bearer {token}" }
Body: { "reason": "Dispute raised" }
Response: { "success": true }

# Refund Escrow
POST /api/v1/escrow/:escrowId/refund
Headers: { "Authorization": "Bearer {token}" }
Body: { "reason": "Booking cancelled" }
Response: { "success": true }
```

---

## Authentication & Authorization

### JWT Token Structure

```
Header:
{
  "alg": "HS256",
  "typ": "JWT"
}

Payload:
{
  "userId": "user-123",
  "email": "user@example.com",
  "role": "worker" | "client" | "admin",
  "iat": 1706777400,
  "exp": 1706863800  // Expires in 24 hours
}

Signature: HMACSHA256(base64UrlEncode(header) + "." + base64UrlEncode(payload), secret)
```

### Adding Authentication to Requests

```javascript
// JavaScript/React Example
const token = localStorage.getItem('authToken');

const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

const response = await fetch('http://localhost:3001/api/v1/users/123', {
  method: 'GET',
  headers: headers
});
```

### Role-Based Access Control (RBAC)

```
Admin: Can access all endpoints
Worker: Can access worker-specific endpoints
Client: Can access client-specific endpoints

Example:
- POST /projects: Client only
- POST /bookings: Client only
- PUT /workers/:id/profile: Worker only
```

### Refresh Token Flow

```
1. User logs in, gets access token (24 hours) + refresh token (30 days)
2. Access token expires
3. Use refresh token to get new access token
4. Refresh token expires → User must log in again

POST /api/v1/auth/refresh
Headers: { "Authorization": "Bearer {refreshToken}" }
Response: {
  "token": "new-access-token",
  "refreshToken": "new-refresh-token"
}
```

---

## Database Models

### Core User Model

```javascript
{
  id: String (UUID),
  email: String (unique),
  password: String (hashed),
  firstName: String,
  lastName: String,
  avatar: String (URL),
  bio: String,
  phone: String,
  userType: "worker" | "client",
  isActive: Boolean,
  emailVerified: Boolean,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Worker Profile Model

```javascript
{
  id: String,
  userId: String (foreign key),
  title: String,
  bio: String,
  skills: Array<String>,
  hourlyRate: Number,
  currency: String,
  averageRating: Number (0-5),
  totalReviews: Number,
  completedProjects: Number,
  portfolio: Array<{
    title: String,
    description: String,
    imageUrl: String,
    projectUrl: String,
    technologies: Array<String>
  }>,
  availability: "available" | "unavailable",
  responseTime: String,
  location: String,
  timezone: String,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Project Model

```javascript
{
  id: String,
  clientId: String (foreign key),
  title: String,
  description: String,
  budget: Number,
  currency: String,
  category: String,
  skills: Array<String>,
  status: "open" | "in_progress" | "completed" | "cancelled",
  startDate: Date,
  deadline: Date,
  attachments: Array<String>,
  bids: Array<String> (bid IDs),
  selectedWorkerId: String,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Booking Model

```javascript
{
  id: String,
  projectId: String,
  clientId: String,
  workerId: String,
  startDate: Date,
  endDate: Date,
  hourlyRate: Number,
  totalHours: Number,
  totalAmount: Number,
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled",
  payment: {
    escrowId: String,
    status: "pending" | "released" | "refunded"
  },
  review: {
    clientReview: String (review ID),
    workerReview: String (review ID)
  },
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

---

## Common Response Formats

### Success Response (2xx)

```javascript
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}

// List Response
{
  "success": true,
  "data": [
    { ... },
    { ... }
  ],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

### Error Response (4xx, 5xx)

```javascript
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "email": "Invalid email format",
      "password": "Password must be at least 8 characters"
    }
  }
}

// Single field error
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "User not found"
  }
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate email, etc. |
| 422 | Unprocessable Entity | Validation error |
| 500 | Server Error | Internal server error |
| 503 | Service Unavailable | Service temporarily down |

### Error Codes Reference

```
AUTH_ERRORS:
- INVALID_CREDENTIALS: Email or password incorrect
- TOKEN_EXPIRED: JWT token has expired
- TOKEN_INVALID: JWT token is invalid
- USER_NOT_FOUND: User doesn't exist
- USER_ALREADY_EXISTS: Email already registered

VALIDATION_ERRORS:
- INVALID_EMAIL: Email format incorrect
- INVALID_PASSWORD: Password doesn't meet requirements
- REQUIRED_FIELD: Required field missing
- INVALID_TYPE: Field type mismatch

AUTHORIZATION_ERRORS:
- INSUFFICIENT_PERMISSIONS: User lacks required role
- OWNER_ONLY: Only owner can perform this action
- NOT_FOUND: Resource not found or inaccessible

PAYMENT_ERRORS:
- INSUFFICIENT_BALANCE: Not enough funds
- PAYMENT_FAILED: Payment processing failed
- STRIPE_ERROR: Stripe API error

DISPUTE_ERRORS:
- DISPUTE_ALREADY_EXISTS: Dispute already open
- BOOKING_NOT_FOUND: Associated booking missing
```

### Error Handling in Frontend

```javascript
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle specific error codes
      if (response.status === 401) {
        // Token expired, redirect to login
        clearToken();
        window.location.href = '/login';
      }
      
      console.error('API Error:', data.error.code, data.error.message);
      throw new Error(data.error.message);
    }

    return data.data;
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
}
```

---

## Integration Examples

### React Component Example - User Profile

```javascript
import React, { useState, useEffect } from 'react';

export function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(
          `${process.env.REACT_APP_USER_SERVICE}/api/v1/users/${userId}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
          }
        );

        if (!response.ok) throw new Error('Failed to fetch user');
        const data = await response.json();
        setUser(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>{user.firstName} {user.lastName}</h1>
      <p>{user.bio}</p>
      <img src={user.avatar} alt={user.firstName} />
    </div>
  );
}
```

### React Hook for API Calls

```javascript
import { useState, useEffect } from 'react';

export function useApi(url, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json',
            ...options.headers
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();
        setData(result.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url]);

  return { data, loading, error };
}

// Usage
const { data: user, loading, error } = useApi('/api/v1/users/123');
```

### Axios Setup Example

```javascript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
apiClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Handle responses
apiClient.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      // Handle token expiration
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

## Development Setup

### Frontend Prerequisites

```bash
# Install Node.js 18+
node --version  # v18.x.x or higher

# Install package manager (npm or yarn)
npm --version
yarn --version
```

### Local Development Environment

```bash
# 1. Clone frontend repo
git clone https://github.com/yourusername/tulifo-gig-frontend.git
cd tulifo-gig-frontend

# 2. Install dependencies
npm install
# or
yarn install

# 3. Create .env.local file
cat > .env.local << EOF
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_AUTH_SERVICE=http://localhost:3001
REACT_APP_USER_SERVICE=http://localhost:3002
REACT_APP_PROJECT_SERVICE=http://localhost:3003
REACT_APP_PAYMENT_SERVICE=http://localhost:3004
REACT_APP_MESSAGE_SERVICE=http://localhost:3005
REACT_APP_NOTIFICATION_SERVICE=http://localhost:3006
REACT_APP_BOOKING_SERVICE=http://localhost:3007
REACT_APP_MATCHING_SERVICE=http://localhost:3008
REACT_APP_SESSION_SERVICE=http://localhost:3009
REACT_APP_WORKER_SERVICE=http://localhost:3010
REACT_APP_CLIENT_SERVICE=http://localhost:3011
REACT_APP_ESCROW_SERVICE=http://localhost:3012
REACT_APP_DISPUTE_SERVICE=http://localhost:3013
REACT_APP_REVIEW_SERVICE=http://localhost:3014
REACT_APP_SEARCH_SERVICE=http://localhost:3015
EOF

# 4. Start backend services (in separate terminal)
cd ../tulifo-gig-backend
docker-compose up -d

# 5. Verify backend is running
bash scripts/verify-services.sh

# 6. Start frontend development server
cd ../tulifo-gig-frontend
npm start
# or
yarn start
```

### Testing Backend Services

```bash
# Check if all services are healthy
curl -s http://localhost:3001/health | jq .

# Test authentication
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }' | jq .

# Test search
curl -X POST http://localhost:3015/api/v1/search/workers \
  -H "Content-Type: application/json" \
  -d '{
    "query": "javascript",
    "skills": ["JavaScript", "React"],
    "limit": 10
  }' | jq .
```

---

## Key Features to Implement

### Authentication Flow
- [ ] Login page
- [ ] Registration page
- [ ] Token storage (localStorage/sessionStorage)
- [ ] Token refresh mechanism
- [ ] Protected routes
- [ ] Logout functionality

### User Profiles
- [ ] View user profile
- [ ] Edit profile
- [ ] Upload avatar
- [ ] Worker profile with portfolio
- [ ] Client profile with project history

### Project Management
- [ ] Create new project
- [ ] List projects with filters
- [ ] Project details page
- [ ] Edit project
- [ ] Delete project
- [ ] Browse worker bids

### Booking & Scheduling
- [ ] View worker availability
- [ ] Create booking
- [ ] Manage bookings (view, cancel, complete)
- [ ] Booking confirmation

### Messaging
- [ ] View conversations
- [ ] Send/receive messages
- [ ] Real-time notifications
- [ ] Message history

### Reviews & Ratings
- [ ] Submit review after booking
- [ ] View user ratings
- [ ] Rating distribution chart

### Search & Discovery
- [ ] Search workers
- [ ] Filter by skills, rate, rating
- [ ] Search projects
- [ ] Browse suggestions

### Payments
- [ ] Integrate Stripe payment
- [ ] Payment history
- [ ] Wallet balance
- [ ] Refund requests

---

## Testing Checklist

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

### Manual Testing Checklist

- [ ] User can register
- [ ] User can login
- [ ] User profile updates
- [ ] Can create project
- [ ] Can search workers
- [ ] Can place bid
- [ ] Can create booking
- [ ] Can send message
- [ ] Can submit review
- [ ] Can process payment
- [ ] Error messages display correctly
- [ ] Token refresh works
- [ ] Logout clears session

---

## Performance Optimization

### Frontend Best Practices

```javascript
// 1. Lazy load routes
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));

// 2. Memoize components
const UserCard = memo(({ user }) => (
  <div>{user.name}</div>
));

// 3. Use useCallback for functions
const handleSearch = useCallback((query) => {
  searchUsers(query);
}, []);

// 4. Optimize images
<img src={url} alt="User" loading="lazy" />

// 5. Debounce search input
const debouncedSearch = debounce((query) => {
  performSearch(query);
}, 300);
```

### API Call Optimization

```javascript
// 1. Cache responses
const cache = new Map();

// 2. Request deduplication
let pendingRequest = null;

// 3. Pagination
GET /api/v1/projects?limit=20&offset=0

// 4. Conditional requests
If-Modified-Since header
```

---

## Deployment Checklist

### Before Deploying to Production

- [ ] All tests passing
- [ ] No console errors
- [ ] No console warnings
- [ ] Environment variables configured
- [ ] API endpoints verified
- [ ] Error handling implemented
- [ ] Loading states handled
- [ ] Responsive design tested
- [ ] Cross-browser compatibility checked
- [ ] Performance metrics acceptable
- [ ] Security headers configured
- [ ] CORS properly configured

### Production Environment Variables

```env
REACT_APP_API_BASE_URL=https://api.tulifo-gig.com
REACT_APP_AUTH_SERVICE=https://api.tulifo-gig.com:3001
... (all services URLs)
```

---

## Support & Documentation

### Additional Resources

- **API Docs:** `http://localhost:9090` (Prometheus metrics)
- **Logs:** `http://localhost:5601` (Kibana)
- **Monitoring:** `http://localhost:3000` (Grafana)
- **Backend Repo:** https://github.com/yourusername/tulifo-gig-backend

### Common Issues & Solutions

**Issue:** CORS errors
```javascript
// Solution: Ensure CORS is enabled in Kong
// Set correct origin in CORS headers
```

**Issue:** Token expired
```javascript
// Solution: Implement refresh token flow
// Auto-refresh when getting 401
```

**Issue:** Slow API responses
```javascript
// Solution: Implement pagination
// Add caching where appropriate
// Use Elasticsearch for search
```

---

## Contact & Support

**Backend Team:** backend@tulifo-gig.com  
**API Issues:** Create issue on GitHub  
**Documentation:** Refer to inline API comments  

---

**Last Updated:** February 1, 2026  
**Status:** ✅ Production Ready  
**All Services Operational:** 100% (15/15 microservices + 6 infrastructure services)
