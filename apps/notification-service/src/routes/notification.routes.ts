import { Router, Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { getDb, webpush, emailTransporter, emitNotification } from '../index';
import { authenticate, validate, logger } from '../lib';

const router: Router = Router();

// Internal Auth Middleware
function requireInternalKey(req: Request, res: Response, next: NextFunction) {
  const key = req.headers['x-internal-service-key'];
  if (!key || key !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(401).json({ success: false, error: { message: 'Unauthorized internal service claim' } });
  }
  next();
}

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
router.post('/send', requireInternalKey, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = validate(sendNotificationSchema, req.body);
    const db = getDb();
    const requestedChannels = data.channels || ['in_app'];

    // Get user's notification preferences
    const userPrefs = await db.collection('notification_settings').findOne({ userId: data.userId });
    
    // Filter channels based on user preferences
    const allowedChannels = requestedChannels.filter(channel => {
      if (channel === 'in_app') return true; // Always allow in-app
      if (channel === 'push') return userPrefs?.push !== false;
      if (channel === 'email') {
        // Check specific email preferences based on notification type
        if (data.type.includes('message')) return userPrefs?.email_messages !== false;
        if (data.type.includes('project') || data.type.includes('bid')) return userPrefs?.email_projects !== false;
        return true; // Default allow for other types
      }
      return true;
    });

    // Check bid_alerts preference for bid-related notifications
    if (data.type.includes('bid') && userPrefs?.bid_alerts === false) {
      // Skip notification entirely if bid alerts disabled
      return res.json({ success: true, skipped: true, reason: 'bid_alerts_disabled' });
    }

    // Create notification record
    const notification = {
      userId: data.userId,
      type: data.type,
      title: data.title,
      body: data.body,
      data: data.data || {},
      channels: allowedChannels,
      isRead: false,
      createdAt: new Date()
    };

    const result = await db.collection('notifications').insertOne(notification);
    
    // Emit real-time notification via Socket.io
    emitNotification(data.userId, { _id: result.insertedId, ...notification });

    // Send push notification
    if (allowedChannels.includes('push')) {
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
    if (allowedChannels.includes('email') && data.data?.email) {
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

    res.json({ success: true, channels: allowedChannels });
  } catch (error) {
    next(error);
  }
});

// Get notification preferences
router.get('/preferences', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const settings = await db.collection('notification_settings').findOne({ userId: req.user!.userId });

    // Return defaults if no settings exist
    const defaultSettings = {
      userId: req.user!.userId,
      email_messages: true,
      email_projects: true,
      push: true,
      bid_alerts: true,
    };

    res.json({
      success: true,
      data: settings ? {
        email_messages: settings.email_messages ?? true,
        email_projects: settings.email_projects ?? true,
        push: settings.push ?? true,
        bid_alerts: settings.bid_alerts ?? true,
      } : defaultSettings
    });
  } catch (error) {
    next(error);
  }
});

// Update notification preferences
const preferencesSchema = z.object({
  email_messages: z.boolean().optional(),
  email_projects: z.boolean().optional(),
  push: z.boolean().optional(),
  bid_alerts: z.boolean().optional(),
});

router.put('/preferences', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = validate(preferencesSchema, req.body);
    const db = getDb();

    const result = await db.collection('notification_settings').updateOne(
      { userId: req.user!.userId },
      {
        $set: {
          ...data,
          userId: req.user!.userId,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    // Fetch updated settings
    const settings = await db.collection('notification_settings').findOne({ userId: req.user!.userId });

    res.json({
      success: true,
      data: {
        email_messages: settings?.email_messages ?? true,
        email_projects: settings?.email_projects ?? true,
        push: settings?.push ?? true,
        bid_alerts: settings?.bid_alerts ?? true,
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
