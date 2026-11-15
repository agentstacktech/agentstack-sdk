import { describe, expect, it } from 'vitest';

import { mcpStepFailed } from '../batchStepData';

describe('mcpStepFailed', () => {
  it('detects status error', () => {
    expect(mcpStepFailed({ status: 'error' })).toBe(true);
  });
  it('passes success step', () => {
    expect(mcpStepFailed({ status: 'success', ok: true })).toBe(false);
  });
});
