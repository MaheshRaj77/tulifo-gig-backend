import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

// ─── In-Memory Rate Limiter ────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 100; // 100 requests per minute per IP

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (entry.count < RATE_LIMIT_MAX) {
    entry.count++;
    return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count };
  }

  return { allowed: false, remaining: 0 };
}

// Periodic cleanup to prevent memory leaks (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetTime) rateLimitMap.delete(ip);
  }
}, 5 * 60_000);

// ─── Public routes that don't require JWT ──────────────────────────
const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/workers',              // Public worker search
  '/api/payments/webhook',    // Stripe webhook — verified by Stripe signature, not JWT
  '/health',
];

function isPublicPath(path: string): boolean {
  // Exact match or starts-with for nested routes
  return PUBLIC_PATHS.some(pub => path === pub || path.startsWith(pub + '/') || path.startsWith(pub + '?'));
}

// ─── JWT Validation ────────────────────────────────────────────────
function validateJwt(authHeader: string | undefined): { valid: boolean; error?: string } {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Missing or invalid Authorization header' };
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return { valid: false, error: 'Gateway misconfigured' };
  }

  try {
    jwt.verify(token, secret);
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid or expired token' };
  }
}

// ─── Proxy Request ─────────────────────────────────────────────────
async function proxyRequest(
  serviceUrl: string,
  req: VercelRequest,
  res: VercelResponse,
  pathRewrite?: string
) {
  try {
    // Forward the full normalized path so service-internal route tables (app.use('/api/xxx', router)) match correctly.
    // pathRewrite carries the normalized path (v1 prefix already stripped by the caller).
    const path = pathRewrite || req.url || '/';
    const url = new URL(serviceUrl);
    const queryString = req.url?.includes('?') ? `?${req.url.split('?')[1]}` : '';
    const fullUrl = `${url.protocol}//${url.host}${path}${queryString}`;

    const headers: Record<string, string> = {};
    // Forward only safe headers
    const safeHeaders = ['authorization', 'content-type', 'x-request-id', 'accept'];
    for (const key of safeHeaders) {
      const val = req.headers[key];
      if (val && typeof val === 'string') {
        headers[key] = val;
      }
    }
    headers['Content-Type'] = 'application/json';

    const response = await fetch(fullUrl, {
      method: req.method || 'GET',
      headers,
      body: req.body ? JSON.stringify(req.body) : undefined,
    } as RequestInit);

    // Copy response headers (excluding hop-by-hop)
    response.headers.forEach((value, key) => {
      if (!['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    const data = await response.text();
    return res.status(response.status).send(data);
  } catch {
    // Do NOT leak internal service URLs in error responses
    return res.status(503).json({
      error: 'Service unavailable',
      message: 'The requested service is temporarily unavailable. Please try again later.',
    });
  }
}

// ─── Main Handler ──────────────────────────────────────────────────
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const path = req.url || '/';

  // ── Rate Limiting ──
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.socket?.remoteAddress
    || 'unknown';

  const rateCheck = checkRateLimit(clientIp);
  res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX);
  res.setHeader('X-RateLimit-Remaining', rateCheck.remaining);

  if (!rateCheck.allowed) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
    });
  }

  // ── Health check (always public) ──
  if (path === '/health' || path === '/health/') {
    return res.status(200).json({
      status: 'healthy',
      service: 'api-gateway',
      version: 'v1',
      timestamp: new Date().toISOString(),
    });
  }

  // ── API Versioning — normalize /api/v1/* to /api/* ──
  let normalizedPath = path;
  let apiVersion = 'v1'; // default
  const versionMatch = path.match(/^\/api\/(v\d+)\//);
  if (versionMatch) {
    apiVersion = versionMatch[1];
    // Strip version prefix: /api/v1/auth/login → /api/auth/login
    normalizedPath = path.replace(`/api/${apiVersion}`, '/api');
  }
  res.setHeader('X-API-Version', apiVersion);

  // ── JWT Validation for protected routes ──
  if (!isPublicPath(normalizedPath)) {
    const jwtResult = validateJwt(req.headers.authorization);
    if (!jwtResult.valid) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: jwtResult.error,
      });
    }
  }

  // ── Service routing ──
  const routes: Record<string, string> = {
    '/api/auth': process.env.AUTH_SERVICE_URL || 'https://auth-service.onrender.com',
    '/api/users': process.env.USER_SERVICE_URL || 'https://user-service.onrender.com',
    '/api/projects': process.env.PROJECT_SERVICE_URL || 'https://project-service.onrender.com',
    '/api/agreements': process.env.PROJECT_SERVICE_URL || 'https://project-service.onrender.com',
    '/api/payments': process.env.PAYMENT_SERVICE_URL || 'https://payment-service.onrender.com',
    '/api/messages': process.env.MESSAGE_SERVICE_URL || 'https://message-service.onrender.com',
    '/api/notifications': process.env.NOTIFICATION_SERVICE_URL || 'https://notification-service.onrender.com',
    '/api/bookings': process.env.BOOKING_SERVICE_URL || 'https://booking-service.onrender.com',
    '/api/availability': process.env.BOOKING_SERVICE_URL || 'https://booking-service.onrender.com',
    '/api/matching': process.env.MATCHING_SERVICE_URL || 'https://matching-service.onrender.com',
    '/api/workers': process.env.WORKER_SERVICE_URL || 'https://worker-service.onrender.com',
    '/api/clients': process.env.CLIENT_SERVICE_URL || 'https://client-service.onrender.com',
    '/api/escrow': process.env.ESCROW_SERVICE_URL || 'https://escrow-service.onrender.com',
    '/api/disputes': process.env.DISPUTE_SERVICE_URL || 'https://dispute-service.onrender.com',
    '/api/reviews': process.env.REVIEW_SERVICE_URL || 'https://review-service.onrender.com',
    '/api/badges': process.env.REVIEW_SERVICE_URL || 'https://review-service.onrender.com',
    '/api/search': process.env.SEARCH_SERVICE_URL || 'https://search-service.onrender.com',
  };

  const serviceUrl = Object.entries(routes).find(([prefix]) => normalizedPath.startsWith(prefix))?.[1];

  if (serviceUrl) {
    // Pass the normalized path (version prefix already stripped above) so services receive the
    // canonical path they register: /api/xxx/... not /api/v1/xxx/...
    return proxyRequest(serviceUrl, req, res, normalizedPath);
  }

  return res.status(404).json({
    error: 'Not found',
    message: 'Endpoint does not exist',
  });
}
