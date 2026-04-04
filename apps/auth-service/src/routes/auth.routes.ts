import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { pool } from '../index';
import {
  generateTokenPair,
  verifyRefreshToken,
  REFRESH_TOKEN_EXPIRY_MS,
  validate,
  ValidationError,
  UnauthorizedError,
  ConflictError,
  authenticate,
  validatePasswordPolicy,
  hashToken,
  maskEmail,
  getClientIp,
  checkRateLimit,
  RATE_LIMITS,
  sendPasswordResetEmail,
} from '../lib';
import { audit } from '../lib/audit-logger';

const router: Router = Router();

// ─── Cookie Config for Refresh Tokens ──────────────────────────────
const REFRESH_COOKIE_NAME = 'refresh_token';
const isProduction = process.env.NODE_ENV === 'production';

function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,                         // Not accessible via JavaScript
    secure: isProduction,                   // HTTPS only in production
    sameSite: isProduction ? 'strict' : 'lax', // Strict in prod, lax in dev
    path: '/api/auth',                      // Only sent to auth endpoints
    maxAge: REFRESH_TOKEN_EXPIRY_MS,        // 7 days
  });
}

function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/api/auth',
  });
}

// ─── Validation Schemas ────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['worker', 'client']),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

// ─── Constants ─────────────────────────────────────────────────────

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

// ─── Helper: Store refresh token in DB ─────────────────────────────

async function storeRefreshToken(
  userId: number | string,
  token: string,
  familyId: string,
  req: Request
): Promise<void> {
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || '';

  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, tokenHash, familyId, expiresAt, ip, userAgent]
  );
}

// ─── Helper: Log login attempt ─────────────────────────────────────

async function logLoginAttempt(email: string, ip: string, success: boolean): Promise<void> {
  await pool.query(
    'INSERT INTO login_attempts (email, ip_address, success) VALUES ($1, $2, $3)',
    [email, ip, success]
  );
}

// ─── Helper: Check account lockout ─────────────────────────────────

async function isAccountLocked(email: string): Promise<boolean> {
  const result = await pool.query(
    'SELECT locked_until FROM users WHERE email = $1',
    [email]
  );
  if (result.rows.length === 0) return false;

  const lockedUntil = result.rows[0].locked_until;
  if (!lockedUntil) return false;

  if (new Date(lockedUntil) > new Date()) {
    return true;
  }

  // Lock expired, reset
  await pool.query(
    'UPDATE users SET locked_until = NULL, failed_login_attempts = 0 WHERE email = $1',
    [email]
  );
  return false;
}

// ─── Helper: Handle failed login ───────────────────────────────────

