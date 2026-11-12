import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSession, generateRoomScript, hostedMcpRunner, netStatus, NetplayError, stackscriptRoomApi, stackscriptTransport, unwrapHostedReply, errorKind } from '../src/index.js';
import { fakeHostedMcp, loadRoomScript } from '../src/testing/index.js';
import { ticTacToe } from '../examples/tic-tac-toe.js';

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
    expect(errorKind('ROOM_FULL')).toBe('server');
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
    // idle-after-game rate: ~2.5 polls/s/client (400 ms), no appends
    expect(fake.stats.byUser.alice! / 10).toBeLessThan(4);
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
