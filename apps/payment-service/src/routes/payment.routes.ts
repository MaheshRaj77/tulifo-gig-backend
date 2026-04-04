import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pool, stripe } from '../index';
import { authenticate, validate, NotFoundError, logger } from '../lib';
import { notifications } from '@flexwork/shared';

const router: Router = Router();

const createPaymentSchema = z.object({
  bookingId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  payeeId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().default('USD')
});

// Create payment intent
router.post('/create-intent', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = validate(createPaymentSchema, req.body);
    const currency = data.currency || 'USD';

    // Calculate fee (10% platform fee)
    const fee = Math.round(data.amount * 0.1 * 100) / 100;
    const netAmount = data.amount - fee;

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(data.amount * 100), // Stripe uses cents
      currency: currency.toLowerCase(),
      metadata: {
        payerId: req.user!.userId,
        payeeId: data.payeeId,
        bookingId: data.bookingId || '',
        projectId: data.projectId || ''
      }
    });

    // Create payment record
    const result = await pool.query(
      `INSERT INTO payments (booking_id, project_id, payer_id, payee_id, amount, currency, fee, net_amount, stripe_payment_intent_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [data.bookingId, data.projectId, req.user!.userId, data.payeeId, data.amount, currency, fee, netAmount, paymentIntent.id]
    );

    res.json({
      success: true,
      data: {
        payment: result.rows[0],
        clientSecret: paymentIntent.client_secret
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get payment by ID
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM payments WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Payment');
    }

    const payment = result.rows[0];

    // Only payer or payee can view
    if (payment.payer_id !== req.user!.userId && payment.payee_id !== req.user!.userId) {
      return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
    }

    res.json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
});

// Stripe webhook
router.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.error('Stripe webhook secret not configured');
    return res.status(500).send('Webhook secret not configured');
  }

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        await pool.query(
          `UPDATE payments SET status = 'completed', completed_at = NOW() WHERE stripe_payment_intent_id = $1`,
          [paymentIntent.id]
        );
        logger.info(`Payment completed: ${paymentIntent.id}`);

        // Send notification to payee
        const paymentResult = await pool.query(
          `SELECT p.*, pr.title as project_title FROM payments p
           LEFT JOIN projects pr ON p.project_id = pr.id
           WHERE p.stripe_payment_intent_id = $1`,
          [paymentIntent.id]
        );
        if (paymentResult.rows.length > 0) {
          const payment = paymentResult.rows[0];
          notifications.paymentCompleted(
            payment.payee_id,
            payment.net_amount,
            payment.project_title || 'your work'
          ).catch(err => logger.error('Failed to send payment notification', err));
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        await pool.query(
          `UPDATE payments SET status = 'failed' WHERE stripe_payment_intent_id = $1`,
          [paymentIntent.id]
        );
        logger.info(`Payment failed: ${paymentIntent.id}`);

        // Send notification to payer about failed payment
        const failedPayment = await pool.query(
          `SELECT payer_id, amount FROM payments WHERE stripe_payment_intent_id = $1`,
          [paymentIntent.id]
        );
        if (failedPayment.rows.length > 0) {
          const payment = failedPayment.rows[0];
          notifications.paymentFailed(
            payment.payer_id,
            payment.amount,
            'Payment was declined'
          ).catch(err => logger.error('Failed to send payment failed notification', err));
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    logger.error('Webhook error:', err);
    res.status(400).send(`Webhook Error: ${(err as Error).message}`);
  }
});

// Get user's payments
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type = 'all', page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = 'SELECT * FROM payments WHERE ';
    if (type === 'sent') {
      query += 'payer_id = $1';
    } else if (type === 'received') {
      query += 'payee_id = $1';
    } else {
      query += '(payer_id = $1 OR payee_id = $1)';
    }
    query += ' ORDER BY created_at DESC LIMIT $2 OFFSET $3';

    const result = await pool.query(query, [req.user!.userId, Number(limit), offset]);

    res.json({
      success: true,
      data: result.rows,
      meta: { page: Number(page), limit: Number(limit) }
    });
  } catch (error) {
    next(error);
  }
});

// Get user balance
router.get('/wallet/balance', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // In a real app this would query the `transactions` table for the user's ledger balance.
    // Since this is a demo/mock flow, we'll calculate it based on completed payments received
    // minus withdrawals made.

    // Total received
    const paymentsResult = await pool.query(
      `SELECT COALESCE(SUM(net_amount), 0) as total_received 
       FROM payments 
       WHERE payee_id = $1 AND status = 'completed'`,
      [req.user!.userId]
    );

    // Total withdrawn (transactions where type='debit')
    const withdrawalsResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_withdrawn 
       FROM transactions 
       WHERE payment_id IN (SELECT id FROM payments WHERE payer_id = $1) AND type = 'debit'`,
      [req.user!.userId]
    );

    const available = Number(paymentsResult.rows[0].total_received) - Number(withdrawalsResult.rows[0].total_withdrawn);

    res.json({
      success: true,
      data: {
        availableBalance: available > 0 ? available : 0,
        currency: 'USD'
      }
    });
  } catch (error) {
    next(error);
  }
});

