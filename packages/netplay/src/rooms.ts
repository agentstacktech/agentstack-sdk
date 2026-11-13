/**
 * Platform rooms (`rooms.*` + `stream.relay.ws_ticket`) through the hosted MCP of a game page (`POST /s/{pid}/mcp`,
 * cookie session — guests too). Pair with `relayTransport` for a quick match without a room script:
 *
 *   const rooms = hostedRooms({ projectId: 2141, scriptId: 'serpent-coop-room' });
 *   const m = await rooms.quickMatch();                      // { matchId, roomId, seat, status: 'waiting' | 'started', … }
 *   const t = relayTransport({ self: me.id, host: m.seat === 0, url: () => rooms.wsUrl(m) });
 *
 * `create` / `listOpen` / `joinByCode` call `rooms.create` / `rooms.list_open` / `rooms.join_by_code`; until the server
 * has them they throw NetplayError('not-published', 'action_not_found') and `support()` reports false — show «скоро».
 */
import { errorKind, NetplayError } from './errors.js';
import { unwrapHostedReply } from './transports/hosted.js';
import { relayTransport, type RelayOptions } from './transports/relay.js';
import type { Transport } from './types.js';

export interface ServerPlayer { readonly seat: number; readonly userId: string; readonly name: string; readonly isHost: boolean; readonly isBot: boolean; readonly connected: boolean }
export type RoomVisibility = 'public' | 'private';
export interface QuickMatch {
  readonly matchId: string;
  readonly roomId: string;
  readonly seat: number;
  /** waiting | open | countdown | starting | started | running | finished | closed */
  readonly status: string;
  readonly seatsTaken: number;
  readonly seatsNeeded: number;
  /** `/play?match=…&invite=…` from the server: share it to bring a friend into this match. */
  readonly inviteLink?: string;
  readonly invite?: string;
  /** 6-symbol room code (rooms.create / wave 2). */
  readonly code?: string;
  readonly visibility?: RoomVisibility;
  readonly minPlayers?: number;
  readonly hostUserId?: string;
  /** Server room snapshot players (wave 2); empty on the old quick_match reply. */
  readonly players?: readonly ServerPlayer[];
  /** Server start time in server ms (`countdown_ends_at_ms`), or null/undefined when no countdown runs. */
  readonly countdownEndsAtMs?: number | null;
  /** local Date.now() − server_now_ms at the time of the reply (0 when the server did not send its clock). */
  readonly clockSkewMs?: number;
  /** Monotonic room version (dedupe of snapshots). */
  readonly version?: number;
}
export interface OpenRoom {
  readonly roomId: string; readonly matchId?: string; readonly code?: string; readonly name?: string; readonly seatsTaken: number; readonly seatsNeeded: number;
  readonly status?: string; readonly countdownEndsAtMs?: number | null; readonly hostName?: string; readonly mode?: string;
}
export interface CreateOptions { visibility?: RoomVisibility; name?: string; seats?: number; minToStart?: number; settings?: Record<string, unknown>; botFillAfterMs?: number }

