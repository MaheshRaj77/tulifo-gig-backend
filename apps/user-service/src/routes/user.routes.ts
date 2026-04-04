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

// ─── Admin: User stats — MUST be registered before GET /:id ──────
router.get('/stats', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
    }

    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE role = 'worker') AS total_workers,
        COUNT(*) FILTER (WHERE role = 'client') AS total_clients,
        COUNT(*) FILTER (WHERE role = 'admin')  AS total_admins,
        COUNT(*) FILTER (WHERE status = 'active') AS active_users,
        COUNT(*) FILTER (WHERE status = 'suspended') AS suspended_users,
        COUNT(*) FILTER (WHERE status = 'pending' OR is_verified = FALSE) AS pending_users,
        COUNT(*) AS total_users
      FROM users
    `);

    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        totalUsers: parseInt(row.total_users, 10),
        totalWorkers: parseInt(row.total_workers, 10),
        totalClients: parseInt(row.total_clients, 10),
        activeUsers: parseInt(row.active_users, 10),
        suspendedUsers: parseInt(row.suspended_users, 10),
        pendingUsers: parseInt(row.pending_users, 10),
      },
    });
  } catch (error) {
    next(error);
  }
});

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

// ─── Admin: List all users (paginated, filterable) ─────────────────
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
    }

    const { role, status, search, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const params: (string | number)[] = [];
    let paramCount = 0;
    let conditions = 'WHERE 1=1';

    if (role && typeof role === 'string') {
      paramCount++;
      conditions += ` AND u.role = $${paramCount}`;
      params.push(role);
    }
    if (status && typeof status === 'string') {
      paramCount++;
      conditions += ` AND u.status = $${paramCount}`;
      params.push(status);
    }
    if (search && typeof search === 'string' && search.trim()) {
      paramCount++;
      conditions += ` AND (u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      params.push(`%${search.trim()}%`);
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM users u ${conditions}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(Number(limit), offset);
    const result = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.status,
              u.avatar_url, u.is_verified, u.created_at
       FROM users u ${conditions}
       ORDER BY u.created_at DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      params
    );

    res.json({
      success: true,
      data: result.rows.map(u => ({
        id: u.id,
        email: u.email,
        firstName: u.first_name,
        lastName: u.last_name,
        role: u.role,
        status: u.status,
        avatarUrl: u.avatar_url,
        isVerified: u.is_verified,
        createdAt: u.created_at,
      })),
      pagination: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (error) {
    next(error);
  }
});

// ─── Admin: Update user status (ban / suspend / activate) ──────────
router.put('/:id/status', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
    }

    const { id } = req.params;
    const { status } = req.body;
    const ALLOWED_STATUSES = ['active', 'suspended', 'banned'];

    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: { message: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` },
      });
    }

    const result = await pool.query(
      `UPDATE users SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, email, first_name, last_name, role, status`,
      [status, id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User');
    }

    // If banning/suspending, revoke all active refresh tokens
    if (status === 'banned' || status === 'suspended') {
      await pool.query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
        [id]
      );
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
        status: user.status,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
