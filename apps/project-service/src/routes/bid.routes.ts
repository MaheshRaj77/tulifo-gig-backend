import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pool } from '../index';
import { authenticate, authorize, validate, NotFoundError, ConflictError } from '../lib';

const router: Router = Router();

// ── Express Interest (Worker clicks "I'm Interested") ──

const expressInterestSchema = z.object({
  projectId: z.string().uuid(),
  note: z.string().max(500).optional(),
});

router.post('/', authenticate, authorize('worker'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = validate(expressInterestSchema, req.body);

    const project = await pool.query('SELECT id, status FROM projects WHERE id = $1', [data.projectId]);
    if (project.rows.length === 0) {
      throw new NotFoundError('Project');
    }
    if (project.rows[0].status !== 'open') {
      throw new ConflictError('Project is not accepting interest');
    }

    const existing = await pool.query(
      'SELECT id FROM bids WHERE project_id = $1 AND worker_id = $2',
      [data.projectId, req.user!.userId]
    );
    if (existing.rows.length > 0) {
      throw new ConflictError('You have already expressed interest in this project');
    }

    const result = await pool.query(
      `INSERT INTO bids (project_id, worker_id, note, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [data.projectId, req.user!.userId, data.note || null]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// ── Withdraw Interest ──

router.post('/:id/withdraw', authenticate, authorize('worker'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE bids SET status = 'withdrawn' WHERE id = $1 AND worker_id = $2 AND status = 'pending' RETURNING *`,
      [id, req.user!.userId]
    );
    if (result.rows.length === 0) {
      throw new NotFoundError('Interest');
    }
    res.json({ success: true, message: 'Interest withdrawn' });
  } catch (error) {
    next(error);
  }
});

// ── Get interested workers for a project ──

router.get('/project/:projectId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;

    const result = await pool.query(
      `SELECT b.id, b.status, b.note, b.ai_score, b.created_at,
              u.id as worker_id, u.first_name, u.last_name, u.avatar_url,
              w.title, w.bio, w.skills, w.hourly_rate, w.rating, w.review_count, w.completed_jobs, w.is_available
       FROM bids b
       JOIN users u ON b.worker_id = u.id
       LEFT JOIN worker_profiles w ON b.worker_id = w.user_id
       WHERE b.project_id = $1 AND b.status != 'withdrawn'
       ORDER BY COALESCE(b.ai_score, 0) DESC, b.created_at ASC`,
      [projectId]
    );

    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        status: row.status,
        note: row.note,
        aiScore: row.ai_score ? parseFloat(row.ai_score) : null,
        createdAt: row.created_at,
        worker: {
          id: row.worker_id,
          firstName: row.first_name,
          lastName: row.last_name,
          avatarUrl: row.avatar_url,
          title: row.title,
          bio: row.bio,
          skills: row.skills || [],
          hourlyRate: row.hourly_rate ? parseFloat(row.hourly_rate) : null,
          rating: row.rating ? parseFloat(row.rating) : null,
          reviewCount: row.review_count,
          completedJobs: row.completed_jobs,
          isAvailable: row.is_available
        }
      }))
    });
  } catch (error) {
    next(error);
  }
});

// ── AI Match — score & rank interested workers for a project ──

