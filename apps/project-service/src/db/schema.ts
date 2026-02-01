import { pgTable, serial, varchar, text, timestamp, decimal, integer, json, boolean, PgTable } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

// Projects table
export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  clientId: integer('client_id').notNull(),
  budget: decimal('budget', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD').notNull(),
  status: varchar('status', { length: 50 }).default('draft').notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  skills: json('skills').$type<string[]>().notNull(),
  deadline: timestamp('deadline'),
  attachments: json('attachments').$type<string[]>(),
  requirements: json('requirements').$type<Record<string, any>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}) as any;

// Project applications table
export const projectApplications = pgTable('project_applications', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id).notNull(),
  workerId: integer('worker_id').notNull(),
  proposal: text('proposal').notNull(),
  budget: decimal('budget', { precision: 10, scale: 2 }).notNull(),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}) as any;

// Zod schemas for validation
export const insertProjectSchema = createInsertSchema(projects) as any;
export const selectProjectSchema = createSelectSchema(projects) as any;
export const insertProjectApplicationSchema = createInsertSchema(projectApplications) as any;
export const selectProjectApplicationSchema = createSelectSchema(projectApplications) as any;