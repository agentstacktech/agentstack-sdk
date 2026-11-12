import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createSession, defineGame, devRelayTransport } from '../src/index.js';
// @ts-expect-error plain JS dev tool
import { startDevRelay } from '../tools/dev-relay.mjs';

const race = defineGame<{ n: number[] }, number>({
  id: 'relay-race', version: 1, seats: { min: 2, max: 2 }, mode: 'fold',
  setup: ({ seats }) => ({ n: Array(seats).fill(0) }), input: (r) => (r === 1 ? 1 : undefined),
  apply: (s, seat) => { s.n[seat]! += 1; }, outcome: (s) => (s.n.some((x) => x >= 5) ? { winner: s.n.indexOf(Math.max(...s.n)), reason: 'five' } : null),
});
let relay: { url: string; close(): Promise<void> };
beforeAll(async () => { relay = await startDevRelay({ port: 0, quiet: true }); });
afterAll(async () => { await relay.close(); });
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const until = async (f: () => boolean, ms = 8000) => { const t = Date.now(); while (!f() && Date.now() - t < ms) await wait(20); return f(); };

describe('dev relay (real HTTP, real timers)', () => {
  it('two sessions with separate transports play a match to the end and agree', async () => {
    const A = createSession(race, { transport: devRelayTransport(relay.url, 'ana', { intervalMs: 30 }), room: 'r1', name: 'Ana', autoPumpMs: 20 });
    const B = createSession(race, { transport: devRelayTransport(relay.url, 'bruno', { intervalMs: 30 }), room: 'r1', name: 'Bruno', autoPumpMs: 20 });
    await A.join(); await B.join();
    expect(await until(() => A.snapshot.phase === 'playing' && B.snapshot.phase === 'playing')).toBe(true);
    for (let i = 0; i < 5; i++) { A.input(1); await wait(60); }
    expect(await until(() => A.snapshot.phase === 'over' && B.snapshot.phase === 'over')).toBe(true);
    expect(B.snapshot.outcome).toEqual(A.snapshot.outcome);
    expect(A.snapshot.outcome).toEqual({ winner: 0, reason: 'five' });
    A.close(); B.close();
  });
  it('enforces private entries and rejects garbage', async () => {
    const post = (p: string, b: unknown) => fetch(relay.url + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) });
    await post('/append', { room: 'r2', from: 'host', body: { k: 'x' }, to: 'ana' });
    await post('/append', { room: 'r2', from: 'host', body: { k: 'y' } });
    const asAna = await (await fetch(`${relay.url}/poll?room=r2&after=0&as=ana`)).json();
    const asBob = await (await fetch(`${relay.url}/poll?room=r2&after=0&as=bob`)).json();
    expect(asAna.length).toBe(2);
    expect(asBob.map((e: { body: { k: string } }) => e.body.k)).toEqual(['y']);
    expect((await post('/append', { room: '../etc', from: 'x', body: 1 })).status).toBe(400);
    expect((await fetch(`${relay.url}/health`)).ok).toBe(true);
  });
});
