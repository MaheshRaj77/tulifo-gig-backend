// @ts-nocheck
/* eslint-disable */
/**
 * Security Implementation Guide for Auth Service
 * Shows how to integrate all security modules into your auth service
 */

// ═══════════════════════════════════════════════════════════════════
// COMPLETE SETUP EXAMPLE - Copy to your auth service index.ts
// ═══════════════════════════════════════════════════════════════════

// imports from previously created security modules
import express, { Request, Response, NextFunction } from 'express';
import corsModule from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import path from 'node:path';

import {
  getClientIp,
  createRateLimiter,
  securityHeaders,
  initializeSecurityContext,
  generateCsrfToken,
} from './lib/advanced-security';

import {
  requestId,
  requestLogger,
  authenticate,
  authorize,
  errorHandler,
} from './lib/middleware';

import { logger } from './lib/logger';
import { sanitizeInput } from './lib/sanitize.middleware';

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Load Configuration ────────────────────────────────────────────
config({ path: path.resolve(process.cwd(), '../../.env') });
config();

// ─── Validate Environment Variables ────────────────────────────────
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'CORS_ORIGIN',
  'DATA_ENCRYPTION_KEY',
];

const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0 && process.env.NODE_ENV === 'production') {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

// ─── Trust Proxy (for rate limiter + IP detection) ─────────────────
app.set('trust proxy', 1);

// ─── Phase 1: Early Security Headers ───────────────────────────────
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
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : undefined,
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  xssFilter: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
}));

// ─── Phase 2: HTTPS Enforcement ─────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production' && 
      req.headers['x-forwarded-proto'] !== 'https') {
    logger.warn('Non-HTTPS request attempted', { ip: getClientIp(req) });
    return res.redirect(301, `https://${req.hostname}${req.url}`);
  }
  next();
});

// ─── Phase 3: CORS Configuration ───────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());

app.use(corsModule({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-CSRF-Token'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400, // Preflight cache: 24 hours
  optionsSuccessStatus: 200,
}));

// ─── Phase 4: Body Parsing with Size Limits ────────────────────────
// Prevent payload amplification attacks
app.use(express.json({ 
  limit: '10kb', // Strict limit for API
}));

app.use(express.urlencoded({ 
  limit: '10kb', 
  extended: true,
}));

// ─── Phase 5: Request Context & Security ───────────────────────────
// Generate unique request ID
app.use(requestId);

// Initialize security context
app.use(initializeSecurityContext);

// Log all requests
app.use(requestLogger);

// Apply custom security headers
app.use(securityHeaders);

// ─── Phase 6: Input Sanitization ───────────────────────────────────
app.use(sanitizeInput);

// ─── Phase 7: Rate Limiting ────────────────────────────────────────

// Global API rate limiter (generous, per-IP)
app.use(createRateLimiter('global', {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,    // 100 requests per minute per IP
  keyGenerator: (req: Request) => getClientIp(req),
}));

// Strict login rate limiter
const loginRateLimiter = createRateLimiter('login', {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,           // Max 5 attempts
  keyGenerator: (req: Request) => {
    // Rate limit by email address (from request body)
    const email = (req.body?.email || '').toLowerCase();
    return email || getClientIp(req);
  },
});

// Strict password reset rate limiter
const passwordResetRateLimiter = createRateLimiter('passwordReset', {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3,           // Max 3 attempts per hour
  keyGenerator: (req: Request) => {
    const email = (req.body?.email || '').toLowerCase();
    return email || getClientIp(req);
  },
});

// ─── Phase 8: Session & CSRF Protection ────────────────────────────

// Session middleware (configure based on your needs)
// Example using express-session:
// const session = require('express-session');
// app.use(session({
//   secret: process.env.SESSION_SECRET,
//   resave: false,
//   saveUninitialized: false,
//   cookie: {
//     secure: process.env.NODE_ENV === 'production',
//     httpOnly: true,
//     maxAge: 24 * 60 * 60 * 1000, // 24 hours
//     sameSite: 'strict',
//   },
// }));

// Generate CSRF token on login page / session start
app.get('/csrf-token', (req: Request, res: Response) => {
  const token = generateCsrfToken();
  // Store in session for verification
  // req.session.csrfToken = token;
  res.json({ csrfToken: token });
});

// ─── Phase 9: Database Connection ──────────────────────────────────

import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } 
    : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error('Unexpected pool error:', err);
  process.exit(1);
});

// Test connection
pool.query('SELECT NOW()')
  .then(() => logger.info('✓ Database connected'))
  .catch((err) => {
    logger.error('✗ Database connection failed:', err);
    process.exit(1);
  });

// ─── Phase 10: Routes with Security ────────────────────────────────

import authRoutes from './routes/auth.routes';

// Public routes (no auth required)
app.use('/api/auth', loginRateLimiter, authRoutes);

// Protected routes (auth required)
app.all('/api/protected/*', authenticate);

app.all('/api/admin/*', authenticate, authorize('ADMIN'));

// ─── Phase 11: Health Check ────────────────────────────────────────

app.get('/health', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.status(200).json({
      status: 'healthy',
      service: 'auth-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'auth-service',
      error: 'Database connection failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// ─── Phase 12: 404 Handler ─────────────────────────────────────────

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint does not exist',
      path: req.path,
      method: req.method,
    },
  });
});

// ─── Phase 13: Error Handler (Last middleware) ────────────────────
app.use(errorHandler);

// ─── Phase 14: Server Startup ──────────────────────────────────────

const server = app.listen(PORT, () => {
  logger.info(`✓ Auth service running on port ${PORT}`);
  logger.info(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`✓ CORS origins: ${allowedOrigins.join(', ')}`);
  logger.info(`✓ Database: ${process.env.DATABASE_URL ? 'configured' : 'NOT SET'}`);
});

// ─── Phase 15: Graceful Shutdown ───────────────────────────────────

const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received - shutting down gracefully...`);

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

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown - some connections did not close properly');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ─── Phase 16: Uncaught Exceptions ─────────────────────────────────

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', { reason, promise });
});

export default app;
