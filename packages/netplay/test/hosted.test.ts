import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSession, generateRoomScript, hostedMcpRunner, netStatus, NetplayError, pollingTransport, stackscriptRoomApi, stackscriptTransport, unwrapHostedReply, errorKind } from '../src/index.js';
import { fakeHostedMcp, loadRoomScript } from '../src/testing/index.js';
import { ticTacToe } from '../examples/tic-tac-toe.js';
import { tugOfWar } from '../examples/tug-of-war.js';

const PID = 2052;
const SCRIPT = 'ttt-room';
const setup = (extra: Partial<Parameters<typeof fakeHostedMcp>[1]> = {}) => {
  const rt = loadRoomScript(generateRoomScript(ticTacToe));
  return fakeHostedMcp(rt, { projectId: PID, scriptId: SCRIPT, tokens: { 'tok-a': 'alice', 'tok-b': 'bob' }, ...extra });
};
const transport = (f: typeof fetch, o: { token?: string; scriptId?: string } = {}) =>
  stackscriptTransport(hostedMcpRunner({ projectId: PID, fetch: f, token: () => o.token ?? null }), { scriptId: o.scriptId ?? SCRIPT, exportPrefix: 'tic-tac-toe', intervalMs: 400 });

describe('hosted MCP envelope (recorded platform shapes)', () => {
  it('unwraps content[0].text, structuredContent and errors', () => {
    const step = { ok: true, data: { value: 7 }, fuel_used: 60, script_id: 's', export: 'r' };
    const text = { jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: JSON.stringify({ data: step, error: null, trace_id: 't' }) }], isError: false } };
    expect(unwrapHostedReply(text)).toEqual(step);
    expect(unwrapHostedReply({ result: { structuredContent: { ok: true, data: step } } })).toEqual(step);
    const missing = { result: { content: [{ type: 'text', text: '{"data":{"ok":false,"error":"script_not_found","script_id":"wt-match"}}' }] } };
    expect(unwrapHostedReply(missing)).toMatchObject({ ok: false, error: 'script_not_found' });
  });
  it('classifies platform and room-script codes', () => {
    expect(errorKind('auth_required')).toBe('auth');
    expect(errorKind('x', 401)).toBe('auth');
    expect(errorKind('AUTH')).toBe('auth');
    expect(errorKind('rate_limit_exceeded')).toBe('rate');
    expect(errorKind('RATE_LIMIT')).toBe('rate');
    expect(errorKind('monthly_quota_exceeded')).toBe('rate');
    expect(errorKind('x', 429)).toBe('rate');
    expect(errorKind('script_not_found')).toBe('not-published');
    expect(errorKind('x', 503)).toBe('offline');
    expect(errorKind('ROOM_FULL')).toBe('full');
    expect(errorKind('NOT_JOINED')).toBe('server');
  });
});

