import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import { Pool } from 'pg';
import cron from 'node-cron';

config();

const app = express();
const PORT = process.env.PORT || 3012;
const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    await pgPool.query('SELECT 1');
    res.json({ status: 'healthy', service: 'escrow-service' });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', service: 'escrow-service' });
  }
});

// Create escrow account
app.post('/api/v1/escrow', async (req, res) => {
  const { bookingId, amount, clientId, workerId } = req.body;
  
  try {
    const result = await pgPool.query(
      `INSERT INTO escrow_accounts (booking_id, client_id, worker_id, held_amount, status)
       VALUES ($1, $2, $3, $4, 'active') RETURNING *`,
      [bookingId, clientId, workerId, amount]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create escrow account' });
  }
});

// Release escrow funds
app.post('/api/v1/escrow/:id/release', async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  
  try {
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to release escrow' });
  }
});

// Freeze escrow (for disputes)
app.post('/api/v1/escrow/:id/freeze', async (req, res) => {
  try {
    const result = await pgPool.query(
      `UPDATE escrow_accounts SET status = 'frozen' WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to freeze escrow' });
  }
});

// Auto-release escrow funds scheduled task (runs every 15 minutes)
cron.schedule('*/15 * * * *', async () => {
  const now = new Date();
  
  try {
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
  }
});

app.listen(PORT, () => {
  console.log(`🔒 Escrow Service running on port ${PORT}`);
  console.log('✅ Auto-release cron job scheduled (every 15 minutes)');
});
