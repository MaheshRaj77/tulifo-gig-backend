import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import { MongoClient, Db } from 'mongodb';
import workerRoutes from './routes/worker.routes';
import { logger } from './utils/logger';

config();

const app = express();
const PORT = process.env.PORT || 3010;

// MongoDB connection
let mongodb: Db;
// Elasticsearch is optional - will use MongoDB text search as fallback
let elasticsearch: any = null;

async function initializeDB() {
  try {
    // MongoDB connection
    const mongoClient = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/tulifo_gig');
    await mongoClient.connect();
    mongodb = mongoClient.db();
    logger.info('MongoDB connected successfully');

    // Create MongoDB text index for search (fallback when Elasticsearch unavailable)
    await initializeMongoIndexes();

    // Elasticsearch connection (optional)
    if (process.env.ELASTICSEARCH_URL) {
      try {
        const { Client: ElasticsearchClient } = await import('@elastic/elasticsearch');
        elasticsearch = new ElasticsearchClient({
          node: process.env.ELASTICSEARCH_URL,
          auth: {
            username: process.env.ELASTICSEARCH_USER || 'elastic',
            password: process.env.ELASTICSEARCH_PASSWORD || 'changeme'
          }
        });
        await elasticsearch.ping();
        logger.info('Elasticsearch connected successfully');
        await initializeElasticsearchIndexes();
      } catch (esError) {
        logger.warn('Elasticsearch unavailable, using MongoDB for search', esError);
        elasticsearch = null;
      }
    } else {
      logger.info('Elasticsearch not configured, using MongoDB for search');
    }
  } catch (error) {
    logger.error('Database initialization failed', error);
    process.exit(1);
  }
}

async function initializeMongoIndexes() {
  try {
    const collection = mongodb.collection('worker_profiles');
    // Create text index for search
    await collection.createIndex(
      { title: 'text', tagline: 'text', 'skills.name': 'text' },
      { name: 'worker_search_index' }
    ).catch(() => {
      // Index may already exist
    });
    // Create index for filtering
    await collection.createIndex({ hourlyRate: 1 }).catch(() => {});
    await collection.createIndex({ averageRating: -1 }).catch(() => {});
    await collection.createIndex({ 'skills.name': 1 }).catch(() => {});
    logger.info('MongoDB indexes created for worker search');
  } catch (error) {
    logger.warn('Failed to create MongoDB indexes', error);
  }
}

async function initializeElasticsearchIndexes() {
  if (!elasticsearch) return;
  
  const indexName = 'workers';

  try {
    const exists = await elasticsearch.indices.exists({ index: indexName });

    if (!exists) {
      await elasticsearch.indices.create({
        index: indexName,
        body: {
          mappings: {
            properties: {
              userId: { type: 'keyword' },
              title: { type: 'text', analyzer: 'standard' },
              tagline: { type: 'text' },
              hourlyRate: { type: 'float' },
              currency: { type: 'keyword' },
              averageRating: { type: 'float' },
              totalReviews: { type: 'integer' },
              responseTime: { type: 'keyword' },
              skills: {
                type: 'nested',
                properties: {
                  name: { type: 'text', analyzer: 'standard' },
                  proficiency: { type: 'integer' },
                  verified: { type: 'boolean' }
                }
              },
              location: { type: 'geo_point' },
              availability: {
                type: 'nested',
                properties: {
                  date: { type: 'date' },
                  status: { type: 'keyword' }
                }
              },
              verifiedProfiles: { type: 'keyword' }
            }
          }
        }
      });
      logger.info('Elasticsearch index created');
    }
  } catch (error) {
    logger.error('Failed to initialize Elasticsearch index', error);
  }
}

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Make DB available to routes
app.use((req: any, res, next) => {
  req.mongodb = mongodb;
  req.elasticsearch = elasticsearch;
  next();
});

// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  try {
    // Check MongoDB
    await mongodb.admin().ping();

    const healthStatus: any = {
      status: 'healthy',
      service: 'worker-service',
      mongodb: 'connected',
      elasticsearch: elasticsearch ? 'connected' : 'not configured (using MongoDB search)'
    };

    // Check Elasticsearch if available
    if (elasticsearch) {
      try {
        await elasticsearch.ping();
      } catch {
        healthStatus.elasticsearch = 'disconnected';
      }
    }

    res.status(200).json(healthStatus);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'worker-service',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Routes
app.use('/api/workers', workerRoutes);

// Error handling
app.use((err: Error, req: Request, res: Response, next: any) => {
  logger.error('Unhandled error', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server after DB initialization
initializeDB().then(() => {
  app.listen(PORT, () => {
    logger.info(`Worker Service running on port ${PORT}`);
  });
}).catch(err => {
  logger.error('Failed to start worker service', err);
});
