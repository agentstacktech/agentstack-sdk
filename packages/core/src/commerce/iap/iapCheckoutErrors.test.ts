import { describe, expect, it } from 'vitest';
import { requiresNewIdempotencyKey } from './index';

describe('requiresNewIdempotencyKey', () => {
  it('returns true for terminal checkout failure codes', () => {
    expect(requiresNewIdempotencyKey('psp_session_missing')).toBe(true);
    expect(requiresNewIdempotencyKey('payment_create_failed')).toBe(true);
  });

  it('returns false for retryable rate limit', () => {
    expect(requiresNewIdempotencyKey('rate_limit_exceeded')).toBe(false);
  });
});
