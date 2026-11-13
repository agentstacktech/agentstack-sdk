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

export interface QuickMatch {
  readonly matchId: string;
  readonly roomId: string;
  readonly seat: number;
  readonly status: string;
  readonly seatsTaken: number;
  readonly seatsNeeded: number;
  /** `/play?match=…&invite=…` from the server: share it to bring a friend into this match. */
  readonly inviteLink?: string;
  readonly invite?: string;
  readonly code?: string;
}
export interface OpenRoom { readonly roomId: string; readonly code?: string; readonly name?: string; readonly seatsTaken: number; readonly seatsNeeded: number }

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
}

export interface RoomsApi {
  quickMatch(o?: { match?: string; invite?: string }): Promise<QuickMatch>;
  status(m: QuickMatch): Promise<QuickMatch>;
  leave(m: QuickMatch): Promise<void>;
  /** Fresh relay URL with a short-lived ticket. Never log or display it. */
  wsUrl(m: QuickMatch): Promise<string>;
  create(o?: { name?: string; seats?: number }): Promise<QuickMatch>;
  listOpen(): Promise<OpenRoom[]>;
  joinByCode(code: string): Promise<QuickMatch>;
  /** Which lobby actions the server has (probed once by `listOpen`, cached). */
  support(): { create: boolean | null; listOpen: boolean | null; joinByCode: boolean | null };
}

type Json = Record<string, unknown>;
const obj = (v: unknown): Json | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : null);
const str = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');
const num = (v: unknown, d = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);

function parseMatch(d: Json, prev?: QuickMatch): QuickMatch {
  const link = str(d.invite_link) || prev?.inviteLink || '';
  const inv = /[?&]invite=([^&]+)/.exec(link)?.[1];
  return {
    matchId: str(d.match_id) || prev?.matchId || '',
    roomId: str(d.room_id) || prev?.roomId || '',
    seat: typeof d.seat === 'number' ? d.seat : prev?.seat ?? -1,
    status: str(d.status) || str(d.match_status) || prev?.status || 'waiting',
    seatsTaken: num(d.seats_taken, prev?.seatsTaken ?? 1),
    seatsNeeded: num(d.seats_needed, prev?.seatsNeeded ?? 2),
    ...(link ? { inviteLink: link } : {}),
    ...(inv ? { invite: decodeURIComponent(inv) } : {}),
    ...(str(d.code) ? { code: str(d.code) } : prev?.code ? { code: prev.code } : {}),
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
  async function call(action: string, params: Json): Promise<Json> {
    const h: Record<string, string> = { 'content-type': 'application/json', accept: 'application/json', 'x-project-id': String(o.projectId) };
    const t = o.token?.();
    if (t) h.authorization = `Bearer ${t}`;
    const body = JSON.stringify({ jsonrpc: '2.0', id: ++id, method: 'tools/call', params: { name: 'agentstack.execute', arguments: {
      action, params: { project_id: o.projectId, ...params }, context: { project_id: o.projectId }, options: { execution_intent: 'direct' },
    } } });
    const signal = typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? AbortSignal.timeout(o.timeoutMs ?? 15_000) : undefined;
    let r: Response;
    try { r = await f(`${base}/s/${o.projectId}/mcp`, { method: 'POST', credentials: 'include', headers: h, body, ...(signal ? { signal } : {}) }); }
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
    const code = typeof err === 'string' ? err : str(obj(err)?.code) || str(p.error_code);
    if (!r.ok || p.ok === false || code) throw new NetplayError(errorKind(code || `http_${r.status}`, r.status), code || `http_${r.status}`, str(obj(err)?.message));
    return obj(p.data) ?? p;
  }
  const key = (k: string) => `${k}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const missing = (e: unknown) => e instanceof NetplayError && e.code === 'action_not_found';
  return {
    async quickMatch(x = {}) {
      return parseMatch(await call('rooms.quick_match', { script_id: o.scriptId, mode, idempotency_key: key('qm'), ...(x.match ? { match_id: x.match } : {}), ...(x.invite ? { invite: x.invite } : {}) }));
    },
    async status(m) { return parseMatch(await call('rooms.match_status', { script_id: o.scriptId, match_id: m.matchId }), m); },
    async leave(m) { try { await call('rooms.leave', { script_id: o.scriptId, match_id: m.matchId }); } catch { /* best effort */ } },
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
      try { const d = await call('rooms.create', { script_id: o.scriptId, mode, idempotency_key: key('cr'), ...x }); mark('create', true); return parseMatch(d); }
      catch (e) { if (missing(e)) mark('create', false); throw e; }
    },
    async listOpen() {
      try {
        const d = await call('rooms.list_open', { script_id: o.scriptId, mode });
        mark('listOpen', true);
        const list = (Array.isArray(d.rooms) ? d.rooms : Array.isArray(d.items) ? d.items : []) as Json[];
        return list.map((r) => ({ roomId: str(r.room_id), ...(str(r.code) ? { code: str(r.code) } : {}), ...(str(r.name) ? { name: str(r.name) } : {}), seatsTaken: num(r.seats_taken, 1), seatsNeeded: num(r.seats_needed, 2) }));
      } catch (e) { if (missing(e)) mark('listOpen', false); throw e; }
    },
    async joinByCode(code) {
      try { const d = await call('rooms.join_by_code', { script_id: o.scriptId, code: code.trim().toUpperCase() }); mark('joinByCode', true); return parseMatch(d); }
      catch (e) { if (missing(e)) mark('joinByCode', false); throw e; }
    },
    support: () => {
      const out = { ...sup };
      for (const k of ['create', 'listOpen', 'joinByCode'] as const) if (out[k] === false && Date.now() - (supAt[k] ?? 0) > reprobeMs) out[k] = null;
      return out;
    },
  };
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
