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
        email: row.email,
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

    const {
      title, bio, skills, hourlyRate, currency, location, country, timezone,
      availability, portfolio, isAvailable, hoursPerWeek, languages, preferredWorkTypes,
      resumeUrl, linkedinUrl, githubUrl, leetcodeUrl, hackerrankUrl, personalWebsite
    } = req.body;

    console.log('=== WORKER PROFILE UPDATE ===');
    console.log('Worker ID:', id);
    console.log('Title:', title);
    console.log('Bio:', bio);
    console.log('Skills:', skills);
    console.log('Languages:', languages);
    console.log('Hourly Rate:', hourlyRate);
    console.log('Country:', country);
    console.log('Hours Per Week:', hoursPerWeek);
    console.log('Resume URL:', resumeUrl);
    console.log('LinkedIn URL:', linkedinUrl);
    console.log('GitHub URL:', githubUrl);
    console.log('LeetCode URL:', leetcodeUrl);
    console.log('HackerRank URL:', hackerrankUrl);
    console.log('Personal Website:', personalWebsite);
    console.log('---');

    const params = [
      title || null,
      bio || null,
      skills || [],
      hourlyRate || null,
      currency || 'USD',
      location || null,
      timezone || 'UTC',
      availability ? JSON.stringify({ types: availability, hours: hoursPerWeek, preferred: preferredWorkTypes }) : null,
      portfolio ? JSON.stringify(portfolio) : null,
      isAvailable !== undefined ? isAvailable : true,
      languages || [],
      resumeUrl || null,
      linkedinUrl || null,
      githubUrl || null,
      leetcodeUrl || null,
      hackerrankUrl || null,
      personalWebsite || null,
      country || null,
      hoursPerWeek || null,
      preferredWorkTypes || [],
      id
    ];

    console.log('--- EXECUTING UPDATE ---');
    console.log('SQL:', `UPDATE worker_profiles SET ... WHERE user_id = $21`);
    console.log('Params:', JSON.stringify(params, null, 2));

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

    const updatedRow = result.rows[0];
    console.log('=== UPDATE RESULT ===');
    console.log('Database update completed successfully');
    console.log('Updated profile:');
    console.log('  title:', updatedRow.title);
    console.log('  bio:', updatedRow.bio);
    console.log('  skills:', updatedRow.skills);
    console.log('  languages:', updatedRow.languages);
    console.log('  resume_url:', updatedRow.resume_url);
    console.log('  linkedin_url:', updatedRow.linkedin_url);
    console.log('  github_url:', updatedRow.github_url);
    console.log('  leetcode_url:', updatedRow.leetcode_url);
    console.log('  hackerrank_url:', updatedRow.hackerrank_url);
    console.log('  personal_website:', updatedRow.personal_website);

    res.json({ success: true, data: updatedRow });
  } catch (error) {
    next(error);
  }
});

export default router;
