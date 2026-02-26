/**
 * Comprehensive Backend Security Module
 * Implements rate limiting, input validation, encryption, and request verification
 */

import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

// ═══════════════════════════════════════════════════════════════════
// Type Extensions for Express Request
// ═══════════════════════════════════════════════════════════════════
declare global {
  namespace Express {
    interface Request {
      session?: {
        csrfToken?: string;
        [key: string]: any;
      };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// Enhanced Rate Limiting with Multiple Strategies
// ═══════════════════════════════════════════════════════════════════

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (req: Request) => string; // Custom key generator
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
    lastRequestTime: number;
  };
}

const rateLimitStores = new Map<string, RateLimitStore>();

/**
 * Creates an enhanced rate limiter middleware
 * Supports multiple strategies: IP-based, user-based, endpoint-based
 */
export function createRateLimiter(
  strategyName: string,
  config: RateLimitConfig
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const store = rateLimitStores.get(strategyName) || {};
    rateLimitStores.set(strategyName, store);

    const key = config.keyGenerator ? config.keyGenerator(req) : getClientIp(req);
    const now = Date.now();

    if (!store[key]) {
      store[key] = {
        count: 0,
        resetTime: now + config.windowMs,
        lastRequestTime: now,
      };
    }

    const entry = store[key];

    // Reset if window has passed
    if (now > entry.resetTime) {
      entry.count = 0;
      entry.resetTime = now + config.windowMs;
    }

    // Check rate limit
    if (entry.count >= config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      res.setHeader('X-RateLimit-Limit', config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', entry.resetTime);

      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: `Too many requests. Please try again in ${retryAfter} seconds.`,
        },
      });
    }

    entry.count++;
    entry.lastRequestTime = now;

    // Add rate limit info to response headers
    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - entry.count));
    res.setHeader('X-RateLimit-Reset', entry.resetTime);

    // Track endpoint usage
    logger.debug({
      strategy: strategyName,
      key,
      count: entry.count,
      limit: config.maxRequests,
    });

    next();
  };
}

// ═══════════════════════════════════════════════════════════════════
// Request Verification & CSRF Protection
// ═══════════════════════════════════════════════════════════════════

/**
 * Extracts client IP address from request (handles proxies)
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return (req.socket.remoteAddress || 'unknown').split(':').pop() || 'unknown';
}

/**
 * Generates CSRF token for form submissions
 */
export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Validates CSRF token
 */
export function validateCsrfToken(token: string, sessionToken: string): boolean {
  // Use timing-safe comparison to prevent timing attacks
  const tokenBuffer = Buffer.from(token);
  const sessionBuffer = Buffer.from(sessionToken);

  if (tokenBuffer.length !== sessionBuffer.length) {
    return false;
  }

  return timingSafeEqual(tokenBuffer, sessionBuffer);
}

/**
 * CSRF protection middleware
 */
export function csrfProtection(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Only check for state-changing methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }

  const token = req.headers['x-csrf-token'] as string;
  const sessionToken = req.session?.csrfToken;

  if (!token || !sessionToken || !validateCsrfToken(token, sessionToken)) {
    res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_VALIDATION_FAILED',
        message: 'CSRF token validation failed',
      },
    });
    return;
  }

  next();
}

// ═══════════════════════════════════════════════════════════════════
// Encryption Utilities (for sensitive data)
// ═══════════════════════════════════════════════════════════════════

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

/**
 * Encrypts sensitive data at rest
 */
export function encryptData(data: string, encryptionKey?: string): string {
  const key = encryptionKey || process.env.DATA_ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error('Invalid encryption key. Must be at least 32 characters.');
  }

  const iv = randomBytes(16);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, Buffer.from(key.slice(0, 32)), iv);

  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Return: iv + authTag + encrypted (all hex)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts sensitive data
 */
export function decryptData(encryptedData: string, encryptionKey?: string): string {
  const key = encryptionKey || process.env.DATA_ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error('Invalid encryption key. Must be at least 32 characters.');
  }

  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = createDecipheriv(
    ENCRYPTION_ALGORITHM,
    Buffer.from(key.slice(0, 32)),
    iv
  );
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// ═══════════════════════════════════════════════════════════════════
// Hashing Utilities (for data integrity)
// ═══════════════════════════════════════════════════════════════════

