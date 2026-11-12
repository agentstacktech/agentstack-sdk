import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSession, defineGame, generateRoomScript, pollingTransport, stackscriptRoomApi, wssTransport, type Entry, type RoomApi } from '../src/index.js';
import { loadRoomScript, microtasks, scriptServer, ScriptError } from '../src/testing/index.js';
import { ticTacToe } from '../examples/tic-tac-toe.js';

describe('generateRoomScript', () => {
  const src = generateRoomScript(ticTacToe);
  it('passes StackScript raw-text lint (no "/", no decimals, no comments) and is deterministic', () => {
    expect(src.split('\n').slice(1).join('\n').includes('/')).toBe(false); // only the import specifier has one
    expect(/\d\.\d/.test(src)).toBe(false);
    expect(generateRoomScript(ticTacToe)).toBe(src);
    expect(src).toContain('name: "tic-tac-toe.room.append"');
    expect(() => generateRoomScript(ticTacToe, { prefix: 'Bad Prefix' })).toThrow();
    expect(() => generateRoomScript(ticTacToe, { maxBody: 0 })).toThrow();
  });
  it('exposes join/append/poll/find and metadata', () => {
    const rt = loadRoomScript(src);
    expect([...rt.exports].sort()).toEqual(['tic-tac-toe.lobby.find', 'tic-tac-toe.room.append', 'tic-tac-toe.room.join', 'tic-tac-toe.room.poll']);
    expect(rt.meta).toMatchObject({ game: 'tic-tac-toe', version: 1, gene: 'sdk.netplay.room.gen1' });
  });
  it('enforces auth, membership, body checks, privacy, rate limit, room size', () => {
    const rt = loadRoomScript(generateRoomScript(ticTacToe, { ratePer10s: 5, maxUsers: 3 }));
    const P = 'tic-tac-toe';
    expect(() => rt.call(null, `${P}.room.join`, { room: 'r1' })).toThrow(/AUTH/);
    expect(() => rt.call('a', `${P}.room.join`, { room: 'Bad/Room' })).toThrow(/BAD_ROOM/);
    expect(rt.call('a', `${P}.room.join`, { room: 'r1' })).toEqual({ self: 'a', seq: 0 });
    expect(() => rt.call('b', `${P}.room.append`, { room: 'r1', body: '{"k":"clock"}' })).toThrow(/NOT_JOINED/);
    rt.call('b', `${P}.room.join`, { room: 'r1' });
    rt.call('c', `${P}.room.join`, { room: 'r1' });
    expect(() => rt.call('d', `${P}.room.join`, { room: 'r1' })).toThrow(/ROOM_FULL/);
    expect(() => rt.call('a', `${P}.room.append`, { room: 'r1', body: 'hello' })).toThrow(/BAD_BODY/);
    expect(() => rt.call('a', `${P}.room.append`, { room: 'r1', body: '{"k":"x","p":"' + 'x'.repeat(5000) + '"}' })).toThrow(/TOO_BIG/);
    expect(() => rt.call('a', `${P}.room.append`, { room: 'r1', body: '{"k":"x"}', to: 'zz' })).toThrow(/BAD_TO/);
    rt.call('a', `${P}.room.append`, { room: 'r1', body: '{"k":"view","secret":1}', to: 'b' });
    rt.call('a', `${P}.room.append`, { room: 'r1', body: '{"k":"clock"}' });
    const forB = rt.call('b', `${P}.room.poll`, { room: 'r1', after: 0 }).entries as Entry[];
    const forC = rt.call('c', `${P}.room.poll`, { room: 'r1', after: 0 }).entries as Entry[];
    expect(forB.map((e) => e.seq)).toEqual([1, 2]);
    expect(forC.map((e) => e.seq)).toEqual([2]); // private entry hidden from c
    expect(forC[0]).toMatchObject({ from: 'a', t: rt.now });
    for (let i = 0; i < 3; i++) rt.call('a', `${P}.room.append`, { room: 'r1', body: '{"k":"clock"}' });
    expect(() => rt.call('a', `${P}.room.append`, { room: 'r1', body: '{"k":"clock"}' })).toThrow(/RATE_LIMIT/);
    rt.now += 10_000;
    expect(rt.call('a', `${P}.room.append`, { room: 'r1', body: '{"k":"clock"}' })).toEqual({ seq: 6 });
  });
  it('polls across DNA chunks and caps the page size', () => {
    const rt = loadRoomScript(generateRoomScript(ticTacToe, { chunk: 4, pollLimit: 7, ratePer10s: 1000 }));
    const P = 'tic-tac-toe';
    rt.call('a', `${P}.room.join`, { room: 'r' });
    for (let i = 0; i < 10; i++) rt.call('a', `${P}.room.append`, { room: 'r', body: `{"k":"clock","i":${i}}` });
    const p1 = rt.call('a', `${P}.room.poll`, { room: 'r', after: 0 }).entries as Entry[];
    expect(p1.map((e) => e.seq)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    const p2 = rt.call('a', `${P}.room.poll`, { room: 'r', after: 7 }).entries as Entry[];
    expect(p2.map((e) => e.seq)).toEqual([8, 9, 10]);
    expect(rt.call('a', `${P}.room.poll`, { room: 'r', after: 2 }).entries).toHaveLength(7);
  });
  it('quick match: validates the game (no "any script_id" rooms), fills seats, expires stale rooms', () => {
    const rt = loadRoomScript(generateRoomScript(ticTacToe));
    const P = 'tic-tac-toe';
    expect(() => rt.call('a', `${P}.lobby.find`, { game: 'other', seats: 2 })).toThrow(/BAD_GAME/);
    expect(() => rt.call('a', `${P}.lobby.find`, { game: P, seats: 5 })).toThrow(/BAD_SEATS/);
    const a = rt.call('a', `${P}.lobby.find`, { game: P, seats: 2 });
    expect(rt.call('a', `${P}.lobby.find`, { game: P, seats: 2 })).toEqual(a);
    const b = rt.call('b', `${P}.lobby.find`, { game: P, seats: 2 });
    expect(b.room).toBe(a.room);
    expect(b.seatsTaken).toBe(2);
    const c = rt.call('c', `${P}.lobby.find`, { game: P, seats: 2 });
    expect(c.room).not.toBe(a.room);
    rt.now += 200_000;
    expect(rt.call('d', `${P}.lobby.find`, { game: P, seats: 2 }).room).not.toBe(c.room);
  });
  it('2-client e2e through the generated server script', async () => {
    const rt = loadRoomScript(generateRoomScript(ticTacToe));
    const srv = scriptServer(rt, 'tic-tac-toe');
    const A = createSession(ticTacToe, { transport: srv.transport('alice'), room: 'g1', now: () => rt.now });
    const B = createSession(ticTacToe, { transport: srv.transport('bob'), room: 'g1', now: () => rt.now });
    await A.join(); srv.pump(); await B.join();
    const step = async () => { for (let i = 0; i < 3; i++) { A.update(); B.update(); await microtasks(); srv.pump(); rt.now += 100; } };
    await step();
    for (const [who, cell] of [[A, 4], [B, 0], [A, 2], [B, 1], [A, 6]] as const) { who.input(cell); await step(); }
    expect(A.snapshot.outcome).toEqual({ winner: 0, reason: 'line' });
    expect(B.snapshot.state).toEqual(A.snapshot.state);
  });
});

describe('stackscriptRoomApi over an SDK-shaped runner', () => {
  it('maps calls to exports, unwraps MCP values, sends idempotency keys, surfaces errors', async () => {
    const rt = loadRoomScript(generateRoomScript(ticTacToe));
    const calls: { export: string; key?: string }[] = [];
    const runner = {
      async run(p: { script_id: string; export: string; input?: unknown; idempotency_key?: string; version?: string }) {
        calls.push({ export: p.export, key: p.idempotency_key });
        try { return { ok: true, data: { value: rt.call('alice', p.export, p.input as Record<string, unknown>) } }; }
        catch (e) { return { ok: true, value: { error: (e as ScriptError).message } }; }
      },
    };
    const api = stackscriptRoomApi(runner, { scriptId: 'ttt-room', exportPrefix: 'tic-tac-toe' });
    expect(await api.join('r')).toEqual({ self: 'alice' });
    await api.append('r', { k: 'clock' });
    await api.append('r', { k: 'ready' });
    const es = await api.poll('r', 0);
    expect(es.map((e) => e.body.k)).toEqual(['clock', 'ready']);
    expect(calls.filter((c) => c.export.endsWith('append')).map((c) => c.key)).toHaveLength(2);
    expect(new Set(calls.filter((c) => c.key).map((c) => c.key)).size).toBe(2);
    expect((await api.find('tic-tac-toe', 2)).room).toMatch(/^tic-tac-toe-q2-1$/);
    await expect(api.find('nope', 2)).rejects.toThrow(/BAD_GAME/);
  });
});

describe('pollingTransport', () => {
  afterEach(() => vi.useRealTimers());
  it('delivers in order, keeps append order, backs off on errors and goes offline', async () => {
    vi.useFakeTimers();
    const log: Entry[] = [];
    let fail = 0;
    const order: string[] = [];
    const api: RoomApi = {
      privateEntries: true,
      async join() { return { self: 'me' }; },
      async append(_r, body) { await new Promise((r) => setTimeout(r, body.k === 'ready' ? 50 : 1)); order.push(body.k); log.push({ seq: log.length + 1, from: 'me', t: 0, body }); },
      async poll(_r, after) { if (fail > 0) { fail--; throw new Error('503'); } return log.filter((e) => e.seq > after); },
    };
    const got: number[] = [];
    const status: string[] = [];
    const link = await pollingTransport(api, { intervalMs: 100, maxErrors: 3 }).connect('r', { afterSeq: 0, onEntries: (es) => got.push(...es.map((e) => e.seq)), onStatus: (s) => status.push(s) });
    void link.send({ k: 'ready' });
    void link.send({ k: 'clock' });
    await vi.advanceTimersByTimeAsync(500);
    expect(order).toEqual(['ready', 'clock']);
    expect(got).toEqual([1, 2]);
    fail = 10;
    await vi.advanceTimersByTimeAsync(5000);
    expect(status).toContain('reconnecting');
    expect(status.at(-1)).toBe('offline');
    await expect(link.send({ k: 'clock' })).rejects.toThrow(/closed/);
  });
});

describe('wssTransport', () => {
  it('joins with the resume cursor, streams entries, appends', async () => {
    const sent: string[] = [];
    class FakeWs {
      readyState = 0; onopen: ((e: unknown) => void) | null = null; onmessage: ((e: { data: unknown }) => void) | null = null;
      onclose: ((e: unknown) => void) | null = null; onerror: ((e: unknown) => void) | null = null;
      static last: FakeWs;
      constructor(readonly url: string) { FakeWs.last = this; setTimeout(() => { this.readyState = 1; this.onopen?.({}); }, 0); }
      send(d: string) { sent.push(d); const m = JSON.parse(d); if (m.op === 'join') setTimeout(() => this.onmessage?.({ data: JSON.stringify({ op: 'welcome', self: 'u9' }) }), 0); }
      close() { this.readyState = 3; this.onclose?.({}); }
    }
    const got: number[] = [];
    const states: string[] = [];
    const link = await wssTransport({ url: (r) => `wss://x/rooms/${r}`, WebSocket: FakeWs as never }).connect('room1', { afterSeq: 5, onEntries: (es) => got.push(...es.map((e) => e.seq)), onStatus: (s) => states.push(s) });
    expect(link.self).toBe('u9');
    expect(JSON.parse(sent[0]!)).toEqual({ op: 'join', room: 'room1', after: 5 });
    FakeWs.last.onmessage!({ data: JSON.stringify({ op: 'entries', entries: [{ seq: 5, from: 'a', t: 1, body: { k: 'clock' } }, { seq: 6, from: 'a', t: 1, body: { k: 'clock' } }] }) });
    expect(got).toEqual([6]);
    await link.send({ k: 'ready' }, 'u1');
    expect(JSON.parse(sent[1]!)).toEqual({ op: 'append', body: { k: 'ready' }, to: 'u1' });
    FakeWs.last.close();
    expect(states).toContain('offline');
  });
});

describe('exactly-once appends over a flaky wire', () => {
  /** In-memory log API whose append can "lose the response" (stored on the server, error to the client). */
  function flakyApi() {
    const log: Entry[] = [];
    let seq = 0;
    const plan: ('ok' | 'lost' | 'fail')[] = [];
    const api: RoomApi & { log: Entry[]; plan: typeof plan } = {
      privateEntries: true, log, plan,
      async join() { return { self: 'me' }; },
      async append(_room, body) {
        const mode = plan.shift() ?? 'ok';
        if (mode === 'fail') throw new Error('network');
        log.push({ seq: ++seq, from: 'me', t: seq * 10, body: JSON.parse(JSON.stringify(body)) });
        if (mode === 'lost') throw new Error('response lost');
      },
      async poll(_room, after) { return log.filter((e) => e.seq > after); },
    };
    return api;
  }

  it('a re-sent command whose first append actually landed is applied once', async () => {
    const counter = defineGame<{ n: number }, number>({ id: 'cnt', version: 1, seats: { min: 1, max: 2 }, mode: 'fold',
      setup: () => ({ n: 0 }), input: (r) => (r === 1 ? 1 : undefined), apply: (s) => { s.n += 1; } });
    const api = flakyApi();
    let now = 0;
    const s = createSession(counter, { transport: pollingTransport(api, { intervalMs: 50 }), room: 'r', now: () => now });
    await s.join(); s.ready();
    for (let i = 0; i < 20; i++) { await microtasks(); now += 100; s.update(); }
    expect(s.snapshot.phase).toBe('playing');
    api.plan.push('lost'); // stored, but the client sees an error and re-sends
    s.input(1);
    for (let i = 0; i < 40; i++) { await microtasks(); now += 300; s.update(); await new Promise((r) => setTimeout(r, 1)); }
    expect(api.log.filter((e) => e.body.k === 'cmd').length).toBe(2); // the wire carried it twice…
    expect(s.snapshot.state).toEqual({ n: 1 });                       // …the room applied it once
  });

  it('after a failed append, later appends of that link never overtake it', async () => {
    const api = flakyApi();
    const link = await pollingTransport(api, { intervalMs: 1000 }).connect('r', { afterSeq: 0, onEntries: () => {} });
    api.plan.push('fail');
    const a = link.send({ k: 'clock', n: 1 });
    const b = link.send({ k: 'clock', n: 2 });
    await expect(a).rejects.toThrow();
    await expect(b).rejects.toThrow();
    expect(api.log.length).toBe(0);
    link.close();
  });
});
