import { pgTable, serial, varchar, text, timestamp, integer, json, PgTable } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

// Disputes table
export const disputes = pgTable('disputes', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull(),
  initiatorId: integer('initiator_id').notNull(),
  respondentId: integer('respondent_id').notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'payment', 'quality', 'deadline'
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  status: varchar('status', { length: 50 }).default('open').notNull(),
  priority: varchar('priority', { length: 20 }).default('medium').notNull(),
  evidence: json('evidence').$type<string[]>(),
  resolution: text('resolution'),
  resolvedBy: integer('resolved_by'),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}) as any;

// Dispute messages table
export const disputeMessages = pgTable('dispute_messages', {
  id: serial('id').primaryKey(),
  disputeId: integer('dispute_id').references(() => disputes.id).notNull(),
  senderId: integer('sender_id').notNull(),
  message: text('message').notNull(),
  attachments: json('attachments').$type<string[]>(),
  isInternal: integer('is_internal').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}) as any;

// Dispute resolutions table
export const disputeResolutions = pgTable('dispute_resolutions', {
  id: serial('id').primaryKey(),
  disputeId: integer('dispute_id').references(() => disputes.id).notNull(),
  resolutionType: varchar('resolution_type', { length: 50 }).notNull(),
  amount: integer('amount'),
  description: text('description').notNull(),
  approvedByClient: integer('approved_by_client'),
  approvedByWorker: integer('approved_by_worker'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}) as any;

// Zod schemas for validation
export const insertDisputeSchema = createInsertSchema(disputes) as any;
export const selectDisputeSchema = createSelectSchema(disputes) as any;
export const insertDisputeMessageSchema = createInsertSchema(disputeMessages) as any;
export const selectDisputeMessageSchema = createSelectSchema(disputeMessages) as any;
export const insertDisputeResolutionSchema = createInsertSchema(disputeResolutions) as any;
export const selectDisputeResolutionSchema = createSelectSchema(disputeResolutions) as any;