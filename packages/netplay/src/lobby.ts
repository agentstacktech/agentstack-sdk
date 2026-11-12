/**
 * Private rooms with human-friendly codes + a headless lobby controller (gene `sdk.netplay.lobby.gen1`).
 *
 *   const lobby = createLobby({ game: 'tribute', connect: (room) => createSession(tribute, { transport, room, name }) });
 *   lobby.subscribe((st) => render(st));      // screen: 'menu' | 'waiting' | 'playing' | 'error'
 *   lobby.create();                           // new code → st.code, st.link («copy invite link»)
 *   lobby.join('k7mq 2x');                    // a typed code or a pasted invite link
 *   lobby.start();                            // «I'm ready» (the match starts when the room is full or all seated are ready)
 *   lobby.joinFromUrl();                      // opened via an invite link → join straight away
 *
 * Pure DOM-free logic: any UI (canvas, React, the optional `@agentstack/netplay/ui` mountLobby) renders `LobbyState`.
 */
import type { Session } from './session.js';
import type { PlayerInfo } from './types.js';

/** No 0/O, 1/I/L, so a code read aloud or typed on a phone survives. */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;

/** A new room code like `K7MQ2X` (`rand` injectable for tests). */
export function roomCode(rand: () => number = secureRandom, length = CODE_LENGTH): string {
  let s = '';
  for (let i = 0; i < length; i++) s += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length) % CODE_ALPHABET.length];
  return s;
}

/**
 * Read a code from what a person typed or pasted: `k7mq 2x`, `K7MQ-2X`, or a whole invite link.
 * Returns the canonical code, or null when it cannot be a code.
 */
