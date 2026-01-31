import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../index';
import { authenticate, NotFoundError } from '../lib';

const router: Router = Router();

// Search workers
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { skills, minRate, maxRate, available, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = `
      SELECT u.id, u.first_name, u.last_name, u.avatar_url,
             w.title, w.bio, w.skills, w.hourly_rate, w.currency, w.location,
             w.rating, w.review_count, w.completed_jobs, w.is_available
      FROM users u
      JOIN worker_profiles w ON u.id = w.user_id
      WHERE u.role = 'worker' AND u.is_active = true
    `;
    const params: (string | string[] | number)[] = [];
    let paramCount = 0;

    if (skills) {
      paramCount++;
      query += ` AND w.skills && $${paramCount}::text[]`;
      params.push((skills as string).split(','));
    }

    if (minRate) {
      paramCount++;
      query += ` AND w.hourly_rate >= $${paramCount}`;
      params.push(Number(minRate));
    }

    if (maxRate) {
      paramCount++;
      query += ` AND w.hourly_rate <= $${paramCount}`;
      params.push(Number(maxRate));
    }

    if (available === 'true') {
      query += ' AND w.is_available = true';
    }

    query += ` ORDER BY w.rating DESC, w.completed_jobs DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(Number(limit), offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        avatarUrl: row.avatar_url,
        title: row.title,
        bio: row.bio,
        skills: row.skills,
        hourlyRate: row.hourly_rate,
        currency: row.currency,
        location: row.location,
        rating: row.rating,
        reviewCount: row.review_count,
        completedJobs: row.completed_jobs,
        isAvailable: row.is_available
      })),
      meta: { page: Number(page), limit: Number(limit) }
    });
  } catch (error) {
    next(error);
  }
});

// Get worker profile
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.avatar_url, u.email,
              w.title, w.bio, w.skills, w.hourly_rate, w.currency, w.location,
              w.timezone, w.availability, w.portfolio, w.rating, w.review_count,
              w.completed_jobs, w.is_available, w.created_at
       FROM users u
       JOIN worker_profiles w ON u.id = w.user_id
       WHERE u.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Worker');
    }

    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        avatarUrl: row.avatar_url,
        title: row.title,
        bio: row.bio,
        skills: row.skills,
        hourlyRate: row.hourly_rate,
        currency: row.currency,
        location: row.location,
        timezone: row.timezone,
        availability: row.availability,
        portfolio: row.portfolio,
        rating: row.rating,
        reviewCount: row.review_count,
        completedJobs: row.completed_jobs,
        isAvailable: row.is_available,
        createdAt: row.created_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update worker profile
router.put('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (req.user!.userId !== id) {
      return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
    }

    const { title, bio, skills, hourlyRate, currency, location, timezone, availability, portfolio, isAvailable } = req.body;

    const result = await pool.query(
      `UPDATE worker_profiles SET
        title = COALESCE($1, title),
        bio = COALESCE($2, bio),
        skills = COALESCE($3, skills),
        hourly_rate = COALESCE($4, hourly_rate),
        currency = COALESCE($5, currency),
        location = COALESCE($6, location),
        timezone = COALESCE($7, timezone),
        availability = COALESCE($8, availability),
        portfolio = COALESCE($9, portfolio),
        is_available = COALESCE($10, is_available),
        updated_at = NOW()
       WHERE user_id = $11
       RETURNING *`,
      [title, bio, skills, hourlyRate, currency, location, timezone, 
       availability ? JSON.stringify(availability) : null,
       portfolio ? JSON.stringify(portfolio) : null,
       isAvailable, id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Worker profile');
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;
