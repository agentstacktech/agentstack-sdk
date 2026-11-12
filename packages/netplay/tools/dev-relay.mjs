#!/usr/bin/env node
/**
 * DEV ONLY — tiny LAN room relay for @agentstack/netplay (`devRelayTransport` on the client).
 * No auth (the client names itself), no persistence (memory), no rate limits beyond size caps.
 * NEVER deploy this or expose it to the internet; production uses the AgentStack room script.
 *
 *   node tools/dev-relay.mjs                 # 127.0.0.1:8787 (this machine only)
 *   node tools/dev-relay.mjs --lan           # 0.0.0.0:8787  (phones / laptops on the same Wi-Fi)
 *   node tools/dev-relay.mjs --port 9000
 *
 * HTTP API (JSON, CORS *): POST /join {room,user} → {self}; POST /append {room,from,body,to?} → {seq};
 * GET /poll?room=&after=&as= → Entry[] visible to `as` (private `to` entries enforced); GET /health.
 */
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { pathToFileURL } from 'node:url';

const MAX_BODY = 64 * 1024, MAX_ROOMS = 500, MAX_LOG = 50_000, ID = /^[A-Za-z0-9._:-]{1,80}$/;

/** Start the relay; resolves with { port, url, close() }. */
export function startDevRelay({ port = 8787, host = '127.0.0.1', quiet = false } = {}) {
  const rooms = new Map(); // room → Entry[]
  const log = (...a) => { if (!quiet) console.log('[dev-relay]', ...a); };
  const send = (res, code, data) => {
    res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'cache-control': 'no-store' });
    res.end(JSON.stringify(data));
  };
  const readJson = (req) => new Promise((ok, bad) => {
    let n = 0; const parts = [];
    req.on('data', (c) => { n += c.length; if (n > MAX_BODY) { bad(new Error('body too large')); req.destroy(); } else parts.push(c); });
    req.on('end', () => { try { ok(JSON.parse(Buffer.concat(parts).toString('utf8') || '{}')); } catch { bad(new Error('bad json')); } });
    req.on('error', bad);
  });
  const roomLog = (room, create) => {
    if (!ID.test(String(room))) throw new Error('bad room');
    let l = rooms.get(room);
    if (!l && create) { if (rooms.size >= MAX_ROOMS) throw new Error('too many rooms'); l = []; rooms.set(room, l); }
    return l ?? [];
  };
  const server = createServer(async (req, res) => {
    try {
      if (req.method === 'OPTIONS') return send(res, 204, {});
      const u = new URL(req.url ?? '/', 'http://relay');
      if (req.method === 'GET' && u.pathname === '/health') return send(res, 200, { ok: true, devOnly: true, rooms: rooms.size });
      if (req.method === 'GET' && u.pathname === '/poll') {
        const room = u.searchParams.get('room'), as = u.searchParams.get('as') ?? '', after = Number(u.searchParams.get('after') ?? 0) | 0;
        const l = roomLog(room, false);
        return send(res, 200, l.slice(Math.max(0, after)).filter((e) => e.to === undefined || e.to === as || e.from === as));
      }
      if (req.method === 'POST' && u.pathname === '/join') {
        const b = await readJson(req);
        roomLog(b.room, true);
        const self = ID.test(String(b.user ?? '')) ? b.user : 'u' + Math.random().toString(36).slice(2, 10);
        log('join', b.room, self);
        return send(res, 200, { self });
      }
      if (req.method === 'POST' && u.pathname === '/append') {
        const b = await readJson(req);
        const l = roomLog(b.room, true);
        if (!ID.test(String(b.from ?? ''))) throw new Error('bad from');
        if (l.length >= MAX_LOG) throw new Error('room log full');
        const e = { seq: l.length + 1, from: b.from, t: Date.now(), body: b.body ?? null, ...(b.to ? { to: String(b.to) } : {}) };
        l.push(e);
        return send(res, 200, { seq: e.seq });
      }
      send(res, 404, { error: 'not found' });
    } catch (err) {
      send(res, 400, { error: String(err?.message ?? err) });
    }
  });
  return new Promise((ok, bad) => {
    server.once('error', bad);
    server.listen(port, host, () => {
      const p = server.address().port;
      ok({ port: p, url: `http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${p}`, close: () => new Promise((r) => server.close(() => r())), rooms });
    });
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const a = process.argv.slice(2);
  const lan = a.includes('--lan');
  const pi = a.indexOf('--port');
  const port = pi >= 0 ? Number(a[pi + 1]) : 8787;
  const r = await startDevRelay({ port, host: lan ? '0.0.0.0' : '127.0.0.1' });
  console.log(`\n  netplay DEV relay — DEV ONLY: no auth, no persistence, never expose to the internet\n  local: http://127.0.0.1:${r.port}`);
  if (lan) for (const list of Object.values(networkInterfaces())) for (const i of list ?? []) if (i.family === 'IPv4' && !i.internal) console.log(`  LAN:   http://${i.address}:${r.port}`);
  console.log(`  open a game with  ?net=dev&relay=<one of the URLs above>   (both devices)\n`);
}
