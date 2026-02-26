# Backend Implementation Guide - Dual Client Type Onboarding

## Overview

This guide documents the complete backend implementation for supporting both individual and business clients in the onboarding system.

## Architecture

### Microservices Flow

```
Frontend (Next.js)
  ↓
POST /api/auth/profile (Auth Service)
  ↓
POST /api/clients/:userId/profile (Client Service)
  ↓
PostgreSQL (client_profiles table)
```

## Database Schema Changes

### Client Profiles Table

The `client_profiles` table has been updated to support both individual and business clients:

```
client_profiles
├── id (serial, PK)
├── user_id (integer, FK to users)
├── client_type (enum: 'individual' | 'business') ✨ NEW
│
├── Contact Fields (Individual & Business)
├── contact_name (varchar, 255)
├── business_email (varchar, 255)
├── business_phone (varchar, 20)
│
├── Company Fields (Business Only)
├── company_name (varchar, 255)
├── company_size (varchar, 50)
├── industry (varchar, 100)
├── company_description (text)
│
├── Location & Preferences (Shared)
├── location (varchar, 255)
├── country (varchar, 100)
├── timezone (varchar, 50)
├── budget_range (varchar, 50)
├── preferred_contract_types (jsonb array)
│
├── Legacy Fields
├── website (varchar, 255)
├── verified (integer, default 0)
├── verification_status (varchar, 50, default 'pending')
├── projects_posted (integer, default 0)
│
└── Timestamps
    ├── created_at (timestamp, default NOW())
    └── updated_at (timestamp, default NOW())
```

## API Endpoints

### 1. Auth Service - Profile Completion

**Endpoint**: `POST /api/auth/profile`

**Authentication**: Required (Bearer token)

**Request Body**:
```json
{
  "role": "client",
  "clientType": "individual" | "business",
  
  "contactName": "string (2-255 chars)",
  "businessEmail": "email",
  "businessPhone": "string (5+ chars)",
  
  "companyName": "string (optional for individual)",
  "companySize": "1-10" | "11-50" | "51-200" | "201-500" | "500+",
  "industry": "string (optional for individual)",
  "companyDescription": "string (20-500 chars, optional for individual)",
  
  "location": "string (2+ chars)",
  "country": "string (2+ chars)",
  "timezone": "UTC" | "US/Eastern" | etc,
  "budgetRange": "<$5k" | "$5k-$10k" | "$10k-$25k" | "$25k-$50k" | "$50k+",
  "preferredContractTypes": ["One-time Project", "Hourly Contract", ...],
  
  "verificationCode": "string (optional)"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": 123,
    "userId": 1,
    "clientType": "individual",
    "contactName": "John Doe",
    "businessEmail": "john@example.com",
    "businessPhone": "+1-555-0100",
    "location": "San Francisco",
    "country": "United States",
    "timezone": "US/Pacific",
    "budgetRange": "$5k-$10k",
    "preferredContractTypes": ["One-time Project", "Hourly Contract"],
    "verificationStatus": "pending",
    "createdAt": "2026-02-26T...",
    "updatedAt": "2026-02-26T..."
  }
}
```

**Validation Rules**:
- `clientType` is required
- For business: `companyName`, `industry`, `companyDescription` are required
- For individual: company fields are optional
- `location`, `country`, `timezone`, `budgetRange` required for both
- At least one `preferredContractType` required

### 2. Client Service - Save Profile

**Endpoint**: `POST /api/clients/:userId/profile`

**Authentication**: Required (Bearer token - from auth service)

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**: Same as auth service endpoint

**Response**: Same as auth service endpoint

## Database Migrations

### Migration File: `0001_add_client_type.sql`

This migration:
1. Creates `client_type` ENUM type
2. Adds `client_type` column to `client_profiles`
3. Adds individual-specific fields
4. Renames existing columns for clarity
5. Adds shared fields
6. Adds verification status
7. Creates indexes for performance

**Run migration**:
```bash
# Using Drizzle ORM
pnpm run db:push

# Or manually
psql -U postgres -d tulifo_gig < apps/client-service/src/db/migrations/0001_add_client_type.sql
```

## Code Changes

### Auth Service (`apps/auth-service/src/routes/auth.routes.ts`)

**New Endpoint**: `POST /api/auth/profile`

```typescript
router.post('/profile', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  // 1. Validate client profile schema
  // 2. Call client-service to save profile
  // 3. Return profile data
  // 4. Audit log
});
```

**Validation Schema**:
```typescript
const clientProfileSchema = z.object({
  role: z.literal('client'),
  clientType: z.enum(['individual', 'business']),
  contactName: z.string().min(2).optional(),
  businessEmail: z.string().email().optional(),
  businessPhone: z.string().min(5).optional(),
  companyName: z.string().min(2).optional(),
  // ... other fields
}).refine((data) => {
  // Business requires company fields
  if (data.clientType === 'business') {
    return data.companyName && data.industry && data.companyDescription;
  }
  return true;
}, {
  message: 'Company information required for business clients',
  path: ['companyName'],
});
```

