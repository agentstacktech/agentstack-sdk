/**
 * Public types of @agentstack/netplay (gene `sdk.netplay.gen1`).
 *
 * Mental model: a room is an append-only, server-ordered log of small JSON entries.
 * Every client folds the same log with the same pure reducer, so every client computes
 * the same lobby, the same seats and (for lockstep / fold games) the same game state.
 */
import type { Rng } from './rng.js';

/** Seat index 0..max-1. Spectators have seat -1. */
export type Seat = number;

/**
 * How inputs become state.
 * - `lockstep`: tick-synchronous. `step(state, inputs[])` runs once every seated player has an input
 *   for the next tick. Realtime games send one input per frame; turn-based games send one per turn.
 * - `fold`: asynchronous commands. `apply(state, seat, input)` runs for each command in log order.
 *   Good for races (each seat has its own board) and open-information board games.
 * - `authority`: hidden information. Only the authority (seat 0 today, a server script later)
 *   runs `apply`; other clients receive `view(state, seat)` projections.
 */
export type Mode = 'lockstep' | 'fold' | 'authority';

/** What happens to a seat that stays silent past `timeouts.turnMs` (lockstep) or `presenceMs` (all modes). */
export type TimeoutPolicy = 'idle' | 'forfeit';

export interface Outcome {
  /** Winning seat, or -1 for a draw / no single winner. */
  winner: Seat;
  /** Optional finishing order (seat per place) for 3+ players. */
  ranks?: Seat[];
  /** Short machine reason: 'ko', 'score', 'forfeit', 'timeout', 'left', … */
  reason?: string;
}

export interface SetupCtx {
  /** Match seed (same on every client). For `authority` it is private to the authority. */
  readonly seed: number;
  /** Number of seated players. */
  readonly seats: number;
  /** Seeded RNG for setup only. */
  readonly rng: Rng;
  /** Free-form room params passed to `createSession({ params })` by the room creator. */
  readonly params: Readonly<Record<string, unknown>>;
}

export interface StepCtx {
  /** Lockstep tick being computed (0-based), or the command index in `fold` / `authority`. */
  readonly tick: number;
  /** Server timestamp (ms) of the log entry that triggered this step. Deterministic. */
  readonly now: number;
  readonly seed: number;
  /** RNG derived from (seed, tick): deterministic, no state to store. */
  readonly rng: Rng;
  /** Seats that are not playing any more (left or timed out). */
  readonly absent: readonly boolean[];
}

/**
 * A multiplayer game definition. Only `id`, `seats`, `mode`, `setup`, `input` and one of
 * `step` (lockstep) / `apply` (fold, authority) are required. Keep every function pure and
 * deterministic: no Date.now, no Math.random, no I/O — use `ctx.now` and `ctx.rng`.
 */
export interface GameDef<S, I, V = S> {
  /** Stable id, also used for script ids and matchmaking queues. `[a-z0-9-]`. */
  readonly id: string;
  /** Rules/protocol version. Clients with a different version cannot sit together. */
  readonly version: number;
  readonly seats: { readonly min: number; readonly max: number };
  readonly mode: Mode;
  /** Initial state for one match. */
  setup(ctx: SetupCtx): S;
  /**
   * Validate an untrusted input. Return the typed input, or `undefined` to reject it.
   * Runs on every client for every entry (anti-cheat), so keep it cheap.
   */
  input(raw: unknown, seat: Seat, state: S): I | undefined;
  /** lockstep: advance one tick. Mutate `state` or return a new one. */
  step?(state: S, inputs: readonly I[], ctx: StepCtx): S | void;
  /** lockstep: input used for a seat that sent nothing (timed out, left). Default `null`. */
  readonly idle?: I;
  /** lockstep: hide inputs until every seat committed (commit–reveal). For simultaneous secret turns. */
  readonly secret?: boolean;
  /** fold / authority: apply one validated command. Mutate `state` or return a new one. */
  apply?(state: S, seat: Seat, input: I, ctx: StepCtx): S | void;
  /** Optional time-driven update (deadlines). Called with the server time before each entry. */
  clock?(state: S, now: number, ctx: StepCtx): S | void;
  /** Finished? Return the outcome, or null while the match runs. */
  outcome?(state: S): Outcome | null;
  /** Projection for one seat (-1 = spectator). Required for `authority`; default identity. */
  view?(state: S, seat: Seat): V;
  /** State hash for desync detection. Default: FNV-1a over a canonical serialization. */
  hash?(state: S): number;
  readonly timeouts?: {
    /** lockstep: max server-time wait for a missing seat's input on one tick/turn. Default: none. */
    readonly turnMs?: number;
    /** Seat with no entries for this long is `away`. Default 20000. */
    readonly presenceMs?: number;
    /** Default 'idle' (lockstep continues with `idle`); 'forfeit' ends a 2-seat match. */
    readonly onTimeout?: TimeoutPolicy;
  };
  /** lockstep: report a state hash every N ticks (default 30; 1 for turn-based). 0 disables. */
  readonly hashEvery?: number;
}

