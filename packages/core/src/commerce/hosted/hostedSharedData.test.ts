import { describe, expect, it, vi } from 'vitest';

import {
  HOSTED_BATCH_PREVIEW_SHA,
  patchHostedProjectLeafCAS,
} from './hostedSharedData';

describe('patchHostedProjectLeafCAS', () => {
  it('uses one POST with preview+commit batch when digest unknown', async () => {
    const post = vi.fn().mockResolvedValueOnce({
      data: {
        steps: [
          { id: 'preview', status: 'success', data: { previous_sha256: 'abc' } },
          { id: 'commit', status: 'success', data: { ok: true, leaf_sha256: 'def' } },
        ],
      },
    });
    const http = { post } as any;
    const out = await patchHostedProjectLeafCAS(
      http,
      2273,
      'config.games.tribute.r1',
      { seats: 2 },
    );
    expect(post).toHaveBeenCalledTimes(1);
    const body = post.mock.calls[0][1] as {
      steps: { id: string; params: { expected_sha256?: string; dry_run?: boolean } }[];
    };
    expect(body.steps).toHaveLength(2);
    expect(body.steps[0].params.dry_run).toBe(true);
    expect(body.steps[1].params.expected_sha256).toBe(HOSTED_BATCH_PREVIEW_SHA);
    expect(out.leaf_sha256).toBe('def');
  });

  it('single step when expectedSha256 provided', async () => {
    const post = vi.fn().mockResolvedValueOnce({
      data: {
        steps: [
          {
            id: 'commit',
            status: 'success',
            data: { ok: true, leaf_sha256: 'fixed' },
          },
        ],
      },
    });
    const http = { post } as any;
    await patchHostedProjectLeafCAS(
      http,
      2273,
      'config.games.tribute.r1',
      {},
      'known-digest',
    );
    expect(post).toHaveBeenCalledTimes(1);
    const steps = (post.mock.calls[0][1] as { steps: unknown[] }).steps;
    expect(steps).toHaveLength(1);
  });
});
