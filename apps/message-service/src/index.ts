import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { MongoClient, Db, ObjectId } from 'mongodb';
import { logger, errorHandler, verifyAccessToken } from './lib';
import messageRoutes from './routes/message.routes';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3005;

// MongoDB connection
let db: Db;
export const getDb = () => db;

async function connectMongo() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
  await client.connect();
  db = client.db('flexwork_messages');
  logger.info('Connected to MongoDB');
}

connectMongo().catch(err => logger.error('MongoDB connection error:', err));

// Socket.io setup
export const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

// Socket authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  try {
    const payload = verifyAccessToken(token);
    socket.data.user = payload;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

// Track online users
const onlineUsers = new Map<string, Set<string>>(); // userId -> Set of socketIds

io.on('connection', (socket) => {
  const userId = socket.data.user.userId;
  socket.join(`user:${userId}`);
  logger.info(`User connected: ${userId}`);

  // Track online presence
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId)!.add(socket.id);
  io.emit('user_online', { userId });

  // Join a conversation room
  socket.on('join_conversation', (conversationId: string) => {
    socket.join(`conversation:${conversationId}`);
    logger.info(`User ${userId} joined conversation ${conversationId}`);
  });

  // Leave a conversation room
  socket.on('leave_conversation', (conversationId: string) => {
    socket.leave(`conversation:${conversationId}`);
  });

  // ── Send message via WebSocket ──
  socket.on('send_message', async (data: {
    conversationId: string;
    content: string;
    type?: string;
    attachments?: Array<{ name: string; url: string; type: string; size: number }>;
  }, callback?: (response: { success: boolean; data?: unknown; error?: string }) => void) => {
    try {
      const { conversationId, content, type = 'text', attachments = [] } = data;

      if (!content || !content.trim()) {
        callback?.({ success: false, error: 'Message content is required' });
        return;
      }

      const database = getDb();

      // Verify participant
      const conversation = await database.collection('conversations').findOne({
        _id: new ObjectId(conversationId),
        participants: userId
      });

      if (!conversation) {
        callback?.({ success: false, error: 'Conversation not found' });
        return;
      }

      const message = {
        conversationId,
        senderId: userId,
        content: content.trim(),
        type,
        attachments,
        readBy: [userId],
        createdAt: new Date()
      };

      const result = await database.collection('messages').insertOne(message);

      // Update conversation's last message
      await database.collection('conversations').updateOne(
        { _id: new ObjectId(conversationId) },
        { $set: { lastMessage: message, updatedAt: new Date() } }
      );

      const fullMessage = { _id: result.insertedId, ...message };

      // Emit to conversation room
      io.to(`conversation:${conversationId}`).emit('new_message', fullMessage);

      // Also emit to individual user rooms for notifications
      conversation.participants.forEach((participantId: string) => {
        if (participantId !== userId) {
          io.to(`user:${participantId}`).emit('new_message', fullMessage);
          io.to(`user:${participantId}`).emit('conversation_updated', {
            conversationId,
            lastMessage: fullMessage,
          });
        }
      });

      callback?.({ success: true, data: fullMessage });
    } catch (error) {
      logger.error('send_message error:', error);
      callback?.({ success: false, error: 'Failed to send message' });
    }
  });

  // ── Typing indicator ──
  socket.on('typing_start', (conversationId: string) => {
    socket.to(`conversation:${conversationId}`).emit('user_typing', {
      userId,
      conversationId,
    });
  });

  socket.on('typing_stop', (conversationId: string) => {
    socket.to(`conversation:${conversationId}`).emit('user_stop_typing', {
      userId,
      conversationId,
    });
  });

  // ── Mark messages as read ──
  socket.on('mark_read', async (conversationId: string) => {
    try {
      const database = getDb();
      await database.collection('messages').updateMany(
        {
          conversationId,
          senderId: { $ne: userId },
          readBy: { $nin: [userId] },
        },
        { $addToSet: { readBy: userId } }
      );

      // Notify the other participants
      socket.to(`conversation:${conversationId}`).emit('messages_read', {
        userId,
        conversationId,
      });
    } catch (error) {
      logger.error('mark_read error:', error);
    }
  });

  // ── Get online users ──
  socket.on('get_online_users', (userIds: string[], callback?: (onlineIds: string[]) => void) => {
    const online = userIds.filter(id => onlineUsers.has(id) && onlineUsers.get(id)!.size > 0);
    callback?.(online);
  });

  // Disconnect
  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${userId}`);
    const sockets = onlineUsers.get(userId);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        onlineUsers.delete(userId);
        io.emit('user_offline', { userId });
      }
    }
  });
});

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'message-service' });
});

app.use('/api/messages', messageRoutes);

app.use(errorHandler);

httpServer.listen(PORT, () => {
  logger.info(`Message service running on port ${PORT}`);
});
