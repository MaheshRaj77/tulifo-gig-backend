import Redis from 'ioredis';
import { logger } from './logger';

let redis: Redis | null = null;

export async function connectRedis(): Promise<Redis> {
  if (redis) return redis;

  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  
  redis = new Redis(url, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) {
        logger.error('Redis connection failed after 3 retries');
        return null;
      }
      return Math.min(times * 100, 3000);
    }
  });

  redis.on('connect', () => {
    logger.info('Connected to Redis');
  });

  redis.on('error', (err) => {
    logger.error('Redis error:', err);
  });

  return redis;
}

export function getRedis(): Redis {
  if (!redis) {
    throw new Error('Redis not connected. Call connectRedis() first.');
  }
  return redis;
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    logger.info('Disconnected from Redis');
  }
}
