import { Router, Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { getDb, io } from '../index';
import { authenticate, validate, NotFoundError } from '../lib';

const router: Router = Router();

const createConversationSchema = z.object({
  participantId: z.string().uuid(),
  projectId: z.string().uuid().optional()
});

const sendMessageSchema = z.object({
  content: z.string().min(1),
  type: z.enum(['text', 'file', 'image']).default('text'),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    type: z.string(),
    size: z.number()
  })).optional()
});

// Get user's conversations
router.get('/conversations', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const conversations = await db.collection('conversations')
      .find({ participants: req.user!.userId })
      .sort({ updatedAt: -1 })
      .toArray();

    res.json({ success: true, data: conversations });
  } catch (error) {
    next(error);
  }
});

// Create or get conversation
router.post('/conversations', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = validate(createConversationSchema, req.body);
    const db = getDb();

    // Check if conversation exists
    const existing = await db.collection('conversations').findOne({
      participants: { $all: [req.user!.userId, data.participantId] },
      ...(data.projectId && { projectId: data.projectId })
    });

    if (existing) {
      return res.json({ success: true, data: existing });
    }

    // Create new conversation
    const conversation = {
      participants: [req.user!.userId, data.participantId],
      projectId: data.projectId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('conversations').insertOne(conversation);

    res.status(201).json({
      success: true,
      data: { _id: result.insertedId, ...conversation }
    });
  } catch (error) {
    next(error);
  }
});

// Get messages in conversation
router.get('/conversations/:id/messages', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const db = getDb();
    
    // Verify participant
    const conversation = await db.collection('conversations').findOne({
      _id: new ObjectId(id),
      participants: req.user!.userId
    });

    if (!conversation) {
      throw new NotFoundError('Conversation');
    }

    const messages = await db.collection('messages')
      .find({ conversationId: id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .toArray();

    // Mark as read
    await db.collection('messages').updateMany(
      { conversationId: id, senderId: { $ne: req.user!.userId }, readBy: { $nin: [req.user!.userId] } },
      { $addToSet: { readBy: req.user!.userId } }
    );

    res.json({
      success: true,
      data: messages.reverse(),
      meta: { page: Number(page), limit: Number(limit) }
    });
  } catch (error) {
    next(error);
  }
});

// Send message
router.post('/conversations/:id/messages', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = validate(sendMessageSchema, req.body);
    const db = getDb();

    // Verify participant
    const conversation = await db.collection('conversations').findOne({
      _id: new ObjectId(id),
      participants: req.user!.userId
    });

    if (!conversation) {
      throw new NotFoundError('Conversation');
    }

    const message = {
      conversationId: id,
      senderId: req.user!.userId,
      content: data.content,
      type: data.type,
      attachments: data.attachments || [],
      readBy: [req.user!.userId],
      createdAt: new Date()
    };

    const result = await db.collection('messages').insertOne(message);

    // Update conversation
    await db.collection('conversations').updateOne(
      { _id: new ObjectId(id) },
      { $set: { lastMessage: message, updatedAt: new Date() } }
    );

    const fullMessage = { _id: result.insertedId, ...message };

    // Emit to all participants via Socket.io
    io.to(`conversation:${id}`).emit('new_message', fullMessage);

    // Also emit to individual user rooms for participants not in conversation room
    conversation.participants.forEach((participantId: string) => {
      if (participantId !== req.user!.userId) {
        io.to(`user:${participantId}`).emit('new_message', fullMessage);
      }
    });

    res.status(201).json({ success: true, data: fullMessage });
  } catch (error) {
    next(error);
  }
});

export default router;
