import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { logger, errorHandler } from './lib';
import userRoutes from './routes/user.routes';
import workerRoutes from './routes/worker.routes';
import clientRoutes from './routes/client.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.query('SELECT NOW()')
  .then(() => logger.info('Connected to PostgreSQL'))
  .catch((err) => logger.error('Database connection error:', err));

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'user-service' });
});

app.use('/api/users', userRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/clients', clientRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`User service running on port ${PORT}`);
});
