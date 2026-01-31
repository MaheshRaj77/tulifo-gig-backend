# Technical Specification: Booking Service

**Service Name**: `booking-service`
**Repository**: `tulifo-gig-backend/apps/booking-service`
**Language**: Go (Golang)
**Framework**: Chi or Gin (Performance focused)
**Database**: PostgreSQL
**Port**: 3003

## 1. Responsibilities
- Availability Slot Management (CRUD)
- Booking Creation & Management
- Calendar Sync (Placeholder)
- Real-time Slot Locking (Redis)

## 2. Database Schema (PostgreSQL)

```sql
CREATE TABLE availability_slots (
  id UUID PRIMARY KEY,
  worker_id UUID NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_booked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bookings (
  id UUID PRIMARY KEY,
  slot_id UUID REFERENCES availability_slots(id),
  client_id UUID NOT NULL,
  worker_id UUID NOT NULL,
  status VARCHAR(20) CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  amount DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 3. API Endpoints

### Public
- `GET /availability/:worker_id` - list slots

### Private
- `POST /availability` - Create slots (Worker)
- `POST /bookings` - Create booking (Client)
- `PUT /bookings/:id/status` - Update status (Worker/System)

## 4. Project Structure (Go Standard)

```
cmd/
  server/
    main.go
internal/
  models/
  handlers/
  repository/    # DB access
  service/       # Business logic
pkg/
  config/
  utils/
go.mod
```
