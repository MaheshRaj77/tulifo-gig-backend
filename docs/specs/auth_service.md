# Technical Specification: Auth Service

**Service Name**: `auth-service`
**Repository**: `tulifo-gig-backend/apps/auth-service`
**Language**: Node.js (TypeScript)
**Framework**: Express.js
**Database**: PostgreSQL (via Prisma ORM or TypeORM)
**Port**: 3001

## 1. Responsibilities
- User Registration (Workers & Clients)
- Login (JWT Issue)
- Token Verification (Middleware)
- Password Reset
- Role Management ('worker', 'client', 'admin')

## 2. Database Schema (PostgreSQL)

We will use a shared `users` table or separate `auth` table. For microservices, owning the identity is key.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('worker', 'client', 'admin')),
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  token VARCHAR(500) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 3. API Endpoints

### Public
- `POST /auth/register`
  - Body: `{ email, password, role }`
- `POST /auth/login`
  - Body: `{ email, password }`
  - Response: `{ accessToken, refreshToken, user: { id, role } }`
- `POST /auth/refresh`
  - Body: `{ refreshToken }`
  - Response: `{ accessToken }`

### Private (Internal/Admin)
- `POST /auth/verify-token` (Internal use for Gateway)
- `GET /auth/me` (Protected)

## 4. Project Structure (Standardized)

```
src/
├── config/         # Environment config
├── controllers/    # Request handlers
├── middlewares/    # Auth, Validation, Error handlers
├── routes/         # Route definitions
├── services/       # Business logic
├── utils/          # Helpers (Password hashing, JWT)
├── app.ts          # Express app setup
└── index.ts        # Server entry point
```

## 5. Development Steps
1.  **Setup**: Install dependencies (`express`, `prisma`, `jsonwebtoken`, `bcryptjs`, `zod`).
2.  **Database**: Configure Prisma/TypeORM and run migrations.
3.  **Core**: Implement Server & Error Handling.
4.  **Feature**: Implement Register Flow.
5.  **Feature**: Implement Login Flow.
6.  **Feature**: Implement Token Verification.
