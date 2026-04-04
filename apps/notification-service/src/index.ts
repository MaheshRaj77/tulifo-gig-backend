import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { MongoClient, Db } from 'mongodb';
import webpush from 'web-push';
import nodemailer from 'nodemailer';
import { logger, errorHandler, verifyAccessToken } from './lib';
import notificationRoutes from './routes/notification.routes';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3006;

// MongoDB connection
let db: Db;
export const getDb = () => db;

async function connectMongo() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
  await client.connect();
  db = client.db('flexwork_notifications');
  logger.info('Connected to MongoDB');
}

connectMongo().catch(err => logger.error('MongoDB connection error:', err));

// Socket.io setup for real-time notifications
export const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  },
  path: '/notifications-socket'
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
  logger.info(`User connected to notifications: ${userId}`);
  
  // Join user-specific room for targeted notifications
  socket.join(`user:${userId}`);
  
  socket.on('disconnect', () => {
    logger.info(`User disconnected from notifications: ${userId}`);
  });
});

// Helper to emit notification to specific user
export function emitNotification(userId: string, notification: Record<string, unknown>) {
  io.to(`user:${userId}`).emit('new_notification', notification);
}

// Web Push setup
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:support@flexwork.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// Email transporter
export const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export { webpush };

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'notification-service' });
});

// Mount at root - the gateway strips /api/notifications prefix before forwarding
app.use('/api/notifications', notificationRoutes);

app.use(errorHandler);

httpServer.listen(PORT, () => {
  logger.info(`Notification service running on port ${PORT}`);
});
