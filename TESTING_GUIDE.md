# Testing Guide - Dual Client Type Onboarding

## Comprehensive Testing Plan

This document outlines testing scenarios for the dual client-type onboarding system.

## Prerequisites

### Setup

1. **Database**: PostgreSQL running with migration applied
2. **Backend Services**: Auth Service, Client Service, User Service running
3. **Frontend**: Next.js app running
4. **Tools**: Postman or cURL for API testing

### Port Configuration

- Frontend: http://localhost:3000
- Auth Service: http://localhost:3001
- Client Service: http://localhost:3002
- User Service: http://localhost:3003

## Unit Tests

### 1. Auth Service - Profile Validation

#### Test: Valid Individual Client Profile

```bash
curl -X POST http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer <valid-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "client",
    "clientType": "individual",
    "contactName": "John Doe",
    "businessEmail": "john@example.com",
    "businessPhone": "+1-555-0100",
    "location": "San Francisco",
    "country": "United States",
    "timezone": "US/Pacific",
    "budgetRange": "$5k-$10k",
    "preferredContractTypes": ["One-time Project", "Hourly Contract"]
  }'
```

**Expected Response**: 201 Created
```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 1,
    "clientType": "individual",
    "contactName": "John Doe",
    "businessEmail": "john@example.com",
    "companyName": null,
    "verificationStatus": "pending"
  }
}
```

#### Test: Valid Business Client Profile

```bash
curl -X POST http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer <valid-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "client",
    "clientType": "business",
    "contactName": "Jane Smith",
    "businessEmail": "jane@techcorp.com",
    "businessPhone": "+1-555-0200",
    "companyName": "TechCorp Inc.",
    "companySize": "51-200",
    "industry": "Technology",
    "companyDescription": "A leading software development company specializing in enterprise solutions.",
    "location": "New York",
    "country": "United States",
    "timezone": "US/Eastern",
    "budgetRange": "$25k-$50k",
    "preferredContractTypes": ["Retainer", "Fixed Price"]
  }'
```

**Expected Response**: 201 Created
```json
{
  "success": true,
  "data": {
    "id": 2,
    "userId": 2,
    "clientType": "business",
    "companyName": "TechCorp Inc.",
    "verificationStatus": "pending"
  }
}
```

#### Test: Business Missing Company Name

```bash
curl -X POST http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer <valid-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "client",
    "clientType": "business",
    "contactName": "John Doe",
    "location": "San Francisco",
    "country": "United States",
    "timezone": "US/Pacific",
    "budgetRange": "$5k-$10k",
    "preferredContractTypes": ["One-time Project"]
  }'
```

**Expected Response**: 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Company information required for business clients",
    "path": ["companyName"]
  }
}
```

#### Test: Missing Authentication

```bash
curl -X POST http://localhost:3001/api/auth/profile \
  -H "Content-Type: application/json" \
  -d '{...}'
```

**Expected Response**: 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "message": "Unauthorized"
  }
}
```

### 2. Client Service - Profile Persistence

#### Test: Profile Saved to Database

```bash
# First save profile via auth service
curl -X POST http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '...'

# Then retrieve profile via user service
curl -X GET http://localhost:3003/api/clients/1
```

**Expected**: Profile matches saved data

#### Test: Profile Update

```bash
curl -X PUT http://localhost:3003/api/clients/1 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "timezone": "US/Central",
    "budgetRange": "$10k-$25k"
  }'
```

**Expected Response**: 200 OK with updated fields

## Integration Tests

### 1. Complete Individual Registration Flow

```
1. POST /api/auth/register
   {
     "email": "individual@example.com",
     "password": "SecurePass123!",
     "firstName": "John",
     "lastName": "Doe",
     "role": "client"
   }
   → Creates user, returns access token

2. POST /api/auth/profile (authenticated)
   {
     "clientType": "individual",
     "contactName": "John Doe",
     "businessEmail": "john@example.com",
     "businessPhone": "+1-555-0100",
     "location": "San Francisco",
     "country": "United States",
     "timezone": "US/Pacific",
     "budgetRange": "$5k-$10k",
     "preferredContractTypes": ["One-time Project"]
   }
   → Saves profile with clientType='individual'

3. GET /api/clients/:id
   → Returns profile with:
      - clientType: 'individual'
      - contactName: 'John Doe'
      - companyName: null

4. POST /api/projects/:clientId
   → Individual client can create projects
```

### 2. Complete Business Registration Flow

```
1. POST /api/auth/register
   {
     "email": "business@techcorp.com",
     "password": "SecurePass456!",
     "firstName": "Jane",
     "lastName": "Smith",
     "role": "client"
   }
   → Creates user, returns access token

2. POST /api/auth/profile (authenticated)
   {
     "clientType": "business",
     "contactName": "Jane Smith",
     "businessEmail": "jane@techcorp.com",
     "businessPhone": "+1-555-0200",
     "companyName": "TechCorp Inc.",
     "companySize": "51-200",
     "industry": "Technology",
     "companyDescription": "Enterprise software solutions",
     "location": "New York",
     "country": "United States",
     "timezone": "US/Eastern",
     "budgetRange": "$25k-$50k",
     "preferredContractTypes": ["Retainer", "Fixed Price"]
   }
   → Saves profile with:
      - clientType='business'
      - All company fields filled
      - verificationStatus='pending'

3. GET /api/clients/:id
   → Returns profile with:
      - clientType: 'business'
      - companyName: 'TechCorp Inc.'
      - industry: 'Technology'

4. POST /api/projects/:clientId
   → Business client can create projects
```

