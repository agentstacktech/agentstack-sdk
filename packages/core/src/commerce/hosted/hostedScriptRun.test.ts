import { describe, expect, it, vi } from 'vitest';
import { createHostedWire } from './hostedScriptRun';

describe('createHostedWire', () => {
  it('posts script.run via executeHostedMcpStepsWithRetry and exposes runScriptPhase', async () => {
    const staged = {
      ok: true,
      runtime_neural_staged: true,
      dna_persisted: false,
      data: { value: { code: 0 } },
    };
    const post = vi.fn().mockResolvedValue({
      steps: [{ id: 'run', ok: true, ...staged, data: staged }],
    });
    const http = { post, getAuthToken: () => 'tok' };
    const wire = createHostedWire(http as never, 2185, {
      mintCookieIfBearer: false,
    });
  const row = await wire.runScript({
      scriptId: 'nahual-coop-lite',
      exportName: 'nhl.c.scan',
      input: { slot: 0 },
    });
    expect(row.runtime_neural_staged).toBe(true);
    const phased = await wire.runScriptPhase({
      scriptId: 's',
      exportName: 'nhl.c.open',
      input: {},
    });
    expect(phased.phase).toBe('syncing');
    expect(post).toHaveBeenCalled();
    const body = post.mock.calls[0]?.[1] as { steps?: { action: string }[] };
    expect(body.steps?.[0]?.action).toBe('script.run');
  });
});