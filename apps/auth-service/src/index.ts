import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import path from 'path';
import { Pool } from 'pg';
import { logger, errorHandler, requestId, requestLogger } from './lib';
import { sanitizeInput } from './lib/sanitize.middleware';
import authRoutes from './routes/auth.routes';

// Load .env from the monorepo root
config({ path: path.resolve(process.cwd(), '../../.env') });
// Also try local .env as fallback
config();

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Database Connection Pool ──────────────────────────────────────
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,                  // Max connections in pool
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Fail if can't connect in 5s
});

// Test database connection
pool.query('SELECT NOW()')
  .then(async () => {
    logger.info('Connected to PostgreSQL');
    // Ensure password_reset_tokens table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
  })
  .catch((err) => logger.error('Database connection error:', err));

// ─── Trust Proxy (for rate limiter + IP detection behind gateway) ──
app.set('trust proxy', 1);

// ─── Security Middleware ───────────────────────────────────────────

// Helmet with strict CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// CORS — whitelist only allowed origins
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  maxAge: 86400, // Preflight cache: 24 hours
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

// ─── Request Pipeline ──────────────────────────────────────────────

// Request ID correlation
app.use(requestId);

// Request logging
app.use(requestLogger);

// Input sanitization
app.use(sanitizeInput);

// ─── Health Check ──────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'healthy',
      service: 'auth-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch {
    res.status(503).json({
      status: 'unhealthy',
      service: 'auth-service',
      error: 'Database connection failed',
    });
  }
});

// ─── Routes ────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// ─── Error Handler ─────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ──────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`Auth service running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
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

  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