### Client Service (`apps/client-service/src/services/client.service.ts`)

**New Method**: `saveProfile(pgPool, userId, profileData)`

This method:
1. Checks if profile exists
2. Updates or inserts profile record
3. Converts contract types array to JSON for storage
4. Returns normalized profile response
5. Handles null values for optional fields

```typescript
async saveProfile(pgPool: Pool, userId: string, profileData: any) {
  // Insert or update client profile in PostgreSQL
  // Returns normalized profile object
}
```

### Client Controller (`apps/client-service/src/controllers/client.controller.ts`)

**New Method**: `saveProfile`

```typescript
saveProfile = async (req: any, res: Response) => {
  const { id } = req.params;
  const profileData = req.body;
  // Save profile via service
  // Return 201 Created response
}
```

### Client Routes (`apps/client-service/src/routes/client.routes.ts`)

**New Route**:
```typescript
router.post('/:id/profile', controller.saveProfile);
```

## Service Communication

### Inter-Service Call Flow

```
1. Frontend calls: POST /api/auth/profile
   ├─ Headers: Authorization: Bearer <token>
   └─ Body: Client profile data

2. Auth Service validates request
   ├─ Authenticate user
   ├─ Validate profile schema
   └─ Call Client Service

3. Auth Service → Client Service
   ├─ POST http://localhost:3002/api/clients/:userId/profile
   ├─ Headers: Authorization: Bearer <token>
   └─ Same body data

4. Client Service saves to PostgreSQL
   ├─ Check if profile exists
   ├─ Insert or update
   └─ Return normalized response

5. Auth Service returns to Frontend
   ├─ Status 201 Created
   └─ Profile data
```

### Environment Variables

Required in `.env` files:

**Auth Service** (`apps/auth-service/.env`):
```
CLIENT_SERVICE_URL=http://localhost:3002
```

**Client Service** (`apps/client-service/.env`):
```
DATABASE_URL=postgresql://...
```

## Testing Flow

### Individual Client Registration

```
1. User registers as "client" role
2. User selects "Individual" client type
3. Fills: Location, Budget, Contract Types, Contact Info
4. POST /api/auth/profile with clientType="individual"
5. Verify: Only contact fields + location/preferences stored
6. Verify: Company fields are NULL
7. Verify: verification_status = "pending"
```

### Business Client Registration

```
1. User registers as "client" role
2. User selects "Business" client type
3. Fills: Company, Location, Budget, Contract Types, Contact Info
4. POST /api/auth/profile with clientType="business"
5. Verify: All fields including company details stored
6. Verify: Company fields are NOT NULL
7. Verify: verification_status = "pending"
```

## Error Handling

### Validation Errors

```
POST /api/auth/profile
Body: { clientType: "business" } // Missing required fields

Response:
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Company information required for business clients",
    "path": ["companyName"]
  }
}
```

### Service Communication Errors

```
If Client Service is unavailable:

Response:
{
  "success": false,
  "error": {
    "code": "SERVICE_ERROR",
    "message": "Failed to save client profile"
  }
}
```

## Monitoring & Logging

### Audit Events

All profile completions are logged:

```typescript
audit({
  event: 'CLIENT_PROFILE_COMPLETED',
  userId: 1,
  email: 'user@example.com',
  ip: '192.168.1.1',
  requestId: 'req-123',
  details: { clientType: 'business' }
});
```

### Query Performance

Create indexes for common queries:

```sql
CREATE INDEX idx_client_profiles_client_type ON client_profiles(client_type);
CREATE INDEX idx_client_profiles_user_id ON client_profiles(user_id);
```

## Deployment Checklist

- [ ] Database migration applied
- [ ] Auth service updated and deployed
- [ ] Client service updated and deployed
- [ ] Environment variables configured
- [ ] Service URLs configured correctly
- [ ] Database backups created
- [ ] Testing completed (individual + business flows)
- [ ] Audit logging verified
- [ ] Error handling tested
- [ ] Load testing completed

## Rollback Plan

If issues arise:

1. Stop accepting new registrations
2. Keep existing clients as-is
3. Revert database migration:
   ```sql
   ALTER TABLE client_profiles DROP COLUMN client_type;
   DROP TYPE client_type;
   ```
4. Revert service code
5. Deploy previous version

## Next Steps

1. **Dashboard Implementation**: Create separate dashboard views for individual vs business clients
2. **Verification System**: Implement email/phone verification for business clients
3. **Client Messaging**: Update messaging system to handle both client types
4. **Reporting**: Add analytics for individual vs business client metrics
5. **Freelancer Onboarding**: Ensure worker profile system also supports both client types
