import crypto from 'crypto';

// ─── Password Policy ───────────────────────────────────────────────
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

export interface PasswordPolicyResult {
    valid: boolean;
    errors: string[];
}

export function validatePasswordPolicy(password: string): PasswordPolicyResult {
    const errors: string[] = [];

    if (password.length < PASSWORD_MIN_LENGTH) {
        errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
    }
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (!/\d/.test(password)) {
        errors.push('Password must contain at least one digit');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }

    return { valid: errors.length === 0, errors };
}

// ─── Sensitive Data Masking ────────────────────────────────────────
export function maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return '***@***';
    const maskedLocal = local.length <= 2
        ? '*'.repeat(local.length)
        : local[0] + '*'.repeat(local.length - 2) + local[local.length - 1];
    return `${maskedLocal}@${domain}`;
}

export function maskToken(token: string): string {
    if (token.length <= 8) return '****';
    return token.slice(0, 4) + '...' + token.slice(-4);
}

// ─── Token Hashing ─────────────────────────────────────────────────
export function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

// ─── IP Extraction ─────────────────────────────────────────────────
export function getClientIp(req: { headers: Record<string, string | string[] | undefined>; ip?: string }): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    if (Array.isArray(forwarded) && forwarded.length > 0) {
        return forwarded[0].split(',')[0].trim();
    }
    return req.ip || '0.0.0.0';
}
