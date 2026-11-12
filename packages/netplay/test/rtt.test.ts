import { describe, expect, it } from 'vitest';
import { suggestInputDelay } from '../src/index.js';
import { createTable } from '../src/testing/index.js';
import { tugOfWar } from '../examples/tug-of-war.js';

describe('pass 5: rtt + input-delay suggestion', () => {
  it('rttMs() measures our own echo (memoryHub 60 ms each way ≈ 120 ms)', async () => {
    const t = await createTable(tugOfWar, { players: 2, latencyMs: 60 });
    expect(t.clients[0]!.rttMs()).not.toBeNull();
    await t.run(3000, (c) => c.input(0));
    const r = t.clients[0]!.rttMs()!;
    console.log('RTT_MEMORY_60', r);
    expect(r).toBeGreaterThanOrEqual(100);
    expect(r).toBeLessThanOrEqual(200);
  });
  it('suggestInputDelay: ticks to cover the trip + 1 margin, clamped', () => {
    expect(suggestInputDelay(null, 50)).toBe(2);
    expect(suggestInputDelay(40, 50)).toBe(2);
    expect(suggestInputDelay(120, 50)).toBe(4);
    expect(suggestInputDelay(5000, 50)).toBe(8);
    expect(suggestInputDelay(0, 50, { min: 1 })).toBe(1);
  });
});