/**
 * Creates a SHA-256 hash (for tokens, verification codes, etc.)
 */
export function hashData(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Creates an HMAC for request signing
 */
export function signDataWithHmac(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Verifies HMAC signature (timing-safe)
 */
export function verifyHmac(data: string, signature: string, secret: string): boolean {
  const expectedSignature = signDataWithHmac(data, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(signatureBuffer, expectedBuffer);
}

// ═══════════════════════════════════════════════════════════════════
// Request Signing (for API security)
// ═══════════════════════════════════════════════════════════════════

/**
 * Creates a signed request (for microservice-to-microservice communication)
 */
export function signRequest(
  method: string,
  path: string,
  body: any,
  timestamp: number,
  secret: string
): {
  signature: string;
  timestamp: number;
} {
  const bodyString = body ? JSON.stringify(body) : '';
  const signatureString = `${method}:${path}:${bodyString}:${timestamp}`;
  const signature = signDataWithHmac(signatureString, secret);

  return { signature, timestamp };
}

/**
 * Verifies a signed request
 */
export function verifyRequestSignature(
  method: string,
  path: string,
  body: any,
  signature: string,
  timestamp: number,
  secret: string,
  maxAgeMs: number = 300000 // 5 minutes
): boolean {
  // Check timestamp freshness (prevent replay attacks)
  if (Date.now() - timestamp > maxAgeMs) {
    logger.warn('Request signature timestamp too old', { timestamp });
    return false;
  }

  return verifyHmac(`${method}:${path}:${JSON.stringify(body) || ''}:${timestamp}`, signature, secret);
}

// ═══════════════════════════════════════════════════════════════════
// SQL Injection Prevention
// ═══════════════════════════════════════════════════════════════════

/**
 * Validates that a value doesn't contain SQL keywords (basic check)
 * Relying on parameterized queries is the primary defense
 */
export function isSuspiciousSqlInput(value: string): boolean {
  const suspiciousPatterns = [
    /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(-{2}|\/\*|\*\/)/,
    /[;'"]/,
  ];

  return suspiciousPatterns.some(pattern => pattern.test(value));
}

/**
 * Sanitizes SQL identifier (table/column name)
 * Use only for identifiers, not values - use parameterized queries for values
 */
export function sanitizeSqlIdentifier(identifier: string): string {
  // Allow only alphanumeric and underscore
  return identifier.replaceAll(/[^\w]/g, '').toLowerCase();
}

// ═══════════════════════════════════════════════════════════════════
// Security Headers Middleware
// ═══════════════════════════════════════════════════════════════════

/**
 * Applies comprehensive security headers
 */
export function securityHeaders(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none';"
  );

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Clickjacking protection
  res.setHeader('X-Frame-Options', 'DENY');

  // XSS protection header (legacy)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy (formerly Feature Policy)
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );

  // Prevent caching of sensitive pages
  if (req.path.includes('/api/')) {
    res.setHeader('Cache-Control', 'no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
}

// ═══════════════════════════════════════════════════════════════════
// Audit Logging
// ═══════════════════════════════════════════════════════════════════

export interface AuditLogEntry {
  timestamp: string;
  event: string;
  userId?: string;
  ip: string;
  userAgent?: string;
  method: string;
  path: string;
  statusCode: number;
  details?: Record<string, any>;
}

/**
 * Logs security-relevant events
 */
export function auditLog(req: Request, event: string, details?: Record<string, any>): void {
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'];

  const entry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    event,
    userId: (req as any).user?.id,
    ip,
    userAgent: userAgent,
    method: req.method,
    path: req.path,
    statusCode: 0,
    details,
  };

  logger.info('AUDIT', entry);
}

// ═══════════════════════════════════════════════════════════════════
// Security Context
// ═══════════════════════════════════════════════════════════════════

declare global {
  namespace Express {
    interface Request {
      securityContext?: {
        ip: string;
        userAgent?: string;
        timestamp: number;
        signature?: string;
      };
    }
  }
}

/**
 * Initializes security context for request
 */
export function initializeSecurityContext(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  (req as any).securityContext = {
    ip: getClientIp(req),
    userAgent: String(req.headers['user-agent']),
    timestamp: Date.now(),
  };

  next();
}
