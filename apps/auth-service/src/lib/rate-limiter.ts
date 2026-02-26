// In-memory sliding-window rate limiter
// No Redis dependency required — suitable for single-instance deployments

interface RateLimitEntry {
    timestamps: number[];
}

interface RateLimiterConfig {
    windowMs: number;      // Time window in milliseconds
    maxRequests: number;    // Max requests per window
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
            entry.timestamps = entry.timestamps.filter(t => now - t < 3600000); // 1 hour max
            if (entry.timestamps.length === 0) {
                store.delete(key);
            }
        });
    });
}, 60000); // Every minute

export function checkRateLimit(
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

    // Remove timestamps outside the window
    entry.timestamps = entry.timestamps.filter(t => now - t < config.windowMs);

    if (entry.timestamps.length >= config.maxRequests) {
        const oldestInWindow = entry.timestamps[0];
        const retryAfterMs = config.windowMs - (now - oldestInWindow);
        return {
            allowed: false,
            remaining: 0,
            retryAfterMs: Math.max(retryAfterMs, 0),
        };
    }

    entry.timestamps.push(now);
    return {
        allowed: true,
        remaining: config.maxRequests - entry.timestamps.length,
        retryAfterMs: 0,
    };
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