/** One entry of the room log as delivered by a transport. `from` and `t` are set by the server. */
export interface Entry<B = Body> {
  readonly seq: number;
  readonly from: string;
  readonly t: number;
  /** Private entry addressed to one user id (authority views). */
  readonly to?: string;
  readonly body: B;
}

/** Wire bodies. Short keys keep polling payloads small. `m` = match number (rematch counter). */
export type Body =
  | { k: 'hello'; g: string; v: number; name?: string; spectate?: boolean; params?: Record<string, unknown> }
  | { k: 'ready' }
  | { k: 'in'; m: number; t: number; d: unknown[]; salt?: string }
  | { k: 'commit'; m: number; t: number; h: number }
  | { k: 'cmd'; m: number; d: unknown }
  | { k: 'hash'; m: number; t: number; h: number }
  | { k: 'view'; m: number; s: number; seat: Seat; d: unknown; o?: Outcome | null }
  | { k: 'clock' }
  | { k: 'rematch'; m: number }
  | { k: 'leave' };

export type PlayerStatus = 'on' | 'away' | 'left';

export interface PlayerInfo {
  readonly id: string;
  readonly seat: Seat;
  readonly name: string;
  readonly status: PlayerStatus;
  readonly ready: boolean;
  /** Server time of this player's last entry. */
  readonly lastT: number;
}

export type Phase = 'lobby' | 'playing' | 'over';

export interface Desync {
  readonly tick: number;
  readonly hashes: Readonly<Record<string, number>>;
}

/** Everything a UI needs, recomputed after every batch of entries. */
export interface Snapshot<S, V = S> {
  readonly room: string;
  readonly self: string;
  /** My seat, -1 when spectating or not joined. */
  readonly seat: Seat;
  readonly phase: Phase;
  readonly match: number;
  readonly players: readonly PlayerInfo[];
  readonly spectators: number;
  /** Confirmed lockstep tick / applied command count. */
  readonly tick: number;
  /** Full state (lockstep / fold, or the authority itself). Null on non-authority clients. */
  readonly state: S | null;
  /** What this client should render: `view(state, seat)` or the last view sent by the authority. */
  readonly view: V | null;
  readonly outcome: Outcome | null;
  readonly desync: Desync | null;
  /** Seats that voted for a rematch in the current `over` phase. */
  readonly rematch: readonly Seat[];
  /** Last rejection or protocol problem, for UI hints and logs. */
  readonly notice: string | null;
  readonly connection: ConnectionState;
}

export type ConnectionState = 'idle' | 'connecting' | 'online' | 'reconnecting' | 'offline';

/** A live connection to one room. */
export interface Link {
  /** Server-assigned identity of this client (user id). */
  readonly self: string;
  /**
   * Append a body to the room log (optionally private to one user id). Called without awaiting:
   * the transport MUST keep call order (queue internally if the wire is async).
   */
  send(body: Body, to?: string): Promise<void>;
  close(): void;
}

export interface TransportCaps {
  /** Entries with `to` are delivered only to that user (server-enforced). */
  readonly privateEntries: boolean;
  /** Human label for logs: 'memory', 'polling', 'stackscript', 'wss'. */
  readonly kind: string;
}

/**
 * Pluggable transport: memory (tests), polling (any HTTP log API), stackscript (generated room
 * script via the SDK StackScript client), wss (push, when the platform upgrade works).
 */
export interface Transport {
  readonly caps: TransportCaps;
  connect(room: string, opts: ConnectOptions): Promise<Link>;
}

export interface ConnectOptions {
  /** Deliver entries with seq > afterSeq (reconnect resumes here). */
  readonly afterSeq: number;
  readonly onEntries: (entries: readonly Entry[]) => void;
  readonly onStatus?: (s: ConnectionState, detail?: string) => void;
}
