/**
 * DEV ONLY transport: two browser windows / devices on one LAN play through `tools/dev-relay.mjs`
 * (`node tools/dev-relay.mjs --lan`). No auth — the client names itself. Not for production:
 * production uses `stackscriptTransport` with the published room script.
 *
 *   const transport = devRelayTransport('http://192.168.1.20:8787', 'ana');
 */
import { pollingTransport, type PollingOptions, type RoomApi } from './polling.js';
import type { Entry, Transport } from '../types.js';

export function devRelayRoomApi(baseUrl: string, user: string, fetchImpl: typeof fetch = (...a) => fetch(...a)): RoomApi {
  const base = baseUrl.replace(/\/+$/, '');
  let self = user;
  const call = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const r = await fetchImpl(base + path, init);
    const j = (await r.json()) as T & { error?: string };
    if (!r.ok) throw new Error(`dev-relay ${path.split('?')[0]}: ${j.error ?? r.status}`);
    return j;
  };
  const post = <T>(path: string, body: unknown) => call<T>(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return {
    privateEntries: true,
    kind: 'dev-relay',
    async join(room) { self = (await post<{ self: string }>('/join', { room, user })).self; return { self }; },
    async append(room, body, to) { await post('/append', { room, from: self, body, ...(to ? { to } : {}) }); },
    poll: (room, afterSeq) => call<Entry[]>(`/poll?room=${encodeURIComponent(room)}&after=${afterSeq}&as=${encodeURIComponent(self)}`),
  };
}

/** Polling transport over the dev relay (default poll 150 ms — it is a LAN). */
export function devRelayTransport(baseUrl: string, user: string, o: PollingOptions = {}): Transport {
  return pollingTransport(devRelayRoomApi(baseUrl, user), { intervalMs: 150, ...o });
}
