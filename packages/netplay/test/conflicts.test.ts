/** Room CAS conflicts (RETRY), one entry per device (inputAll), log cap and smaller chunks in the generated room. */
import { describe, expect, it } from 'vitest';
import { conflictDelayMs, createSession, defineGame, generateRoomScript, memoryHub, stackscriptRoomApi } from '../src/index.js';
import { loadRoomScript, microtasks, ScriptError } from '../src/testing/index.js';
import { ticTacToe } from '../examples/tic-tac-toe.js';

describe('RETRY: jittered backoff, fresh idempotency key per attempt', () => {
  it('waits base·2^n·(0.5…1.5) between attempts and never reuses the key', async () => {
    const keys: (string | undefined)[] = [];
    const waits: number[] = [];
    let n = 0;
    const runner = { async run(p: { idempotency_key?: string }) { keys.push(p.idempotency_key); n++; return n <= 3 ? { ok: true, data: { value: { error: 'RETRY' } } } : { ok: true, data: { value: { self: 'me', seq: 4, entries: [] } } }; } };
    const api = stackscriptRoomApi(runner, { scriptId: 's', exportPrefix: 'p', sleep: async (ms) => { waits.push(ms); }, random: () => 0.5 });
    await api.appendRead!('r', [{ body: { k: 'clock' } }], 0);
    expect(n).toBe(4);
    expect(new Set(keys).size).toBe(4); // fresh key each time
    expect(keys[1]).toBe(`${keys[0]}~r1`);
    expect(waits).toEqual([25, 50, 100]);
  });
  it('gives up after conflictRetries and reports the conflict', async () => {
    let n = 0;
    const runner = { async run() { n++; return { ok: true, data: { value: { error: 'RETRY' } } }; } };
    const api = stackscriptRoomApi(runner, { scriptId: 's', exportPrefix: 'p', conflictRetries: 2, sleep: async () => {} });
    await expect(api.poll('r', 0)).rejects.toMatchObject({ code: 'RETRY' });
    expect(n).toBe(3);
  });
  it('jitter spreads two clashing clients apart', () => {
    expect(conflictDelayMs(0, 25, 0)).toBe(13);
    expect(conflictDelayMs(0, 25, 0.999)).toBe(37);
    expect(conflictDelayMs(9, 25, 0.5)).toBe(800); // capped at 2^5
  });
});

const table = defineGame<{ t: number[]; n: number }, number>({
  id: 'all-seats', version: 1, seats: { min: 2, max: 4 }, mode: 'fold',
  setup: ({ seats }) => ({ t: new Array<number>(seats).fill(0), n: 0 }),
  input: (r) => (Number.isInteger(r) && (r as number) >= 0 ? (r as number) : undefined),
  apply: (s, seat, v) => { s.t[seat] = v; s.n++; },
});

describe('inputAll: one command for every seat on the device in one entry', () => {
  it('applies to own + local seats in seat order, everywhere, as one log entry', async () => {
    const hub = memoryHub({ manual: true, latencyMs: 10 });
    const mk = (u: string, locals?: string[]) => createSession(table, { transport: hub.transport(u), room: 'r', name: u, now: () => hub.now, ...(locals ? { locals } : {}) });
    const A = mk('ana', ['bia']), C = mk('caio');
    await A.join(); hub.advance(10); await microtasks();
    await C.join(); hub.advance(10); await microtasks();
    A.ready(); C.ready();
    for (let i = 0; i < 20; i++) { A.update(); C.update(); hub.advance(20); await microtasks(); }
    expect(A.snapshot.phase).toBe('playing');
    const before = hub.log('r').length;
    expect(A.inputAll(7)).toBe(true);
    for (let i = 0; i < 10; i++) { A.update(); C.update(); hub.advance(20); await microtasks(); }
    const added = hub.log('r').slice(before).filter((e) => (e.body as { k: string }).k === 'cmd');
    expect(added).toHaveLength(1);
    expect(A.model.state!.t).toEqual([7, 7, 0]);
    expect(C.model.state!).toEqual(A.model.state!);
    expect(A.inputAll(-1)).toBe(false); // nobody accepts it: nothing sent
  });
});

describe('generated room: log cap and chunk size', () => {
  it('LOG_FULL past maxLog; default chunk 16 rewrites at most 16 entries per append', () => {
    const rt = loadRoomScript(generateRoomScript(ticTacToe, { maxLog: 5 }));
    rt.call('a', 'tic-tac-toe.room.join', { room: 'r' });
    for (let i = 0; i < 5; i++) { rt.now += 1000; rt.call('a', 'tic-tac-toe.room.append', { room: 'r', body: JSON.stringify({ k: 'clock', n: i }) }); }
    expect(() => rt.call('a', 'tic-tac-toe.room.append', { room: 'r', body: JSON.stringify({ k: 'clock', n: 9 }) })).toThrow(ScriptError);
    try { rt.call('a', 'tic-tac-toe.room.append', { room: 'r', body: '{"k":"clock"}' }); } catch (e) { expect((e as ScriptError).code).toBe('LOG_FULL'); }
    const big = loadRoomScript(generateRoomScript(ticTacToe));
    big.call('a', 'tic-tac-toe.room.join', { room: 'r' });
    for (let i = 0; i < 40; i++) { big.now += 1000; big.call('a', 'tic-tac-toe.room.append', { room: 'r', body: JSON.stringify({ k: 'clock', n: i }) }); }
    const chunks = [...big.dna.entries()].filter(([k]) => k.includes('_log')).map(([, v]) => (JSON.parse(v.v) as { e: unknown[] }).e.length);
    expect(Math.max(...chunks)).toBe(16);
    expect((big.call('a', 'tic-tac-toe.room.poll', { room: 'r', after: 0 }) as { entries: unknown[] }).entries).toHaveLength(40);
  });
});

describe('full rooms: a plain reason instead of «no connection»', () => {
  it('ROOM_FULL / LOG_FULL → issue full → netStatus full + lobby error full (ru/en/pt texts)', async () => {
    const { errorKind, netStatus } = await import('../src/index.js');
    const { describeNetStatus, NET_STATUS_LABELS, LOBBY_LABELS } = await import('../src/ui/index.js');
    expect(errorKind('ROOM_FULL')).toBe('full');
    expect(errorKind('LOG_FULL')).toBe('full');
    const st = netStatus({ issue: 'full', phase: 'lobby', connection: 'offline', players: [], self: 'a', hostWaitMs: null, desync: null } as never);
    expect(st).toEqual({ kind: 'full' });
    expect(describeNetStatus(st!, NET_STATUS_LABELS.ru)).toBe('Комната заполнена — откройте новую');
    expect(describeNetStatus(st!, { ...NET_STATUS_LABELS.en, full: undefined })).toBe(NET_STATUS_LABELS.en.full);
    expect(LOBBY_LABELS.pt.full).toMatch(/cheia/);
  });
});
