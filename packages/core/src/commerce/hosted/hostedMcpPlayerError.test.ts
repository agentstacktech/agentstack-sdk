import { describe, expect, it } from 'vitest';

import { mapHostedMcpPlayerError } from './hostedMcpPlayerError';

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

  it('maps text_revision_conflict', () => {
    const row = mapHostedMcpPlayerError({
      message: 'text_revision_conflict: expected_sha256 mismatch',
    });
    expect(row.code).toBe('text_revision_conflict');
    expect(row.recoverable).toBe(true);
  });
});
