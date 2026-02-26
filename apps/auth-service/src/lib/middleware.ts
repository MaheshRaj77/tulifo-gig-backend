import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { verifyAccessToken, AccessTokenPayload } from './jwt';
import { ApiError, UnauthorizedError, ForbiddenError } from './errors';
import { logger } from './logger';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
      requestId?: string;
    }
  }
}

// ─── Request ID Middleware ──────────────────────────────────────────
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}

// ─── Request Logging Middleware ────────────────────────────────────
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });
  });

  next();
}

// ─── Authentication Middleware ──────────────────────────────────────
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);

    req.user = payload;
    next();
  } catch (error) {
    next(error);
  }
}

// ─── Authorization Middleware ──────────────────────────────────────
export function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Not authenticated'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
}

// ─── Error Handler ─────────────────────────────────────────────────
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error({
    requestId: req.requestId,
    error: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message,
    },
  });
}
