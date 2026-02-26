import { logger } from './logger';

export type AuditEvent =
    | 'AUTH_REGISTER'
    | 'AUTH_LOGIN_SUCCESS'
    | 'AUTH_LOGIN_FAILED'
    | 'AUTH_TOKEN_REFRESH'
    | 'AUTH_TOKEN_REUSE_DETECTED'
    | 'AUTH_LOGOUT'
    | 'AUTH_LOGOUT_ALL'
    | 'AUTH_PASSWORD_CHANGED'
    | 'AUTH_PASSWORD_RESET_REQUESTED'
    | 'AUTH_PASSWORD_RESET_COMPLETED'
    | 'AUTH_ACCOUNT_LOCKED'
    | 'CLIENT_PROFILE_COMPLETED'
    | 'SUSPICIOUS_INPUT';

export interface AuditLogEntry {
    event: AuditEvent;
    userId?: string | number;
    email?: string;
    ip?: string;
    userAgent?: string;
    requestId?: string;
    details?: Record<string, unknown>;
}

const auditLogger = logger.child({ context: 'security-audit' });

export function audit(entry: AuditLogEntry): void {
    const severity = getSeverity(entry.event);

    const logData = {
        ...entry,
        timestamp: new Date().toISOString(),
    };

    switch (severity) {
        case 'warn':
            auditLogger.warn(logData, `[AUDIT] ${entry.event}`);
            break;
        case 'error':
            auditLogger.error(logData, `[AUDIT] ${entry.event}`);
            break;
        default:
            auditLogger.info(logData, `[AUDIT] ${entry.event}`);
    }
}

function getSeverity(event: AuditEvent): 'info' | 'warn' | 'error' {
    switch (event) {
        case 'AUTH_TOKEN_REUSE_DETECTED':
        case 'AUTH_ACCOUNT_LOCKED':
        case 'SUSPICIOUS_INPUT':
            return 'error';
        case 'AUTH_LOGIN_FAILED':
            return 'warn';
        default:
            return 'info';
    }
}