## Frontend UI Tests

### 1. Onboarding Flow - Individual

```
1. Navigate to /complete-profile
2. Click "Individual" button
3. Proceed through 4 steps:
   - Step 0: Select "Individual"
   - Step 1: Enter location and preferences
   - Step 2: Enter contact information
   - Step 3: Review and submit
4. Verify success toast and redirect to dashboard
5. Verify profile saved with clientType='individual'
```

### 2. Onboarding Flow - Business

```
1. Navigate to /complete-profile
2. Click "Business" button
3. Proceed through 5 steps:
   - Step 0: Select "Business"
   - Step 1: Enter company information
   - Step 2: Enter location and preferences
   - Step 3: Enter contact information
   - Step 4: Review and submit
4. Verify success toast and redirect to dashboard
5. Verify profile saved with clientType='business' and all company fields
```

### 3. Form Validation - Business Missing Company

```
1. Select "Business"
2. Skip company step
3. Click Next on company step
4. Verify error: "Company name required"
5. Verify cannot proceed without company info
```

## Database Tests

### 1. Verify Schema Changes

```sql
-- Check enum type created
SELECT typname FROM pg_type WHERE typname = 'client_type';
-- Result: client_type

-- Check columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name='client_profiles';
-- Results should include:
-- - client_type
-- - contact_name
-- - company_name
-- - budget_range
-- - preferred_contract_types
-- - verification_status
```

### 2. Verify Data Integrity

```sql
-- Individual profile has null company fields
SELECT user_id, client_type, company_name, contact_name FROM client_profiles
WHERE client_type = 'individual' AND user_id = 1;
-- Expected: company_name = NULL, contact_name = 'John Doe'

-- Business profile has company fields
SELECT user_id, client_type, company_name, industry FROM client_profiles
WHERE client_type = 'business' AND user_id = 2;
-- Expected: company_name = 'TechCorp Inc.', industry = 'Technology'
```

### 3. Verify Indexes

```sql
-- Check indexes created
SELECT indexname FROM pg_indexes 
WHERE tablename = 'client_profiles';
-- Results should include:
-- - idx_client_profiles_client_type
-- - idx_client_profiles_user_id
```

## Performance Tests

### 1. Query Performance

```bash
# Time profile retrieval for 1000 clients
time curl -X GET http://localhost:3003/api/clients/1

# Expected: < 50ms response time
```

### 2. Batch Profile Creation

```bash
# Create 100 profiles in sequence
for i in {1..100}; do
  curl -X POST http://localhost:3001/api/auth/profile \
    -H "Authorization: Bearer <token-$i>" \
    -H "Content-Type: application/json" \
    -d '...'
done

# Expected: All complete within 30 seconds
```

## Security Tests

### 1. Authorization

```bash
# User 1 cannot update User 2's profile
curl -X PUT http://localhost:3003/api/clients/2 \
  -H "Authorization: Bearer <user1-token>" \
  -H "Content-Type: application/json" \
  -d '{"timezone": "US/Central"}'

# Expected: 403 Forbidden
```

### 2. Input Sanitization

```bash
# Test SQL injection
curl -X POST http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "contactName": "x\'; DROP TABLE client_profiles; --",
    ...
  }'

# Expected: Safely stored as string, no table drop
```

## Migration Tests

### 1. Backward Compatibility

```bash
# Old queries should still work
curl -X GET http://localhost:3003/api/clients/1

# New queries should work
curl -X GET http://localhost:3003/api/clients/1/profile

# Both return same data structure (except clientType)
```

## Error Scenario Tests

### 1. Network Failure

```bash
1. Stop client-service
2. Try to save profile via auth-service
3. Expected: 500 Service Error or timeout
4. Restore service
5. Retry should succeed
```

### 2. Database Connection

```bash
1. Restart database
2. Try to retrieve profile
3. Expected: 500 Database Error
4. Auto-retry after reconnect
```

## Reporting Template

### Test Results

```
Date: 2026-02-26
Tester: [Name]
Build: [Version]
Environment: [Dev/Staging/Prod]

Individual Client Registration
  - Profile Creation: ✅ PASS
  - Step Count (4): ✅ PASS
  - Company Fields NULL: ✅ PASS
  - Database Storage: ✅ PASS

Business Client Registration
  - Profile Creation: ✅ PASS
  - Step Count (5): ✅ PASS
  - Company Fields Required: ✅ PASS
  - Validation Logic: ✅ PASS

Integration Flow
  - Complete Individual: ✅ PASS
  - Complete Business: ✅ PASS
  - Profile Retrieval: ✅ PASS
  - Authorization Checks: ✅ PASS

Database
  - Schema Migration: ✅ PASS
  - Data Integrity: ✅ PASS
  - Query Performance: ✅ PASS

Security
  - Auth Required: ✅ PASS
  - Authorization: ✅ PASS
  - SQL Injection: ✅ PASS

Issues Found:
  - None

Sign Off: [Name] ✅
```
