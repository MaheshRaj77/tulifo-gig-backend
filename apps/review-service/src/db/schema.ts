import { pgTable, serial, varchar, text, timestamp, decimal, integer, PgTable } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

// Reviews table
export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull(),
  reviewerId: integer('reviewer_id').notNull(),
  revieweeId: integer('reviewee_id').notNull(),
  rating: integer('rating').notNull(), // 1-5 stars
  title: varchar('title', { length: 255 }),
  comment: text('comment'),
  reviewType: varchar('review_type', { length: 20 }).notNull(), // 'client_to_worker', 'worker_to_client'
  isPublic: integer('is_public').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}) as any;

// Review responses table
export const reviewResponses = pgTable('review_responses', {
  id: serial('id').primaryKey(),
  reviewId: integer('review_id').references(() => reviews.id).notNull(),
  responderId: integer('responder_id').notNull(),
  response: text('response').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}) as any;

// Review statistics table
export const reviewStatistics = pgTable('review_statistics', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  totalReviews: integer('total_reviews').default(0).notNull(),
  averageRating: decimal('average_rating', { precision: 3, scale: 2 }).default('0').notNull(),
  fiveStarCount: integer('five_star_count').default(0).notNull(),
  fourStarCount: integer('four_star_count').default(0).notNull(),
  threeStarCount: integer('three_star_count').default(0).notNull(),
  twoStarCount: integer('two_star_count').default(0).notNull(),
  oneStarCount: integer('one_star_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}) as any;

// Zod schemas for validation
export const insertReviewSchema = createInsertSchema(reviews) as any;
export const selectReviewSchema = createSelectSchema(reviews) as any;
export const insertReviewResponseSchema = createInsertSchema(reviewResponses) as any;
export const selectReviewResponseSchema = createSelectSchema(reviewResponses) as any;
export const insertReviewStatisticsSchema = createInsertSchema(reviewStatistics) as any;
export const selectReviewStatisticsSchema = createSelectSchema(reviewStatistics) as any;