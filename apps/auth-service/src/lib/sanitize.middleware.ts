import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

// ─── HTML / Script Tag Stripping ────────────────────────────────────
function stripHtmlTags(value: string): string {
    return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
}

// ─── Recursive Sanitization ────────────────────────────────────────
function sanitizeValue(value: unknown): unknown {
    if (typeof value === 'string') {
        return stripHtmlTags(value).trim();
    }
    if (Array.isArray(value)) {
        return value.map(sanitizeValue);
    }
    if (value !== null && typeof value === 'object') {
        return sanitizeObject(value as Record<string, unknown>);
    }
    return value;
}

function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeValue(value);
    }
    return sanitized;
}

// ─── SQL Injection Pattern Detection ───────────────────────────────
const SQL_INJECTION_PATTERNS = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC)\b)/i,
    /('.*(--))/,
    /(;.*\b(DROP|DELETE|UPDATE|INSERT)\b)/i,
    /(\bOR\b\s+\d+\s*=\s*\d+)/i,
    /(\bAND\b\s+\d+\s*=\s*\d+)/i,
];

function detectSqlInjection(value: string): boolean {
    return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(value));
}

// ─── Middleware ─────────────────────────────────────────────────────
export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
    // Sanitize body
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
    }

    // Check query params for SQL injection
    for (const [key, value] of Object.entries(req.query)) {
        if (typeof value === 'string' && detectSqlInjection(value)) {
            logger.warn({
                event: 'SUSPICIOUS_INPUT',
                type: 'sql_injection_attempt',
                param: key,
                ip: req.ip,
                path: req.path,
            });
            // Don't block — our queries are parameterized. Just log.
        }
    }

    next();
}
