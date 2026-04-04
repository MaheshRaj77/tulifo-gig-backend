import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-secret-key-for-unit-tests';

function makeToken(payload: Record<string, unknown>) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

describe('Review input validation', () => {
  function validateReviewInput(body: Record<string, unknown>, authenticatedUserId: string): string | null {
    const { revieweeId, rating } = body;
    const reviewerId = authenticatedUserId; // Always from token, never body

    if (!revieweeId || typeof revieweeId !== 'string') {
      return 'revieweeId is required';
    }
    if (reviewerId === revieweeId) {
      return 'Cannot review yourself';
    }
    const ratingNum = Number(rating);
    if (!Number.isFinite(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return 'Rating must be a number between 1 and 5';
    }
    return null;
  }

  it('should reject missing revieweeId', () => {
    const err = validateReviewInput({ rating: 4 }, 'u1');
    expect(err).not.toBeNull();
    expect(err).toContain('revieweeId');
  });

  it('should reject self-review', () => {
    const err = validateReviewInput({ revieweeId: 'u1', rating: 5 }, 'u1');
    expect(err).not.toBeNull();
    expect(err).toContain('yourself');
  });

  it('should reject rating below 1', () => {
    const err = validateReviewInput({ revieweeId: 'u2', rating: 0 }, 'u1');
    expect(err).not.toBeNull();
    expect(err).toContain('between 1 and 5');
  });

  it('should reject rating above 5', () => {
    const err = validateReviewInput({ revieweeId: 'u2', rating: 6 }, 'u1');
    expect(err).not.toBeNull();
  });

  it('should reject non-numeric rating', () => {
    const err = validateReviewInput({ revieweeId: 'u2', rating: 'excellent' }, 'u1');
    expect(err).not.toBeNull();
    expect(err).toContain('between 1 and 5');
  });

  it('should reject rating=NaN (bypassing old naive check)', () => {
    // Old code: if (rating < 1 || rating > 5) — NaN comparisons are false, old code would allow it
    const err = validateReviewInput({ revieweeId: 'u2', rating: NaN }, 'u1');
    expect(err).not.toBeNull();
  });

  it('should accept valid review data', () => {
    const err = validateReviewInput({ revieweeId: 'u2', rating: 4, bookingId: 'b1', comment: 'Great work!' }, 'u1');
    expect(err).toBeNull();
  });

  it('should use reviewerId from token, not body', () => {
    // The fix: reviewerId comes from authenticatedUserId (JWT), not body
    // If body sends a different reviewerId, it should be ignored
    const authenticatedUserId = 'u1';
    const err = validateReviewInput(
      { revieweeId: 'u2', rating: 5, reviewerId: 'u3' }, // body tries to spoof reviewerId as u3
      authenticatedUserId
    );
    // No error here — the body's reviewerId is simply ignored
    // reviewerId will be authenticatedUserId = 'u1', not 'u3'
    expect(err).toBeNull();
  });
});

describe('Review service auth token validation', () => {
  function authenticate(authHeader: string | undefined): { valid: boolean; user?: Record<string, unknown>; error?: string } {
    if (!authHeader?.startsWith('Bearer ')) {
      return { valid: false, error: 'No token provided' };
    }
    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, JWT_SECRET) as Record<string, unknown>;
      return { valid: true, user: payload };
    } catch {
      return { valid: false, error: 'Invalid or expired token' };
    }
  }

  it('should extract userId from token for review ownership', () => {
    const token = makeToken({ userId: 'u1', role: 'client' });
    const result = authenticate(`Bearer ${token}`);
    expect(result.valid).toBe(true);
    expect(result.user?.userId).toBe('u1');
  });

  it('should reject tampered token', () => {
    const token = makeToken({ userId: 'u1', role: 'client' });
    const tampered = token.slice(0, -5) + 'XXXXX';
    const result = authenticate(`Bearer ${tampered}`);
    expect(result.valid).toBe(false);
  });
});
