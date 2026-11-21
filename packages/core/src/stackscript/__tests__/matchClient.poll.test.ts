import { describe, expect, it, vi } from 'vitest';

import {
  createStackScriptClient,
  createStackScriptMatchClient,
  type StackScriptMatchClient,
} from '../index';

describe('createStackScriptMatchClient', () => {
  it('barrel exports StackScriptMatchClient with pollMatchRevision', () => {
    const pollKey: keyof StackScriptMatchClient = 'pollMatchRevision';
    expect(pollKey).toBe('pollMatchRevision');
  });

  it('pollMatchRevision reads revision leaf only', async () => {
    const http = {
      get: vi.fn().mockResolvedValue({
        data: {
          value: {
            'ecosystem.scripts.runtime.m1.revision': 4,
          },
        },
      }),
      post: vi.fn(),
    };
    const client = createStackScriptClient(http as never, 42);
    const match = createStackScriptMatchClient(client, http as never, 42);
    const rev = await match.pollMatchRevision({ matchId: 'm1' });
    expect(rev).toBe(4);
    expect(http.get).toHaveBeenCalledWith(
      '/api/projects/42/data',
      { paths: 'ecosystem.scripts.runtime.m1.revision' },
      expect.objectContaining({ skipCache: true }),
    );
  });

  it('submitTurn injects expected_revision after poll', async () => {
    const http = {
      get: vi.fn().mockResolvedValue({
        data: { value: { 'ecosystem.scripts.runtime.m1.revision': 2 } },
      }),
      post: vi.fn().mockResolvedValue({
        success: true,
        data: { ok: true },
      }),
    };
    const client = createStackScriptClient(http as never, 9);
    const match = createStackScriptMatchClient(client, http as never, 9);
    await match.submitTurn({
      scriptId: 'thermo',
      export: 'applyTurn',
      input: { matchId: 'm1', move: 1 },
      idempotencyKey: 'm1:2:p:applyTurn',
      pollRevision: true,
    });
    expect(http.post).toHaveBeenCalledWith(
      '/mcp',
      expect.objectContaining({
        action: 'script.run',
        params: expect.objectContaining({
          input: expect.objectContaining({ matchId: 'm1', expected_revision: 2 }),
        }),
      }),
      undefined,
    );
  });
});
