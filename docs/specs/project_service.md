# Technical Specification: Project Service

**Service Name**: `project-service`
**Repository**: `tulifo-gig-backend/apps/project-service`
**Language**: Node.js (TypeScript)
**Framework**: Express.js
**Database**: PostgreSQL
**Port**: 3008

## 1. Responsibilities
- Project Posting (Client)
- Proposal/Bid Management (Worker)
- Project Lifecycle (Open -> In Progress -> Completed)

## 2. Database Schema (PostgreSQL)

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  client_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  budget_min DECIMAL(10, 2),
  budget_max DECIMAL(10, 2),
  status VARCHAR(20) DEFAULT 'open',
  skills_required TEXT[], -- Array of strings
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE proposals (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  worker_id UUID NOT NULL,
  cover_letter TEXT,
  bid_amount DECIMAL(10, 2),
  status VARCHAR(20) DEFAULT 'submitted',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 3. API Endpoints
- `POST /projects` - Create project
- `GET /projects` - List projects (Filterable)
- `POST /projects/:id/proposals` - Submit proposal
