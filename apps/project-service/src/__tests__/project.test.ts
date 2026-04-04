import { describe, it, expect } from 'vitest';

// ─── Project / Agreement Logic Unit Tests ─────────────────────────
// Tests cover project visibility, agreement state machine, signing
// access control, and conflict detection — all without a live DB.

// ─── Project visibility ────────────────────────────────────────────

describe('Project visibility rules', () => {
  type Visibility = 'public' | 'private' | 'invite_only';

  function isVisibleToWorker(visibility: Visibility, invitedWorkerIds: string[], workerId: string): boolean {
    if (visibility === 'public') return true;
    if (visibility === 'invite_only') return invitedWorkerIds.includes(workerId);
    return false; // private — owner only
  }

  it('should show public projects to all workers', () => {
    expect(isVisibleToWorker('public', [], 'worker-123')).toBe(true);
  });

  it('should hide private projects from workers', () => {
    expect(isVisibleToWorker('private', [], 'worker-123')).toBe(false);
  });

  it('should show invite_only projects only to invited workers', () => {
    expect(isVisibleToWorker('invite_only', ['worker-123'], 'worker-123')).toBe(true);
    expect(isVisibleToWorker('invite_only', ['worker-123'], 'worker-456')).toBe(false);
  });
});

// ─── Agreement state machine ──────────────────────────────────────

describe('Agreement status transitions', () => {
  type AgreementStatus = 'draft' | 'pending_signatures' | 'active' | 'completed' | 'cancelled';

  function getNextStatus(current: AgreementStatus, action: 'sign' | 'complete' | 'cancel'): AgreementStatus | null {
    const transitions: Record<AgreementStatus, Partial<Record<'sign' | 'complete' | 'cancel', AgreementStatus>>> = {
      draft: { sign: 'pending_signatures', cancel: 'cancelled' },
      pending_signatures: { sign: 'active', cancel: 'cancelled' },
      active: { complete: 'completed', cancel: 'cancelled' },
      completed: {},
      cancelled: {},
    };
    return transitions[current][action] ?? null;
  }

  it('draft → pending_signatures on first sign', () => {
    expect(getNextStatus('draft', 'sign')).toBe('pending_signatures');
  });

  it('pending_signatures → active on second sign', () => {
    expect(getNextStatus('pending_signatures', 'sign')).toBe('active');
  });

  it('active → completed on complete', () => {
    expect(getNextStatus('active', 'complete')).toBe('completed');
  });

  it('active → cancelled on cancel', () => {
    expect(getNextStatus('active', 'cancel')).toBe('cancelled');
  });

  it('completed agreement cannot be changed', () => {
    expect(getNextStatus('completed', 'sign')).toBeNull();
    expect(getNextStatus('completed', 'cancel')).toBeNull();
  });

  it('cancelled agreement cannot be re-opened', () => {
    expect(getNextStatus('cancelled', 'sign')).toBeNull();
    expect(getNextStatus('cancelled', 'complete')).toBeNull();
  });
});

// ─── Agreement signing access control ─────────────────────────────

describe('Agreement signing access control', () => {
  function canSign(
    requestUserId: string,
    agreement: { client_id: string; worker_id: string; status: string }
  ): { allowed: boolean; reason?: string } {
    if (agreement.status === 'cancelled' || agreement.status === 'completed') {
      return { allowed: false, reason: `Agreement is ${agreement.status}` };
    }
    const isParty = requestUserId === agreement.client_id || requestUserId === agreement.worker_id;
    if (!isParty) {
      return { allowed: false, reason: 'Not a party to this agreement' };
    }
    return { allowed: true };
  }

  const agreement = { client_id: 'client-001', worker_id: 'worker-002', status: 'draft' };

  it('should allow the client to sign', () => {
    expect(canSign('client-001', agreement).allowed).toBe(true);
  });

  it('should allow the worker to sign', () => {
    expect(canSign('worker-002', agreement).allowed).toBe(true);
  });

  it('should deny a third party from signing', () => {
    const result = canSign('outsider-003', agreement);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Not a party to this agreement');
  });

  it('should deny signing a cancelled agreement', () => {
    const result = canSign('client-001', { ...agreement, status: 'cancelled' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('cancelled');
  });

  it('should deny signing a completed agreement', () => {
    const result = canSign('worker-002', { ...agreement, status: 'completed' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('completed');
  });
});

// ─── Agreement conflict detection ─────────────────────────────────

describe('Duplicate agreement prevention', () => {
  type ActiveStatus = 'draft' | 'pending_signatures' | 'active';
  const ACTIVE_STATUSES: ActiveStatus[] = ['draft', 'pending_signatures', 'active'];

  function hasActiveAgreement(
    existingAgreements: Array<{ project_id: string; status: string }>,
    projectId: string
  ): boolean {
    return existingAgreements.some(
      a => a.project_id === projectId && ACTIVE_STATUSES.includes(a.status as ActiveStatus)
    );
  }

  it('should detect an existing draft agreement', () => {
    const existing = [{ project_id: 'proj-001', status: 'draft' }];
    expect(hasActiveAgreement(existing, 'proj-001')).toBe(true);
  });

  it('should detect an existing active agreement', () => {
    const existing = [{ project_id: 'proj-001', status: 'active' }];
    expect(hasActiveAgreement(existing, 'proj-001')).toBe(true);
  });

  it('should allow new agreement if prior one was completed', () => {
    const existing = [{ project_id: 'proj-001', status: 'completed' }];
    expect(hasActiveAgreement(existing, 'proj-001')).toBe(false);
  });

  it('should allow new agreement if prior one was cancelled', () => {
    const existing = [{ project_id: 'proj-001', status: 'cancelled' }];
    expect(hasActiveAgreement(existing, 'proj-001')).toBe(false);
  });

  it('should allow new agreement for a different project', () => {
    const existing = [{ project_id: 'proj-001', status: 'active' }];
    expect(hasActiveAgreement(existing, 'proj-002')).toBe(false);
  });
});

// ─── Project input validation ──────────────────────────────────────

describe('Project creation validation', () => {
  function isValidProject(input: { title?: unknown; budget?: unknown }): boolean {
    if (typeof input.title !== 'string' || input.title.trim().length < 5) return false;
    if (!input.budget || typeof input.budget !== 'object') return false;
    return true;
  }

  it('should reject titles shorter than 5 characters', () => {
    expect(isValidProject({ title: 'Hi', budget: { type: 'fixed', amount: 100 } })).toBe(false);
  });

  it('should reject missing budget', () => {
    expect(isValidProject({ title: 'Valid Title', budget: undefined })).toBe(false);
  });

  it('should accept a valid project', () => {
    expect(isValidProject({ title: 'Build a platform', budget: { type: 'fixed', amount: 5000 } })).toBe(true);
  });
});
