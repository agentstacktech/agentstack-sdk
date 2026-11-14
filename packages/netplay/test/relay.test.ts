import { afterEach, expect, it, vi } from 'vitest';
import { relayTransport, createSession, type Entry } from '../src/index.js';
import { ticTacToe } from '../examples/tic-tac-toe.js';
import { tugOfWar } from '../examples/tug-of-war.js';

/** Fake of the **actual** raw-payload relay, copies and own echoes included. No network. */
class Relay {
  peers: FakeWs[] = [];
  copies = 200;
  seq = 0;
  envelope: boolean | 'flat' = false;
  drop = 0;
  Ctor: typeof FakeWs;
  constructor() {
    const r = this;
    this.Ctor = class extends FakeWs {
      conn = 'conn_' + r.peers.length;
      constructor(_url: string) { super(); r.peers.push(this); setTimeout(() => { this.readyState = 1; this.onmessage?.({ data: JSON.stringify({ type: 'connected', connection_id: this.conn }) }); }, 0); }
      send(data: string) {
        const m = JSON.parse(data);
        if (m.type !== 'broadcast') return;
        if (r.drop > 0) { r.drop--; return; }
        const seq = ++r.seq;
        for (const p of r.peers) {
          if (p.readyState !== 1) continue;
          if (r.envelope === 'flat' && p === this) continue; // the shipped relay honours exclude_self
          const data = r.envelope === 'flat' ? JSON.stringify({ relay_envelope: 'v1', sender_connection_id: this.conn, sender_user_id: null, seq, ts: Date.now() / 1000, body: m.payload })
            : r.envelope ? JSON.stringify({ type: 'broadcast', payload: m.payload, relay_envelope: { v: 1, sender_connection_id: this.conn, seq, exclude_self: true } }) : JSON.stringify(m.payload);
          for (let i = 0; i < r.copies; i++) p.onmessage?.({ data });
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

it('uses relay_envelope v1 when the server sends it (dedupe by sender_connection_id+seq, own frames dropped)', async () => {
  vi.useFakeTimers();
  const r = new Relay(); r.envelope = true; r.copies = 300;
  const a: Entry[] = [], b: Entry[] = [];
  const pA = relayTransport({ self: 'a', host: true, url: () => 'ws://test', WebSocket: r.Ctor }).connect('r', { afterSeq: 0, onEntries: (e) => a.push(...e) });
  const pB = relayTransport({ self: 'b', host: false, url: () => 'ws://test', WebSocket: r.Ctor }).connect('r', { afterSeq: 0, onEntries: (e) => b.push(...e) });
  await advance(5);
  const A = await pA, B = await pB;
  await B.send({ k: 'ready' }); await A.send({ k: 'ready' });
  await advance(300);
  expect(a.map((e) => e.from).sort()).toEqual(['a', 'b']);
  expect(a).toHaveLength(2);
  expect(b).toEqual(a);
  A.close(); B.close();
});

it('reads the shipped flat relay_envelope v1 shape ({relay_envelope:"v1", sender_connection_id, seq, body}) and runs a game', async () => {
  vi.useFakeTimers();
  const r = new Relay(); r.envelope = 'flat'; r.copies = 3;
  const A = createSession(ticTacToe, { transport: relayTransport({ self: 'a', host: true, url: () => 'ws://test', WebSocket: r.Ctor }), room: 'r', name: 'A', autoPumpMs: 10 });
  const B = createSession(ticTacToe, { transport: relayTransport({ self: 'b', host: false, url: () => 'ws://test', WebSocket: r.Ctor }), room: 'r', name: 'B', autoPumpMs: 10 });
  const joins = [A.join(), B.join()];
  await advance(500);
  await Promise.all(joins);
  expect(B.snapshot.players.map((p) => p.id)).toEqual(['a', 'b']);
  A.ready(); B.ready();
  await advance(500);
  expect(B.snapshot.phase).toBe('playing');
  A.input(0);
  await advance(500);
  expect(A.snapshot.state).toEqual(B.snapshot.state);
  A.close(); B.close();
});

it('a second join() on a playing session keeps ONE link: realtime lockstep keeps ticking on both (game adapter re-joins after the quick-play screen)', async () => {
  vi.useFakeTimers();
  const r = new Relay(); r.envelope = 'flat'; r.copies = 2;
  const A = createSession(tugOfWar, { transport: relayTransport({ self: 'a', host: true, url: () => 'ws://test', WebSocket: r.Ctor }), room: 'r', name: 'A', autoPumpMs: 10 });
  const B = createSession(tugOfWar, { transport: relayTransport({ self: 'b', host: false, url: () => 'ws://test', WebSocket: r.Ctor }), room: 'r', name: 'B', autoPumpMs: 10 });
  await Promise.all([A.join(), B.join(), advance(500)]);
  A.ready(); B.ready();
  await advance(500);
  expect(A.snapshot.phase).toBe('playing');
  const peers = r.peers.length;
  await Promise.all([A.join(), B.join()]); // the adapter's connect(): must not open a second socket
  expect(r.peers.length).toBe(peers);
  for (let i = 0; i < 60; i++) { A.input(1); B.input(0); await advance(20); }
  expect(A.snapshot.tick).toBeGreaterThan(10);
  expect(B.snapshot.tick).toBeGreaterThan(10);
  expect(Math.abs(A.snapshot.tick - B.snapshot.tick)).toBeLessThan(6);
  A.close(); B.close();
});
