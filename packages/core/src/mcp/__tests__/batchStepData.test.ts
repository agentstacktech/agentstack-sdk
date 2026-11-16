import { describe, expect, it } from '@jest/globals';

import { mcpStepData, mcpStepFailed } from '../batchStepData';

describe('mcpStepFailed', () => {
  it('detects status error', () => {
    expect(mcpStepFailed({ status: 'error' })).toBe(true);
  });
  it('passes success step', () => {
    expect(mcpStepFailed({ status: 'success', ok: true })).toBe(false);
  });
});

describe('mcpStepData', () => {
  it('merges StackScript MP hoists from step root', () => {
    const data = mcpStepData({
      status: 'success',
      result: { data: { value: 1 } },
      timings: { neural_defer: true, commit_ms: 9 },
      dna_persisted: false,
      runtime_neural_staged: true,
    });
    expect(data.timings).toEqual({ neural_defer: true, commit_ms: 9 });
    expect(data.dna_persisted).toBe(false);
    expect(data.runtime_neural_staged).toBe(true);
  });
});
