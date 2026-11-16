import { describe, expect, it } from 'vitest';

import { hostedRunPhase, mapHostedMcpPlayerError } from './hostedMcpPlayerError';

describe('mapHostedMcpPlayerError journal lane', () => {
  it('maps hosted_shared_data_denied', () => {
    const row = mapHostedMcpPlayerError({
      body: { code: 'hosted_shared_data_denied' },
    });
    expect(row.code).toBe('hosted_shared_data_denied');
    expect(row.recoverable).toBe(true);
  });

  it('maps error_code-only nested detail', () => {
    const row = mapHostedMcpPlayerError({
      body: { detail: { error_code: 'auth_required' } },
    });
    expect(row.code).toBe('auth_required');
    expect(row.message).toContain('Sign in');
  });

  it('maps db_unavailable + neural_flush failure_phase', () => {
    const row = mapHostedMcpPlayerError({
      body: {
        error: 'db_unavailable',
        failure_phase: 'neural_flush',
        retry_after_ms: 2000,
      },
    });
    expect(row.code).toBe('neural_flush');
    expect(row.recoverable).toBe(true);
    expect(row.message).toMatch(/syncing/i);
  });

  it('hostedRunPhase detects neural defer success', () => {
    expect(hostedRunPhase({ ok: true, runtime_neural_staged: true, dna_persisted: false })).toBe('syncing');
    expect(hostedRunPhase({ ok: true, dna_persisted: true })).toBe('ready');
    expect(hostedRunPhase({ ok: false })).toBe('error');
  });

  it('maps text_revision_conflict', () => {
    const row = mapHostedMcpPlayerError({
      message: 'text_revision_conflict: expected_sha256 mismatch',
    });
    expect(row.code).toBe('text_revision_conflict');
    expect(row.recoverable).toBe(true);
  });
});
