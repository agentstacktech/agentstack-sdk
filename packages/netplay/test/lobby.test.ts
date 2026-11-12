import { describe, expect, it } from 'vitest';
import { createLobby, createSession, defineGame, inviteLink, codeFromUrl, memoryHub, parseRoomCode, roomCode, roomIdFor, CODE_ALPHABET, type Session } from '../src/index.js';
import { microtasks } from '../src/testing/index.js';

const race = defineGame<{ n: number[] }, number>({
  id: 'race', version: 1, seats: { min: 2, max: 3 }, mode: 'fold',
  setup: ({ seats }) => ({ n: Array(seats).fill(0) }),
  input: (raw) => (raw === 1 ? 1 : undefined),
  apply: (s, seat) => { s.n[seat]! += 1; },
});

describe('room codes', () => {
  it('codes use an unambiguous alphabet and round-trip through typing and links', () => {
    let x = 0;
    const c = roomCode(() => ((x = (x * 9301 + 49297) % 233280) / 233280));
    expect(c).toMatch(new RegExp(`^[${CODE_ALPHABET}]{6}$`));
    expect(CODE_ALPHABET).not.toMatch(/[01OIL]/);
    expect(parseRoomCode(` ${c.slice(0, 3).toLowerCase()} - ${c.slice(3)} `)).toBe(c);
    const link = inviteLink(c, 'https://game.example/s/1/tribute/?lang=ru#x');
    expect(link).toBe(`https://game.example/s/1/tribute/?lang=ru&join=${c}`);
    expect(codeFromUrl(link)).toBe(c);
    expect(parseRoomCode(link)).toBe(c);
    expect(parseRoomCode('hello')).toBeNull();
    expect(parseRoomCode('K7MQ2O')).toBeNull(); // O is not in the alphabet
    expect(parseRoomCode('https://x.example/?other=1')).toBeNull();
    expect(roomIdFor('tribute', c)).toBe(`tribute-p-${c.toLowerCase()}`);
  });
});

describe('createLobby', () => {
  async function pair() {
    const hub = memoryHub({ manual: true, latencyMs: 30 });
    const started: string[] = [];
    const mk = (user: string) => createLobby({
      game: 'race', baseUrl: 'https://g.example/play/',
      connect: (room) => createSession(race, { transport: hub.transport(user), room, name: user, now: () => hub.now }),
      onStart: (s: Session<{ n: number[] }, number, { n: number[] }>) => started.push(`${user}:${s.seat}`),
    });
    const lobbies: { session: Session<unknown, unknown, unknown> | null }[] = [];
    const mk2 = (user: string) => { const l = mk(user); lobbies.push(l as never); return l; };
    // sessions without autoPumpMs send inputs on update() — the game loop's job; here the test loop does it
    const tick = async (ms = 200) => { for (let t = 0; t < ms; t += 20) { for (const l of lobbies) l.session?.update(); hub.advance(20); await microtasks(); } };
    return { hub, started, mk: mk2, tick };
  }

  it('create → share link → friend joins from the link → both press start → match starts on both', async () => {
    const { started, mk, tick } = await pair();
    const a = mk('ana'), b = mk('bruno');
    const code = a.create();
    await tick();
    expect(a.state).toMatchObject({ screen: 'waiting', code, host: true, min: 2, max: 3, canStart: false });
    expect(a.state.players.map((p) => p.name)).toEqual(['ana']);
    expect(b.joinFromUrl(a.state.link!)).toBe(code);
    await tick();
    expect(b.state).toMatchObject({ screen: 'waiting', code, host: false, canStart: true });
    expect(a.state.players.map((p) => p.name)).toEqual(['ana', 'bruno']);
    a.start();
    await tick();
    expect(a.state.ready).toBe(true);
    expect(b.state.players.find((p) => p.name === 'ana')!.ready).toBe(true);
    expect(started).toEqual([]);
    b.start();
    await tick();
    expect(a.state.screen).toBe('playing');
    expect(b.state.screen).toBe('playing');
    expect(started.sort()).toEqual(['ana:0', 'bruno:1']);
    b.session!.input(1);
    await tick();
    expect(a.session!.snapshot.state).toEqual({ n: [0, 1] });
  });

  it('a full room starts by itself; a late code joiner watches as a spectator', async () => {
    const { mk, tick } = await pair();
    const [a, b, c, d] = ['a', 'b', 'c', 'd'].map(mk) as [ReturnType<typeof mk>, ReturnType<typeof mk>, ReturnType<typeof mk>, ReturnType<typeof mk>];
    const code = a.create();
    await tick(); b.join(code); await tick(); c.join(code.toLowerCase()); await tick();
    expect([a, b, c].map((l) => l.state.screen)).toEqual(['playing', 'playing', 'playing']);
    d.join(code); await tick();
    expect(d.state.screen).toBe('playing');
    expect(d.session!.seat).toBe(-1);
  });

  it('bad codes show an error; back returns to the menu; leaving frees the seat', async () => {
    const { mk, tick } = await pair();
    const a = mk('a'), b = mk('b');
    expect(b.join('no')).toBe(false);
    expect(b.state).toMatchObject({ screen: 'error', error: 'bad-code' });
    b.back();
    expect(b.state.screen).toBe('menu');
    const code = a.create(); await tick();
    b.join(code); await tick();
    b.cancel(); await tick();
    expect(b.state.screen).toBe('menu');
    expect(b.session).toBeNull();
    expect(a.state.players.map((p) => p.name)).toEqual(['a']); // a lobby seat is freed, not kept as 'left'
    expect(a.state.canStart).toBe(false);
  });

  it('a different game version is reported in plain terms', async () => {
    const { hub, tick } = await pair();
    const v2 = defineGame({ ...race, version: 2 });
    const a = createLobby({ game: 'race', connect: (room) => createSession(race, { transport: hub.transport('a'), room, now: () => hub.now }) });
    const b = createLobby({ game: 'race', connect: (room) => createSession(v2, { transport: hub.transport('b'), room, now: () => hub.now }) });
    const code = a.create(); await tick();
    b.join(code); await tick();
    expect(b.state).toMatchObject({ screen: 'error', error: 'version' });
    expect(a.state).toMatchObject({ screen: 'error', error: 'version' });
  });
});