describe('net=as: hostedMcpRunner + stackscriptTransport against the fake', () => {
  afterEach(() => vi.useRealTimers());

  it('plays a 2-client match (signed-in cookies) and measures the request rate', async () => {
    vi.useFakeTimers();
    const fake = setup();
    const A = createSession(ticTacToe, { transport: transport(fake.browser('alice')), room: 'g1', autoPumpMs: 100 });
    const B = createSession(ticTacToe, { transport: transport(fake.browser('bob')), room: 'g1', autoPumpMs: 100 });
    await A.join(); await B.join();
    await vi.advanceTimersByTimeAsync(1500);
    for (const [who, cell] of [[A, 4], [B, 0], [A, 2], [B, 1], [A, 6]] as const) { who.input(cell); await vi.advanceTimersByTimeAsync(1200); }
    expect(A.snapshot.outcome).toEqual({ winner: 0, reason: 'line' });
    expect(B.snapshot.state).toEqual(A.snapshot.state);
    expect(A.snapshot.issue).toBeNull();
    fake.stats.reset();
    await vi.advanceTimersByTimeAsync(10_000);
    // quiet room after the game: polls stretch to 1.2 s → < 1 request/s/client
    expect(fake.stats.byUser.alice! / 10).toBeLessThan(1);
    A.leave(); B.leave();
  });

  it('guest (no cookie, no token): 401 auth_required → issue auth → «sign in» status, slow retries', async () => {
    vi.useFakeTimers();
    const fake = setup();
    const G = createSession(ticTacToe, { transport: transport(fake.browser()), room: 'g1', autoPumpMs: 100 });
    await expect(G.join()).rejects.toBeInstanceOf(NetplayError);
    expect(G.snapshot.issue).toBe('auth');
    expect(netStatus(G.snapshot)).toEqual({ kind: 'sign-in' });
    const before = fake.stats.rejected.auth;
    await vi.advanceTimersByTimeAsync(30_000);
    expect(fake.stats.rejected.auth - before).toBeLessThanOrEqual(2); // ≥15 s between tries, not a hammer
    G.leave();
  });

  it('a Bearer token mints the hosted_app cookie once on 401 (cookie-only MCP), then plays', async () => {
    vi.useFakeTimers();
    const fake = setup({ mcpAcceptsBearer: false });
    const f = fake.browser();
    const spy = vi.fn(f);
    const S = createSession(ticTacToe, { transport: transport(spy as typeof fetch, { token: 'tok-a' }), room: 'g2', autoPumpMs: 100 });
    await S.join();
    expect(fake.stats.byUser.alice).toBeGreaterThan(0);
    expect(S.snapshot.issue).toBeNull();
    expect(spy.mock.calls.some(([u]) => String(u).endsWith(`/api/hosted-apps/${PID}/session`))).toBe(true);
    S.leave();
  });

  it('429 rate_limit_exceeded → «busy», waits retry_after_ms, game still finishes', async () => {
    vi.useFakeTimers();
    const fake = setup({ rateLimitPerSec: 3, retryAfterMs: 1500 });
    const seen = new Set<string>();
    const A = createSession(ticTacToe, { transport: transport(fake.browser('alice')), room: 'g3', autoPumpMs: 100 });
    const B = createSession(ticTacToe, { transport: transport(fake.browser('bob')), room: 'g3', autoPumpMs: 100 });
    A.subscribe((s) => { const k = netStatus(s)?.kind; if (k) seen.add(k); });
    await A.join(); await B.join();
    await vi.advanceTimersByTimeAsync(3000);
    for (const [who, cell] of [[A, 4], [B, 0], [A, 2], [B, 1], [A, 6]] as const) { who.input(cell); await vi.advanceTimersByTimeAsync(4000); }
    expect(fake.stats.rejected.rate).toBeGreaterThan(0);
    expect(seen.has('busy')).toBe(true);
    expect(A.snapshot.outcome).toEqual({ winner: 0, reason: 'line' });
    expect(A.snapshot.issue).toBeNull();
    A.leave(); B.leave();
  });

  it('script not published → «unavailable»', async () => {
    const fake = setup();
    const S = createSession(ticTacToe, { transport: transport(fake.browser('alice'), { scriptId: 'tribute-room-typo' }), room: 'g4' });
    await expect(S.join()).rejects.toThrow(/script_not_found/);
    expect(netStatus(S.snapshot)).toEqual({ kind: 'unavailable' });
    S.leave();
  });

  it('RETRY (room CAS race) is repeated transparently, other script errors are not', async () => {
    let n = 0;
    const runner = { async run() { n++; return n === 1 ? { ok: true, data: { value: { error: 'RETRY' } } } : { ok: true, data: { value: { self: 'me', seq: 0 } } }; } };
    expect(await stackscriptRoomApi(runner, { scriptId: 's', exportPrefix: 'p' }).join('r')).toEqual({ self: 'me' });
    expect(n).toBe(2);
    const full = { async run() { return { ok: true, data: { value: { error: 'ROOM_FULL' } } }; } };
    await expect(stackscriptRoomApi(full, { scriptId: 's', exportPrefix: 'p' }).join('r')).rejects.toMatchObject({ kind: 'full', code: 'ROOM_FULL' });
  });

  it('a replayed idempotency key does not append twice', async () => {
    const fake = setup();
    const f = fake.browser('alice');
    const runner = hostedMcpRunner({ projectId: PID, fetch: f });
    const api = stackscriptRoomApi(runner, { scriptId: SCRIPT, exportPrefix: 'tic-tac-toe' });
    await api.join('r');
    const p = { script_id: SCRIPT, export: 'tic-tac-toe.room.append', input: { room: 'r', body: JSON.stringify({ k: 'clock', n: 1 }), to: '' }, idempotency_key: 'k-1', version: 'live' };
    await runner.run(p); await runner.run(p);
    expect(await api.poll('r', 0)).toHaveLength(1);
  });
});

