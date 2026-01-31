import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../index';
import { authenticate, NotFoundError } from '../lib';

const router: Router = Router();

// Get client profile
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.avatar_url,
              c.company_name, c.company_size, c.industry, c.location,
              c.timezone, c.projects_posted, c.total_spent, c.created_at
       FROM users u
       JOIN client_profiles c ON u.id = c.user_id
       WHERE u.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Client');
    }

    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        avatarUrl: row.avatar_url,
        companyName: row.company_name,
        companySize: row.company_size,
        industry: row.industry,
        location: row.location,
        timezone: row.timezone,
        projectsPosted: row.projects_posted,
        totalSpent: row.total_spent,
        createdAt: row.created_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update client profile
router.put('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (req.user!.userId !== id) {
      return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
    }

    const { companyName, companySize, industry, location, timezone } = req.body;

    const result = await pool.query(
      `UPDATE client_profiles SET
        company_name = COALESCE($1, company_name),
        company_size = COALESCE($2, company_size),
        industry = COALESCE($3, industry),
        location = COALESCE($4, location),
        timezone = COALESCE($5, timezone),
        updated_at = NOW()
       WHERE user_id = $6
       RETURNING *`,
      [companyName, companySize, industry, location, timezone, id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Client profile');
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;
