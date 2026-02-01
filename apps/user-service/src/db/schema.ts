import { pgTable, serial, varchar, text, timestamp, json, integer } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

// User profiles table
export const userProfiles = pgTable('user_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  bio: text('bio'),
  skills: json('skills').$type<string[]>(),
  experience: varchar('experience', { length: 100 }),
  location: varchar('location', { length: 255 }),
  avatar: varchar('avatar', { length: 500 }),
  portfolio: json('portfolio').$type<string[]>(),
  socialLinks: json('social_links').$type<Record<string, string>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}) as any;

// User settings table
export const userSettings = pgTable('user_settings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  notifications: json('notifications').$type<Record<string, boolean>>(),
  privacy: json('privacy').$type<Record<string, string>>(),
  preferences: json('preferences').$type<Record<string, any>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}) as any;

// Zod schemas for validation
export const insertUserProfileSchema = createInsertSchema(userProfiles) as any;
export const selectUserProfileSchema = createSelectSchema(userProfiles) as any;
export const insertUserSettingsSchema = createInsertSchema(userSettings) as any;
export const selectUserSettingsSchema = createSelectSchema(userSettings) as any;