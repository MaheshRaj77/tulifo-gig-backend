import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pool } from '../index';
import { authenticate, authorize, validate, NotFoundError } from '../lib';

const router: Router = Router();

const createProjectSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().optional(),
  skills: z.array(z.string()).default([]),
  budget: z.object({
    type: z.enum(['fixed', 'hourly']),
    min: z.number().optional(),
    max: z.number().optional(),
    amount: z.number().optional(),
    currency: z.string().default('USD')
  }),
  duration: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    unit: z.enum(['hours', 'days', 'weeks', 'months'])
  }).optional(),
  visibility: z.enum(['public', 'private', 'invite_only']).default('public')
});

// List projects
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { skills, status = 'open', page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = `
      SELECT p.*, u.first_name, u.last_name, u.avatar_url
      FROM projects p
      JOIN users u ON p.client_id = u.id
      WHERE p.visibility = 'public'
    `;
    const params: (string | string[] | number)[] = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND p.status = $${paramCount}`;
      params.push(status as string);
    }

    if (skills) {
      paramCount++;
      query += ` AND p.skills && $${paramCount}::text[]`;
      params.push((skills as string).split(','));
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(Number(limit), offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        skills: row.skills,
        budget: row.budget,
        duration: row.duration,
        status: row.status,
        createdAt: row.created_at,
        client: {
          id: row.client_id,
          firstName: row.first_name,
          lastName: row.last_name,
          avatarUrl: row.avatar_url
        }
      })),
      meta: { page: Number(page), limit: Number(limit) }
    });
  } catch (error) {
    next(error);
  }
});

// Create project
router.post('/', authenticate, authorize('client', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = validate(createProjectSchema, req.body);

    const result = await pool.query(
      `INSERT INTO projects (client_id, title, description, skills, budget, duration, visibility, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'open')
       RETURNING *`,
      [req.user!.userId, data.title, data.description, data.skills, 
       JSON.stringify(data.budget), data.duration ? JSON.stringify(data.duration) : null, 
       data.visibility]
    );

    // Update client's projects_posted count
    await pool.query(
      'UPDATE client_profiles SET projects_posted = projects_posted + 1 WHERE user_id = $1',
      [req.user!.userId]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Get project by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT p.*, u.first_name, u.last_name, u.avatar_url
       FROM projects p
       JOIN users u ON p.client_id = u.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Project');
    }

    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        id: row.id,
        title: row.title,
        description: row.description,
        skills: row.skills,
        budget: row.budget,
        duration: row.duration,
        status: row.status,
        visibility: row.visibility,
        attachments: row.attachments,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        client: {
          id: row.client_id,
          firstName: row.first_name,
          lastName: row.last_name,
          avatarUrl: row.avatar_url
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update project
router.put('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    // Check ownership
    const project = await pool.query('SELECT client_id FROM projects WHERE id = $1', [id]);
    if (project.rows.length === 0) {
      throw new NotFoundError('Project');
    }
    if (project.rows[0].client_id !== req.user!.userId && req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
    }

    const { title, description, skills, budget, duration, visibility, status } = req.body;

    const result = await pool.query(
      `UPDATE projects SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        skills = COALESCE($3, skills),
        budget = COALESCE($4, budget),
        duration = COALESCE($5, duration),
        visibility = COALESCE($6, visibility),
        status = COALESCE($7, status),
        updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [title, description, skills, 
       budget ? JSON.stringify(budget) : null,
       duration ? JSON.stringify(duration) : null,
       visibility, status, id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;
