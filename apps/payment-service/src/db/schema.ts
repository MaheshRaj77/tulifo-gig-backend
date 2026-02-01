import { pgTable, serial, varchar, text, timestamp, decimal, integer, json } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

// Payments table
export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD').notNull(),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }).notNull(),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
  projectId: integer('project_id').notNull(),
  payerId: integer('payer_id').notNull(),
  payeeId: integer('payee_id').notNull(),
  description: text('description'),
  metadata: json('metadata').$type<Record<string, any>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}) as any;

// Transactions table
export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  paymentId: integer('payment_id').references(() => payments.id).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'credit', 'debit'
  description: text('description'),
  balance: decimal('balance', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}) as any;

// Payment methods table
export const paymentMethods = pgTable('payment_methods', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'card', 'bank'
  stripePaymentMethodId: varchar('stripe_payment_method_id', { length: 255 }).notNull(),
  isDefault: integer('is_default').default(0).notNull(),
  metadata: json('metadata').$type<Record<string, any>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}) as any;

// Zod schemas for validation
export const insertPaymentSchema = createInsertSchema(payments) as any;
export const selectPaymentSchema = createSelectSchema(payments) as any;
export const insertTransactionSchema = createInsertSchema(transactions) as any;
export const selectTransactionSchema = createSelectSchema(transactions) as any;
export const insertPaymentMethodSchema = createInsertSchema(paymentMethods) as any;
export const selectPaymentMethodSchema = createSelectSchema(paymentMethods) as any;