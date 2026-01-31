import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pool } from '../index';
import { authenticate, authorize, validate, NotFoundError, ConflictError } from '../lib';

const router: Router = Router();

const createBidSchema = z.object({
  projectId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().default('USD'),
  proposal: z.string().optional(),
  estimatedDuration: z.number().positive().optional()
});

// Create bid
router.post('/', authenticate, authorize('worker'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = validate(createBidSchema, req.body);

    // Check if project exists and is open
    const project = await pool.query('SELECT id, status FROM projects WHERE id = $1', [data.projectId]);
    if (project.rows.length === 0) {
      throw new NotFoundError('Project');
    }
    if (project.rows[0].status !== 'open') {
      throw new ConflictError('Project is not accepting bids');
    }

    // Check if already bid
    const existingBid = await pool.query(
      'SELECT id FROM bids WHERE project_id = $1 AND worker_id = $2',
      [data.projectId, req.user!.userId]
    );
    if (existingBid.rows.length > 0) {
      throw new ConflictError('You have already submitted a bid for this project');
    }

    const result = await pool.query(
      `INSERT INTO bids (project_id, worker_id, amount, currency, proposal, estimated_duration)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.projectId, req.user!.userId, data.amount, data.currency, data.proposal, data.estimatedDuration]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Get bids for a project
router.get('/project/:projectId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;

    const result = await pool.query(
      `SELECT b.*, u.first_name, u.last_name, u.avatar_url,
              w.title, w.rating, w.review_count, w.completed_jobs
       FROM bids b
       JOIN users u ON b.worker_id = u.id
       JOIN worker_profiles w ON b.worker_id = w.user_id
       WHERE b.project_id = $1
       ORDER BY b.created_at DESC`,
      [projectId]
    );

    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        amount: row.amount,
        currency: row.currency,
        proposal: row.proposal,
        estimatedDuration: row.estimated_duration,
        status: row.status,
        createdAt: row.created_at,
        worker: {
          id: row.worker_id,
          firstName: row.first_name,
          lastName: row.last_name,
          avatarUrl: row.avatar_url,
          title: row.title,
          rating: row.rating,
          reviewCount: row.review_count,
          completedJobs: row.completed_jobs
        }
      }))
    });
  } catch (error) {
    next(error);
  }
});

// Accept bid
router.post('/:id/accept', authenticate, authorize('client', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Get bid and project
    const bidResult = await pool.query(
      'SELECT b.*, p.client_id FROM bids b JOIN projects p ON b.project_id = p.id WHERE b.id = $1',
      [id]
    );

    if (bidResult.rows.length === 0) {
      throw new NotFoundError('Bid');
    }

    const bid = bidResult.rows[0];

    if (bid.client_id !== req.user!.userId && req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
    }

    if (bid.status !== 'pending') {
      throw new ConflictError('Bid is no longer pending');
    }

    // Accept bid and reject others
    await pool.query('UPDATE bids SET status = $1 WHERE id = $2', ['accepted', id]);
    await pool.query(
      'UPDATE bids SET status = $1 WHERE project_id = $2 AND id != $3 AND status = $4',
      ['rejected', bid.project_id, id, 'pending']
    );

    // Update project status
    await pool.query('UPDATE projects SET status = $1 WHERE id = $2', ['in_progress', bid.project_id]);

    res.json({ success: true, message: 'Bid accepted' });
  } catch (error) {
    next(error);
  }
});

export default router;
