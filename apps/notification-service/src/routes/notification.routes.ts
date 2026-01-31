import { Router, Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { getDb, webpush, emailTransporter } from '../index';
import { authenticate, validate, logger } from '../lib';

const router: Router = Router();

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string()
  })
});

const sendNotificationSchema = z.object({
  userId: z.string().uuid(),
  type: z.string(),
  title: z.string(),
  body: z.string(),
  data: z.record(z.unknown()).optional(),
  channels: z.array(z.enum(['in_app', 'email', 'push'])).default(['in_app'])
});

// Get user's notifications
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { unreadOnly, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const db = getDb();
    const query: Record<string, unknown> = { userId: req.user!.userId };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const notifications = await db.collection('notifications')
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .toArray();

    const total = await db.collection('notifications').countDocuments(query);
    const unreadCount = await db.collection('notifications').countDocuments({
      userId: req.user!.userId,
      isRead: false
    });

    res.json({
      success: true,
      data: notifications,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        unreadCount
      }
    });
  } catch (error) {
    next(error);
  }
});

// Mark notification as read
router.patch('/:id/read', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const db = getDb();

    await db.collection('notifications').updateOne(
      { _id: new ObjectId(id), userId: req.user!.userId },
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Mark all as read
router.patch('/read-all', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();

    await db.collection('notifications').updateMany(
      { userId: req.user!.userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Subscribe to push notifications
router.post('/subscribe', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subscription = validate(subscribeSchema, req.body);
    const db = getDb();

    await db.collection('push_subscriptions').updateOne(
      { userId: req.user!.userId },
      { $set: { userId: req.user!.userId, subscription, updatedAt: new Date() } },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Send notification (internal API)
router.post('/send', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = validate(sendNotificationSchema, req.body);
    const db = getDb();
    const channels = data.channels || ['in_app'];

    // Create notification record
    const notification = {
      userId: data.userId,
      type: data.type,
      title: data.title,
      body: data.body,
      data: data.data || {},
      channels: channels,
      isRead: false,
      createdAt: new Date()
    };

    await db.collection('notifications').insertOne(notification);

    // Send push notification
    if (channels.includes('push')) {
      const sub = await db.collection('push_subscriptions').findOne({ userId: data.userId });
      if (sub) {
        try {
          await webpush.sendNotification(sub.subscription, JSON.stringify({
            title: data.title,
            body: data.body,
            data: data.data
          }));
        } catch (err) {
          logger.error('Push notification failed:', err);
        }
      }
    }

    // Send email notification
    if (channels.includes('email') && data.data?.email) {
      try {
        await emailTransporter.sendMail({
          from: process.env.EMAIL_FROM || 'noreply@flexwork.com',
          to: data.data.email as string,
          subject: data.title,
          text: data.body,
          html: `<p>${data.body}</p>`
        });
      } catch (err) {
        logger.error('Email notification failed:', err);
      }
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
