import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../index';
import { authenticate, NotFoundError } from '../lib';

const router: Router = Router();

// ─── Password Policy ───────────────────────────────────────────────
function validatePasswordPolicy(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (password.length < 8) errors.push('Password must be at least 8 characters');
  if (!/[a-z]/.test(password)) errors.push('Must contain a lowercase letter');
  if (!/[A-Z]/.test(password)) errors.push('Must contain an uppercase letter');
  if (!/\d/.test(password)) errors.push('Must contain a digit');
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push('Must contain a special character');
  return { valid: errors.length === 0, errors };
}

// Get user by ID
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, role, avatar_url, is_verified, created_at FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User');
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
        createdAt: user.created_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update user
router.put('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, avatarUrl } = req.body;

    // Check authorization
    if (req.user!.userId !== id && req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
    }

    const result = await pool.query(
      `UPDATE users SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name), 
       avatar_url = COALESCE($3, avatar_url), updated_at = NOW()
       WHERE id = $4
       RETURNING id, email, first_name, last_name, role, avatar_url`,
      [firstName, lastName, avatarUrl, id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User');
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
        avatarUrl: user.avatar_url
      }
    });
  } catch (error) {
    next(error);
  }
});

// ─── Change Password ───────────────────────────────────────────────
const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8),
});

router.put('/:id/password', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Only the user themselves can change their password
    if (req.user!.userId !== id) {
      return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
    }

    const data = changePasswordSchema.parse(req.body);

    // Enforce password policy
    const policyCheck = validatePasswordPolicy(data.newPassword);
    if (!policyCheck.valid) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Password does not meet requirements', details: policyCheck.errors },
      });
    }

    // Get current password hash
    const userResult = await pool.query(
      'SELECT id, password_hash FROM users WHERE id = $1',
      [id]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundError('User');
    }

    // Verify current password
    const validCurrent = await bcrypt.compare(data.currentPassword, userResult.rows[0].password_hash);
    if (!validCurrent) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Current password is incorrect' },
      });
    }

    // Ensure new password is different
    const sameAsOld = await bcrypt.compare(data.newPassword, userResult.rows[0].password_hash);
    if (sameAsOld) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'New password must be different from the current password' },
      });
    }

    // Hash and update
    const newHash = await bcrypt.hash(data.newPassword, 12);
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHash, id]
    );

    // Revoke all refresh tokens for this user (force re-login)
    await pool.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
      [id]
    );

    res.json({
      success: true,
      data: { message: 'Password changed successfully. Please log in again on all devices.' },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
