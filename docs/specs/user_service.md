# Technical Specification: User Service

**Service Name**: `user-service`
**Repository**: `tulifo-gig-backend/apps/user-service`
**Language**: Node.js (TypeScript)
**Framework**: Express.js
**Database**: MongoDB (via Mongoose) or PostgreSQL (shared) - *Decision: MongoDB for flexible profiles*
**Port**: 3002

## 1. Responsibilities
- User Profile Management (Worker & Client details)
- Skills & Portfolio Management
- Worker Availability (Basic metadata, actual slots in Booking)
- KyC Status Tracking

## 2. Database Schema (MongoDB)

```typescript
// User Profile Collection
interface UserProfile {
  userId: string; // References Auth Service ID
  email: string;
  fullName: string;
  role: 'worker' | 'client';
  bio?: string;
  skills: string[]; // e.g., ["React", "Go"]
  hourlyRate?: number;
  verificationStatus: 'none' | 'pending' | 'verified';
  location?: {
    city: string;
    country: string;
    timezone: string;
  };
  createdAt: Date;
}
```

## 3. API Endpoints

### Public
- `GET /users/:id` - Get public profile
- `GET /users/search` - Search workers by skill/location

### Private (Authenticated)
- `POST /users/profile` - Create/Update profile
- `POST /users/verification/request` - Submit KYC
- `GET /users/me` - Get own profile

## 4. Project Structure (Standard)
Matches Auth Service structure.
```
src/
├── models/         # Mongoose models
├── controllers/
├── routes/
├── services/
└── index.ts
```