describe('request budget for realtime lockstep over hosted HTTP', () => {
  afterEach(() => vi.useRealTimers());
  const play = async (mode: 'legacy' | 'batched', rtt: number) => {
    vi.useFakeTimers();
    const rt = loadRoomScript(generateRoomScript(tugOfWar, { ratePer10s: 400 }));
    const fake = fakeHostedMcp(rt, { projectId: PID, scriptId: 'tug', latencyMs: rtt });
    const mk = (u: string) => {
      const runner = hostedMcpRunner({ projectId: PID, fetch: fake.browser(u) });
      const o = { scriptId: 'tug', exportPrefix: 'tug-of-war' };
      // legacy = round-4 behaviour: append every frame + a poll after each append
      const tr = mode === 'legacy' ? pollingTransport({ ...stackscriptRoomApi(runner, o), appendRead: undefined }, {}) : stackscriptTransport(runner, o);
      return createSession(tugOfWar, { transport: tr, room: 'rt', inputDelay: 12, maxAhead: 30 });
    };
    const A = mk('a'); const B = mk('b');
    const joined = Promise.all([A.join(), B.join()]);
    await vi.advanceTimersByTimeAsync(500); await joined;
    A.ready(); B.ready();
    let frames = 0; let ran = 0;
    const loop = setInterval(() => { frames++; for (const s of [A, B]) { if (s.input(0)) ran++; /* idle rope: the match never ends, the whole window is steady play */ s.update(); } }, 33);
    await vi.advanceTimersByTimeAsync(2000);
    fake.stats.reset(); frames = 0; ran = 0;
    await vi.advanceTimersByTimeAsync(10_000);
    clearInterval(loop);
    const res = { reqPerSec: fake.stats.byUser.a! / 10, appendCallsPer10s: fake.stats.byExport['tug-of-war.room.append']! / 2, flow: ran / (frames * 2), rateRejected: fake.stats.rejected.rate, desync: A.snapshot.desync ?? B.snapshot.desync };
    A.leave(); B.leave();
    return res;
  };
  it('batching every 100 ms + piggybacked reads cut requests ~5× and keep the room under its rate', async () => {
    const r: Record<string, Awaited<ReturnType<typeof play>>> = {};
    for (const rtt of [40, 150]) for (const m of ['legacy', 'batched'] as const) r[`${m}@${rtt}ms`] = await play(m, rtt);
    // eslint-disable-next-line no-console
    console.log('tug-of-war, 30 Hz lockstep, per client:', r);
    expect(r['batched@40ms']!.reqPerSec).toBeLessThan(r['legacy@40ms']!.reqPerSec / 3);
    for (const k of ['batched@40ms', 'batched@150ms']) {
      expect(r[k]!.reqPerSec).toBeLessThanOrEqual(10.5);
      expect(r[k]!.appendCallsPer10s).toBeLessThan(400);
      expect(r[k]!.flow).toBeGreaterThan(0.95); // an input accepted every frame: no stall
      expect(r[k]!.desync).toBeNull();
    }
  }, 30_000);
});

describe('slow joins', () => {
  afterEach(() => vi.useRealTimers());
  it('update() during a slow HTTP join does not open a second link (no leaked poll loop)', async () => {
    vi.useFakeTimers();
    const fake = setup({ latencyMs: 300 });
    const S = createSession(ticTacToe, { transport: transport(fake.browser('alice')), room: 'slow' });
    const joining = S.join();
    for (let i = 0; i < 10; i++) { S.update(); await vi.advanceTimersByTimeAsync(50); }
    await joining;
    await vi.advanceTimersByTimeAsync(3000);
    expect(fake.stats.byExport['tic-tac-toe.room.join']).toBe(1);
    fake.stats.reset();
    await vi.advanceTimersByTimeAsync(12_000);
    expect(fake.stats.byExport['tic-tac-toe.room.poll'] ?? 0).toBeLessThanOrEqual(12); // one loop, ~1.2 s when quiet
    S.close();
  });
});
