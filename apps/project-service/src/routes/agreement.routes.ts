import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pool } from '../index';
import { authenticate, authorize, validate, NotFoundError, ConflictError, ForbiddenError } from '../lib';

const router: Router = Router();

// ── Create Agreement (client creates after meeting with worker) ──

const createAgreementSchema = z.object({
  projectId: z.string().uuid(),
  workerId: z.string().uuid(),
  bookingId: z.string().uuid().optional(),
  title: z.string().min(3).max(200),
  scope: z.string().min(10),
  deliverables: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    dueDate: z.string().optional(),
  })).optional(),
  amount: z.number().positive(),
  currency: z.string().default('USD'),
  paymentType: z.enum(['fixed', 'hourly', 'milestone']).default('fixed'),
  duration: z.number().positive().optional(),
  durationUnit: z.enum(['hours', 'days', 'weeks', 'months']).default('days'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  terms: z.string().optional(),
});

router.post('/', authenticate, authorize('client', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = validate(createAgreementSchema, req.body);

    // Verify project belongs to client
    const project = await pool.query('SELECT id, client_id, title FROM projects WHERE id = $1', [data.projectId]);
    if (project.rows.length === 0) throw new NotFoundError('Project');
    if (project.rows[0].client_id !== req.user!.userId && req.user!.role !== 'admin') {
      throw new ForbiddenError();
    }

    // Verify worker exists
    const worker = await pool.query('SELECT id FROM users WHERE id = $1 AND role = $2', [data.workerId, 'worker']);
    if (worker.rows.length === 0) throw new NotFoundError('Worker');

    // Check no active agreement exists for this project
    const existing = await pool.query(
      `SELECT id FROM agreements WHERE project_id = $1 AND status NOT IN ('cancelled', 'completed')`,
      [data.projectId]
    );
    if (existing.rows.length > 0) {
      throw new ConflictError('An active agreement already exists for this project');
    }

    const result = await pool.query(
      `INSERT INTO agreements (
        project_id, worker_id, client_id, booking_id,
        title, scope, deliverables, amount, currency, payment_type,
        duration, duration_unit, start_date, end_date, terms, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'draft')
      RETURNING *`,
      [
        data.projectId, data.workerId, req.user!.userId, data.bookingId || null,
        data.title, data.scope, JSON.stringify(data.deliverables || []),
        data.amount, data.currency, data.paymentType,
        data.duration || null, data.durationUnit, data.startDate || null, data.endDate || null,
        data.terms || null
      ]
    );

    res.status(201).json({ success: true, data: formatAgreement(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

// ── List Agreements for current user ──

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;
    const { status, projectId } = req.query;

    let query = `
      SELECT a.*,
             p.title as project_title,
             cu.first_name as client_first_name, cu.last_name as client_last_name, cu.avatar_url as client_avatar,
             wu.first_name as worker_first_name, wu.last_name as worker_last_name, wu.avatar_url as worker_avatar
      FROM agreements a
      JOIN projects p ON a.project_id = p.id
      JOIN users cu ON a.client_id = cu.id
      JOIN users wu ON a.worker_id = wu.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (role !== 'admin') {
      params.push(userId);
      query += ` AND (a.client_id = $${params.length} OR a.worker_id = $${params.length})`;
    }
    if (status) {
      params.push(status);
      query += ` AND a.status = $${params.length}`;
    }
    if (projectId) {
      params.push(projectId);
      query += ` AND a.project_id = $${params.length}`;
    }

    query += ' ORDER BY a.created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows.map(row => ({
        ...formatAgreement(row),
        projectTitle: row.project_title,
        client: {
          id: row.client_id,
          firstName: row.client_first_name,
          lastName: row.client_last_name,
          avatarUrl: row.client_avatar,
        },
        worker: {
          id: row.worker_id,
          firstName: row.worker_first_name,
          lastName: row.worker_last_name,
          avatarUrl: row.worker_avatar,
        }
      }))
    });
  } catch (error) {
    next(error);
  }
});

// ── Get Agreement by ID ──

router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT a.*,
              p.title as project_title, p.description as project_description,
              cu.first_name as client_first_name, cu.last_name as client_last_name, cu.avatar_url as client_avatar, cu.email as client_email,
              wu.first_name as worker_first_name, wu.last_name as worker_last_name, wu.avatar_url as worker_avatar, wu.email as worker_email
       FROM agreements a
       JOIN projects p ON a.project_id = p.id
       JOIN users cu ON a.client_id = cu.id
       JOIN users wu ON a.worker_id = wu.id
       WHERE a.id = $1`,
      [id]
    );

    if (result.rows.length === 0) throw new NotFoundError('Agreement');

    const row = result.rows[0];
    if (row.client_id !== req.user!.userId && row.worker_id !== req.user!.userId && req.user!.role !== 'admin') {
      throw new ForbiddenError();
    }

    res.json({
      success: true,
      data: {
        ...formatAgreement(row),
        projectTitle: row.project_title,
        projectDescription: row.project_description,
        client: {
          id: row.client_id,
          firstName: row.client_first_name,
          lastName: row.client_last_name,
          avatarUrl: row.client_avatar,
          email: row.client_email,
        },
        worker: {
          id: row.worker_id,
          firstName: row.worker_first_name,
          lastName: row.worker_last_name,
          avatarUrl: row.worker_avatar,
          email: row.worker_email,
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// ── Update Agreement (only in draft status) ──

const updateAgreementSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  scope: z.string().min(10).optional(),
  deliverables: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    dueDate: z.string().optional(),
  })).optional(),
  amount: z.number().positive().optional(),
  currency: z.string().optional(),
  paymentType: z.enum(['fixed', 'hourly', 'milestone']).optional(),
  duration: z.number().positive().optional(),
  durationUnit: z.enum(['hours', 'days', 'weeks', 'months']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  terms: z.string().optional(),
});

router.put('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = validate(updateAgreementSchema, req.body);

    const existing = await pool.query('SELECT * FROM agreements WHERE id = $1', [id]);
    if (existing.rows.length === 0) throw new NotFoundError('Agreement');

    const agreement = existing.rows[0];
    if (agreement.client_id !== req.user!.userId && agreement.worker_id !== req.user!.userId && req.user!.role !== 'admin') {
      throw new ForbiddenError();
    }
    if (!['draft', 'pending_worker', 'pending_client'].includes(agreement.status)) {
      throw new ConflictError('Agreement can only be modified in draft or pending status');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const addField = (col: string, val: any) => {
      if (val !== undefined) {
        fields.push(`${col} = $${paramIndex}`);
        values.push(col === 'deliverables' ? JSON.stringify(val) : val);
        paramIndex++;
      }
    };

    addField('title', data.title);
    addField('scope', data.scope);
    addField('deliverables', data.deliverables);
    addField('amount', data.amount);
    addField('currency', data.currency);
    addField('payment_type', data.paymentType);
    addField('duration', data.duration);
    addField('duration_unit', data.durationUnit);
    addField('start_date', data.startDate);
    addField('end_date', data.endDate);
    addField('terms', data.terms);

    if (fields.length === 0) {
      return res.json({ success: true, data: formatAgreement(agreement) });
    }

    // If the other party modifies it, reset to draft so both can review
    fields.push(`status = $${paramIndex}`);
    values.push('draft');
    paramIndex++;

    values.push(id);
    const result = await pool.query(
      `UPDATE agreements SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    res.json({ success: true, data: formatAgreement(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

// ── Sign / Send for signing ──

router.post('/:id/sign', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const existing = await pool.query('SELECT * FROM agreements WHERE id = $1', [id]);
    if (existing.rows.length === 0) throw new NotFoundError('Agreement');

    const agreement = existing.rows[0];
    const isClient = agreement.client_id === userId;
    const isWorker = agreement.worker_id === userId;

    if (!isClient && !isWorker && req.user!.role !== 'admin') {
      throw new ForbiddenError();
    }

    if (['active', 'completed', 'cancelled'].includes(agreement.status)) {
      throw new ConflictError(`Agreement is already ${agreement.status}`);
    }

    const now = new Date().toISOString();
    let newStatus: string;

    if (isClient) {
      // Client signs → pending worker approval (or active if worker already signed)
      if (agreement.worker_signed_at) {
        newStatus = 'active';
      } else {
        newStatus = 'pending_worker';
      }
      await pool.query(
        'UPDATE agreements SET client_signed_at = $1, status = $2 WHERE id = $3',
        [now, newStatus, id]
      );
    } else if (isWorker) {
      // Worker signs → pending client approval (or active if client already signed)
      if (agreement.client_signed_at) {
        newStatus = 'active';
      } else {
        newStatus = 'pending_client';
      }
      await pool.query(
        'UPDATE agreements SET worker_signed_at = $1, status = $2 WHERE id = $3',
        [now, newStatus, id]
      );
    } else {
      throw new ForbiddenError();
    }

    // If both signed → activate the project
    if (newStatus === 'active') {
      await pool.query(
        "UPDATE projects SET status = 'in_progress' WHERE id = $1",
        [agreement.project_id]
      );
    }

    const updated = await pool.query('SELECT * FROM agreements WHERE id = $1', [id]);
    res.json({ success: true, data: formatAgreement(updated.rows[0]) });
  } catch (error) {
    next(error);
  }
});

// ── Complete Agreement ──

router.post('/:id/complete', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existing = await pool.query('SELECT * FROM agreements WHERE id = $1', [id]);
    if (existing.rows.length === 0) throw new NotFoundError('Agreement');

    const agreement = existing.rows[0];
    if (agreement.client_id !== req.user!.userId && req.user!.role !== 'admin') {
      throw new ForbiddenError();
    }
    if (agreement.status !== 'active') {
      throw new ConflictError('Only active agreements can be completed');
    }

    const now = new Date().toISOString();
    await pool.query(
      'UPDATE agreements SET status = $1, completed_at = $2 WHERE id = $3',
      ['completed', now, id]
    );
    await pool.query(
      "UPDATE projects SET status = 'completed' WHERE id = $1",
      [agreement.project_id]
    );

    res.json({ success: true, message: 'Agreement completed' });
  } catch (error) {
    next(error);
  }
});

// ── Cancel Agreement ──

router.post('/:id/cancel', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existing = await pool.query('SELECT * FROM agreements WHERE id = $1', [id]);
    if (existing.rows.length === 0) throw new NotFoundError('Agreement');

    const agreement = existing.rows[0];
    if (agreement.client_id !== req.user!.userId && agreement.worker_id !== req.user!.userId && req.user!.role !== 'admin') {
      throw new ForbiddenError();
    }
    if (['completed', 'cancelled'].includes(agreement.status)) {
      throw new ConflictError(`Agreement is already ${agreement.status}`);
    }

    await pool.query('UPDATE agreements SET status = $1 WHERE id = $2', ['cancelled', id]);
    // Reopen the project
    await pool.query("UPDATE projects SET status = 'open' WHERE id = $1", [agreement.project_id]);

    res.json({ success: true, message: 'Agreement cancelled' });
  } catch (error) {
    next(error);
  }
});

// ── Helpers ──

function formatAgreement(row: any) {
  return {
    id: row.id,
    projectId: row.project_id,
    workerId: row.worker_id,
    clientId: row.client_id,
    bookingId: row.booking_id,
    title: row.title,
    scope: row.scope,
    deliverables: typeof row.deliverables === 'string' ? JSON.parse(row.deliverables) : row.deliverables || [],
    amount: row.amount ? parseFloat(row.amount) : 0,
    currency: row.currency,
    paymentType: row.payment_type,
    duration: row.duration,
    durationUnit: row.duration_unit,
    startDate: row.start_date,
    endDate: row.end_date,
    terms: row.terms,
    status: row.status,
    clientSignedAt: row.client_signed_at,
    workerSignedAt: row.worker_signed_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export default router;
