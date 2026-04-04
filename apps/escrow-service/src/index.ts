import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import { Pool } from 'pg';
import cron from 'node-cron';
import jwt from 'jsonwebtoken';

config();

const app = express();
const PORT = process.env.PORT || 3012;
const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });

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
  res.json({ status: 'healthy', service: 'escrow-service', database: dbStatus });
});

// Auth Middleware
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
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Create escrow account
app.post('/api/escrow', authenticate, async (req, res) => {
  const { bookingId, amount, clientId, workerId } = req.body;

  try {
    const result = await pgPool.query(
      `INSERT INTO escrow_accounts (booking_id, client_id, worker_id, held_amount, status)
       VALUES ($1, $2, $3, $4, 'active') RETURNING *`,
      [bookingId, clientId, workerId, amount]
    );
    res.status(201).json(result.rows[0]);
  } catch (error_) {
    console.error('Create escrow error:', error_);
    res.status(500).json({ error: 'Failed to create escrow account' });
  }
});

// Release escrow funds
app.post('/api/escrow/:id/release', authenticate, async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  const user = (req as any).user;

  try {
    // Verify ownership
    const checkResult = await pgPool.query('SELECT client_id FROM escrow_accounts WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Escrow account not found' });
    }
    
    if (user.userId !== checkResult.rows[0].client_id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Only the client can release funds' });
    }

    const result = await pgPool.query(
      `UPDATE escrow_accounts 
       SET status = 'released', released_amount = $1, released_at = NOW()
       WHERE id = $2 AND status = 'active' RETURNING *`,
      [amount, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Escrow account not found or already released' });
    }

    res.json(result.rows[0]);
  } catch (error_) {
    console.error('Release escrow error:', error_);
    res.status(500).json({ error: 'Failed to release escrow' });
  }
});

// Freeze escrow (for disputes)
app.post('/api/escrow/:id/freeze', authenticate, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== 'admin' && user.role !== 'support') {
    return res.status(403).json({ error: 'Forbidden: Only admin/support can freeze escrow' });
  }

  try {
    const result = await pgPool.query(
      `UPDATE escrow_accounts SET status = 'frozen' WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error_) {
    console.error('Freeze escrow error:', error_);
    res.status(500).json({ error: 'Failed to freeze escrow' });
  }
});

// Auto-release escrow funds scheduled task (runs every 15 minutes)
cron.schedule('*/15 * * * *', async () => {
  const now = new Date();
  let lockAcquired = false;

  try {
    const lockResult = await pgPool.query('SELECT pg_try_advisory_lock(777) AS acquired');
    if (!lockResult.rows[0].acquired) {
      console.log('Skipping auto-release cron (lock held by another instance)');
      return;
    }
    lockAcquired = true;

    const result = await pgPool.query(
      `UPDATE escrow_accounts 
       SET status = 'released', released_amount = held_amount, released_at = NOW()
       WHERE auto_release_enabled = true 
         AND auto_release_at <= $1 
         AND status = 'active'
       RETURNING id, booking_id, released_amount`,
      [now]
    );

    if (result.rowCount && result.rowCount > 0) {
      console.log(`Auto-released ${result.rowCount} escrow accounts:`, result.rows);
    }
  } catch (error) {
    console.error('Auto-release cron job failed:', error);
  } finally {
    if (lockAcquired) {
      await pgPool.query('SELECT pg_advisory_unlock(777)');
    }
  }
});

app.listen(PORT, () => {
  console.log(`🔒 Escrow Service running on port ${PORT}`);
  console.log('✅ Auto-release cron job scheduled (every 15 minutes)');
});
