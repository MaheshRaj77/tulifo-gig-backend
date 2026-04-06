import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { Pool } from 'pg';
import { logger, errorHandler } from './lib';
import userRoutes from './routes/user.routes';
import workerRoutes from './routes/worker.routes';
import clientRoutes from './routes/client.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.query('SELECT NOW()')
  .then(() => logger.info('Connected to PostgreSQL'))
  .catch((err) => logger.error('Database connection error:', err));

// ─── Trust Proxy (for IP detection behind gateway / load balancer) ─
app.set('trust proxy', 1);

app.use(helmet({
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// CORS — locked to allowed origins only
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  maxAge: 86400,
}));

// Body parser with size limit (prevent payload attacks)
app.use(express.json({ limit: '10kb' }));

// HTTPS enforcement in production
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, `https://${req.hostname}${req.url}`);
  }
  next();
});

// Request ID correlation
app.use((req, res, next) => {
  const id = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  (req as express.Request & { requestId?: string }).requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
});

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${Date.now() - start}ms`,
      ip: req.ip,
    });
  });
  next();
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', service: 'user-service', timestamp: new Date().toISOString(), uptime: process.uptime() });
  } catch {
    res.status(503).json({ status: 'unhealthy', service: 'user-service', error: 'Database connection failed' });
  }
});

app.use('/api/users', userRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/clients', clientRoutes);

app.use(errorHandler);

const server = app.listen(PORT, () => {
  logger.info(`User service running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});

// ─── Graceful Shutdown ─────────────────────────────────────────────
function gracefulShutdown(signal: string) {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    logger.info('HTTP server closed');
    try {
      await pool.end();
      logger.info('Database pool closed');
    } catch (err) {
      logger.error('Error closing database pool:', err);
    }
    process.exit(0);
  });
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
