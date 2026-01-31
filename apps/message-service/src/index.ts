import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { MongoClient, Db } from 'mongodb';
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

io.on('connection', (socket) => {
  const userId = socket.data.user.userId;
  socket.join(`user:${userId}`);
  logger.info(`User connected: ${userId}`);

  socket.on('join_conversation', (conversationId: string) => {
    socket.join(`conversation:${conversationId}`);
  });

  socket.on('leave_conversation', (conversationId: string) => {
    socket.leave(`conversation:${conversationId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${userId}`);
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
