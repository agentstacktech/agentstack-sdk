import { describe, expect, it, vi } from 'vitest';

import { AgentLogic } from '../AgentLogic';

describe('AgentLogic SDK surface (W-E7)', () => {
  it('exposes listExecutions and dryRun', () => {
    const client = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };
    const logic = new AgentLogic(client as never);
    expect(typeof logic.listExecutions).toBe('function');
    expect(typeof logic.dryRun).toBe('function');
    expect(typeof logic.getExecutionHistory).toBe('function');
  });
});
