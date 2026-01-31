# Technical Specification: Message Service

**Service Name**: `message-service`
**Repository**: `tulifo-gig-backend/apps/message-service`
**Language**: Node.js (TypeScript)
**Framework**: Express.js + Socket.io
**Database**: MongoDB (Chat History), Redis (Pub/Sub for scaling)
**Port**: 3007

## 1. Responsibilities
- Real-time Chat (WebSockets)
- Chat History Persistence
- Presence System (Online/Offline status)

## 2. Architecture
- **Socket.io**: Handles real-time connections.
- **Redis Adapter**: Allows scaling to multiple instances.

## 3. Database Schema (MongoDB)

```typescript
interface Message {
  conversationId: string;
  senderId: string;
  content: string; // Encrypted ideally
  attachments: string[];
  createdAt: Date;
  readBy: string[];
}

interface Conversation {
  participants: string[];
  lastMessageAt: Date;
}
```

## 4. API Endpoints
- `GET /conversations`
- `GET /conversations/:id/messages`
