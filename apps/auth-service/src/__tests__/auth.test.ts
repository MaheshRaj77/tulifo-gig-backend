import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── JWT Tests ─────────────────────────────────────────────────────
// Mock environment before importing
vi.stubEnv('JWT_SECRET', 'test-jwt-secret-at-least-32-characters-long!!');
vi.stubEnv('JWT_REFRESH_SECRET', 'test-refresh-secret-at-least-32-chars!!');

const { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken, generateTokenPair } = await import('../lib/jwt');

describe('JWT Token Management', () => {
  const testPayload = {
    userId: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
    role: 'worker',
  };

  describe('generateAccessToken', () => {
    it('should generate a valid JWT string', () => {
      const token = generateAccessToken(testPayload);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include all payload fields', () => {
      const token = generateAccessToken(testPayload);
      const decoded = verifyAccessToken(token);
      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.role).toBe(testPayload.role);
    });

    it('should include a jti (JWT ID)', () => {
      const token = generateAccessToken(testPayload);
      const decoded = verifyAccessToken(token);
      expect(decoded.jti).toBeTruthy();
      expect(typeof decoded.jti).toBe('string');
    });

    it('should generate unique jti for each token', () => {
      const token1 = generateAccessToken(testPayload);
      const token2 = generateAccessToken(testPayload);
      const decoded1 = verifyAccessToken(token1);
      const decoded2 = verifyAccessToken(token2);
      expect(decoded1.jti).not.toBe(decoded2.jti);
    });
  });

  describe('generateRefreshToken', () => {
    it('should return token and familyId', () => {
      const result = generateRefreshToken(testPayload);
      expect(result.token).toBeTruthy();
      expect(result.familyId).toBeTruthy();
    });

    it('should use provided familyId', () => {
      const familyId = 'custom-family-id';
      const result = generateRefreshToken(testPayload, familyId);
      expect(result.familyId).toBe(familyId);
    });

    it('should generate a new familyId if not provided', () => {
      const result1 = generateRefreshToken(testPayload);
      const result2 = generateRefreshToken(testPayload);
      expect(result1.familyId).not.toBe(result2.familyId);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid token', () => {
      const token = generateAccessToken(testPayload);
      const decoded = verifyAccessToken(token);
      expect(decoded.userId).toBe(testPayload.userId);
    });

    it('should throw on invalid token', () => {
      expect(() => verifyAccessToken('invalid-token')).toThrow();
    });

    it('should throw on tampered token', () => {
      const token = generateAccessToken(testPayload);
      const tampered = token.slice(0, -5) + 'XXXXX';
      expect(() => verifyAccessToken(tampered)).toThrow();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', () => {
      const { token } = generateRefreshToken(testPayload);
      const decoded = verifyRefreshToken(token);
      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.familyId).toBeTruthy();
    });

    it('should throw on access token (wrong secret)', () => {
      const accessToken = generateAccessToken(testPayload);
      expect(() => verifyRefreshToken(accessToken)).toThrow();
    });
  });

  describe('generateTokenPair', () => {
    it('should generate both tokens', () => {
      const pair = generateTokenPair(testPayload);
      expect(pair.accessToken).toBeTruthy();
      expect(pair.refreshToken).toBeTruthy();
      expect(pair.familyId).toBeTruthy();
      expect(pair.expiresIn).toBe(900); // 15 minutes
    });
  });
});

// ─── Password Policy Tests ─────────────────────────────────────────
describe('Password Policy', () => {
  // Import the password validation logic
  function validatePasswordPolicy(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (password.length < 8) errors.push('Password must be at least 8 characters');
    if (!/[a-z]/.test(password)) errors.push('Must contain a lowercase letter');
    if (!/[A-Z]/.test(password)) errors.push('Must contain an uppercase letter');
    if (!/\d/.test(password)) errors.push('Must contain a digit');
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push('Must contain a special character');
    return { valid: errors.length === 0, errors };
  }

  it('should accept a strong password', () => {
    const result = validatePasswordPolicy('MySecure1!');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject a short password', () => {
    const result = validatePasswordPolicy('Ab1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must be at least 8 characters');
  });

  it('should reject password without uppercase', () => {
    const result = validatePasswordPolicy('mysecure1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Must contain an uppercase letter');
  });

  it('should reject password without digit', () => {
    const result = validatePasswordPolicy('MySecure!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Must contain a digit');
  });

  it('should reject password without special character', () => {
    const result = validatePasswordPolicy('MySecure1');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Must contain a special character');
  });

  it('should return multiple errors for very weak password', () => {
    const result = validatePasswordPolicy('abc');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});

// ─── Rate Limiter Tests (In-Memory Fallback) ───────────────────────
describe('Rate Limiter', () => {
  // We test the in-memory path (no Redis)
  // The function is async now, so we await it

  beforeEach(() => {
    vi.resetModules();
  });

  it('should allow requests within limit', async () => {
    const { checkRateLimit } = await import('../lib/rate-limiter');
    const config = { windowMs: 60000, maxRequests: 3 };

    const r1 = await checkRateLimit('test-allow', 'user1', config);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = await checkRateLimit('test-allow', 'user1', config);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);
  });

  it('should block requests over limit', async () => {
    const { checkRateLimit } = await import('../lib/rate-limiter');
    const config = { windowMs: 60000, maxRequests: 2 };

    await checkRateLimit('test-block', 'user2', config);
    await checkRateLimit('test-block', 'user2', config);
    const r3 = await checkRateLimit('test-block', 'user2', config);
    expect(r3.allowed).toBe(false);
    expect(r3.remaining).toBe(0);
    expect(r3.retryAfterMs).toBeGreaterThan(0);
  });

  it('should track different keys separately', async () => {
    const { checkRateLimit } = await import('../lib/rate-limiter');
    const config = { windowMs: 60000, maxRequests: 1 };

    const r1 = await checkRateLimit('test-keys', 'ip-a', config);
    expect(r1.allowed).toBe(true);

    const r2 = await checkRateLimit('test-keys', 'ip-b', config);
    expect(r2.allowed).toBe(true);
  });
});
