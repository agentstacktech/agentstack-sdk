import { describe, expect, it, vi } from 'vitest';
import { executeHostedMcpStepsWithRetry } from '../executeHostedMcpSteps';

vi.mock('../hostedAppSession', async () => {
  const actual = await vi.importActual<typeof import('../hostedAppSession')>(
    '../hostedAppSession',
  );
  return {
    ...actual,
    hostedMcpCookieMinted: () => true,
    mintHostedAppSession: vi.fn(),
  };
});

vi.mock('../../mcp/urls', () => ({
  resolveHostedMcpUrl: () => '/s/2185/mcp',
}));

describe('executeHostedMcpStepsWithRetry', () => {
  it('retries db_unavailable with same steps', async () => {
    const post = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error('db_unavailable'), {
          code: 'db_unavailable',
          body: { retry_after_ms: 1 },
        }),
      )
      .mockResolvedValueOnce({ ok: true, steps: [{ id: 's0', data: { ok: true } }] });
    const http = { post, getAuthToken: () => 'tok' };
    const row = await executeHostedMcpStepsWithRetry(
      http as never,
      2185,
      [{ id: 's0', action: 'script.run', params: { project_id: 2185 } }],
      { pickStepId: 's0', maxAttempts: 3 },
    );
    expect(row.ok).toBe(true);
    expect(post).toHaveBeenCalledTimes(2);
  });

  it('retries neural_flush from failure_phase under db_unavailable', async () => {
    const post = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error('db_unavailable'), {
          code: 'db_unavailable',
          body: { error: 'db_unavailable', failure_phase: 'neural_flush', retry_after_ms: 1 },
        }),
      )
      .mockResolvedValueOnce({ ok: true, steps: [{ id: 's0', data: { ok: true } }] });
    const http = { post, getAuthToken: () => 'tok' };
    const row = await executeHostedMcpStepsWithRetry(
      http as never,
      2185,
      [{ id: 's0', action: 'script.run', params: { project_id: 2185 } }],
      { pickStepId: 's0', maxAttempts: 3 },
    );
    expect(row.ok).toBe(true);
    expect(post).toHaveBeenCalledTimes(2);
  });
});