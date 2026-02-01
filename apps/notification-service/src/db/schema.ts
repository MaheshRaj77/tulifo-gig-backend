import { z } from 'zod';

// Notification validation schema
export const notificationSchema = z.object({
  _id: z.string().optional(),
  userId: z.string().uuid(),
  type: z.enum(['order', 'message', 'review', 'payment', 'system']),
  title: z.string().max(255),
  message: z.string(),
  data: z.record(z.any()).optional(),
  read: z.boolean().default(false),
  readAt: z.date().optional(),
  createdAt: z.date().default(() => new Date()),
});

export type Notification = z.infer<typeof notificationSchema>;

// Notification settings validation schema
export const notificationSettingsSchema = z.object({
  _id: z.string().optional(),
  userId: z.string().uuid(),
  email: z.boolean().default(true),
  push: z.boolean().default(true),
  sms: z.boolean().default(false),
  types: z.record(z.boolean()).optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;

// Insert/Select schemas for MongoDB operations
export const insertNotificationSchema = notificationSchema;
export const selectNotificationSchema = notificationSchema;
export const insertNotificationSettingsSchema = notificationSettingsSchema;
export const selectNotificationSettingsSchema = notificationSettingsSchema;