import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import { MongoClient, Db } from 'mongodb';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import workerRoutes from './routes/worker.routes';
import { logger } from './utils/logger';

config();

const app = express();
const PORT = process.env.PORT || 3010;

// MongoDB connection
let mongodb: Db;
let elasticsearch: ElasticsearchClient;

async function initializeDB() {
  try {
    // MongoDB connection
    const mongoClient = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/tulifo_gig');
    await mongoClient.connect();
    mongodb = mongoClient.db();
    logger.info('MongoDB connected successfully');

    // Elasticsearch connection
    elasticsearch = new ElasticsearchClient({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      auth: {
        username: process.env.ELASTICSEARCH_USER || 'elastic',
        password: process.env.ELASTICSEARCH_PASSWORD || 'changeme'
      }
    });

    // Test Elasticsearch connection
    await elasticsearch.ping();
    logger.info('Elasticsearch connected successfully');

    // Create indexes if they don't exist
    await initializeElasticsearchIndexes();
  } catch (error) {
    logger.error('Database initialization failed', error);
    process.exit(1);
  }
}

async function initializeElasticsearchIndexes() {
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
  origin: process.env.CORS_ORIGIN || '*',
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
    
    // Check Elasticsearch
    await elasticsearch.ping();
    
    res.status(200).json({ 
      status: 'healthy', 
      service: 'worker-service',
      mongodb: 'connected',
      elasticsearch: 'connected'
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy', 
      service: 'worker-service',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Routes
app.use('/api/v1/workers', workerRoutes);

// Error handling
app.use((err: Error, req: Request, res: Response, next: any) => {
  logger.error('Unhandled error', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server after DB initialization
await initializeDB();
app.listen(PORT, () => {
  logger.info(`Worker Service running on port ${PORT}`);
});
