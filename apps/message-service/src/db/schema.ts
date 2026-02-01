import { z } from 'zod';

// Message validation schema
export const messageSchema = z.object({
  _id: z.string().optional(),
  conversationId: z.string().uuid(),
  senderId: z.string().uuid(),
  content: z.string().min(1),
  messageType: z.enum(['text', 'file', 'image']).default('text'),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    type: z.string(),
    size: z.number()
  })).optional(),
  readAt: z.date().optional(),
  createdAt: z.date().default(() => new Date()),
});

export type Message = z.infer<typeof messageSchema>;

// Conversation validation schema
export const conversationSchema = z.object({
  _id: z.string().optional(),
  participants: z.array(z.string().uuid()).min(2),
  title: z.string().max(255).optional(),
  lastMessageAt: z.date().default(() => new Date()),
  createdAt: z.date().default(() => new Date()),
});

export type Conversation = z.infer<typeof conversationSchema>;

// Conversation participant validation schema
export const conversationParticipantSchema = z.object({
  _id: z.string().optional(),
  conversationId: z.string().uuid(),
  userId: z.string().uuid(),
  joinedAt: z.date().default(() => new Date()),
  leftAt: z.date().optional(),
});

export type ConversationParticipant = z.infer<typeof conversationParticipantSchema>;

// Insert/Select schemas for MongoDB operations
export const insertMessageSchema = messageSchema;
export const selectMessageSchema = messageSchema;
export const insertConversationSchema = conversationSchema;
export const selectConversationSchema = conversationSchema;
export const insertConversationParticipantSchema = conversationParticipantSchema;
export const selectConversationParticipantSchema = conversationParticipantSchema;