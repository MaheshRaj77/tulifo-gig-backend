import { Pool } from 'pg';
import { Db, ObjectId } from 'mongodb';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16'
});

export class ClientService {
  async getClientById(pgPool: Pool, mongodb: Db, clientId: string) {
    const pgResult = await pgPool.query(
      'SELECT * FROM user_profiles WHERE user_id = $1',
      [clientId]
    );

    const mongoData = await mongodb.collection('client_profiles').findOne({ userId: clientId });

    return {
      ...pgResult.rows[0],
      ...mongoData
    };
  }

  async updateClient(mongodb: Db, clientId: string, updates: any) {
    const result = await mongodb.collection('client_profiles').findOneAndUpdate(
      { userId: clientId },
      { 
        $set: { 
          ...updates,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after', upsert: true }
    );

    return (result && result.value) || null;
  }

  async getProjects(mongodb: Db, clientId: string, filters: any) {
    const query: any = { clientId };

    if (filters.status) {
      query.status = filters.status;
    }

    const projects = await mongodb.collection('projects')
      .find(query)
      .skip((filters.page - 1) * filters.limit)
      .limit(filters.limit)
      .sort({ createdAt: -1 })
      .toArray();

    const total = await mongodb.collection('projects').countDocuments(query);

    return {
      projects,
      total,
      page: filters.page,
      pages: Math.ceil(total / filters.limit)
    };
  }

  async createProject(mongodb: Db, clientId: string, projectData: any) {
    const project = {
      _id: new ObjectId(),
      clientId,
      ...projectData,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await mongodb.collection('projects').insertOne(project);
    return project;
  }

  async getBookings(pgPool: Pool, clientId: string, filters: any) {
    let query = 'SELECT * FROM bookings WHERE client_id = $1';
    const params: any[] = [clientId];
    let paramIndex = 2;

    if (filters.status) {
      query += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.startDate) {
      query += ` AND scheduled_start >= $${paramIndex}`;
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters.endDate) {
      query += ` AND scheduled_end <= $${paramIndex}`;
      params.push(filters.endDate);
      paramIndex++;
    }

    query += ' ORDER BY scheduled_start DESC';

    const result = await pgPool.query(query, params);
    return result.rows;
  }

  async getPaymentMethods(pgPool: Pool, clientId: string) {
    const result = await pgPool.query(
      'SELECT * FROM payment_methods WHERE user_id = $1 AND deleted_at IS NULL ORDER BY is_default DESC, created_at DESC',
      [clientId]
    );

    return result.rows;
  }

  async addPaymentMethod(pgPool: Pool, clientId: string, stripePaymentMethodId: string) {
    // Attach payment method to Stripe customer
    const paymentMethod = await stripe.paymentMethods.retrieve(stripePaymentMethodId);

    const result = await pgPool.query(
      `INSERT INTO payment_methods (user_id, stripe_payment_method_id, type, last_four, brand)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        clientId,
        stripePaymentMethodId,
        paymentMethod.type,
        paymentMethod.card?.last4 || null,
        paymentMethod.card?.brand || null
      ]
    );

    return result.rows[0];
  }

  async removePaymentMethod(pgPool: Pool, clientId: string, methodId: string) {
    await pgPool.query(
      'UPDATE payment_methods SET deleted_at = NOW() WHERE id = $1 AND user_id = $2',
      [methodId, clientId]
    );
  }

  async getSpending(pgPool: Pool, clientId: string, filters: any) {
    const daysAgo = Number.parseInt(filters.period?.replace('d', '') || '30');
    const startDate = filters.startDate || new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    const endDate = filters.endDate || new Date();

    const result = await pgPool.query(
      `SELECT 
         COUNT(*) as total_bookings,
         SUM(total_amount) as total_spent,
         AVG(total_amount) as average_booking_value,
         SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END) as completed_amount,
         SUM(CASE WHEN status IN ('confirmed', 'in_progress') THEN total_amount ELSE 0 END) as pending_amount
       FROM bookings
       WHERE client_id = $1
       AND created_at BETWEEN $2 AND $3`,
      [clientId, startDate, endDate]
    );

    return {
      period: { startDate, endDate },
      ...result.rows[0]
    };
  }

  async getFavoriteWorkers(mongodb: Db, clientId: string) {
    const client = await mongodb.collection('client_profiles').findOne({ userId: clientId });
    return client?.favoriteWorkers || [];
  }

  async addFavoriteWorker(mongodb: Db, clientId: string, workerId: string) {
    await mongodb.collection('client_profiles').updateOne(
      { userId: clientId },
      { 
        $addToSet: { favoriteWorkers: workerId },
        $set: { updatedAt: new Date() }
      },
      { upsert: true }
    );
  }

  async removeFavoriteWorker(mongodb: Db, clientId: string, workerId: string) {
    await mongodb.collection('client_profiles').updateOne(
      { userId: clientId },
      { 
        $pull: { favoriteWorkers: workerId } as any,
        $set: { updatedAt: new Date() }
      }
    );
  }
}
