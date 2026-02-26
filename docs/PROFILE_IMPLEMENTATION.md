# Backend Profile Implementation Guide

## Overview
This guide covers implementing the backend services to handle worker and client profile creation, retrieval, and updates.

---

## 🏗️ Architecture Overview

```
Frontend (Next.js)
    ↓ POST /api/auth/profile
API Gateway (Next.js Route)
    ↓ Forwards to auth-service:3001
Auth Service (Node.js)
    ↓ Routes by role
    ├─→ Worker Profile Service (save WorkerProfile)
    ├─→ Client Profile Service (save ClientProfile)
    └─→ Both services persist to PostgreSQL
```

---

## 📦 Backend Endpoints to Implement

### 1. Create/Update Profile (Frontend calls this)

**Endpoint:** `POST /api/auth/profile`  
**Service:** Auth Service  
**Authentication:** Required (JWT)

```typescript
// Request Structure
{
  "role": "worker" | "client",
  "profileData": {
    // worker or client specific fields
  }
}

// Response
{
  "success": boolean,
  "message": string,
  "data": {
    "userId": string,
    "profileId": string,
    "role": "worker" | "client",
    "completedAt": timestamp
  }
}
```

### 2. Get Worker Profile

**Endpoint:** `GET /api/profiles/worker/:userId`  
**Service:** Worker Profile Service  
**Authentication:** Optional (public profiles)

```typescript
// Response
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "title": string,
    "bio": string,
    "skills": string[],
    "hourlyRate": number,
    "availability": string,
    "rating": number,
    "completedJobs": number,
    "createdAt": timestamp
  }
}
```

### 3. Get Client Profile

**Endpoint:** `GET /api/profiles/client/:userId`  
**Service:** Client Profile Service  
**Authentication:** Optional (public profiles)

```typescript
// Response
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "companyName": string,
    "industry": string,
    "budgetRange": string,
    "projectsPosted": number,
    "totalSpent": number,
    "verificationStatus": "pending" | "verified",
    "createdAt": timestamp
  }
}
```

### 4. Update Profile

**Endpoint:** `PUT /api/profiles/:role/:userId`  
**Service:** Respective Profile Service  
**Authentication:** Required (JWT)

```typescript
// Allows partial updates - only send fields to change
{
  "title": "New Title",
  "hourlyRate": 95
  // ... other fields
}
```

---

## 🗄️ Database Schema

### Worker Profile Table

```sql
CREATE TABLE worker_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  bio TEXT,
  location VARCHAR(100),
  country VARCHAR(100),
  timezone VARCHAR(100),
  skills TEXT[] DEFAULT '{}',
  languages TEXT[] DEFAULT '{}',
  hourly_rate DECIMAL(10, 2),
  currency VARCHAR(10) DEFAULT 'USD',
  availability VARCHAR(50),
  hours_per_week INTEGER,
  preferred_work_types TEXT[] DEFAULT '{}',
  
  -- Metrics
  rating DECIMAL(3, 2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  completed_jobs INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_worker_profiles_user_id ON worker_profiles(user_id);
CREATE INDEX idx_worker_profiles_skills ON worker_profiles USING GIN(skills);
CREATE INDEX idx_worker_profiles_availability ON worker_profiles(availability);
```

### Client Profile Table

```sql
CREATE TABLE client_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  company_name VARCHAR(255) NOT NULL,
  company_size VARCHAR(50),
  industry VARCHAR(100),
  company_description TEXT,
  location VARCHAR(100),
  country VARCHAR(100),
  timezone VARCHAR(100),
  budget_range VARCHAR(50),
  preferred_contract_types TEXT[] DEFAULT '{}',
  
  -- Contact
  business_email VARCHAR(255),
  business_phone VARCHAR(20),
  
  -- Verification
  verification_status VARCHAR(50) DEFAULT 'pending',
  verification_code VARCHAR(255),
  verified_at TIMESTAMP,
  
  -- Metrics
  projects_posted INTEGER DEFAULT 0,
  total_spent DECIMAL(15, 2) DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_client_profiles_user_id ON client_profiles(user_id);
CREATE INDEX idx_client_profiles_industry ON client_profiles(industry);
CREATE INDEX idx_client_profiles_verification ON client_profiles(verification_status);
```

---

## 💻 Implementation Examples

### Worker Profile Service (Node.js/Express)

