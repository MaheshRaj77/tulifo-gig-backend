# Technical Specification: Notification Service

**Service Name**: `notification-service`
**Repository**: `tulifo-gig-backend/apps/notification-service`
**Language**: Node.js (TypeScript)
**Framework**: Express.js (Worker mostly)
**Database**: Redis (Queue), MongoDB (Logs)
**Port**: 3006

## 1. Responsibilities
- Send Emails (SendGrid/SES)
- Send SMS (Twilio)
- Push Notifications (FCM)
- In-App Notification History

## 2. Architecture
- Acts as a **Consumer** of RabbitMQ events (`user.created`, `booking.confirmed`).
- Exposes API for manual triggers and history.

## 3. API Endpoints
- `GET /notifications` - Get user's notification history.
- `PUT /notifications/:id/read` - Mark as read.

## 4. Events Consumed
- `booking.created` -> Email Client & Worker.
- `message.received` -> Push Notification.
