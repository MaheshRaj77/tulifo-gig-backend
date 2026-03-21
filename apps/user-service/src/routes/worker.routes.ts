import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pool } from '../index';
import { authenticate, NotFoundError } from '../lib';

const router: Router = Router();

// ─── Validation Schema for Worker Profile Update ───────────────────
const workerProfileUpdateSchema = z.object({
  title: z.string().min(2).max(100).optional(),
  bio: z.string().min(10).max(2000).optional(),
  skills: z.array(z.string().min(1).max(50)).max(20).optional(),
  hourlyRate: z.number().positive().max(10000).optional(),
  currency: z.string().length(3).optional(),
  location: z.string().min(2).max(100).optional(),
  country: z.string().min(2).max(100).optional(),
  timezone: z.string().min(2).max(50).optional(),
  availability: z.string().optional(),
  portfolio: z.array(z.string().url()).max(10).optional(),
  isAvailable: z.boolean().optional(),
  hoursPerWeek: z.number().int().min(1).max(168).optional(),
  languages: z.array(z.string().min(1).max(50)).max(10).optional(),
  preferredWorkTypes: z.array(z.string().min(1).max(50)).max(10).optional(),
  resumeUrl: z.string().url().optional().nullable(),
  linkedinUrl: z.string().url().optional().nullable(),
  githubUrl: z.string().url().optional().nullable(),
  leetcodeUrl: z.string().url().optional().nullable(),
  hackerrankUrl: z.string().url().optional().nullable(),
  personalWebsite: z.string().url().optional().nullable(),
});

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

// Get worker profile (public — but do NOT expose email)
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.avatar_url,
              w.title, w.bio, w.skills, w.hourly_rate, w.currency, w.location,
              w.timezone, w.availability, w.portfolio, w.rating, w.review_count,
              w.resume_url, w.linkedin_url, w.github_url, w.leetcode_url, w.hackerrank_url, w.personal_website,
              w.completed_jobs, w.is_available, w.created_at, w.languages, w.country, w.hours_per_week, w.preferred_work_types
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
        avatarUrl: row.avatar_url,
        title: row.title,
        bio: row.bio,
        skills: row.skills,
        languages: row.languages,
        hourlyRate: row.hourly_rate,
        currency: row.currency,
        location: row.location,
        timezone: row.timezone,
        availability: row.availability,
        portfolio: row.portfolio,
        resumeUrl: row.resume_url,
        linkedinUrl: row.linkedin_url,
        githubUrl: row.github_url,
        leetcodeUrl: row.leetcode_url,
        hackerrankUrl: row.hackerrank_url,
        personalWebsite: row.personal_website,
        rating: row.rating,
        reviewCount: row.review_count,
        completedJobs: row.completed_jobs,
        isAvailable: row.is_available,
        createdAt: row.created_at,
        country: row.country,
        hoursPerWeek: row.hours_per_week,
        preferredWorkTypes: row.preferred_work_types
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

    // Validate input with Zod schema
    const data = workerProfileUpdateSchema.parse(req.body);

    const params = [
      data.title || null,
      data.bio || null,
      data.skills || [],
      data.hourlyRate || null,
      data.currency || 'USD',
      data.location || null,
      data.timezone || 'UTC',
      data.availability ? JSON.stringify({ types: data.availability, hours: data.hoursPerWeek, preferred: data.preferredWorkTypes }) : null,
      data.portfolio ? JSON.stringify(data.portfolio) : null,
      data.isAvailable !== undefined ? data.isAvailable : true,
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
      id
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
      throw new NotFoundError('Worker profile');
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;
