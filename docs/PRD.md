# Product Requirements Document (PRD)
## Unified Gig Platform - "FlexWork" (Working Title)

**Version:** 1.0  
**Date:** January 21, 2026  
**Status:** Draft for Review  
**Owner:** Product Team  
**Stakeholders:** Engineering, Design, Legal, Finance, Operations

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Target Users & Personas](#3-target-users--personas)
4. [Product Goals & Objectives](#4-product-goals--objectives)
5. [Core Features & Requirements](#5-core-features--requirements)
6. [User Flows](#6-user-flows)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Technical Architecture](#8-technical-architecture)
9. [Development Phases & Timeline](#9-development-phases--timeline)
10. [Success Metrics & KPIs](#10-success-metrics--kpis)
11. [Risk Assessment & Mitigation](#11-risk-assessment--mitigation)
12. [Go-to-Market Strategy](#12-go-to-market-strategy)
13. [Support & Documentation](#13-support--documentation)
14. [Legal & Compliance](#14-legal--compliance)
15. [Appendix](#15-appendix)

---

## 1. Executive Summary

### 1.1 Vision Statement
Build the world's most flexible and trustworthy gig economy platform that empowers workers with multiple ways to monetize their skills while providing clients with instant access to verified, available talent through real-time booking, AI-powered matching, and blockchain-secured smart contracts.

### 1.2 Product Overview
FlexWork is an enterprise-grade, multi-modal gig marketplace that combines:
- **Real-time availability booking** (primary differentiator)
- **AI-powered intelligent matching** (no bidding wars)
- **Smart contract automation** (trust & transparency)
- **Multi-tenancy architecture** (white-label capabilities)
- **Comprehensive user types** (14 distinct roles)

### 1.3 Success Metrics (12-month targets)
- **Active Workers:** 50,000+
- **Active Clients:** 10,000+
- **Monthly Transactions:** $5M GMV
- **Platform Uptime:** 99.9%
- **Average Match Time:** < 2 hours
- **Dispute Rate:** < 2%
- **Worker Retention:** 70%
- **Client Retention:** 80%

### 1.4 Market Positioning
FlexWork positions itself as the "Calendly meets Upwork" solution - eliminating bidding friction through real-time booking while maintaining marketplace quality through AI matching and smart contracts.

**Competitive Advantages:**
1. Instant booking (no 7-day hiring cycle)
2. Multi-modal acquisition (8 different ways to get work)
3. Smart contracts (automatic trust)
4. White-label ready (enterprise market)
5. Worker-centric (flexible income streams)

---

## 2. Problem Statement

### 2.1 Current Market Pain Points

**For Gig Workers:**
- Endless bidding fatigue (applying to 50+ jobs for 1 contract)
- Race to the bottom pricing wars
- Unpredictable income streams
- Payment fraud and delayed payments (30-60 day payment cycles)
- Lack of portable reputation systems
- No control over work schedules
- High platform fees (15-20%)
- Algorithm opacity (don't know why bids get rejected)

**For Clients:**
- Sorting through 100+ low-quality bids
- Difficulty assessing skill levels
- Long time-to-hire (7-14 days average)
- No guarantee of worker availability
- Payment disputes and incomplete work
- Lack of real-time collaboration tools
- Project scope creep
- Communication barriers across timezones

**For Platforms:**
- High customer acquisition costs ($100-300 per user)
- Low conversion rates (bid-to-hire: ~3%)
- Platform trust erosion (fake reviews, inflated profiles)
- Scaling issues with manual verification
- Regional compliance complexity
- High dispute resolution costs
- Worker churn (60% leave within 6 months)

### 2.2 Market Opportunity
- **Global gig economy:** $455B (2023) → projected $873B (2028)
- **Freelancers worldwide:** 1.57B (2023)
- **US freelancers:** 64M+ (38% of workforce)
- **Gen Z freelance intent:** 73% expect to freelance
- **Enterprise contingent workforce adoption:** +42% YoY
- **White-label platform demand:** +67% in B2B sector
- **Real-time booking market:** Largely untapped in gig economy

### 2.3 Target Market Segments

**Primary Market (Year 1):**
- Tech freelancers (developers, designers, PMs)
- Digital marketers and content creators
- Small-medium businesses (10-250 employees)
- Startup CTOs and hiring managers
- Geographic focus: US, India, UK, Canada

**Secondary Market (Year 2):**
- Enterprise corporations (Fortune 1000)
- Professional services (legal, accounting, consulting)
- Creative industries (video, photography, writing)
- Physical services (home services, tutoring)
- Geographic expansion: EU, LATAM, APAC

---

## 3. Target Users & Personas

### 3.1 Primary User Personas

#### Persona 1: "Digital Nomad Priya" (Gig Worker)
**Demographics:**
- **Age:** 28
- **Location:** Chennai, India (travels frequently)
- **Education:** B.Tech in Computer Science
- **Experience:** 5 years as Full-stack Developer
- **Income Goal:** ₹1.2L/month (₹14.4L/year)

**Psychographics:**
- Values work-life balance and location independence
- Prefers project-based work over long-term employment
- Tech-savvy, uses multiple platforms
- Active in developer communities (GitHub, Stack Overflow)
- Concerned about payment security and timely payouts

**Goals:**
- Flexible hours that accommodate travel schedule
- Premium clients willing to pay fair rates
- Build long-term client relationships
- Maintain 4.8+ rating across platforms
- Diversify income streams

**Pain Points:**
- Spends 10-15 hours/week applying to jobs (low conversion)
- Clients ghost after initial discussions
- Payment delays of 30-45 days
- Difficult to showcase skills beyond portfolio
- Timezone management with US/EU clients
- Platform fees eat into margins (15-20%)

**Platform Usage:**
- Sets 20 hrs/week availability across preferred time slots
- Accepts AI matches for projects matching skill set
- Prefers instant booking for short-term work
- Uses invitation-only for high-value clients
- Active user: checks platform 3-4 times/day

**Quote:** *"I'm tired of writing proposals that get ignored. I just want clients to book my available time and start working."*

---

#### Persona 2: "Startup Steve" (SMB Client)
**Demographics:**
- **Age:** 34
- **Location:** San Francisco, USA
- **Role:** CTO of 15-person SaaS startup (Series A)
- **Budget:** $10K/month on contractors
- **Company:** B2B productivity tool with 500 customers

**Psychographics:**
- Fast-paced, needs quick solutions
- Values quality over cost (within budget)
- Limited time for lengthy hiring processes
- Prefers ongoing relationships over one-off projects
- Tech-forward, adopts new tools quickly

**Goals:**
- Fill skill gaps without full-time hires
- Quick talent access (same-day or next-day)
- Budget control and predictable costs
- Quality work with minimal supervision
- Scale team up/down based on sprint needs

**Pain Points:**
- Takes 2-3 weeks to hire a good contractor
- Sorting through unqualified applicants wastes time
- Contractors disappear mid-project
- Scope creep leads to budget overruns
- No way to verify actual availability
- Payment disputes over milestone definitions

**Platform Usage:**
- Books developers weekly (3-5 hour sessions)
- Prefers real-time availability over waiting for bids
- Uses standing agreements for trusted contractors
- Schedules recurring sessions for ongoing projects
- Moderate user: books 2-3 times per week

**Quote:** *"I need a React developer for 4 hours tomorrow. I don't have time to post a job and wait a week for proposals."*

---

#### Persona 3: "Enterprise Emma" (Corporate Client)
**Demographics:**
- **Age:** 41
- **Location:** New York, USA
- **Role:** Procurement Manager at Fortune 500 financial services firm
- **Budget:** $500K/year on contingent workforce
- **Team Size:** Manages vendor relationships for 200+ contractors

**Psychographics:**
- Process-oriented, values compliance and documentation
- Risk-averse, needs legal approval for platforms
- Data-driven, requires detailed reporting
- Relationship-focused, prefers account managers
- Long-term thinker, evaluates 3-5 year contracts

**Goals:**
- Compliance with corporate policies and regulations
- Centralized vendor management and billing
- Cost optimization through volume discounts
- Talent pool curation for recurring needs
- Streamlined invoice processing and reporting

**Pain Points:**
- Multiple platforms = compliance nightmare
- No centralized billing or reporting
- Difficult to enforce corporate rate cards
- Background checks and security clearances
- Invoice processing delays (60-90 days)
- Talent quality inconsistency across vendors

**Platform Usage:**
- White-label deployment for internal branding
- Team bookings for cross-functional projects
- Standing agreements with pre-vetted contractors
- API integration with procurement systems
- Light user: delegates to team, reviews monthly reports

**Quote:** *"We need a platform that integrates with our systems, provides compliance documentation, and consolidates all our contractor spend."*

---

#### Persona 4: "Expert Eric" (Top-Tier Specialist)
**Demographics:**
- **Age:** 45
- **Location:** London, UK
- **Education:** PhD in Computer Science
- **Specialization:** Blockchain Architecture & Smart Contracts
- **Experience:** 20+ years in tech, 8 years blockchain
- **Rate:** £200-300/hour

**Psychographics:**
- Highly selective about projects
- Values intellectual challenge over volume
- Reputation-conscious, protects personal brand
- Well-connected in industry
- Financially secure, not desperate for work

**Goals:**
- High rates commensurate with expertise
- Selective projects (only interesting/complex work)
- Reputation building through high-profile clients
- Thought leadership and speaking opportunities
- Long-term advisory roles

**Pain Points:**
- Time wasters asking for free advice
- Low-value inquiries from unqualified clients
- Platforms commoditize specialized skills
- Payment disputes with high-value contracts
- Need for NDAs and IP protection
- Platform fees feel excessive for high rates

**Platform Usage:**
- Invitation-only mode (doesn't browse jobs)
- Auction mode for premium clients to bid
- Standing agreements for advisory roles
- Prefers fixed-scope over hourly work
- Very light user: responds to opportunities 1-2x/week

**Quote:** *"I don't apply to jobs. The right clients find me, and they're willing to pay for my expertise."*

---

### 3.2 Secondary User Personas

#### Persona 5: "Support Agent Sarah"
- **Role:** Customer Support Tier 2
- **Goals:** Quick issue resolution, user satisfaction
- **Tools:** CRM, ticketing system, live chat
- **KPIs:** Response time < 2 hours, satisfaction > 4.5/5

#### Persona 6: "Admin Alex"
- **Role:** Platform Administrator
- **Goals:** Platform health, user verification, policy enforcement
- **Tools:** Admin dashboard, analytics, user management
- **KPIs:** Verification SLA < 24 hrs, fraud detection rate > 95%

#### Persona 7: "Arbitrator Amy"
- **Role:** Dispute Resolution Specialist
- **Goals:** Fair outcomes, fast resolution, reduced appeals
- **Tools:** Case management system, evidence review, precedent database
- **KPIs:** Resolution time < 3 days, appeal rate < 5%

---

## 4. Product Goals & Objectives

### 4.1 Business Goals

**Year 1 Targets:**
1. **Revenue:** $10M ARR
   - Transaction fees: $7M (70%)
   - Subscriptions: $2M (20%)
   - Enterprise licensing: $1M (10%)

2. **Market Position:** Top 3 in real-time gig booking
   - Brand awareness: 30% in target market
   - Press mentions: 50+ articles
   - Conference presentations: 10+ events

3. **Enterprise Adoption:** 100+ B2B white-label clients
   - SMB tier (10-100 employees): 80 clients
   - Mid-market (100-1000): 15 clients
   - Enterprise (1000+): 5 clients

4. **Geographic Expansion:** 15 countries by Q4
   - Launch sequence: US → India → UK → Canada → EU5

5. **Strategic Exit:** Acquisition or Series B ($50M+) within 24 months
   - Build investor relationships from Month 1
   - Target acquirers: Upwork, Fiverr, LinkedIn, Microsoft

**Year 2 Targets:**
- Revenue: $30M ARR
- Users: 250K+ registered
- GMV: $200M+
- Geographic presence: 35+ countries
- Series B funding: $50-100M

### 4.2 Product Goals

**User Experience:**
1. **Reduce time-to-hire** from 7 days to <2 hours
   - Search to booking: < 30 minutes
   - First contact to contract: < 1 hour
   - Payment to start work: < 10 minutes

2. **Eliminate 80% of bidding friction**
   - 50% of projects use instant booking
   - 30% use AI matching
   - 20% use traditional bidding

3. **Achieve 95% payment success rate**
   - Zero payment fraud through escrow
   - 100% on-time releases (within SLA)
   - < 1% chargebacks

4. **Enable 50% of bookings to be instant**
   - No negotiation, accept rate card
   - Book available time slot immediately
   - Auto-contract generation

5. **Launch 8 acquisition modes** across 4 phases
   - Phase 1: Real-time booking, smart contracts, bidding
   - Phase 2: AI matching, invitation-only
   - Phase 3: Team booking, subscriptions
   - Phase 4: Auctions, reverse marketplace

**Platform Quality:**
1. **99.9% uptime** (< 9 hours downtime/year)
2. **< 500ms search latency** for 50K+ profiles
3. **< 1 second status updates** (WebSocket)
4. **< 2% dispute rate** (vs 5-8% industry average)
5. **4.5+ average satisfaction** across all user types

### 4.3 User Goals

**Workers:**
1. **Predictable income:** Book 70% of available hours
2. **Fewer rejections:** 40% proposal acceptance rate (vs 5% industry)
3. **Faster payments:** 1-3 day payout (vs 30-60 days)
4. **Fair pricing:** Maintain rate floor, no race to bottom
5. **Portable reputation:** Export profile data, multi-platform badges

**Clients:**
1. **Instant talent access:** Find and book within 1 hour
2. **Transparent pricing:** See real-time rates, no hidden fees
3. **Quality assurance:** Verified skills, ratings, portfolios
4. **Budget control:** Fixed rates, milestone-based payments
5. **Collaboration tools:** Chat, video, screen share, file sharing

**Enterprises:**
1. **Compliance tools:** Background checks, NDAs, tax forms
2. **Centralized billing:** Single invoice, consolidated reporting
3. **Talent analytics:** Utilization rates, spend analysis, performance
4. **White-label option:** Custom branding, domain, integrations
5. **Volume discounts:** 8-10% platform fee (vs 12% standard)

---

## 5. Core Features & Requirements

### 5.1 Feature Priority Matrix

| Feature | Priority | Complexity | MVP Phase | Dependencies |
|---------|----------|------------|-----------|--------------|
| User Registration & KYC | P0 | Medium | Phase 1 | - |
| Worker/Client Profiles | P0 | Medium | Phase 1 | Registration |
| Real-Time Booking System | P0 | High | Phase 1 | Profiles, Calendar |
| Availability Calendar | P0 | Medium | Phase 1 | Profiles |
| Real-Time Status System | P0 | Medium | Phase 1 | WebSocket |
| Worker Search & Filters | P0 | Medium | Phase 1 | Elasticsearch |
| Pre-Booking Chat | P0 | High | Phase 1 | WebSocket |
| Smart Contract Generation | P0 | High | Phase 1 | Chat, Booking |
| Escrow Payment System | P0 | Medium | Phase 1 | Stripe |
| Basic Ratings & Reviews | P0 | Low | Phase 1 | Bookings |
| AI-Powered Matching | P1 | High | Phase 2 | ML Pipeline |
| Live Session Management | P1 | High | Phase 2 | WebRTC |
| Video/Screen Share | P1 | Medium | Phase 2 | WebRTC |
| Task Checklists | P1 | Low | Phase 2 | Sessions |
| Dispute Resolution | P1 | Medium | Phase 2 | Arbitrator Tools |
| Advanced Analytics | P1 | Medium | Phase 2 | Data Pipeline |
| Notifications System | P1 | Medium | Phase 2 | Email/SMS/Push |
| Open Bidding (Legacy) | P2 | Low | Phase 3 | Projects |
| Team Booking | P2 | High | Phase 3 | Multi-user |
| Subscription Tiers | P2 | Medium | Phase 3 | Billing |
| Mobile Apps | P2 | High | Phase 3 | React Native |
| White-Label Deployment | P2 | Very High | Phase 3 | Multi-tenancy |
| API Marketplace | P2 | Medium | Phase 3 | Public API |
| Blockchain Integration | P3 | Very High | Phase 4 | Smart Contracts |
| Crypto Payments | P3 | High | Phase 4 | Blockchain |
| NFT Certifications | P3 | Medium | Phase 4 | Blockchain |

---

### 5.2 Real-Time Booking System (Core Feature)

#### 5.2.1 Worker Availability Management

**Functional Requirements:**

**FR-AVL-001: Calendar Interface**
- Workers can create availability slots with 30-minute minimum granularity
- Slots can range from 30 minutes to 8 hours
- Calendar view displays: day, week, month
- Drag-and-drop slot creation and editing
- Visual indicators for booked, available, blocked time

**FR-AVL-002: Recurring Schedule Templates**
- Workers can create weekly recurring patterns
- "Copy to next week" bulk action
- Template library (e.g., "Mon-Fri 9-5", "Weekend only")
- Exception handling for holidays/vacations
- Temporary override of recurring patterns

**FR-AVL-003: Domain/Skill Tagging**
- Each slot can be tagged with 1-5 domains/skills
- Dropdown selection from predefined taxonomy
- Custom skill addition (requires approval)
- Skill level indication (beginner/intermediate/expert)
- Different skills can have different rates in same slot

**FR-AVL-004: Dynamic Pricing**
- Per-slot hourly rate configuration
- Different rates for different skills
- Peak/off-peak pricing rules
- Minimum session duration pricing (e.g., 2-hour minimum)
- Discount for longer bookings (e.g., 4+ hours get 10% off)

**FR-AVL-005: Buffer Time Management**
- Auto-insert 15-minute buffer between back-to-back bookings
- Configurable buffer duration (0-60 minutes)
- Option to disable buffer for specific slots
- Visual indication of buffer time in calendar
- Buffer time not billable

**FR-AVL-006: External Calendar Integration**
- Two-way sync with Google Calendar
- Two-way sync with Outlook Calendar
- Two-way sync with Apple Calendar
- Conflict detection and warnings
- Import existing events as blocked time
- Auto-create calendar invites on booking

**FR-AVL-007: Mobile Calendar Sync**
- Real-time sync between web and mobile (< 10 sec)
- Offline mode with sync on reconnect
- Push notifications for booking requests
- Quick accept/decline from mobile notifications
- Mobile-optimized calendar UI

**FR-AVL-008: Daily Hour Limits**
- Set maximum hours per day (default: 8)
- Set maximum hours per week (default: 40)
- Warnings when approaching limits
- Override option with confirmation
- Burnout prevention messaging

**FR-AVL-009: Vacation/Blocked Time**
- Mark date ranges as unavailable
- Bulk block multiple dates
- Vacation auto-responder message
- Hide or show blocked time to clients
- Emergency availability toggle

**Acceptance Criteria:**

**AC-AVL-001:**
- Given a worker opens the calendar interface
- When they create a new availability slot
- Then the slot is saved and visible within 2 seconds
- And external calendars sync within 10 seconds
- And the slot appears in search results immediately

**AC-AVL-002:**
- Given a worker sets recurring weekly schedule
- When they select "every Monday 9 AM - 5 PM"
- Then 52 slots are created for the next year
- And worker can edit/delete individual occurrences
- And changes propagate to search index within 10 seconds

**AC-AVL-003:**
- Given a worker is nearing daily hour limit
- When they attempt to create a slot exceeding limit
- Then system shows warning dialog
- And allows override with confirmation
- And logs the override event

**AC-AVL-004:**
- Given a client books a worker's available slot
- When booking is confirmed
- Then slot status changes to "booked"
- And calendar invite sent to both parties
- And external calendar updated within 10 seconds
- And buffer time automatically blocked

**User Stories:**

```
US-AVL-001: Quick Availability Setup
As a worker,
I want to set my availability for the next month in under 5 minutes,
So that I can start receiving bookings immediately without lengthy setup.

Acceptance Criteria:
- Calendar loads in < 2 seconds
- Recurring pattern creation takes < 30 seconds
- Template application is instant
- Confirmation takes < 5 seconds

US-AVL-002: Prevent Double Booking
As a worker,
I want my platform calendar to sync with Google Calendar,
So I don't get double-booked with personal appointments.

Acceptance Criteria:
- Google Calendar events appear as blocked time
- Sync happens automatically every 5 minutes
- Conflicts trigger immediate warnings
- Manual sync option available

US-AVL-003: Skill-Based Pricing
As a worker,
I want to set different hourly rates for different skills,
So I can charge appropriately for specialized work.

Acceptance Criteria:
- Each slot supports multiple skill tags
- Each skill can have independent pricing
- Rate shown to clients before booking
- Highest rate highlighted in search results

US-AVL-004: Bulk Schedule Management
As a worker,
I want to copy my weekly schedule to the next 4 weeks,
So I don't have to manually create each slot.

Acceptance Criteria:
- "Copy week" action creates 7 days of slots
- "Copy to next N weeks" bulk action
- Individual slots remain editable
- Undo option available for 24 hours
```

**Technical Specifications:**

**Database Schema:**
```sql
CREATE TABLE availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER GENERATED ALWAYS AS 
    (EXTRACT(EPOCH FROM (end_time - start_time))/60) STORED,
  domain VARCHAR(100),
  skills JSONB, -- [{skill: "React", rate: 85, level: "expert"}]
  base_hourly_rate DECIMAL(10,2) NOT NULL,
  status ENUM('available', 'booked', 'blocked', 'expired') DEFAULT 'available',
  max_bookings INTEGER DEFAULT 1,
  current_bookings INTEGER DEFAULT 0,
  buffer_before_minutes INTEGER DEFAULT 0,
  buffer_after_minutes INTEGER DEFAULT 15,
  recurrence_rule TEXT, -- iCalendar RRULE format
  recurrence_parent_id UUID REFERENCES availability_slots(id),
  is_recurring BOOLEAN DEFAULT false,
  external_calendar_sync JSONB, -- {google: event_id, outlook: event_id}
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_worker_date (worker_id, date),
  INDEX idx_status (status),
  INDEX idx_domain (domain),
  INDEX idx_date_range (date, start_time, end_time),
  INDEX idx_skills (skills) USING GIN,
  
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT valid_duration CHECK (duration_minutes >= 30),
  CONSTRAINT valid_max_bookings CHECK (max_bookings >= 1),
  CONSTRAINT valid_current_bookings CHECK (current_bookings <= max_bookings)
);

-- Index for searching available slots
CREATE INDEX idx_available_slots ON availability_slots (
  date, status, worker_id
) WHERE status = 'available' AND date >= CURRENT_DATE;

-- Trigger to update status based on date
CREATE OR REPLACE FUNCTION expire_past_slots()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.date < CURRENT_DATE AND NEW.status = 'available' THEN
    NEW.status := 'expired';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_expire_slots
  BEFORE UPDATE ON availability_slots
  FOR EACH ROW EXECUTE FUNCTION expire_past_slots();
```

**API Endpoints:**
```
POST   /api/v1/availability/slots
  Body: {
    date, start_time, end_time, domain, skills[], 
    hourly_rate, max_bookings, recurrence_rule
  }
  Response: {id, status: "created", slot_details}

GET    /api/v1/availability/slots?start_date=&end_date=&status=
  Response: {slots: [...], total_count, has_more}

PUT    /api/v1/availability/slots/:id
  Body: {partial_update}
  Response: {id, status: "updated", slot_details}

DELETE /api/v1/availability/slots/:id?delete_series=false
  Response: {id, status: "deleted"}

POST   /api/v1/availability/bulk-create
  Body: {
    template_type: "weekly_recurring",
    pattern: {...},
    start_date,
    end_date,
    slots: [...]
  }
  Response: {created_count, slot_ids: [...]}

POST   /api/v1/availability/sync-external
  Body: {
    provider: "google|outlook|apple",
    auth_code,
    sync_direction: "two_way|import_only"
  }
  Response: {status: "synced", conflicts: [...]}

GET    /api/v1/availability/calendar/:worker_id
  Query: ?start_date=&end_date=&timezone=
  Response: {slots: [...], blocked_time: [...], bookings: [...]}
```

**WebSocket Events:**
```javascript
// Server → Client
{
  event: "slot_created",
  data: {slot_id, worker_id, date, start_time, end_time}
}

{
  event: "slot_booked",
  data: {slot_id, booking_id, client_name, session_time}
}

{
  event: "slot_cancelled",
  data: {slot_id, reason, cancelled_by}
}

{
  event: "calendar_sync_complete",
  data: {provider, slots_imported, conflicts}
}

// Client → Server
{
  action: "update_slot_status",
  slot_id: "...",
  status: "available|blocked"
}
```

**Performance Requirements:**
- Slot creation/update: < 200ms response time
- Calendar load (30 days): < 500ms
- Bulk slot creation (50 slots): < 2 seconds
- External calendar sync: < 10 seconds
- Search index update: < 2 seconds after slot change
- Concurrent slot updates: Handle 1000+ workers updating simultaneously

**Edge Cases & Validations:**
1. **Overlapping Slots:** Prevent worker from creating overlapping available slots
2. **Past Date Slots:** Warn when creating slots in the past
3. **Excessive Slots:** Limit to 1000 active future slots per worker
4. **Sync Conflicts:** When external calendar has conflicting event, mark as blocked and notify
5. **Timezone Handling:** Store in UTC, display in worker's local timezone
6. **DST Transitions:** Handle daylight saving time changes gracefully
7. **Orphaned Slots:** Auto-delete expired slots older than 90 days
8. **Rate Changes:** If rate changed after booking inquiry, confirm with client

---

#### 5.2.2 Real-Time Status System

**Functional Requirements:**

**FR-STA-001: Status States**
- Four status states with distinct visual indicators:
  - 🟢 **Online & Ready** - Available for immediate chat/booking
  - 🟡 **Online & Busy** - In active session, can receive messages
  - ⚪ **Away** - Briefly unavailable, auto-return expected
  - 🔴 **Offline** - Not available, bookings go to calendar

**FR-STA-002: WebSocket-Based Updates**
- Real-time status propagation (< 1 second latency)
- Automatic reconnection on connection loss
- Fallback to long-polling for incompatible clients
- Status visible to all users viewing worker profile
- Status displayed in search results

**FR-STA-003: Auto-Status Management**
- Auto-away after 5 minutes of inactivity
- Auto-offline after 30 minutes of inactivity
- Auto-online when user interacts with platform
- Activity detection: mouse movement, keyboard, clicks
- Mobile background status sync every 2 minutes

**FR-STA-004: Manual Status Controls**
- Workers can manually set any status
- Status persists across browser sessions
- "Do Not Disturb" mode (appear offline while online)
- Custom away messages (e.g., "In a meeting, back at 3 PM")
- Quick status presets ("Lunch", "Meeting", "Focus time")

**FR-STA-005: Session Status Management**
- Status automatically changes to "Busy" when session starts
- Remains "Busy" during entire session duration
- Returns to previous status when session ends
- Can't manually change to "Ready" during active session
- Session timer visible in status indicator

**FR-STA-006: Push Notifications**
- 30-minute reminder before scheduled session
- 10-minute reminder (critical notification)
- 2-minute final reminder
- Notification when client initiates chat
- Notification when booking request received

**FR-STA-007: Online Requirement Enforcement**
- Worker MUST be online 10 minutes before session
- System sends escalating reminders
- Warning email if offline 5 minutes before session
- Automated notification to client if worker not online at start time
