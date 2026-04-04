import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import { Pool } from 'pg';
import axios from 'axios';
import jwt from 'jsonwebtoken';

config();

const app = express();
const PORT = process.env.PORT || 3013;
const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
const ESCROW_SERVICE_URL = process.env.ESCROW_SERVICE_URL || 'http://escrow-service:3012';

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    await pgPool.query('SELECT 1');
    dbStatus = 'connected';
  } catch (error_) {
    // DB may be temporarily unavailable — service is still running
  }
  res.json({ status: 'healthy', service: 'dispute-service', database: dbStatus });
});

// Auth middleware
function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    (req as any).user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Create dispute
app.post('/api/disputes', authenticate, async (req, res) => {
  const user = (req as any).user;
  const { bookingId, projectId, reason, description, escrowId } = req.body;

  // Input validation
  if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
    return res.status(400).json({ error: 'reason is required (min 3 characters)' });
  }
  if (!description || typeof description !== 'string' || description.trim().length < 10) {
    return res.status(400).json({ error: 'description is required (min 10 characters)' });
  }
  if (!bookingId && !projectId) {
    return res.status(400).json({ error: 'bookingId or projectId is required' });
  }

  const openedBy = user.userId; // Always use authenticated user, never trust body

  try {
    // Freeze escrow if provided
    if (escrowId) {
      await axios.post(`${ESCROW_SERVICE_URL}/api/escrow/${escrowId}/freeze`);
    }

    const result = await pgPool.query(
      `INSERT INTO disputes (booking_id, project_id, opened_by, reason, description, status, escrow_id)
       VALUES ($1, $2, $3, $4, $5, 'open', $6) RETURNING *`,
      [bookingId ?? null, projectId ?? null, openedBy, reason.trim(), description.trim(), escrowId ?? null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Failed to create dispute:', error);
    res.status(500).json({ error: 'Failed to create dispute' });
  }
});

// Get dispute by ID
app.get('/api/disputes/:id', authenticate, async (req, res) => {
  const user = (req as any).user;
  try {
    const result = await pgPool.query(
      'SELECT * FROM disputes WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    const dispute = result.rows[0];
    // Only parties to the dispute or admins can view it
    if (user.userId !== dispute.opened_by && user.userId !== dispute.respondent_id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json(dispute);
  } catch (error_) {
    console.error('Fetch dispute error:', error_);
    res.status(500).json({ error: 'Failed to fetch dispute' });
  }
});

// Get all disputes — admin only; must be registered BEFORE /:id to avoid param shadowing
app.get('/api/disputes', authenticate, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const result = await pgPool.query(
      `SELECT * FROM disputes ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error_) {
    console.error('Fetch all disputes error:', error_);
    res.status(500).json({ error: 'Failed to fetch disputes' });
  }
});

// Get disputes by user (own disputes only)
app.get('/api/disputes/user/:userId', authenticate, async (req, res) => {
  const user = (req as any).user;
  // Users can only fetch their own disputes; admins can fetch anyone's
  if (user.userId !== req.params.userId && user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const result = await pgPool.query(
      `SELECT * FROM disputes 
       WHERE opened_by = $1 OR respondent_id = $1 
       ORDER BY created_at DESC`,
      [req.params.userId]
    );

    res.json(result.rows);
  } catch (error_) {
    console.error('Fetch disputes error:', error_);
    res.status(500).json({ error: 'Failed to fetch disputes' });
  }
});

// Add evidence to dispute
app.post('/api/disputes/:id/evidence', authenticate, async (req, res) => {
  const user = (req as any).user;
  const { evidenceType, description, attachments } = req.body;

  try {
    const result = await pgPool.query(
      `INSERT INTO dispute_evidence (dispute_id, submitted_by, evidence_type, description, attachments)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.id, user.userId, evidenceType, description, JSON.stringify(attachments)]
    );

    res.status(201).json(result.rows[0]);
  } catch (error_) {
    console.error('Add evidence error:', error_);
    res.status(500).json({ error: 'Failed to add evidence' });
  }
});

// Update dispute status (admin only)
app.patch('/api/disputes/:id', authenticate, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { status, resolution, resolvedBy } = req.body;

  try {
    const result = await pgPool.query(
      `UPDATE disputes 
       SET status = $1, resolution = $2, resolved_by = $3, resolved_at = NOW()
       WHERE id = $4 
       RETURNING *`,
      [status, resolution, resolvedBy, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    res.json(result.rows[0]);
  } catch (error_) {
    console.error('Update dispute error:', error_);
    res.status(500).json({ error: 'Failed to update dispute' });
  }
});

app.listen(PORT, () => {
  console.log(`⚖️  Dispute Service running on port ${PORT}`);
});
