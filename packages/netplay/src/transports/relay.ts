/**
 * Room log over the AgentStack stream relay (`stream.relay.ws_ticket` → `wss://…/api/stream-relay/ws/rooms/{room}`)
 * for rooms made by `rooms.quick_match` — no room script needed.
 *
 * The relay only fans out raw payloads (`{type:'broadcast', payload}`): no server order, no sender, and (13.11.2026)
 * every frame can arrive thousands of times, own frames included. So this transport builds the room log itself:
 *   - the **sequencer** (seat 0 of the quick match, `host: true`) numbers every entry (`g`) and broadcasts them;
 *   - everybody else **proposes** entries (`{s: sender, q: own counter}`) and re-sends them until they come back numbered;
 *   - every frame carries our envelope `{np:1, s: sender, …}`: own echoes are dropped, byte-identical copies are
 *     dropped before JSON.parse, entries are accepted once by `g`, proposals once by (sender, q);
 *   - at most `drainPerTick` frames are handled per tick and at most `maxQueue` wait (the rest are dropped — they are
 *     copies; a real gap is healed by `hello` → the sequencer re-sends the log after the gap).
 * Private entries (`to`) are filtered on the client (the relay is public): fine for 1v1 duels, not anti-cheat.
 * The sequencer keeps the log in memory: if it reloads, the room cannot be resumed (start a new quick match).
 *
 *   const t = relayTransport({ self: me.id, host: match.seat === 0, url: () => rooms.wsUrl(match.roomId, match.matchId) });
 *   createSession(game, { transport: t, room: match.roomId, name: me.name });
 */
import type { Body, ConnectOptions, Entry, Link, Transport } from '../types.js';

interface WsLike {
  readyState: number;
  send(data: string): void;
  close(): void;
  onopen: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onclose: ((ev: unknown) => void) | null;
  onerror: ((ev: unknown) => void) | null;
}

export interface RelayOptions {
  /** Fresh connect URL (the ws ticket lives ~60 s): called on every connect. Never log it. */
  url: () => string | Promise<string>;
  /** This member's stable id (the same one the session / lobby use). */
  self: string;
  /** true on the sequencer (quick match seat 0). Exactly one member of a room must be the sequencer. */
  host: boolean;
  WebSocket?: new (url: string) => WsLike;
  /** Frames handled per tick. Default 256. */
  drainPerTick?: number;
  /** Max frames waiting; extra ones are dropped (copies). Default 4000. */
  maxQueue?: number;
  /** Tick (ms): batching + draining. Default 16. */
  tickMs?: number;
  /** Re-send un-numbered proposals / ask for a gap after this long (ms). Default 1200. */
  resendMs?: number;
  /** Give up waiting for the relay's `connected` frame (ms). Default 8000. */
  timeoutMs?: number;
  /** Clock for entry timestamps on the sequencer. Default Date.now. */
  now?: () => number;
  onStats?: (s: RelayStats) => void;
}

export interface RelayStats {
  received: number;
  copies: number;
  echoes: number;
  dropped: number;
  accepted: number;
  resent: number;
  queue: number;
}

/** Wire (inside the relay payload). Short keys: these frames are copied a lot. */
type Wire =
  | { np: 1; k: 'p'; s: string; ps: { q: number; b: Body; to?: string }[] }
  | { np: 1; k: 'e'; s: string; es: WEntry[] }
  | { np: 1; k: 'h'; s: string; a: number };
interface WEntry { g: number; f: string; t: number; b: Body; to?: string; q?: number }

const RAW_MEMO = 512;
const CHUNK = 40;