async function handleFailedLogin(email: string, ip: string, requestId?: string): Promise<void> {
  await logLoginAttempt(email, ip, false);

  const result = await pool.query(
    `UPDATE users SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1
     WHERE email = $1
     RETURNING failed_login_attempts`,
    [email]
  );

  if (result.rows.length > 0 && result.rows[0].failed_login_attempts >= MAX_FAILED_ATTEMPTS) {
    const lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
    await pool.query(
      'UPDATE users SET locked_until = $1 WHERE email = $2',
      [lockUntil, email]
    );

    audit({
      event: 'AUTH_ACCOUNT_LOCKED',
      email: maskEmail(email),
      ip,
      requestId,
      details: { lockUntil: lockUntil.toISOString() },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// REGISTER
// ═══════════════════════════════════════════════════════════════════
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ip = getClientIp(req);

    // Rate limit
    const rl = await checkRateLimit('register', ip, RATE_LIMITS.register);
    if (!rl.allowed) {
      res.setHeader('Retry-After', Math.ceil(rl.retryAfterMs / 1000));
      return res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many registration attempts. Please try again later.' },
      });
    }

    const data = validate(registerSchema, req.body);

    // Enforce password policy
    const passwordCheck = validatePasswordPolicy(data.password);
    if (!passwordCheck.valid) {
      throw new ValidationError('Password does not meet requirements', passwordCheck.errors);
    }

    // Check if user exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [data.email]);
    if (existing.rows.length > 0) {
      throw new ConflictError('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

    const client = await pool.connect();
    let user;
    try {
      await client.query('BEGIN');

      // Create user
      const result = await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, first_name, last_name, role, created_at`,
        [data.email, passwordHash, data.firstName, data.lastName, data.role]
      );

      user = result.rows[0];

      // Create profile based on role
      if (data.role === 'worker') {
        await client.query('INSERT INTO worker_profiles (user_id) VALUES ($1)', [user.id]);
      } else {
        await client.query('INSERT INTO client_profiles (user_id) VALUES ($1)', [user.id]);
      }

      await client.query('COMMIT');
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }

    // Generate tokens with DB storage
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await storeRefreshToken(user.id, tokens.refreshToken, tokens.familyId, req);

    audit({
      event: 'AUTH_REGISTER',
      userId: user.id,
      email: maskEmail(user.email),
      ip,
      requestId: req.requestId,
      details: { role: data.role },
    });

    // Set refresh token as HttpOnly cookie
    setRefreshTokenCookie(res, tokens.refreshToken);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
        },
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════════════
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ip = getClientIp(req);
    const data = validate(loginSchema, req.body);

    // Rate limit by IP
    const rl = await checkRateLimit('login', ip, RATE_LIMITS.login);
    if (!rl.allowed) {
      res.setHeader('Retry-After', Math.ceil(rl.retryAfterMs / 1000));
      return res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many login attempts. Please try again later.' },
      });
    }

    // Check lockout
    const locked = await isAccountLocked(data.email);
    if (locked) {
      audit({
        event: 'AUTH_LOGIN_FAILED',
        email: maskEmail(data.email),
        ip,
        requestId: req.requestId,
        details: { reason: 'account_locked' },
      });
      throw new UnauthorizedError('Account is temporarily locked due to too many failed attempts. Please try again later.');
    }

    // Find user
    const result = await pool.query(
      'SELECT id, email, password_hash, first_name, last_name, role, is_active FROM users WHERE email = $1',
      [data.email]
    );

    if (result.rows.length === 0) {
      await handleFailedLogin(data.email, ip, req.requestId);
      audit({
        event: 'AUTH_LOGIN_FAILED',
        email: maskEmail(data.email),
        ip,
        requestId: req.requestId,
        details: { reason: 'user_not_found' },
      });
      throw new UnauthorizedError('Invalid credentials');
    }

    const user = result.rows[0];

    if (!user.is_active) {
      audit({
        event: 'AUTH_LOGIN_FAILED',
        userId: user.id,
        email: maskEmail(data.email),
        ip,
        requestId: req.requestId,
        details: { reason: 'account_deactivated' },
      });
      throw new UnauthorizedError('Account is deactivated');
    }

    // Verify password
    const validPassword = await bcrypt.compare(data.password, user.password_hash);
    if (!validPassword) {
      await handleFailedLogin(data.email, ip, req.requestId);
      audit({
        event: 'AUTH_LOGIN_FAILED',
        userId: user.id,
        email: maskEmail(data.email),
        ip,
        requestId: req.requestId,
        details: { reason: 'invalid_password' },
      });
      throw new UnauthorizedError('Invalid credentials');
    }

    // Reset failed attempts on success
    await pool.query(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
      [user.id]
    );
    await logLoginAttempt(data.email, ip, true);

    // Generate tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await storeRefreshToken(user.id, tokens.refreshToken, tokens.familyId, req);

    audit({
      event: 'AUTH_LOGIN_SUCCESS',
      userId: user.id,
      email: maskEmail(user.email),
      ip,
      requestId: req.requestId,
      userAgent: req.headers['user-agent'],
    });

    // Set refresh token as HttpOnly cookie
    setRefreshTokenCookie(res, tokens.refreshToken);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
        },
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════════
// REFRESH TOKEN (with rotation)
// ═══════════════════════════════════════════════════════════════════
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Read refresh token from HttpOnly cookie (fallback to body for backward compat)
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token required');
    }

    const ip = getClientIp(req);

    // Rate limit
    const rl = await checkRateLimit('refresh', ip, RATE_LIMITS.refresh);
    if (!rl.allowed) {
      res.setHeader('Retry-After', Math.ceil(rl.retryAfterMs / 1000));
      return res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many refresh attempts.' },
      });
    }

    const payload = verifyRefreshToken(refreshToken);
    const tokenHash = hashToken(refreshToken);

    // Find the token in DB
    const tokenResult = await pool.query(
      'SELECT id, user_id, family_id, revoked_at FROM refresh_tokens WHERE token_hash = $1',
      [tokenHash]
    );

    if (tokenResult.rows.length === 0) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const storedToken = tokenResult.rows[0];

    // Check if token was already revoked (reuse detection!)
    if (storedToken.revoked_at) {
      // Token reuse detected — revoke entire family (potential theft)
      await pool.query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE family_id = $1 AND revoked_at IS NULL',
        [storedToken.family_id]
      );

      audit({
        event: 'AUTH_TOKEN_REUSE_DETECTED',
        userId: storedToken.user_id,
        ip,
        requestId: req.requestId,
        details: { familyId: storedToken.family_id },
      });

      throw new UnauthorizedError('Token reuse detected. All sessions revoked for security.');
    }

    // Verify user is still active
    const userResult = await pool.query(
      'SELECT id, email, role, is_active FROM users WHERE id = $1',
      [payload.userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Revoke old token
    await pool.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1',
      [storedToken.id]
    );

    // Issue new token pair with same family ID
    const user = userResult.rows[0];
    const tokens = generateTokenPair(
      { userId: user.id, email: user.email, role: user.role },
      storedToken.family_id // Keep the same family
    );

    await storeRefreshToken(user.id, tokens.refreshToken, tokens.familyId, req);

    audit({
      event: 'AUTH_TOKEN_REFRESH',
      userId: user.id,
      ip,
      requestId: req.requestId,
    });

    // Set new refresh token as HttpOnly cookie
    setRefreshTokenCookie(res, tokens.refreshToken);

    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET CURRENT USER
// ═══════════════════════════════════════════════════════════════════
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, role, avatar_url, is_verified, created_at FROM users WHERE id = $1',
      [req.user!.userId]
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedError('User not found');
    }

    const user = result.rows[0];
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        avatarUrl: user.avatar_url,
        isVerified: user.is_verified,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════════
// CHANGE PASSWORD
// ═══════════════════════════════════════════════════════════════════
router.post('/change-password', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ip = getClientIp(req);

    // Rate limit
    const rl = await checkRateLimit('passwordChange', `user:${req.user!.userId}`, RATE_LIMITS.passwordChange);
    if (!rl.allowed) {
      res.setHeader('Retry-After', Math.ceil(rl.retryAfterMs / 1000));
      return res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many password change attempts.' },
      });
    }

    const data = validate(changePasswordSchema, req.body);

    // Enforce password policy on new password
    const passwordCheck = validatePasswordPolicy(data.newPassword);
    if (!passwordCheck.valid) {
      throw new ValidationError('New password does not meet requirements', passwordCheck.errors);
    }

    // Get current password hash
    const userResult = await pool.query(
      'SELECT id, password_hash FROM users WHERE id = $1',
      [req.user!.userId]
    );

    if (userResult.rows.length === 0) {
      throw new UnauthorizedError('User not found');
    }

    // Verify current password
    const validCurrent = await bcrypt.compare(data.currentPassword, userResult.rows[0].password_hash);
    if (!validCurrent) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Ensure new password is different
    const sameAsOld = await bcrypt.compare(data.newPassword, userResult.rows[0].password_hash);
    if (sameAsOld) {
      throw new ValidationError('New password must be different from the current password');
    }

    // Hash and update
    const newHash = await bcrypt.hash(data.newPassword, 12);
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHash, req.user!.userId]
    );

    // Revoke all refresh tokens (force re-login on all devices)
    await pool.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
      [req.user!.userId]
    );

    audit({
      event: 'AUTH_PASSWORD_CHANGED',
      userId: req.user!.userId,
      ip,
      requestId: req.requestId,
    });

    res.json({
      success: true,
      data: { message: 'Password changed successfully. Please log in again.' },
    });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════════
// LOGOUT (single session)
// ═══════════════════════════════════════════════════════════════════
router.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Read refresh token from cookie (fallback to body)
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
    const ip = getClientIp(req);

    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await pool.query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND user_id = $2',
        [tokenHash, req.user!.userId]
      );
    }

    audit({
      event: 'AUTH_LOGOUT',
      userId: req.user!.userId,
      ip,
      requestId: req.requestId,
    });

    // Clear refresh token cookie
    clearRefreshTokenCookie(res);

    res.json({ success: true, data: { message: 'Logged out successfully' } });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════════
// LOGOUT ALL (all sessions)
// ═══════════════════════════════════════════════════════════════════
router.post('/logout-all', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ip = getClientIp(req);

    await pool.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
      [req.user!.userId]
    );

    audit({
      event: 'AUTH_LOGOUT_ALL',
      userId: req.user!.userId,
      ip,
      requestId: req.requestId,
    });

    // Clear refresh token cookie
    clearRefreshTokenCookie(res);

    res.json({ success: true, data: { message: 'All sessions terminated' } });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════════
// FORGOT PASSWORD (request reset)
// ═══════════════════════════════════════════════════════════════════
router.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ip = getClientIp(req);

    // Rate limit by IP
    const rl = await checkRateLimit('passwordReset', ip, RATE_LIMITS.passwordReset);
    if (!rl.allowed) {
      res.setHeader('Retry-After', Math.ceil(rl.retryAfterMs / 1000));
      return res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many password reset attempts. Please try again later.' },
      });
    }

    const data = validate(forgotPasswordSchema, req.body);

    // Always respond with success to prevent email enumeration
    const successResponse = {
      success: true,
      data: { message: 'If an account exists for this email, password reset instructions have been sent.' },
    };

    // Find user
    const result = await pool.query(
      'SELECT id, email, first_name FROM users WHERE email = $1 AND is_active = true',
      [data.email]
    );

    if (result.rows.length === 0) {
      // User not found — still return success (anti-enumeration)
      return res.json(successResponse);
    }

    const user = result.rows[0];

    // Generate a secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS);

    // Delete any existing reset tokens for this user
    await pool.query(
      'DELETE FROM password_reset_tokens WHERE user_id = $1',
      [user.id]
    );

    // Store the hashed token
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt]
    );

    // Send the reset email (with the plain token — only user sees it)
    await sendPasswordResetEmail(user.email, resetToken, user.first_name);

    audit({
      event: 'AUTH_PASSWORD_RESET_REQUESTED',
      userId: user.id,
      email: maskEmail(user.email),
      ip,
      requestId: req.requestId,
    });

    res.json(successResponse);
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════════
// RESET PASSWORD (complete reset with token)
// ═══════════════════════════════════════════════════════════════════
router.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ip = getClientIp(req);

    // Rate limit by IP
    const rl = await checkRateLimit('passwordReset', ip, RATE_LIMITS.passwordReset);
    if (!rl.allowed) {
      res.setHeader('Retry-After', Math.ceil(rl.retryAfterMs / 1000));
      return res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many password reset attempts. Please try again later.' },
      });
    }

    const data = validate(resetPasswordSchema, req.body);

    // Enforce password policy
    const passwordCheck = validatePasswordPolicy(data.newPassword);
    if (!passwordCheck.valid) {
      throw new ValidationError('Password does not meet requirements', passwordCheck.errors);
    }

    // Hash the provided token and look it up
    const tokenHash = crypto.createHash('sha256').update(data.token).digest('hex');

    const tokenResult = await pool.query(
      `SELECT prt.id, prt.user_id, prt.expires_at, u.email, u.first_name
       FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE prt.token_hash = $1`,
      [tokenHash]
    );

    if (tokenResult.rows.length === 0) {
      throw new ValidationError('Invalid or expired reset token. Please request a new password reset.');
    }

    const tokenRecord = tokenResult.rows[0];

    // Check if token has expired
    if (new Date(tokenRecord.expires_at) < new Date()) {
      // Clean up expired token
      await pool.query('DELETE FROM password_reset_tokens WHERE id = $1', [tokenRecord.id]);
      throw new ValidationError('Reset token has expired. Please request a new password reset.');
    }

    // Hash new password and update
    const newHash = await bcrypt.hash(data.newPassword, 12);
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHash, tokenRecord.user_id]
    );

    // Delete the used reset token
    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [tokenRecord.user_id]);

    // Revoke all refresh tokens (force re-login on all devices)
    await pool.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
      [tokenRecord.user_id]
    );

    audit({
      event: 'AUTH_PASSWORD_RESET_COMPLETED',
      userId: tokenRecord.user_id,
      email: maskEmail(tokenRecord.email),
      ip,
      requestId: req.requestId,
    });

    res.json({
      success: true,
      data: { message: 'Password has been reset successfully. Please log in with your new password.' },
    });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════════
// CLIENT PROFILE COMPLETION
// ═══════════════════════════════════════════════════════════════════

const clientProfileSchema = z.object({
  role: z.literal('client'),
  clientType: z.enum(['individual', 'business']),

  // Individual fields
  contactName: z.string().min(2).optional().or(z.literal('')),
  businessEmail: z.string().email().optional().or(z.literal('')),
  businessPhone: z.string().min(5).optional().or(z.literal('')),

  // Business fields
  companyName: z.string().min(2).optional().or(z.literal('')),
  companySize: z.enum(['1-10', '11-50', '51-200', '201-500', '500+']).optional(),
  industry: z.string().min(2).optional().or(z.literal('')),
  companyDescription: z.string().min(20).max(500).optional().or(z.literal('')),

  // Shared fields
  location: z.string().min(2),
  country: z.string().min(2),
  timezone: z.string().min(2),
  budgetRange: z.enum(['<$5k', '$5k-$10k', '$10k-$25k', '$25k-$50k', '$50k+']),
  preferredContractTypes: z.array(z.string()).min(1),

  verificationCode: z.string().optional(),
}).refine((data) => {
  // If business, require company info
  if (data.clientType === 'business') {
    return data.companyName && data.companyName.length > 0 &&
      data.industry && data.industry.length > 0 &&
      data.companyDescription && data.companyDescription.length > 0;
  }
  return true;
}, {
  message: 'Company information required for business clients',
  path: ['companyName'],
});

const workerProfileSchema = z.object({
  role: z.literal('worker'),
  title: z.string().min(2),
  bio: z.string().min(20).max(500).optional(),
  location: z.string().min(2),
  country: z.string().min(2),
  timezone: z.string().min(2),
  skills: z.array(z.string()).min(1),
  languages: z.array(z.string()).min(1).optional(),
  hourlyRate: z.number().min(5),
  currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD']),
  availability: z.enum(['Full-time', 'Part-time', 'As Needed', 'Not Available']),
  hoursPerWeek: z.number().min(1).max(168),
  preferredWorkTypes: z.array(z.string()).min(1),

  // Cloudinary / portfolio links
  resumeUrl: z.string().url().optional().or(z.literal('')),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  githubUrl: z.string().url().optional().or(z.literal('')),
  leetcodeUrl: z.string().url().optional().or(z.literal('')),
  hackerrankUrl: z.string().url().optional().or(z.literal('')),
  personalWebsite: z.string().url().optional().or(z.literal('')),
  portfolioUrls: z.array(z.string().url()).optional(),
  portfolio: z.array(z.string().url()).optional(),
});

router.post('/profile', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { role } = req.body;

    if (role === 'worker') {
      const data = validate(workerProfileSchema, req.body);

      // Update worker_profiles directly since we share the same PostgreSQL
      const params = [
        data.title || null,
        data.bio || null,
        data.skills || [],
        data.hourlyRate || null,
        data.currency || 'USD',
        data.location || null,
        data.timezone || 'UTC',
        data.availability ? JSON.stringify({ types: data.availability, hours: data.hoursPerWeek, preferred: data.preferredWorkTypes }) : null,
        data.portfolio ? JSON.stringify(data.portfolio) : (data.portfolioUrls ? JSON.stringify(data.portfolioUrls) : null),
        true, // is_available
        data.languages || [],
        data.resumeUrl || null,
        data.linkedinUrl || null,
        data.githubUrl || null,
        data.leetcodeUrl || null,
        data.hackerrankUrl || null,
        data.personalWebsite || null,
        data.country || null,
        data.hoursPerWeek || null,
        data.preferredWorkTypes || [],
        userId
      ];



      const result = await pool.query(
        `UPDATE worker_profiles SET
          title = $1,
          bio = $2,
          skills = $3,
          hourly_rate = $4,
          currency = $5,
          location = $6,
          timezone = $7,
          availability = $8,
          portfolio = $9,
          is_available = $10,
          languages = $11,
          resume_url = $12,
          linkedin_url = $13,
          github_url = $14,
          leetcode_url = $15,
          hackerrank_url = $16,
          personal_website = $17,
          country = $18,
          hours_per_week = $19,
          preferred_work_types = $20,
          updated_at = NOW()
         WHERE user_id = $21
         RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        throw new Error('Worker profile not found. Make sure the account was registered properly.');
      }

      const updatedRow = result.rows[0];


      audit({
        event: 'WORKER_PROFILE_COMPLETED',
        userId,
        email: maskEmail(req.user!.email),
        ip: getClientIp(req),
        requestId: req.requestId,
      });

      return res.status(201).json({
        success: true,
        data: updatedRow,
      });
    }

    // Default to handling client
    const data = validate(clientProfileSchema, req.body);

    // Update client_profiles directly (same shared PostgreSQL as worker flow)
    const clientParams = [
      data.clientType,
      data.contactName || null,
      data.businessEmail || null,
      data.businessPhone || null,
      data.companyName || null,
      data.companySize || null,
      data.industry || null,
      data.companyDescription || null,
      data.location || null,
      data.country || null,
      data.timezone || 'UTC',
      data.budgetRange || null,
      data.preferredContractTypes ? JSON.stringify(data.preferredContractTypes) : null,
      userId,
    ];

    const result = await pool.query(
      `UPDATE client_profiles SET
        client_type = $1,
        contact_name = $2,
        business_email = $3,
        business_phone = $4,
        company_name = $5,
        company_size = $6,
        industry = $7,
        company_description = $8,
        location = $9,
        country = $10,
        timezone = $11,
        budget_range = $12,
        preferred_contract_types = $13,
        updated_at = NOW()
       WHERE user_id = $14
       RETURNING *`,
      clientParams
    );

    if (result.rows.length === 0) {
      throw new Error('Client profile not found. Make sure the account was registered properly.');
    }

    const updatedRow = result.rows[0];

    audit({
      event: 'CLIENT_PROFILE_COMPLETED',
      userId,
      email: maskEmail(req.user!.email),
      ip: getClientIp(req),
      requestId: req.requestId,
      details: { clientType: data.clientType },
    });

    res.status(201).json({
      success: true,
      data: updatedRow,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