```typescript
// services/worker-profile.service.ts
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { validateWorkerProfile } from '../validators/profile.validator';

const router = Router();
const prisma = new PrismaClient();

// POST: Create Worker Profile
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId } = req.user; // from JWT middleware
    const profileData = req.body;

    // Validate data
    const validated = validateWorkerProfile(profileData);
    if (!validated.success) {
      return res.status(400).json({
        success: false,
        errors: validated.errors
      });
    }

    // Check if profile already exists
    const existingProfile = await prisma.workerProfile.findUnique({
      where: { user_id: userId }
    });

    if (existingProfile) {
      // Update existing
      const updated = await prisma.workerProfile.update({
        where: { user_id: userId },
        data: profileData,
        include: { user: { select: { email: true, name: true } } }
      });

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: updated
      });
    }

    // Create new
    const newProfile = await prisma.workerProfile.create({
      data: {
        user_id: userId,
        ...profileData
      },
      include: { user: { select: { email: true, name: true } } }
    });

    // Emit event: profile.created
    eventBus.emit('profile:created', {
      userId,
      role: 'worker',
      profileId: newProfile.id
    });

    res.status(201).json({
      success: true,
      message: 'Profile created successfully',
      data: newProfile
    });
  } catch (error) {
    console.error('Error creating worker profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create profile',
      error: error.message
    });
  }
});

// GET: Fetch Worker Profile
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const profile = await prisma.workerProfile.findUnique({
      where: { user_id: userId },
      select: {
        id: true,
        title: true,
        bio: true,
        location: true,
        country: true,
        timezone: true,
        skills: true,
        languages: true,
        hourly_rate: true,
        currency: true,
        availability: true,
        completed_jobs: true,
        rating: true,
        review_count: true,
        is_available: true,
        created_at: true,
        user: {
          select: { name: true, avatar_url: true }
        }
      }
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
});

// PUT: Update Worker Profile
router.put('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { userId: tokenUserId } = req.user;

    // Auth: Only owner can update
    if (userId !== tokenUserId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const updated = await prisma.workerProfile.update({
      where: { user_id: userId },
      data: req.body,
      include: { user: { select: { email: true } } }
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

export default router;
```

### Client Profile Service (Node.js/Express)

```typescript
// services/client-profile.service.ts
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { validateClientProfile } from '../validators/profile.validator';

const router = Router();
const prisma = new PrismaClient();

// POST: Create Client Profile
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId } = req.user;
    const profileData = req.body;

    // Validate
    const validated = validateClientProfile(profileData);
    if (!validated.success) {
      return res.status(400).json({
        success: false,
        errors: validated.errors
      });
    }

    // Check existing
    const existingProfile = await prisma.clientProfile.findUnique({
      where: { user_id: userId }
    });

    if (existingProfile) {
      const updated = await prisma.clientProfile.update({
        where: { user_id: userId },
        data: profileData
      });

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: updated
      });
    }

    // Create new
    const newProfile = await prisma.clientProfile.create({
      data: {
        user_id: userId,
        ...profileData,
        verification_status: 'pending'
      }
    });

    // Emit event
    eventBus.emit('profile:created', {
      userId,
      role: 'client',
      profileId: newProfile.id
    });

    // Send verification email
    await sendVerificationEmail(profileData.business_email, userId);

    res.status(201).json({
      success: true,
      message: 'Profile created successfully. Check your email for verification.',
      data: newProfile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create profile'
    });
  }
});

// GET: Fetch Client Profile
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const profile = await prisma.clientProfile.findUnique({
      where: { user_id: userId },
      select: {
        id: true,
        company_name: true,
        industry: true,
        company_description: true,
        location: true,
        country: true,
        budget_range: true,
        verification_status: true,
        projects_posted: true,
        total_spent: true,
        created_at: true,
        user: {
          select: { name: true, avatar_url: true }
        }
      }
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
});

export default router;
```

---

## 🔗 Integration Points

### Update Auth Service Routes

```typescript
// auth-service/src/routes/index.ts
import workerProfileRoutes from './profiles/worker';
import clientProfileRoutes from './profiles/client';

router.use('/api/profiles/worker', workerProfileRoutes);
router.use('/api/profiles/client', clientProfileRoutes);

// Main profile endpoint (routes by role)
router.post('/api/profiles', authenticateJWT, async (req, res) => {
  const { role } = req.body;
  
  if (role === 'worker') {
    // Forward to worker profile service
    return axios.post(`${WORKER_SERVICE_URL}/api/profiles`, req.body);
  } else if (role === 'client') {
    // Forward to client profile service
    return axios.post(`${CLIENT_SERVICE_URL}/api/profiles`, req.body);
  }
});
```

