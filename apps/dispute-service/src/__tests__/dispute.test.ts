import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-secret-key-for-unit-tests';

function makeToken(payload: Record<string, unknown>) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

// Inline the authenticate logic from the service (same pattern as escrow/dispute-service)
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

describe('Dispute service auth', () => {
  it('should reject requests with no Authorization header', () => {
    const result = authenticate(undefined);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('No token provided');
  });

  it('should reject malformed Authorization header (no Bearer prefix)', () => {
    const result = authenticate('Token abc123');
    expect(result.valid).toBe(false);
  });

  it('should reject an expired token', () => {
    const expired = jwt.sign({ userId: 'u1', role: 'client' }, JWT_SECRET, { expiresIn: '-1s' });
    const result = authenticate(`Bearer ${expired}`);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid or expired token');
  });

  it('should accept a valid token and return the user payload', () => {
    const token = makeToken({ userId: 'u1', role: 'client' });
    const result = authenticate(`Bearer ${token}`);
    expect(result.valid).toBe(true);
    expect(result.user?.userId).toBe('u1');
  });
});

describe('Dispute input validation', () => {
  function validateDisputeInput(body: Record<string, unknown>): string | null {
    const { reason, description, bookingId, projectId } = body;

    if (!reason || typeof reason !== 'string' || (reason as string).trim().length < 3) {
      return 'reason is required (min 3 characters)';
    }
    if (!description || typeof description !== 'string' || (description as string).trim().length < 10) {
      return 'description is required (min 10 characters)';
    }
    if (!bookingId && !projectId) {
      return 'bookingId or projectId is required';
    }
    return null;
  }

  it('should reject missing reason', () => {
    const err = validateDisputeInput({ description: 'This is a valid description here', projectId: 'p1' });
    expect(err).not.toBeNull();
    expect(err).toContain('reason');
  });

  it('should reject reason that is too short', () => {
    const err = validateDisputeInput({ reason: 'no', description: 'This is a valid description text', projectId: 'p1' });
    expect(err).not.toBeNull();
    expect(err).toContain('min 3');
  });

  it('should reject description shorter than 10 characters', () => {
    const err = validateDisputeInput({ reason: 'Valid reason', description: 'Too short', projectId: 'p1' });
    expect(err).not.toBeNull();
    expect(err).toContain('min 10');
  });

  it('should reject when neither bookingId nor projectId provided', () => {
    const err = validateDisputeInput({ reason: 'Valid reason', description: 'This is a valid description for the dispute' });
    expect(err).not.toBeNull();
    expect(err).toContain('bookingId or projectId');
  });

  it('should pass valid dispute input with bookingId', () => {
    const err = validateDisputeInput({
      reason: 'Missed deadline',
      description: 'The worker missed the deadline by 2 weeks without communicating.',
      bookingId: 'b1',
    });
    expect(err).toBeNull();
  });

  it('should pass valid dispute input with projectId', () => {
    const err = validateDisputeInput({
      reason: 'Quality issue',
      description: 'Delivered work does not meet the agreed specifications.',
      projectId: 'p1',
    });
    expect(err).toBeNull();
  });
});

describe('Dispute access control', () => {
  function canViewDispute(requesterId: string, requesterRole: string, openedBy: string, respondentId: string | null): boolean {
    return requesterId === openedBy || requesterId === respondentId || requesterRole === 'admin';
  }

  function canResolveDispute(requesterRole: string): boolean {
    return requesterRole === 'admin';
  }

  it('opener can view their own dispute', () => {
    expect(canViewDispute('u1', 'client', 'u1', 'u2')).toBe(true);
  });

  it('respondent can view the dispute', () => {
    expect(canViewDispute('u2', 'worker', 'u1', 'u2')).toBe(true);
  });

  it('unrelated user cannot view the dispute', () => {
    expect(canViewDispute('u3', 'client', 'u1', 'u2')).toBe(false);
  });

  it('admin can view any dispute', () => {
    expect(canViewDispute('admin1', 'admin', 'u1', 'u2')).toBe(true);
  });

  it('only admin can resolve disputes', () => {
    expect(canResolveDispute('admin')).toBe(true);
    expect(canResolveDispute('client')).toBe(false);
    expect(canResolveDispute('worker')).toBe(false);
  });
});
