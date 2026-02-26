# Dual Client Type Onboarding - Complete Implementation Checklist

## Phase 1: Database & Backend Schema (✅ COMPLETED)

### Database Schema
- [x] Create migration SQL file: `0001_add_client_type.sql`
- [x] Add `client_type` ENUM type
- [x] Add `client_type` column to `client_profiles`
- [x] Add individual-specific fields:
  - [x] `contact_name`
  - [x] `business_email`
  - [x] `business_phone`
- [x] Add shared location/preference fields:
  - [x] `location`
  - [x] `country`
  - [x] `timezone`
  - [x] `budget_range`
  - [x] `preferred_contract_types`
  - [x] `verification_status`
- [x] Add indexes for performance
- [x] Update Drizzle schema file

### Backend Services Updated
- [x] Auth Service (`apps/auth-service/`)
  - [x] Add client profile validation schema
  - [x] Add POST `/api/auth/profile` endpoint
  - [x] Implement profile schema validation
  - [x] Add service-to-service call to client-service
  - [x] Add audit logging for profile completion
- [x] Client Service (`apps/client-service/`)
  - [x] Update schema for client_type support
  - [x] Add `saveProfile()` method to ClientService
  - [x] Add `saveProfile` controller method
  - [x] Add POST `/:id/profile` route
- [x] User Service (`apps/user-service/`)
  - [x] Update GET client profile query to include all fields
  - [x] Update PUT client profile to handle all fields
  - [x] Support both individual and business profiles

## Phase 2: Frontend Implementation (✅ COMPLETED)

### Form Component
- [x] Add `clientType` enum to Zod schema
- [x] Add conditional field validation
- [x] Add CLIENT_TYPES array with options
- [x] Implement Step 0: Client Type Selection
- [x] Implement Step 1: Location/Preferences (individual) or Company (business)
- [x] Implement Step 2: Contact Information
- [x] Implement Step 3/4: Preview (depends on type)
- [x] Add `onClientTypeChange` callback prop
- [x] Implement `useEffect` to notify parent of type changes
- [x] API endpoint: POST `/api/auth/profile`

### Orchestrator Page
- [x] Add `clientType` state tracking
- [x] Implement `useMemo` for dynamic step calculation
- [x] Add `onClientTypeChange` callback handler
- [x] Display correct step count (4 for individual, 5 for business)
- [x] Progress bar adjusts for variable step count

### Documentation
- [x] ONBOARDING_GUIDE.md updated with dual-client structure
- [x] Add IndividualClientProfile interface
- [x] Add BusinessClientProfile interface
- [x] Document both client type flows
- [x] Document field breakdown tables

## Phase 3: API Integration (✅ COMPLETED)

### Auth Service API
- [x] POST `/api/auth/profile` endpoint
- [x] Request validation
- [x] Inter-service communication
- [x] Audit logging
- [x] Error handling

### Client Service API
- [x] POST `/api/clients/:userId/profile` endpoint
- [x] Database insert/update logic
- [x] Proper field mapping
- [x] Response formatting

### User Service API
- [x] GET `/api/clients/:id` with all new fields
- [x] PUT `/api/clients/:id` supporting updates
- [x] Query optimization with indexes

## Phase 4: Testing (🔄 IN PROGRESS)

### Manual Testing
- [ ] Unit Test: Individual profile creation
- [ ] Unit Test: Business profile creation
- [ ] Unit Test: Company field validation
- [ ] Integration Test: Full individual flow
- [ ] Integration Test: Full business flow
- [ ] Frontend UI Test: 4-step individual flow
- [ ] Frontend UI Test: 5-step business flow
- [ ] Database Test: Data integrity check
- [ ] Query Test: Performance verification

### Integration Tests
- [ ] Auth → Client Service communication
- [ ] Database transaction consistency
- [ ] Error handling and recovery
- [ ] Authorization/authentication

### Edge Cases
- [ ] Switching client type (should not be allowed post-selection)
- [ ] Partial profile submission
- [ ] Concurrent profile creation
- [ ] Missing optional fields

## Phase 5: Deployment Preparation (⏳ PENDING)

### Pre-deployment
- [ ] Code review completed
- [ ] Database backup created
- [ ] Migration script tested on staging DB
- [ ] Zero-downtime migration plan
- [ ] Rollback plan documented

### Deployment Steps
- [ ] Apply database migration
- [ ] Deploy auth-service v2
- [ ] Deploy client-service v2
- [ ] Deploy user-service v2
- [ ] Update frontend with new API paths
- [ ] Verify all services health

### Post-deployment
- [ ] Monitor error logs
- [ ] Check database performance
- [ ] Verify audit logs
- [ ] Monitor user signups
- [ ] Check both client types working

