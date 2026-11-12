import { describe, expect, it, vi } from 'vitest';
import { memoryHub } from '../src/index.js';

describe('memoryHub', () => {
  it('a subscriber whose handler throws (a reloaded iframe\'s dead page) is dropped; the others still get entries', async () => {
    const hub = memoryHub({ latencyMs: 10 });
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await hub.transport('ana').connect('r', { afterSeq: 0, onEntries: () => { throw new TypeError("can't access dead object"); }, onStatus: () => {} });
    const got: number[] = [];
    const bruno = await hub.transport('bruno').connect('r', { afterSeq: 0, onEntries: (es) => got.push(...es.map((e) => e.seq)), onStatus: () => {} });
    await bruno.send({ k: 'hello' } as never);
    hub.advance(50);
    // the reloaded tab reconnects with a new handler and gets the backlog in the same batch as everyone else
    const again: number[] = [];
    await hub.transport('ana').connect('r', { afterSeq: 0, onEntries: (es) => again.push(...es.map((e) => e.seq)), onStatus: () => {} });
    await bruno.send({ k: 'ready' } as never);
    hub.advance(50);
    expect([got, again]).toEqual([[1, 2], [1, 2]]);
    expect(err).toHaveBeenCalledTimes(1);
    err.mockRestore();
  });
});