// Request withdrawal
const withdrawSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['bank_transfer', 'paypal']),
  details: z.any()
});

router.post('/withdraw', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const data = validate(withdrawSchema, req.body);
    const userId = req.user!.userId;

    // Use a transaction to ensure atomicity
    await client.query('BEGIN');

    // Lock the user row to serialize concurrent withdrawal attempts
    await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);

    // Calculate available balance: total received minus total withdrawn
    const balanceResult = await client.query(
      `SELECT
         COALESCE((SELECT SUM(net_amount) FROM payments WHERE payee_id = $1 AND status = 'completed'), 0)
         -
         COALESCE((SELECT SUM(t.amount) FROM transactions t JOIN payments p ON t.payment_id = p.id WHERE p.payer_id = $1 AND t.type = 'debit'), 0)
         AS available_balance`,
      [userId]
    );

    const availableBalance = Number(balanceResult.rows[0].available_balance);

    if (availableBalance < data.amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_BALANCE',
          message: `Insufficient balance. Available: $${availableBalance.toFixed(2)}, Requested: $${data.amount.toFixed(2)}`,
        },
      });
    }

    // Create withdrawal payment record
    const paymentResult = await client.query(
      `INSERT INTO payments (payer_id, payee_id, amount, currency, fee, net_amount, status, description)
       VALUES ($1, $1, $2, 'USD', 0, $2, 'pending', 'Withdrawal Request') RETURNING id`,
      [userId, data.amount]
    );

    const paymentId = paymentResult.rows[0].id;

    // Insert transaction record — description computed in application layer (not SQL concatenation)
    const description = `Withdrawal via ${data.method}`;
    const newBalance = availableBalance - data.amount;

    await client.query(
      `INSERT INTO transactions (payment_id, amount, type, description, balance)
       VALUES ($1, $2, 'debit', $3, $4)`,
      [paymentId, data.amount, description, newBalance]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Withdrawal requested successfully',
      data: {
        amount: data.amount,
        remainingBalance: newBalance,
        status: 'pending'
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

// ─── Admin: Payment stats (revenue overview) ───────────────────────
router.get('/stats', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
    }

    const result = await pool.query(`
      SELECT
        COALESCE(SUM(amount), 0)     AS total_volume,
        COALESCE(SUM(fee), 0)        AS total_fees,
        COALESCE(SUM(net_amount), 0) AS total_net,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
        COUNT(*) FILTER (WHERE status = 'pending')   AS pending_count,
        COUNT(*) FILTER (WHERE status = 'failed')    AS failed_count,
        COUNT(*) AS total_count
      FROM payments
    `);

    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        totalVolume: parseFloat(row.total_volume),
        totalFees: parseFloat(row.total_fees),
        totalNet: parseFloat(row.total_net),
        completedCount: parseInt(row.completed_count, 10),
        pendingCount: parseInt(row.pending_count, 10),
        failedCount: parseInt(row.failed_count, 10),
        totalCount: parseInt(row.total_count, 10),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
