import { pgTable, serial, varchar, text, timestamp, decimal, integer, PgTable } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

// Escrow accounts table
export const escrowAccounts = pgTable('escrow_accounts', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull(),
  clientId: integer('client_id').notNull(),
  workerId: integer('worker_id').notNull(),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  heldAmount: decimal('held_amount', { precision: 10, scale: 2 }).default('0').notNull(),
  releasedAmount: decimal('released_amount', { precision: 10, scale: 2 }).default('0').notNull(),
  status: varchar('status', { length: 50 }).default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}) as any;

// Escrow transactions table
export const escrowTransactions = pgTable('escrow_transactions', {
  id: serial('id').primaryKey(),
  escrowAccountId: integer('escrow_account_id').references(() => escrowAccounts.id).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'deposit', 'release', 'refund'
  description: text('description'),
  transactionId: varchar('transaction_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}) as any;

// Milestones table
export const milestones = pgTable('milestones', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull(),
  escrowAccountId: integer('escrow_account_id').references(() => escrowAccounts.id).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  dueDate: timestamp('due_date'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}) as any;

// Zod schemas for validation
export const insertEscrowAccountSchema = createInsertSchema(escrowAccounts) as any;
export const selectEscrowAccountSchema = createSelectSchema(escrowAccounts) as any;
export const insertEscrowTransactionSchema = createInsertSchema(escrowTransactions) as any;
export const selectEscrowTransactionSchema = createSelectSchema(escrowTransactions) as any;
export const insertMilestoneSchema = createInsertSchema(milestones) as any;
export const selectMilestoneSchema = createSelectSchema(milestones) as any;