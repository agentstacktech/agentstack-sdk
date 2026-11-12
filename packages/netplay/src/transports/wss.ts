/**
 * Push transport over a WebSocket that speaks the netplay room protocol:
 *   client → { op: 'join', room, after } | { op: 'append', body, to? }
 *   server → { op: 'welcome', self } | { op: 'entries', entries: Entry[] } | { op: 'error', message }
 * Use it when the platform room WSS upgrade works; until then use the polling/stackscript transport.
 */
import type { ConnectOptions, Entry, Link, Transport } from '../types.js';

interface WsLike {
  readyState: number;
  send(data: string): void;
  close(): void;
  onopen: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onclose: ((ev: unknown) => void) | null;
  onerror: ((ev: unknown) => void) | null;
}

export interface WssOptions {
  /** Room URL builder, e.g. (room) => `wss://host/api/stream-relay/ws/rooms/${room}?ticket=…`. */
  url: (room: string) => string | Promise<string>;
  /** WebSocket constructor (defaults to globalThis.WebSocket). */
  WebSocket?: new (url: string) => WsLike;
  privateEntries?: boolean;
  /** ms to wait for `welcome`. Default 8000. */
  timeoutMs?: number;
}

export function wssTransport(o: WssOptions): Transport {
  return {
    caps: { privateEntries: o.privateEntries ?? true, kind: 'wss' },
    async connect(room: string, opts: ConnectOptions): Promise<Link> {
      const Ctor = o.WebSocket ?? (globalThis as unknown as { WebSocket?: new (u: string) => WsLike }).WebSocket;
      if (!Ctor) throw new Error('wss: no WebSocket available');
      const ws = new Ctor(await o.url(room));
      let cursor = opts.afterSeq;
      let closed = false;
      const self = await new Promise<string>((resolve, reject) => {
        const to = setTimeout(() => { reject(new Error('wss: welcome timeout')); ws.close(); }, o.timeoutMs ?? 8000);
        ws.onopen = () => ws.send(JSON.stringify({ op: 'join', room, after: cursor }));
        ws.onerror = () => { clearTimeout(to); reject(new Error('wss: connection error')); };
        ws.onclose = () => { clearTimeout(to); reject(new Error('wss: closed before welcome')); };
        ws.onmessage = (ev) => {
          const msg = JSON.parse(String(ev.data)) as { op: string; self?: string; entries?: Entry[]; message?: string };
          if (msg.op === 'welcome') { clearTimeout(to); resolve(String(msg.self)); }
          else if (msg.op === 'error') { clearTimeout(to); reject(new Error(`wss: ${msg.message}`)); }
          else if (msg.op === 'entries' && msg.entries) {
            const fresh = msg.entries.filter((e) => e.seq > cursor);
            if (fresh.length) { cursor = fresh[fresh.length - 1]!.seq; opts.onEntries(fresh); }
          }
        };
      });
      ws.onclose = () => { if (!closed) opts.onStatus?.('offline', 'socket closed'); closed = true; };
      ws.onerror = () => opts.onStatus?.('reconnecting', 'socket error');
      return {
        self,
        async send(body, to) {
          if (closed || ws.readyState !== 1) throw new Error('wss: not open');
          ws.send(JSON.stringify({ op: 'append', body, ...(to ? { to } : {}) }));
        },
        close() { closed = true; ws.close(); },
      };
    },
  };
}