export function relayTransport(o: RelayOptions): Transport {
  const stats: RelayStats = { received: 0, copies: 0, echoes: 0, dropped: 0, accepted: 0, resent: 0, queue: 0 };
  const now = o.now ?? (() => Date.now());
  // sequencer state survives reconnects of the same page (not reloads)
  const log: WEntry[] = [];
  const lastQ = new Map<string, number>();
  let myQ = 0;
  const pending: { q: number; b: Body; to?: string; at: number }[] = [];
  return {
    caps: { privateEntries: true, kind: 'relay' },
    stats: () => ({ ...stats }),
    async connect(room: string, opts: ConnectOptions): Promise<Link> {
      const Ctor = o.WebSocket ?? (globalThis as unknown as { WebSocket?: new (u: string) => WsLike }).WebSocket;
      if (!Ctor) throw new Error('relay: no WebSocket available');
      const ws = new Ctor(await o.url());
      let cursor = opts.afterSeq;
      let closed = false;
      let ready = false;
      const queue: string[] = [];
      const seenRaw = new Set<string>();
      const ahead = new Map<number, WEntry>();
      let gapSince = 0;
      let lastHello = 0;
      let outE: WEntry[] = [];
      const mine: WEntry[] = [];
      const put = (w: Wire) => { if (!closed && ws.readyState === 1) ws.send(JSON.stringify({ type: 'broadcast', payload: w, exclude_self: true, qos: 'reliable' })); };
      const deliver = (list: WEntry[]) => {
        const out: Entry[] = [];
        for (const e of list) {
          if (e.g <= cursor) continue;
          cursor = e.g;
          stats.accepted++;
          if (e.f === o.self && typeof e.q === 'number') { while (pending.length && pending[0]!.q <= e.q) pending.shift(); }
          if (e.to !== undefined && e.to !== o.self && e.f !== o.self) continue; // private, not for us
          out.push({ seq: e.g, from: e.f, t: e.t, body: e.b, ...(e.to !== undefined ? { to: e.to } : {}) });
        }
        if (out.length) opts.onEntries(out);
      };
      const sequence = (from: string, b: Body, to?: string, q?: number) => {
        const e: WEntry = { g: log.length + 1, f: from, t: now(), b, ...(to !== undefined ? { to } : {}), ...(q !== undefined ? { q } : {}) };
        log.push(e);
        outE.push(e);
        mine.push(e); // delivered on the next tick, never inside send()
      };
      const handle = (raw: string) => {
        let w: Wire;
        try { w = JSON.parse(raw) as Wire; } catch { return; }
        if (!w || w.np !== 1 || typeof w.s !== 'string') return;
        if (w.s === o.self) { stats.echoes++; return; }
        if (o.host) {
          if (w.k === 'p') {
            for (const p of w.ps ?? []) {
              const last = lastQ.get(w.s) ?? 0;
              if (p.q !== last + 1) continue; // copy (≤ last) or gap (the sender re-sends in order)
              lastQ.set(w.s, p.q);
              sequence(w.s, p.b, p.to, p.q);
            }
          } else if (w.k === 'h') {
            const after = Math.max(0, Number(w.a) | 0);
            for (let i = after; i < log.length; i += CHUNK) put({ np: 1, k: 'e', s: o.self, es: log.slice(i, i + CHUNK) });
            if (after >= log.length) put({ np: 1, k: 'e', s: o.self, es: [] });
          }
          return;
        }
        if (w.k === 'e') {
          for (const e of w.es ?? []) if (e && e.g > cursor && !ahead.has(e.g)) ahead.set(e.g, e);
          const run: WEntry[] = [];
          while (ahead.has(cursor + 1 + run.length)) { const n = cursor + 1 + run.length; run.push(ahead.get(n)!); }
          for (const e of run) ahead.delete(e.g);
          for (const g of [...ahead.keys()]) if (g <= cursor + run.length) ahead.delete(g);
          deliver(run);
          gapSince = ahead.size ? gapSince || now() : 0;
        }
      };
      const tick = () => {
        if (closed) return;
        const n = Math.min(queue.length, o.drainPerTick ?? 256);
        for (let i = 0; i < n; i++) handle(queue.shift()!);
        stats.queue = queue.length;
        const t = now();
        const wait = o.resendMs ?? 1200;
        if (o.host) {
          if (mine.length) deliver(mine.splice(0));
          if (outE.length) { for (let i = 0; i < outE.length; i += CHUNK) put({ np: 1, k: 'e', s: o.self, es: outE.slice(i, i + CHUNK) }); outE = []; }
        } else {
          const fresh = pending.filter((p) => p.at === 0);
          const stale = pending.length && pending[0]!.at && t - pending[0]!.at > wait;
          if (fresh.length && !stale) { put({ np: 1, k: 'p', s: o.self, ps: fresh.map(({ q, b, to }) => ({ q, b, ...(to !== undefined ? { to } : {}) })) }); for (const p of fresh) p.at = t; }
          else if (stale) {
            // in order from the oldest un-numbered one: the sequencer accepts only lastQ + 1
            for (let i = 0; i < pending.length; i += CHUNK) put({ np: 1, k: 'p', s: o.self, ps: pending.slice(i, i + CHUNK).map(({ q, b, to }) => ({ q, b, ...(to !== undefined ? { to } : {}) })) });
            for (const p of pending) p.at = t;
            stats.resent++;
          }
          if (((gapSince && t - gapSince > wait) || cursor === 0) && t - lastHello > wait) { lastHello = t; put({ np: 1, k: 'h', s: o.self, a: cursor }); }
        }
        o.onStats?.(stats);
      };
      let timer: ReturnType<typeof setInterval> | null = null;
      let ping: ReturnType<typeof setInterval> | null = null;
      await new Promise<void>((resolve, reject) => {
        const to = setTimeout(() => { if (!ready) { reject(new Error('relay: connect timeout')); ws.close(); } }, o.timeoutMs ?? 8000);
        const go = () => { if (ready) return; ready = true; clearTimeout(to); resolve(); };
        ws.onopen = () => { /* the relay greets with {type:'connected'} */ };
        ws.onerror = () => { if (!ready) { clearTimeout(to); reject(new Error('relay: connection error')); } else opts.onStatus?.('reconnecting', 'socket error'); };
        ws.onclose = () => {
          if (!ready) { clearTimeout(to); reject(new Error('relay: closed before connected')); return; }
          if (!closed) opts.onStatus?.('offline', 'socket closed');
          closed = true;
          if (timer) clearInterval(timer);
          if (ping) clearInterval(ping);
        };
        ws.onmessage = (ev) => {
          const raw = typeof ev.data === 'string' ? ev.data : String(ev.data);
          stats.received++;
          if (!ready) { if (raw.includes('"connected"')) go(); }
          if (!raw.includes('"np":1') && !raw.includes('"np": 1')) return; // presence / state / pong spam: ignore cheaply
          if (seenRaw.has(raw)) { stats.copies++; return; }
          seenRaw.add(raw);
          if (seenRaw.size > RAW_MEMO) seenRaw.delete(seenRaw.values().next().value as string);
          if (queue.length >= (o.maxQueue ?? 4000)) { stats.dropped++; return; }
          queue.push(raw);
        };
      });
      timer = setInterval(tick, o.tickMs ?? 16);
      ping = setInterval(() => { if (!closed && ws.readyState === 1) ws.send('{"type":"ping"}'); }, 20_000);
      opts.onStatus?.('online');
      if (!o.host) { lastHello = now(); put({ np: 1, k: 'h', s: o.self, a: cursor }); for (const p of pending) p.at = 0; }
      return {
        self: o.self,
        async send(body: Body, to?: string) {
          if (closed) throw new Error('relay: not open');
          if (o.host) sequence(o.self, body, to);
          else pending.push({ q: ++myQ, b: body, ...(to !== undefined ? { to } : {}), at: 0 });
        },
        close() { closed = true; if (timer) clearInterval(timer); if (ping) clearInterval(ping); try { ws.close(); } catch { /* already closed */ } },
      };
    },
  } as Transport & { stats(): RelayStats };
}
