import { afterEach, expect, it, vi } from 'vitest';
import { relayTransport, createSession, type Entry } from '../src/index.js';
import { ticTacToe } from '../examples/tic-tac-toe.js';

/** Fake of the **actual** raw-payload relay, copies and own echoes included. No network. */
class Relay {
  peers: FakeWs[] = [];
  copies = 200;
  drop = 0;
  Ctor: typeof FakeWs;
  constructor() {
    const r = this;
    this.Ctor = class extends FakeWs {
      constructor(_url: string) { super(); r.peers.push(this); setTimeout(() => { this.readyState = 1; this.onmessage?.({ data: '{"type":"connected","connection_id":"c"}' }); }, 0); }
      send(data: string) {
        const m = JSON.parse(data);
        if (m.type !== 'broadcast') return;
        if (r.drop > 0) { r.drop--; return; }
        for (const p of r.peers) {
          if (p.readyState !== 1) continue;
          for (let i = 0; i < r.copies; i++) p.onmessage?.({ data: JSON.stringify(m.payload) });
        }
      }
    };
  }
}
class FakeWs {
  readyState = 0;
  onopen: ((e: unknown) => void) | null = null;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onclose: ((e: unknown) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  constructor(..._args: unknown[]) {}
  send(_data: string) {}
  close() { this.readyState = 3; this.onclose?.({}); }
}
const advance = async (ms = 100) => { await vi.advanceTimersByTimeAsync(ms); };
afterEach(() => vi.useRealTimers());

it('orders entries identically, rejects thousands of copies and own echoes, retries a lost proposal', async () => {
  vi.useFakeTimers();
  const r = new Relay();
  const a: Entry[] = [], b: Entry[] = [];
  const ta = relayTransport({ self: 'a', host: true, url: () => 'ws://test', WebSocket: r.Ctor, resendMs: 100 });
  const tb = relayTransport({ self: 'b', host: false, url: () => 'ws://test', WebSocket: r.Ctor, resendMs: 100 });
  const pA = ta.connect('r', { afterSeq: 0, onEntries: (e) => a.push(...e) });
  const pB = tb.connect('r', { afterSeq: 0, onEntries: (e) => b.push(...e) });
  await advance(5);
  const A = await pA, B = await pB;
  await A.send({ k: 'hello', g: 'x', v: 1, name: 'A' });
  await B.send({ k: 'hello', g: 'x', v: 1, name: 'B' });
  await advance();
  expect(a.length).toBe(2);
  expect(b).toEqual(a);
  r.drop = 1;
  await B.send({ k: 'ready' });
  await A.send({ k: 'ready' });
  await advance(500);
  expect(b).toEqual(a);
  expect(a.filter((e) => e.from === 'b' && e.body.k === 'ready')).toHaveLength(1);
  expect(a.map((e) => e.seq)).toEqual([1, 2, 3, 4]);
  A.close(); B.close();
});

it('starts a real game session on raw relay (1000 copies per frame), no scripts', async () => {
  vi.useFakeTimers();
  const r = new Relay(); r.copies = 1000;
  const A = createSession(ticTacToe, { transport: relayTransport({ self: 'a', host: true, url: () => 'ws://test', WebSocket: r.Ctor }), room: 'r', name: 'A', autoPumpMs: 10 });
  const B = createSession(ticTacToe, { transport: relayTransport({ self: 'b', host: false, url: () => 'ws://test', WebSocket: r.Ctor }), room: 'r', name: 'B', autoPumpMs: 10 });
  const joins = [A.join(), B.join()];
  await advance(500);
  await Promise.all(joins);
  expect(A.snapshot.players.map((p) => p.id)).toEqual(['a', 'b']);
  expect(B.snapshot.players.map((p) => p.id)).toEqual(['a', 'b']);
  A.ready(); B.ready();
  await advance(500);
  expect(A.snapshot.phase).toBe('playing');
  expect(B.snapshot.phase).toBe('playing');
  A.input(0);
  await advance(500);
  expect(A.snapshot.state).toEqual(B.snapshot.state);
  expect(A.snapshot.tick).toBeGreaterThan(0);
  expect(A.snapshot.desync).toBeNull();
  A.close(); B.close();
});
