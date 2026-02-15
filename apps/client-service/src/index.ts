import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import path from 'path';
import { Pool } from 'pg';
import { MongoClient, Db } from 'mongodb';
import clientRoutes from './routes/client.routes';
import { logger } from './utils/logger';
import { supabase } from './utils/supabase';

config({ path: path.resolve(process.cwd(), '../../.env') });

const app = express();
const PORT = process.env.PORT || 3011;

let pgPool: Pool | null;
let mongodb: Db;
let supabaseConnected = false;

async function initializeDB() {
  try {
    // Supabase PostgreSQL connection
    try {
      pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });
      await pgPool.query('SELECT NOW()');
      logger.info('Supabase PostgreSQL connected successfully');
    } catch (pgError) {
      logger.warn('Supabase PostgreSQL connection failed, continuing without it', pgError instanceof Error ? pgError.message : pgError);
      pgPool = null;
    }

    // Test Supabase client connection
    try {
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      if (error) throw error;
      supabaseConnected = true;
      logger.info('Supabase client connected successfully');
    } catch (supabaseError) {
      logger.warn('Supabase client connection failed, continuing without it', supabaseError instanceof Error ? supabaseError.message : supabaseError);
      supabaseConnected = false;
    }

    // MongoDB connection
    try {
      const mongoClient = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/tulifo_gig', {
        connectTimeoutMS: 5000,
        serverSelectionTimeoutMS: 5000,
      });
      await mongoClient.connect();
      mongodb = mongoClient.db();
      logger.info('MongoDB connected successfully');
    } catch (mongoError) {
      logger.warn('MongoDB connection failed, continuing without it', mongoError instanceof Error ? mongoError.message : mongoError);
      // MongoDB will be initialized lazily if needed
    }
  } catch (error) {
    logger.error('Database initialization error', error);
    // Don't exit, allow service to start in degraded mode
  }
}

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());

app.use((req: any, res, next) => {
  req.pgPool = pgPool;
  req.mongodb = mongodb;
  req.supabase = supabase;
  next();
});

app.get('/health', async (_req: Request, res: Response) => {
  try {
    let dbStatus = {};
    let isHealthy = true;

    // Check Supabase PostgreSQL
    if (pgPool) {
      try {
        await pgPool.query('SELECT 1');
        dbStatus = { ...dbStatus, postgresql: 'connected' };
      } catch (error_) {
        console.error('PostgreSQL health check error:', error_);
        dbStatus = { ...dbStatus, postgresql: 'disconnected' };
        // Supabase PostgreSQL is optional, don't mark unhealthy
      }
    } else {
      dbStatus = { ...dbStatus, postgresql: 'disconnected' };
      // Supabase PostgreSQL is optional
    }

    // Check Supabase client
    if (supabaseConnected) {
      try {
        const { error } = await supabase.from('profiles').select('count').limit(1);
        if (error) throw error;
        dbStatus = { ...dbStatus, supabase: 'connected' };
      } catch (error_) {
        console.error('Supabase client health check error:', error_);
        dbStatus = { ...dbStatus, supabase: 'disconnected' };
        // Supabase client is optional, don't mark unhealthy
      }
    } else {
      dbStatus = { ...dbStatus, supabase: 'disconnected' };
      // Supabase client is optional
    }

    // Check MongoDB
    if (mongodb) {
      try {
        await mongodb.admin().ping();
        dbStatus = { ...dbStatus, mongodb: 'connected' };
      } catch (error_) {
        console.error('MongoDB health check error:', error_);
        dbStatus = { ...dbStatus, mongodb: 'disconnected' };
        isHealthy = false; // MongoDB is required
      }
    } else {
      dbStatus = { ...dbStatus, mongodb: 'disconnected' };
      isHealthy = false;
    }
    
    res.status(isHealthy ? 200 : 503).json({ 
      status: isHealthy ? 'healthy' : 'degraded',
      service: 'client-service',
      ...dbStatus
    });
  } catch (error_) {
    console.error('Health check error:', error_);
    res.status(503).json({ 
      status: 'unhealthy', 
      service: 'client-service',
      error: error_ instanceof Error ? error_.message : 'Unknown error'
    });
  }
});

app.use('/api/v1/clients', clientRoutes);

app.use((err: Error, req: Request, res: Response, next: any) => {
  logger.error('Unhandled error', err);
  res.status(500).json({ error: 'Internal server error' });
});

await initializeDB();
app.listen(PORT, () => {
  logger.info(`Client Service running on port ${PORT}`);
});

