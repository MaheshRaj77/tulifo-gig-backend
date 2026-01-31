# Technical Specification: Payment Service

**Service Name**: `payment-service`
**Repository**: `tulifo-gig-backend/apps/payment-service`
**Language**: Node.js (TypeScript)
**Framework**: Express.js
**Database**: PostgreSQL
**Port**: 3005

## 1. Responsibilities
- Payment Processing (Stripe Integration)
- Escrow Management
- Payouts to Workers
- Transaction History

## 2. Database Schema (PostgreSQL)

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  booking_id UUID NOT NULL,
  payer_id UUID NOT NULL,
  payee_id UUID NOT NULL,
  amount DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) CHECK (status IN ('pending', 'held_in_escrow', 'released', 'refunded')),
  stripe_payment_intent_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 3. API Endpoints

### Private (Internal)
- `POST /payments/escrow/deposit` - Initiate payment for booking.
- `POST /payments/escrow/release` - Release funds to worker.
- `GET /payments/history/:userId`

### Webhooks
- `POST /webhooks/stripe` - Handle Stripe events.

## 4. Dependencies
- `stripe`: Node.js SDK