export function parseRoomCode(text: string, param = 'join', length = CODE_LENGTH): string | null {
  const raw = String(text ?? '').trim();
  if (!raw) return null;
  const fromUrl = /[/?#=&]/.test(raw) ? codeFromUrl(raw, param, length) : null;
  if (fromUrl) return fromUrl;
  const c = raw.toUpperCase().replace(/[\s\-_.]/g, '');
  if (c.length !== length) return null;
  for (const ch of c) if (!CODE_ALPHABET.includes(ch)) return null;
  return c;
}

/** Room id for a code (namespaced per game, so codes never collide across games). */
export function roomIdFor(game: string, code: string): string {
  return `${game}-p-${code.toLowerCase()}`;
}

/** Invite link: `base` (default: current page) with `?join=CODE`; other query params are kept. */
export function inviteLink(code: string, base?: string, param = 'join'): string {
  const href = base ?? (typeof location !== 'undefined' ? location.href : 'https://example.invalid/');
  const u = new URL(href);
  u.searchParams.set(param, code);
  u.hash = '';
  return u.toString();
}

/** The code inside an invite link (or null). */
export function codeFromUrl(url: string, param = 'join', length = CODE_LENGTH): string | null {
  try {
    const v = new URL(url, 'https://example.invalid/').searchParams.get(param);
    return v ? parseRoomCode(v, param, length) : null;
  } catch {
    return null;
  }
}

export type LobbyScreen = 'menu' | 'waiting' | 'playing' | 'error';

export interface LobbyState {
  readonly screen: LobbyScreen;
  /** Room code (waiting / playing). */
  readonly code: string | null;
  /** Invite link for the code. */
  readonly link: string | null;
  /** Did I create the room (true) or join by code (false)? */
  readonly host: boolean;
  readonly players: readonly PlayerInfo[];
  /** Seats needed before the match can start / seats the room holds. */
  readonly min: number;
  readonly max: number;
  /** I already pressed «start». */
  readonly ready: boolean;
  /** Enough players are here for `start()` to make sense. */
  readonly canStart: boolean;
  /** Machine reason for the error screen. A full / running room is not an error: you join as a spectator (screen 'playing', `seat -1`). */
  readonly error: LobbyError | null;
}
export type LobbyError = 'bad-code' | 'offline' | 'version' | 'sign-in' | 'unavailable';

export interface LobbyOptions<S, I, V> {
  /** Game id (namespaces room ids). */
  game: string;
  /** Open a session for a room id (your transport, name, params…). Called once per create/join. */
  connect(room: string, code: string): Session<S, I, V>;
  /** Called once when the match starts (screen → 'playing'); mount the game with this session. */
  onStart?(session: Session<S, I, V>, code: string): void;
  /** Page the invite link points at (default: current page). */
  baseUrl?: string;
  /** Query param carrying the code in invite links. Default 'join'. */
  param?: string;
  /** Source of randomness for codes (tests). */
  rand?: () => number;
}

export interface LobbyController<S, I, V> {
  readonly state: LobbyState;
  readonly session: Session<S, I, V> | null;
  subscribe(fn: (s: LobbyState) => void): () => void;
  /** Make a new private room and wait in it. */
  create(): string;
  /** Join by a typed code or a pasted link. false (screen 'error', error 'bad-code') when it is not a code. */
  join(text: string): boolean;
  /** If the page was opened from an invite link, join that room. Returns the code or null. */
  joinFromUrl(url?: string): string | null;
  /** «Start» = ready vote. */
  start(): void;
  /** Leave the room and go back to the menu. */
  cancel(): void;
  /** Error screen → menu. */
  back(): void;
}

export function createLobby<S, I, V>(o: LobbyOptions<S, I, V>): LobbyController<S, I, V> {
  const param = o.param ?? 'join';
  const listeners = new Set<(s: LobbyState) => void>();
  let session: Session<S, I, V> | null = null;
  let off: (() => void) | null = null;
  let started = false;
  const idle = (screen: LobbyScreen = 'menu', error: LobbyError | null = null): LobbyState =>
    ({ screen, code: null, link: null, host: false, players: [], min: 0, max: 0, ready: false, canStart: false, error });
  let state: LobbyState = idle();
  const emit = (s: LobbyState) => { state = s; for (const f of [...listeners]) f(s); };

  const enter = (code: string, host: boolean) => {
    leave();
    started = false;
    const s = o.connect(roomIdFor(o.game, code), code);
    session = s;
    const { min, max } = s.game.seats;
    const link = inviteLink(code, o.baseUrl, param);
    const sync = () => {
      const snap = s.snapshot;
      const me = snap.players.find((p) => p.id === snap.self);
      const seated = snap.players.filter((p) => p.status !== 'left');
      // every client accepts its own hello and rejects the other version's, so any mismatch in the lobby = can't play together
      if (!started && snap.phase === 'lobby' && snap.notice?.startsWith('version mismatch')) { emit({ ...idle('error', 'version') }); return; }
      if (snap.phase !== 'lobby' && !started) {
        started = true;
        emit({ screen: 'playing', code, link, host, players: snap.players, min, max, ready: true, canStart: false, error: null });
        o.onStart?.(s, code);
        return;
      }
      if (started) { emit({ ...state, players: snap.players }); return; }
      if (snap.issue === 'auth') { emit({ ...idle('error', 'sign-in') }); return; }
      if (snap.issue === 'not-published') { emit({ ...idle('error', 'unavailable') }); return; }
      if (snap.connection === 'offline') { emit({ ...idle('error', 'offline') }); return; }
      emit({ screen: 'waiting', code, link, host, players: snap.players, min, max, ready: !!me?.ready, canStart: seated.length >= min && !me?.ready, error: null });
    };
    off = s.subscribe(sync);
    emit({ screen: 'waiting', code, link, host, players: [], min, max, ready: false, canStart: false, error: null });
    s.join().catch(() => emit({ ...idle('error', s.snapshot.issue === 'auth' ? 'sign-in' : s.snapshot.issue === 'not-published' ? 'unavailable' : 'offline') }));
  };
  const leave = () => {
    off?.(); off = null;
    if (session) { try { if (!started) session.leave(); } finally { if (!started) session.close(); } }
    session = null;
  };

  return {
    get state() { return state; },
    get session() { return session; },
    subscribe(fn) { listeners.add(fn); fn(state); return () => listeners.delete(fn); },
    create() { const code = roomCode(o.rand); enter(code, true); return code; },
    join(text) {
      const code = parseRoomCode(text, param);
      if (!code) { emit({ ...idle('error', 'bad-code') }); return false; }
      enter(code, false);
      return true;
    },
    joinFromUrl(url) {
      const href = url ?? (typeof location !== 'undefined' ? location.href : '');
      const code = href ? codeFromUrl(href, param) : null;
      if (code) enter(code, false);
      return code;
    },
    start() { if (session && state.screen === 'waiting' && state.canStart) { session.ready(); emit({ ...state, ready: true, canStart: false }); } },
    cancel() { leave(); emit(idle()); },
    back() { if (state.screen === 'error') { leave(); emit(idle()); } },
  };
}

function secureRandom(): number {
  const c = (globalThis as { crypto?: { getRandomValues?: (a: Uint32Array) => Uint32Array } }).crypto;
  if (c?.getRandomValues) return c.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32;
  return Math.random();
}
