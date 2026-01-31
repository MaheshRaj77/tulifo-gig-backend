import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { logger, errorHandler } from './lib';
import projectRoutes from './routes/project.routes';
import bidRoutes from './routes/bid.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

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
  res.json({ status: 'healthy', service: 'project-service' });
});

app.use('/api/projects', projectRoutes);
app.use('/api/bids', bidRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Project service running on port ${PORT}`);
});
