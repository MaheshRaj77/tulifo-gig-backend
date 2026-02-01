import { pgTable, serial, varchar, text, timestamp, decimal, integer, json } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

// Client profiles table
export const clientProfiles = pgTable('client_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  company: varchar('company', { length: 255 }),
  industry: varchar('industry', { length: 100 }),
  companySize: varchar('company_size', { length: 50 }),
  website: varchar('website', { length: 255 }),
  description: text('description'),
  verified: integer('verified').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}) as any;

// Bookings table
export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull(),
  clientId: integer('client_id').notNull(),
  workerId: integer('worker_id').notNull(),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  agreedBudget: decimal('agreed_budget', { precision: 10, scale: 2 }).notNull(),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  deliverables: json('deliverables').$type<string[]>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}) as any;

// Client spending table
export const clientSpending = pgTable('client_spending', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id').notNull(),
  totalSpent: decimal('total_spent', { precision: 10, scale: 2 }).default('0').notNull(),
  projectsCompleted: integer('projects_completed').default(0).notNull(),
  averageRating: decimal('average_rating', { precision: 3, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}) as any;

// Zod schemas for validation
export const insertClientProfileSchema = createInsertSchema(clientProfiles) as any;
export const selectClientProfileSchema = createSelectSchema(clientProfiles) as any;
export const insertBookingSchema = createInsertSchema(bookings) as any;
export const selectBookingSchema = createSelectSchema(bookings) as any;
export const insertClientSpendingSchema = createInsertSchema(clientSpending) as any;
export const selectClientSpendingSchema = createSelectSchema(clientSpending) as any;