router.post('/project/:projectId/match', authenticate, authorize('client', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;

    // Get project details
    const projectResult = await pool.query(
      'SELECT p.*, p.client_id FROM projects p WHERE p.id = $1',
      [projectId]
    );
    if (projectResult.rows.length === 0) {
      throw new NotFoundError('Project');
    }
    const project = projectResult.rows[0];

    if (project.client_id !== req.user!.userId && req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
    }

    // Get all interested workers with their full profiles
    const interestedResult = await pool.query(
      `SELECT b.id as bid_id, b.worker_id,
              u.first_name, u.last_name, u.avatar_url,
              w.title, w.bio, w.skills, w.hourly_rate, w.rating, w.review_count,
              w.completed_jobs, w.is_available
       FROM bids b
       JOIN users u ON b.worker_id = u.id
       LEFT JOIN worker_profiles w ON b.worker_id = w.user_id
       WHERE b.project_id = $1 AND b.status IN ('pending', 'shortlisted')`,
      [projectId]
    );

    if (interestedResult.rows.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const projectSkills: string[] = project.skills || [];
    const budgetData = typeof project.budget === 'string' ? JSON.parse(project.budget) : project.budget;
    const projectBudgetMax = budgetData?.max || budgetData?.amount || 10000;

    // AI Matching: Score each worker
    const scoredWorkers = interestedResult.rows.map(worker => {
      let score = 0;
      const reasons: string[] = [];
      const workerSkills: string[] = worker.skills || [];

      // 1. Skill Match (0-40 points)
      const matchedSkills = projectSkills.filter((s: string) =>
        workerSkills.some((ws: string) => ws.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(ws.toLowerCase()))
      );
      const skillScore = projectSkills.length > 0
        ? (matchedSkills.length / projectSkills.length) * 40
        : 20;
      score += skillScore;
      if (matchedSkills.length > 0) {
        reasons.push(`Matches ${matchedSkills.length}/${projectSkills.length} required skills`);
      }

      // 2. Experience & Rating (0-25 points)
      const rating = worker.rating ? parseFloat(worker.rating) : 0;
      const completedJobs = worker.completed_jobs || 0;
      const ratingScore = (rating / 5) * 15;
      const experienceScore = Math.min(completedJobs / 20, 1) * 10;
      score += ratingScore + experienceScore;
      if (rating > 0) reasons.push(`${rating.toFixed(1)}★ rating`);
      if (completedJobs > 0) reasons.push(`${completedJobs} jobs completed`);

      // 3. Budget Alignment (0-20 points)
      const hourlyRate = worker.hourly_rate ? parseFloat(worker.hourly_rate) : 0;
      if (hourlyRate > 0 && projectBudgetMax > 0) {
        const budgetFit = hourlyRate <= projectBudgetMax ? 20 : Math.max(0, 20 - ((hourlyRate - projectBudgetMax) / projectBudgetMax) * 20);
        score += budgetFit;
        if (budgetFit > 15) reasons.push('Great budget fit');
      } else {
        score += 10;
      }

      // 4. Availability Bonus (0-15 points)
      if (worker.is_available) {
        score += 15;
        reasons.push('Currently available');
      }

      return {
        bidId: worker.bid_id,
        workerId: worker.worker_id,
        score: Math.round(score * 100) / 100,
        reasons,
        worker: {
          id: worker.worker_id,
          firstName: worker.first_name,
          lastName: worker.last_name,
          avatarUrl: worker.avatar_url,
          title: worker.title,
          bio: worker.bio,
          skills: workerSkills,
          hourlyRate: hourlyRate || null,
          rating: rating || null,
          reviewCount: worker.review_count,
          completedJobs,
          isAvailable: worker.is_available
        }
      };
    });

    // Sort by score descending
    scoredWorkers.sort((a, b) => b.score - a.score);

    // Save AI scores to bids table
    for (const sw of scoredWorkers) {
      await pool.query(
        'UPDATE bids SET ai_score = $1 WHERE id = $2',
        [sw.score, sw.bidId]
      );
    }

    res.json({ success: true, data: scoredWorkers });
  } catch (error) {
    next(error);
  }
});

// ── Shortlist a worker ──

router.post('/:id/shortlist', authenticate, authorize('client', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const bidResult = await pool.query(
      'SELECT b.*, p.client_id FROM bids b JOIN projects p ON b.project_id = p.id WHERE b.id = $1',
      [id]
    );
    if (bidResult.rows.length === 0) {
      throw new NotFoundError('Interest');
    }
    const bid = bidResult.rows[0];
    if (bid.client_id !== req.user!.userId && req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
    }

    await pool.query('UPDATE bids SET status = $1 WHERE id = $2', ['shortlisted', id]);
    res.json({ success: true, message: 'Worker shortlisted' });
  } catch (error) {
    next(error);
  }
});

// ── Accept worker (after meeting → agreement) ──

router.post('/:id/accept', authenticate, authorize('client', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const bidResult = await pool.query(
      'SELECT b.*, p.client_id FROM bids b JOIN projects p ON b.project_id = p.id WHERE b.id = $1',
      [id]
    );
    if (bidResult.rows.length === 0) {
      throw new NotFoundError('Interest');
    }
    const bid = bidResult.rows[0];
    if (bid.client_id !== req.user!.userId && req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
    }
    if (bid.status === 'rejected' || bid.status === 'withdrawn') {
      throw new ConflictError('Cannot accept this interest');
    }

    await pool.query('UPDATE bids SET status = $1 WHERE id = $2', ['accepted', id]);
    await pool.query(
      `UPDATE bids SET status = 'rejected' WHERE project_id = $1 AND id != $2 AND status IN ('pending', 'shortlisted')`,
      [bid.project_id, id]
    );

    res.json({ success: true, message: 'Worker accepted' });
  } catch (error) {
    next(error);
  }
});

export default router;
