/**
 * Redis-backed sliding-window rate limiter.
 * Falls back to in-memory if Redis is unavailable.
 */
import Redis from 'ioredis';
import { logger } from './logger';

// ─── Redis Connection ──────────────────────────────────────────────
let redis: Redis | null = null;
let useRedis = false;

export function initRedisRateLimiter(): void {
  const url = process.env.REDIS_URL;
  if (!url) {
    logger.warn('REDIS_URL not set — using in-memory rate limiter (not suitable for multi-instance)');
    return;
  }

  try {
    redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 2000)),
    });

    redis.on('connect', () => {
      useRedis = true;
      logger.info('Redis connected for rate limiting');
    });

    redis.on('error', (err) => {
      useRedis = false;
      logger.error('Redis error — falling back to in-memory rate limiter', err.message);
    });

    redis.on('close', () => {
      useRedis = false;
    });

    redis.connect().catch(() => {
      logger.warn('Redis connection failed — using in-memory rate limiter');
    });
  } catch {
    logger.warn('Redis initialization failed — using in-memory rate limiter');
  }
}

// ─── In-Memory Fallback ────────────────────────────────────────────
interface RateLimitEntry {
  timestamps: number[];
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

function getStore(name: string): Map<string, RateLimitEntry> {
  if (!stores.has(name)) {
    stores.set(name, new Map());
  }
  return stores.get(name)!;
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  stores.forEach((store) => {
    store.forEach((entry, key) => {
      entry.timestamps = entry.timestamps.filter(t => now - t < 3600000);
      if (entry.timestamps.length === 0) {
        store.delete(key);
      }
    });
  });
}, 60000);

function checkInMemory(
  storeName: string,
  key: string,
  config: RateLimiterConfig
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const store = getStore(storeName);
  const now = Date.now();

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  entry.timestamps = entry.timestamps.filter(t => now - t < config.windowMs);

  if (entry.timestamps.length >= config.maxRequests) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = config.windowMs - (now - oldestInWindow);
    return { allowed: false, remaining: 0, retryAfterMs: Math.max(retryAfterMs, 0) };
  }

  entry.timestamps.push(now);
  return { allowed: true, remaining: config.maxRequests - entry.timestamps.length, retryAfterMs: 0 };
}

// ─── Redis-Backed Check ────────────────────────────────────────────
async function checkRedis(
  storeName: string,
  key: string,
  config: RateLimiterConfig
): Promise<{ allowed: boolean; remaining: number; retryAfterMs: number }> {
  const redisKey = `ratelimit:${storeName}:${key}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Lua script for atomic sliding window
  const script = `
    redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[1])
    local count = redis.call('ZCARD', KEYS[1])
    if count < tonumber(ARGV[2]) then
      redis.call('ZADD', KEYS[1], ARGV[3], ARGV[3])
      redis.call('PEXPIRE', KEYS[1], ARGV[4])
      return {1, tonumber(ARGV[2]) - count - 1, 0}
    else
      local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
      local retryMs = tonumber(ARGV[4]) - (tonumber(ARGV[3]) - tonumber(oldest[2]))
      return {0, 0, retryMs}
    end
  `;

  const result = await redis!.eval(
    script, 1, redisKey,
    windowStart.toString(),
    config.maxRequests.toString(),
    now.toString(),
    config.windowMs.toString()
  ) as number[];

  return {
    allowed: result[0] === 1,
    remaining: result[1],
    retryAfterMs: Math.max(result[2], 0),
  };
}

// ─── Public API ────────────────────────────────────────────────────

interface RateLimiterConfig {
  windowMs: number;
  maxRequests: number;
}

export async function checkRateLimit(
  storeName: string,
  key: string,
  config: RateLimiterConfig
): Promise<{ allowed: boolean; remaining: number; retryAfterMs: number }> {
  if (useRedis && redis) {
    try {
      return await checkRedis(storeName, key, config);
    } catch {
      // Redis failed mid-request — fall back
      return checkInMemory(storeName, key, config);
    }
  }
  return checkInMemory(storeName, key, config);
}

// ─── Pre-configured rate limit configs ─────────────────────────────

export const RATE_LIMITS = {
  login: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: 5,
  },
  register: {
    windowMs: 60 * 60 * 1000,  // 1 hour
    maxRequests: 3,
  },
  refresh: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 10,
  },
  passwordChange: {
    windowMs: 60 * 60 * 1000,  // 1 hour
    maxRequests: 3,
  },
  passwordReset: {
    windowMs: 60 * 60 * 1000,  // 1 hour
    maxRequests: 10,
  },
} as const;