/** Milliseconds until the server countdown ends (null when the server runs no countdown). */
export function countdownLeftMs(m: Pick<QuickMatch, 'countdownEndsAtMs' | 'clockSkewMs'>, now = Date.now()): number | null {
  if (typeof m.countdownEndsAtMs !== 'number') return null;
  return Math.max(0, m.countdownEndsAtMs + (m.clockSkewMs ?? 0) - now);
}
/** Pull `?match=&invite=` or a bare code out of what a player pasted. */
export function parseInvite(text: string): { match?: string; invite?: string; code?: string; link?: string } {
  const v = text.trim();
  const mm = /[?&]match=([^&\s#]+)/.exec(v);
  const inv = /[?&]invite=([^&\s#]+)/.exec(v);
  const jc = /[?&](?:join|code|invite_code)=([^&\s#]+)/.exec(v);
  const norm = (c: string) => { const t = c.replace(/\s+/g, ''); return /^[0-9a-f]+$/i.test(t) ? t.toLowerCase() : t; };
  if (mm) return { match: decodeURIComponent(mm[1]!), ...(inv ? { invite: decodeURIComponent(inv[1]!), code: norm(decodeURIComponent(inv[1]!)) } : {}), link: v };
  if (inv) return { code: norm(decodeURIComponent(inv[1]!)) };
  if (jc) return { code: norm(decodeURIComponent(jc[1]!)) };
  return v ? { code: norm(v) } : {};
}

export interface HostedRoomsOptions {
  projectId: number;
  scriptId: string;
  mode?: string;
  origin?: string;
  token?: () => string | null | undefined;
  fetch?: typeof fetch;
  timeoutMs?: number;
  /** Re-try a lobby action that was missing after this long (ms). Default 60000. */
  reprobeMs?: number;
  /** Mint a hosted-app session cookie (guest or bearer) when a call answers auth_required, then retry once. Default true. */
  session?: boolean;
}

export interface RoomsApi {
  quickMatch(o?: { match?: string; invite?: string }): Promise<QuickMatch>;
  status(m: QuickMatch): Promise<QuickMatch>;
  leave(m: QuickMatch): Promise<void>;
  /** Fresh relay URL with a short-lived ticket. Never log or display it. */
  wsUrl(m: QuickMatch): Promise<string>;
  /** rooms.create (signed-in host; guests get NetplayError kind 'auth', code auth_required_to_host). */
  create(o?: CreateOptions): Promise<QuickMatch>;
  listOpen(): Promise<OpenRoom[]>;
  /** A 6-symbol code or a pasted invite link. */
  joinByCode(code: string): Promise<QuickMatch>;
  /** Join a public room from the list by its room_id (rooms.join; falls back to its code). */
  joinRoom(r: OpenRoom): Promise<QuickMatch>;
  /** Which lobby actions the server has (probed once by `listOpen`, cached). */
  support(): { create: boolean | null; listOpen: boolean | null; joinByCode: boolean | null };
}

type Json = Record<string, unknown>;
const obj = (v: unknown): Json | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : null);
const str = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');
const num = (v: unknown, d = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);

function parsePlayers(v: unknown): ServerPlayer[] | undefined {
  if (!Array.isArray(v)) return undefined;
  return v.map((x) => obj(x) ?? {}).map((p) => ({ seat: num(p.seat, -1), userId: str(p.user_id), name: str(p.display_name) || str(p.name), isHost: p.is_host === true, isBot: p.is_bot === true, connected: p.connected !== false }));
}

/** Old flat quick_match reply and the wave-2 `{ room: {...}, seat }` shape both land here. */
export function parseMatch(d0: Json, prev?: QuickMatch, now = Date.now()): QuickMatch {
  const room = obj(d0.room);
  const d: Json = room ? { ...room, ...Object.fromEntries(Object.entries(d0).filter(([k, v]) => k !== 'room' && v !== undefined && v !== null)) } : d0;
  const link = str(d.invite_link) || prev?.inviteLink || '';
  const inv = /[?&]invite=([^&]+)/.exec(link)?.[1];
  const players = parsePlayers(d.players) ?? prev?.players;
  const sn = typeof d.server_now_ms === 'number' ? d.server_now_ms : undefined;
  const cd = d.countdown_ends_at_ms === null ? null : typeof d.countdown_ends_at_ms === 'number' ? d.countdown_ends_at_ms : typeof d.countdown_ends_at === 'number' ? d.countdown_ends_at : prev?.countdownEndsAtMs;
  const vis = str(d.visibility);
  return {
    matchId: str(d.match_id) || prev?.matchId || '',
    roomId: str(d.room_id) || prev?.roomId || '',
    seat: typeof d.seat === 'number' ? d.seat : prev?.seat ?? -1,
    status: str(d.status) || str(d.match_status) || prev?.status || 'waiting',
    seatsTaken: num(d.seats_taken, players ? players.length : prev?.seatsTaken ?? 1),
    seatsNeeded: num(d.seats_needed, num(d.max_players, prev?.seatsNeeded ?? 2)),
    ...(link ? { inviteLink: link } : {}),
    ...(inv ? { invite: decodeURIComponent(inv) } : {}),
    ...((str(d.invite_code) || str(d.join_code) || str(d.code)) ? { code: str(d.invite_code) || str(d.join_code) || str(d.code) } : prev?.code ? { code: prev.code } : {}),
    ...(vis === 'public' || vis === 'private' ? { visibility: vis } : prev?.visibility ? { visibility: prev.visibility } : {}),
    ...(typeof d.min_players === 'number' ? { minPlayers: d.min_players } : prev?.minPlayers ? { minPlayers: prev.minPlayers } : {}),
    ...(str(d.host_user_id) ? { hostUserId: str(d.host_user_id) } : prev?.hostUserId ? { hostUserId: prev.hostUserId } : {}),
    ...(players ? { players } : {}),
    ...(cd !== undefined ? { countdownEndsAtMs: cd } : {}),
    clockSkewMs: sn !== undefined ? now - sn : prev?.clockSkewMs ?? 0,
    ...(typeof d.version === 'number' ? { version: d.version } : prev?.version !== undefined ? { version: prev.version } : {}),
  };
}

export function hostedRooms(o: HostedRoomsOptions): RoomsApi {
  const f = o.fetch ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  const base = (o.origin ?? '').replace(/\/+$/, '');
  const mode = o.mode ?? '1v1';
  const sup: { create: boolean | null; listOpen: boolean | null; joinByCode: boolean | null } = { create: null, listOpen: null, joinByCode: null };
  // «missing» expires: the server can ship rooms.create / list_open / join_by_code while the page is open
  const supAt: Record<string, number> = {};
  const reprobeMs = o.reprobeMs ?? 60_000;
  const mark = (k: keyof typeof sup, v: boolean) => { sup[k] = v; supAt[k] = Date.now(); };
  let id = 0;
  // A guest page has no hosted-app cookie until it asks for one. We never overwrite a working cookie: the first auth error mints one
  // (guest, or with the player's bearer) and the call is retried once.
  let session: Promise<boolean> | null = null;
  const mintSession = (): Promise<boolean> => {
    const t = o.token?.();
    const h: Record<string, string> = { 'content-type': 'application/json', accept: 'application/json' };
    if (t) h.authorization = `Bearer ${t}`;
    return f(`${base}/api/hosted-apps/${o.projectId}/session`, { method: 'POST', credentials: 'include', headers: h, body: t ? '{}' : '{"guest":true}' })
      .then((r) => r.ok, () => false);
  };
  const ensureSession = (): Promise<boolean> => { if (o.session === false) return Promise.resolve(true); session = mintSession(); return session; };
  const AUTHY = new Set(['auth_required', 'unauthorized', 'hosted_app_session_required', 'session_setup_required', 'expired', 'http_401']);
  const BUSY = new Set(['server_busy', 'http_503', 'http_502']);
  async function call(action: string, params: Json, attempt = 0, keepalive = false): Promise<Json> {
    if (session) await session; // a mint in flight: wait for its cookie
    try { return await call1(action, params, keepalive); }
    catch (e) {
      if (attempt === 0 && e instanceof NetplayError && AUTHY.has(e.code)) { await ensureSession(); return call(action, params, 1); }
      if (attempt < 2 && e instanceof NetplayError && BUSY.has(e.code)) { await new Promise((r) => setTimeout(r, 700 * (attempt + 1))); return call(action, params, attempt + 1); }
      throw e;
    }
  }
  async function call1(action: string, params: Json, keepalive = false): Promise<Json> {
    const h: Record<string, string> = { 'content-type': 'application/json', accept: 'application/json', 'x-project-id': String(o.projectId) };
    const t = o.token?.();
    if (t) h.authorization = `Bearer ${t}`;
    const body = JSON.stringify({ jsonrpc: '2.0', id: ++id, method: 'tools/call', params: { name: 'agentstack.execute', arguments: {
      action, params: { project_id: o.projectId, ...params }, context: { project_id: o.projectId }, options: { execution_intent: 'direct' },
    } } });
    const signal = typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? AbortSignal.timeout(o.timeoutMs ?? 15_000) : undefined;
    let r: Response;
    try { r = await f(`${base}/s/${o.projectId}/mcp`, { method: 'POST', credentials: 'include', headers: h, body, ...(keepalive ? { keepalive: true } : signal ? { signal } : {}) }); }
    catch (e) { throw new NetplayError('offline', 'network', String((e as Error)?.message ?? e)); }
    let text = await r.text();
    if (text.includes('\ndata:') || text.startsWith('data:') || text.startsWith('event:')) {
      const ds = text.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim());
      text = ds[ds.length - 1] ?? text;
    }
    let j: unknown = null;
    try { j = JSON.parse(text); } catch { /* not JSON */ }
    const p = unwrapHostedReply(j);
    const err = p.error ?? obj(obj(j)?.error);
    const sc = (v: unknown) => (typeof v === 'string' ? v : '');
    const eo = obj(err);
    // JSON-RPC errors carry a number code and the platform code in data.code; a bare auth reply is { code: 'auth_required' }
    const code = str(p.error_code) || (typeof err === 'string' ? err : '') || sc(obj(eo?.data)?.code) || sc(eo?.code) || (eo && typeof eo.code === 'number' ? `rpc_${eo.code}` : '') || str(p.error_code) || (p.data === undefined ? sc(obj(j)?.code) : '');
    if (!r.ok || p.ok === false || code) throw new NetplayError(errorKind(code || `http_${r.status}`, r.status), code || `http_${r.status}`, str(obj(err)?.message));
    return obj(p.data) ?? p;
  }
  const key = (k: string) => `${k}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const missing = (e: unknown) => e instanceof NetplayError && e.code === 'action_not_found';
  const api: RoomsApi = {
    async quickMatch(x = {}) {
      return parseMatch(await call('rooms.quick_match', { script_id: o.scriptId, mode, idempotency_key: key('qm'), ...(x.match ? { match_id: x.match } : {}), ...(x.invite ? { invite: x.invite } : {}) }));
    },
    async status(m) { return parseMatch(await call('rooms.match_status', { script_id: o.scriptId, match_id: m.matchId }), m); },
    async leave(m) { try { await call('rooms.leave', { script_id: o.scriptId, match_id: m.matchId }, 2, true); } catch { /* best effort */ } },
    async wsUrl(m) {
      const d = await call('stream.relay.ws_ticket', { room_id: m.roomId, match_id: m.matchId });
      const u = str(d.ws_connect_url);
      if (u) return u;
      const tok = str(d.token);
      if (!tok) throw new NetplayError('server', 'no_ws_ticket');
      const host = base ? base.replace(/^http/, 'ws') : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;
      return `${host}/api/stream-relay/ws/rooms/${encodeURIComponent(m.roomId)}?token=${encodeURIComponent(tok)}`;
    },
    async create(x = {}) {
      // shipped contract (13.11 18:53): script_id, mode, visibility, bot_fill_after_ms; the rest only when asked
      const p: Json = { script_id: o.scriptId, mode, visibility: x.visibility ?? 'private', idempotency_key: key('cr') };
      if (x.seats) p.max_players = x.seats;
      if (x.minToStart) p.min_to_start = x.minToStart;
      if (x.name) p.name = x.name;
      if (x.settings) p.settings = x.settings;
      if (x.botFillAfterMs !== undefined) p.bot_fill_after_ms = x.botFillAfterMs;
      try { const d = await call('rooms.create', p); mark('create', true); return parseMatch(d); }
      catch (e) { if (missing(e)) mark('create', false); throw e; }
    },
    async listOpen() {
      try {
        const d = await call('rooms.list_open', { script_id: o.scriptId, mode, limit: 20 });
        mark('listOpen', true);
        const list = (Array.isArray(d.matches) ? d.matches : Array.isArray(d.rooms) ? d.rooms : Array.isArray(d.items) ? d.items : []) as Json[];
        return list.map((r) => ({
          roomId: str(r.room_id), ...((str(r.invite_code) || str(r.join_code) || str(r.code)) ? { code: str(r.invite_code) || str(r.join_code) || str(r.code) } : {}), ...(str(r.match_id) ? { matchId: str(r.match_id) } : {}), ...(str(r.name) ? { name: str(r.name) } : {}),
          seatsTaken: num(r.seats_taken, 1), seatsNeeded: num(r.seats_needed, num(r.max_players, 2)),
          ...(str(r.status) ? { status: str(r.status) } : {}), ...(typeof r.countdown_ends_at_ms === 'number' ? { countdownEndsAtMs: r.countdown_ends_at_ms } : {}),
          ...(str(r.host_display_name) ? { hostName: str(r.host_display_name) } : {}), ...(str(r.mode) ? { mode: str(r.mode) } : {}),
        }));
      } catch (e) { if (missing(e)) mark('listOpen', false); throw e; }
    },
    async joinByCode(text) {
      const v = parseInvite(text);
      // shipped contract: { invite_code } (a link carries it as ?invite=)
      if (!v.code) throw new NetplayError('server', 'bad_code');
      const p: Json = { invite_code: v.code };
      try { const d = await call('rooms.join_by_code', p); mark('joinByCode', true); return parseMatch(d); }
      catch (e) { if (missing(e)) mark('joinByCode', false); throw e; }
    },
    async joinRoom(r) {
      if (r.code) return api.joinByCode(r.code);
      try { return parseMatch(await call('rooms.join', { script_id: o.scriptId, room_id: r.roomId, idempotency_key: key('jr') })); }
      catch (e) { if (missing(e) && r.code) return api.joinByCode(r.code); throw e; }
    },
    support: () => {
      const out = { ...sup };
      for (const k of ['create', 'listOpen', 'joinByCode'] as const) if (out[k] === false && Date.now() - (supAt[k] ?? 0) > reprobeMs) out[k] = null;
      return out;
    },
  };
  return api;
}

/**
 * The match the quick-play screen is opening right now. `mountQuickPlay` sets it just before `connect(m)`, so a game's
 * existing `transportFor(params, user)` can return `activeMatchTransport(user)` for `net=qm` without new plumbing.
 */
let active: { m: QuickMatch; rooms: RoomsApi } | null = null;
export function setActiveMatch(m: QuickMatch | null, rooms?: RoomsApi): void { active = m && rooms ? { m, rooms } : null; }
export function activeMatch(): QuickMatch | null { return active?.m ?? null; }
export function activeMatchTransport(self: string, o: Partial<Omit<RelayOptions, 'self' | 'host' | 'url'>> = {}): Transport {
  const a = active;
  if (!a) throw new Error('net=qm: no quick match is open (use the quick-play screen)');
  return relayTransport({ ...o, self, host: a.m.seat === 0, url: () => a.rooms.wsUrl(a.m) });
}
