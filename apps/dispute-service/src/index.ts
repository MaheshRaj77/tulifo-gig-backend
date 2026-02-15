import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import { Pool } from 'pg';
import axios from 'axios';

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

// Create dispute
app.post('/api/v1/disputes', async (req, res) => {
  const { bookingId, openedBy, reason, description, escrowId } = req.body;

  try {
    // Freeze escrow if provided
    if (escrowId) {
      await axios.post(`${ESCROW_SERVICE_URL}/api/v1/escrow/${escrowId}/freeze`);
    }

    const result = await pgPool.query(
      `INSERT INTO disputes (booking_id, opened_by, reason, description, status, escrow_id)
       VALUES ($1, $2, $3, $4, 'open', $5) RETURNING *`,
      [bookingId, openedBy, reason, description, escrowId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Failed to create dispute:', error);
    res.status(500).json({ error: 'Failed to create dispute' });
  }
});

// Get dispute by ID
app.get('/api/v1/disputes/:id', async (req, res) => {
  try {
    const result = await pgPool.query(
      'SELECT * FROM disputes WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    res.json(result.rows[0]);
  } catch (error_) {
    console.error('Fetch dispute error:', error_);
    res.status(500).json({ error: 'Failed to fetch dispute' });
  }
});

// Get disputes by user
app.get('/api/v1/disputes/user/:userId', async (req, res) => {
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
app.post('/api/v1/disputes/:id/evidence', async (req, res) => {
  const { userId, evidenceType, description, attachments } = req.body;

  try {
    const result = await pgPool.query(
      `INSERT INTO dispute_evidence (dispute_id, submitted_by, evidence_type, description, attachments)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.id, userId, evidenceType, description, JSON.stringify(attachments)]
    );

    res.status(201).json(result.rows[0]);
  } catch (error_) {
    console.error('Add evidence error:', error_);
    res.status(500).json({ error: 'Failed to add evidence' });
  }
});

// Update dispute status
app.patch('/api/v1/disputes/:id', async (req, res) => {
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
