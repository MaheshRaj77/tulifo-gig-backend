import { logger } from './logger';

export interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channels?: ('in_app' | 'email' | 'push')[];
}

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006';
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || 'dev-internal-key';

/**
 * Send a notification to a user via the notification service.
 * This is an internal service-to-service call.
 * 
 * @param payload - The notification payload
 * @returns Promise<boolean> - true if notification was sent successfully
 */
export async function sendNotification(payload: NotificationPayload): Promise<boolean> {
  try {
    const response = await fetch(`${NOTIFICATION_SERVICE_URL}/api/notifications/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service-key': INTERNAL_SERVICE_KEY,
      },
      body: JSON.stringify({
        userId: payload.userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
        channels: payload.channels || ['in_app'],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('Failed to send notification:', { error, payload });
      return false;
    }

    logger.info('Notification sent successfully', { type: payload.type, userId: payload.userId });
    return true;
  } catch (error) {
    logger.error('Error sending notification:', { error, payload });
    return false;
  }
}

/**
 * Helper functions for common notification types
 */
export const notifications = {
  bidPlaced: async (projectOwnerId: string, projectTitle: string, bidderName: string, bidAmount: number, email?: string) => {
    return sendNotification({
      userId: projectOwnerId,
      type: 'bid.submitted',
      title: 'New Bid Received',
      body: `${bidderName} placed a bid of $${bidAmount} on "${projectTitle}"`,
      data: { email },
      channels: ['in_app', ...(email ? ['email' as const] : [])],
    });
  },

  bidAccepted: async (workerId: string, projectTitle: string, clientName: string, email?: string) => {
    return sendNotification({
      userId: workerId,
      type: 'bid.accepted',
      title: 'Bid Accepted! 🎉',
      body: `${clientName} accepted your bid on "${projectTitle}"`,
      data: { email },
      channels: ['in_app', 'push', ...(email ? ['email' as const] : [])],
    });
  },

  newMessage: async (recipientId: string, senderName: string, messagePreview: string, email?: string) => {
    return sendNotification({
      userId: recipientId,
      type: 'message.received',
      title: 'New Message',
      body: `${senderName}: ${messagePreview.substring(0, 100)}${messagePreview.length > 100 ? '...' : ''}`,
      data: { email },
      channels: ['in_app', 'push'],
    });
  },

  paymentCompleted: async (userId: string, amount: number, projectTitle: string, email?: string) => {
    return sendNotification({
      userId,
      type: 'payment.completed',
      title: 'Payment Received',
      body: `You received $${amount} for "${projectTitle}"`,
      data: { email },
      channels: ['in_app', 'email', 'push'],
    });
  },

  paymentFailed: async (userId: string, amount: number, reason: string, email?: string) => {
    return sendNotification({
      userId,
      type: 'payment.failed',
      title: 'Payment Failed',
      body: `Payment of $${amount} failed: ${reason}`,
      data: { email },
      channels: ['in_app', 'email'],
    });
  },

  projectDelivered: async (clientId: string, projectTitle: string, workerName: string, email?: string) => {
    return sendNotification({
      userId: clientId,
      type: 'project.delivered',
      title: 'Project Delivered',
      body: `${workerName} has delivered "${projectTitle}". Please review.`,
      data: { email },
      channels: ['in_app', 'email', 'push'],
    });
  },

  projectCompleted: async (workerId: string, projectTitle: string, email?: string) => {
    return sendNotification({
      userId: workerId,
      type: 'project.completed',
      title: 'Project Completed',
      body: `"${projectTitle}" has been marked as completed`,
      data: { email },
      channels: ['in_app', 'push'],
    });
  },

  bookingCreated: async (workerId: string, clientName: string, date: string, email?: string) => {
    return sendNotification({
      userId: workerId,
      type: 'booking.created',
      title: 'New Booking Request',
      body: `${clientName} requested a booking for ${date}`,
      data: { email },
      channels: ['in_app', 'email', 'push'],
    });
  },

  bookingConfirmed: async (clientId: string, workerName: string, date: string, email?: string) => {
    return sendNotification({
      userId: clientId,
      type: 'booking.confirmed',
      title: 'Booking Confirmed',
      body: `${workerName} confirmed your booking for ${date}`,
      data: { email },
      channels: ['in_app', 'email', 'push'],
    });
  },
};