---

## ✅ Validation Rules (Backend)

### Worker Profile Validation

```typescript
import { z } from 'zod';

export const WorkerProfileSchema = z.object({
  title: z.string().min(2).max(100),
  bio: z.string().min(20).max(500).optional(),
  location: z.string().min(2).max(50),
  country: z.string().min(2).max(50),
  timezone: z.string().refine(isValidTimezone, 'Invalid timezone'),
  skills: z.array(z.string()).min(1).max(50),
  languages: z.array(z.string()).min(1).max(10),
  hourlyRate: z.number().min(5).max(5000),
  currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD']),
  availability: z.enum(['Full-time', 'Part-time', 'As Needed']),
  hoursPerWeek: z.number().min(1).max(168),
  preferredWorkTypes: z.array(z.string()).min(1)
});

export function validateWorkerProfile(data) {
  try {
    WorkerProfileSchema.parse(data);
    return { success: true };
  } catch (error) {
    return { success: false, errors: error.errors };
  }
}
```

### Client Profile Validation

```typescript
export const ClientProfileSchema = z.object({
  companyName: z.string().min(2).max(100),
  companySize: z.enum(['1-10', '11-50', '51-200', '201-500', '500+']),
  industry: z.string().min(2),
  companyDescription: z.string().min(20).max(500),
  location: z.string().min(2).max(50),
  country: z.string().min(2).max(50),
  timezone: z.string().refine(isValidTimezone, 'Invalid timezone'),
  budgetRange: z.enum(['<$5k', '$5k-$10k', '$10k-$25k', '$25k-$50k', '$50k+']),
  preferredContractTypes: z.array(z.string()).min(1),
  businessEmail: z.string().email(),
  businessPhone: z.string().min(5)
});

export function validateClientProfile(data) {
  try {
    ClientProfileSchema.parse(data);
    return { success: true };
  } catch (error) {
    return { success: false, errors: error.errors };
  }
}
```

---

## 📡 Event-Driven Updates

### Profile Created Event

```typescript
// Emit when profile is created
eventBus.emit('profile:created', {
  userId: string,
  role: 'worker' | 'client',
  profileId: string,
  timestamp: Date
});

// Listeners
eventBus.on('profile:created', async (event) => {
  // 1. Update search index
  await searchService.indexProfile(event);
  
  // 2. Send welcome email
  await emailService.sendWelcomeEmail(event.userId, event.role);
  
  // 3. Update user status
  await userService.updateProfileStatus(event.userId, 'completed');
  
  // 4. Log onboarding event
  await analyticsService.track('profile_completed', event);
});
```

---

## 🧪 Testing Profile Endpoints

### Test Worker Profile Creation

```bash
curl -X POST http://localhost:3001/api/profiles \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "worker",
    "title": "Full Stack Developer",
    "bio": "10+ years of experience in web development",
    "location": "San Francisco",
    "country": "United States",
    "timezone": "US/Pacific",
    "skills": ["JavaScript", "React", "Node.js", "PostgreSQL"],
    "languages": ["English"],
    "hourlyRate": 85,
    "currency": "USD",
    "availability": "Full-time",
    "hoursPerWeek": 40,
    "preferredWorkTypes": ["Remote"]
  }'
```

### Test Client Profile Creation

```bash
curl -X POST http://localhost:3001/api/profiles \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "client",
    "companyName": "TechStartup Inc",
    "companySize": "11-50",
    "industry": "Technology",
    "companyDescription": "AI-powered analytics platform for enterprises",
    "location": "New York",
    "country": "United States",
    "timezone": "US/Eastern",
    "budgetRange": "$25k-$50k",
    "preferredContractTypes": ["Hourly Contract", "Retainer"],
    "businessEmail": "hire@techstartup.com",
    "businessPhone": "+1-555-0100"
  }'
```

---

## 📋 Checklist

- [ ] Create worker_profiles table
- [ ] Create client_profiles table
- [ ] Implement worker profile endpoints (POST, GET, PUT)
- [ ] Implement client profile endpoints (POST, GET, PUT)
- [ ] Add validation schemas
- [ ] Add authentication middleware
- [ ] Implement event emitters
- [ ] Add profile event listeners
- [ ] Test all endpoints
- [ ] Add database migrations
- [ ] Update Docker Compose if needed
- [ ] Deploy changes
