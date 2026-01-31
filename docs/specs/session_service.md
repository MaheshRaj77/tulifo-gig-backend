# Technical Specification: Session Service

**Service Name**: `session-service`
**Repository**: `tulifo-gig-backend/apps/session-service`
**Language**: Node.js (TypeScript)
**Framework**: Express.js
**Database**: Redis (Active Sessions), PostgreSQL (Session Logs)
**Port**: 3009

## 1. Responsibilities
- Manage Live Work Sessions (Timer)
- WebSocket Events for Session State (Start/Pause/End)
- Integration with Video/Screen Share (Daily.co)

## 2. API Endpoints
- `POST /sessions/start`
- `POST /sessions/:id/pause`
- `POST /sessions/:id/end`
- `GET /sessions/active`

## 3. Real-time Events (Socket.io)
- `session:timer_update`
- `session:state_change`