## Phase 6: Dashboard Implementation (⏳ PENDING)

### Individual Client Dashboard
- [ ] Show budget tracking
- [ ] Show posted jobs
- [ ] Show job drafts
- [ ] Show spending summary
- [ ] Hide company-specific widgets

### Business Client Dashboard
- [ ] Show company info
- [ ] Show team members (future)
- [ ] Show advanced analytics
- [ ] Show billing details
- [ ] Show verification status

### Dashboard Conditional Rendering
- [ ] Query clientType from profile
- [ ] Branch component rendering based on type
- [ ] Adjust dashboard layout for each type
- [ ] Update navigation based on type

## Phase 7: Messaging System Updates (⏳ PENDING)

### Message History
- [ ] Update messages to reference clientType
- [ ] Filter messages by client type
- [ ] Show correct client info in replies

### Notifications
- [ ] Notifications aware of client type
- [ ] Different notification preferences per type

## Phase 8: Project & Bidding System (⏳ PENDING)

### Project Creation
- [ ] Show different fields for individual vs business
- [ ] Set different defaults based on client type
- [ ] Budget guidance based on client type

### Freelancer Matching
- [ ] Algorithm considers client type
- [ ] Individual clients get different worker ranking
- [ ] Business clients get verified workers first

## Phase 9: Verification & Security (⏳ PENDING)

### Email/Phone Verification
- [ ] Individual clients: basic email verification
- [ ] Business clients: email + enhanced verification
- [ ] Verification badge display

### Fraud Prevention
- [ ] Monitor for fake business profiles
- [ ] Flag unusual registration patterns
- [ ] Rate limiting per client type

## Phase 10: Analytics & Monitoring (⏳ PENDING)

### Metrics
- [ ] Track individual vs business signups
- [ ] Track completion rates per type
- [ ] Track project success rates
- [ ] Dashboard usage patterns

### Reporting
- [ ] Monthly reports by client type
- [ ] Growth metrics
- [ ] Engagement metrics

## Environment Configuration

### Required Environment Variables

**Auth Service** (`.env`):
```
CLIENT_SERVICE_URL=http://localhost:3002
DATABASE_URL=postgresql://...
JWT_SECRET=...
```

**Client Service** (`.env`):
```
DATABASE_URL=postgresql://...
```

**User Service** (`.env`):
```
DATABASE_URL=postgresql://...
```

**Frontend** (`.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Success Criteria

- [x] Frontend form supports both individual and business clients
- [x] Backend schema supports storing client type
- [x] API endpoint for profile completion works
- [x] Validation rules enforced (company required for business)
- [x] Step count adjusts based on client type
- [ ] Database migration successfully applied
- [ ] All services deployed and communicating
- [ ] All tests passing
- [ ] Zero errors in production
- [ ] Both client types completing onboarding

## Known Limitations & Future Work

### Current Limitations
1. Client type cannot be changed after selection (by design)
2. Marketing dashboard not updated yet
3. Freelancer profile doesn't support client type visibility
4. No client type-specific messaging templates

### Future Enhancements
1. Allow company registration without contact name
2. Bulk client profile import
3. Client API keys for automation
4. Webhook notifications on profile completion
5. Client type-specific onboarding tutorials
6. Multi-user accounts (team members for business)
7. Client organization management

## Support & Troubleshooting

### Common Issues

**Problem**: "Company information required" error on individual profiles
- **Solution**: Ensure `clientType: 'individual'` not `'business'`

**Problem**: Database migration fails
- **Solution**: Check if columns already exist, verify PostgreSQL version

**Problem**: Service communication fails
- **Solution**: Verify `CLIENT_SERVICE_URL` env var, check network connectivity

**Problem**: Profile not saving
- **Solution**: Check auth token valid, verify database connection, check logs

## Documentation Files

Created/Updated:
- [x] `/docs/ONBOARDING_GUIDE.md` - User-facing guide
- [x] `/DUAL_CLIENT_IMPLEMENTATION.md` - Technical implementation
- [x] `/TESTING_GUIDE.md` - Testing procedures
- [x] `/IMPLEMENTATION_CHECKLIST.md` - This file

## Contact & Questions

For questions about this implementation:
1. Check TESTING_GUIDE.md for test scenarios
2. Check DUAL_CLIENT_IMPLEMENTATION.md for architecture details
3. Check ONBOARDING_GUIDE.md for user flows
4. Review code comments in backend services

---

**Last Updated**: 2026-02-26
**Status**: Phase 2 & 3 Complete, Testing In Progress
**Owner**: Development Team
