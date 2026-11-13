import { expect, it } from 'vitest';
import { countdownLeftMs, hostedRooms, NetplayError, parseInvite, parseMatch } from '../src/index.js';

const reply = (inner: unknown) => new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: JSON.stringify(inner) }] } }), { status: 200 });
it('parses the hosted quick_match reply (guest shape, 13.11) and marks missing lobby actions as unsupported', async () => {
  const calls: string[] = [];
  const f = (async (_u: string, init: RequestInit) => {
    const a = JSON.parse(String(init.body)).params.arguments;
    calls.push(a.action);
    if (a.action === 'rooms.quick_match') return reply({ data: { ok: true, data: { match_id: 'qm_1', room_id: 'qm:s:1v1:qm_1', seat: 1, status: 'started', seats_taken: 2, seats_needed: 2, invite_link: '/play?match=qm_1&invite=ab12' } } });
    if (a.action === 'stream.relay.ws_ticket') return reply({ data: { ok: true, data: { ws_connect_url: 'wss://x/api/stream-relay/ws/rooms/r?token=T' } } });
    return reply({ ok: false, error: { code: 'action_not_found', message: 'nope' } });
  }) as unknown as typeof fetch;
  const r = hostedRooms({ projectId: 2141, scriptId: 'serpent-coop-room', fetch: f, session: false });
  const m = await r.quickMatch();
  expect(m).toMatchObject({ matchId: 'qm_1', roomId: 'qm:s:1v1:qm_1', seat: 1, status: 'started', seatsTaken: 2, seatsNeeded: 2, invite: 'ab12' });
  expect(await r.wsUrl(m)).toContain('token=');
  await expect(r.listOpen()).rejects.toBeInstanceOf(NetplayError);
  await expect(r.joinByCode('k7mq2x')).rejects.toMatchObject({ code: 'action_not_found' });
  expect(r.support()).toEqual({ create: null, listOpen: false, joinByCode: false });
  expect(calls).toEqual(['rooms.quick_match', 'stream.relay.ws_ticket', 'rooms.list_open', 'rooms.join_by_code']);
});

it('wave 2: create(visibility) / list_open / join_by_code (code + invite link) / join from list, room snapshot + server countdown', async () => {
  const seen: { action: string; p: Record<string, unknown> }[] = [];
  const room = (x: Record<string, unknown>) => ({ room_id: 'r:K7QM2X', match_id: 'm_1', visibility: 'private', invite_code: 'f0c91d3db25e', invite_link: '/play?match=m_1&invite=zz', status: 'open', min_players: 2, max_players: 2, seats_taken: 1, host_user_id: 'u1', players: [{ seat: 0, user_id: 'u1', display_name: 'Алекс', is_host: true }], countdown_ends_at_ms: null, version: 3, server_now_ms: 1_000_000, ...x });
  const f = (async (_u: string, init: RequestInit) => {
    const a = JSON.parse(String(init.body)).params.arguments;
    seen.push({ action: a.action, p: a.params });
    if (a.action === 'rooms.create') return a.params.visibility === 'public' ? reply({ ok: false, error: { code: 'auth_required_to_host' } }) : reply({ data: { ok: true, data: { room: room({}), seat: 0 } } });
    if (a.action === 'rooms.list_open') return reply({ data: { ok: true, data: { matches: [{ match_id: 'm_p', room_id: 'r:PUB', seats_needed: 2, seats_taken: 1, invite_code: 'aa11bb22cc33' }], count: 1 } } });
    if (a.action === 'rooms.join_by_code') return a.params.invite_code === 'bad000' ? reply({ data: { ok: false, error_code: 'invite_not_found', error: 'unknown invite code' } }) : reply({ data: { ok: true, data: { room: room({ status: 'countdown', seats_taken: 2, countdown_ends_at_ms: 1_003_000 }), seat: 1 } } });
    if (a.action === 'rooms.join') return reply({ ok: false, error: { code: 'action_not_found' } });
    return reply({ ok: false, error: { code: 'action_not_found' } });
  }) as unknown as typeof fetch;
  const r = hostedRooms({ projectId: 2152, scriptId: 'stones-duel-room', fetch: f, session: false });
  const m = await r.create({ visibility: 'private' });
  expect(m).toMatchObject({ code: 'f0c91d3db25e', visibility: 'private', seat: 0, hostUserId: 'u1', seatsNeeded: 2, countdownEndsAtMs: null, version: 3 });
  expect(m.players?.[0]).toMatchObject({ name: 'Алекс', isHost: true });
  await expect(r.create({ visibility: 'public' })).rejects.toMatchObject({ kind: 'auth', code: 'auth_required_to_host' });
  const list = await r.listOpen();
  expect(list[0]).toMatchObject({ roomId: 'r:PUB', matchId: 'm_p', seatsNeeded: 2, code: 'aa11bb22cc33' });
  const j = await r.joinByCode(' F0C91D3DB25E ');
  expect(j).toMatchObject({ seat: 1, status: 'countdown', seatsTaken: 2 });
  const left = countdownLeftMs(j, 1_000_500 + (j.clockSkewMs ?? 0));
  expect(left).toBe(2500);
  await r.joinByCode('https://agentstack.tech/s/2152/kamni/?mp=qm&match=m_1&invite=zz');
  await expect(r.joinByCode('BAD000')).rejects.toMatchObject({ kind: 'server', code: 'invite_not_found' });
  await expect(r.joinRoom({ roomId: 'r:PUB', seatsTaken: 1, seatsNeeded: 2 })).rejects.toMatchObject({ code: 'action_not_found' });
  await r.joinRoom({ roomId: 'r:PUB', code: 'aa11bb22cc33', seatsTaken: 1, seatsNeeded: 2 });
  const p = (a: string) => seen.filter((x) => x.action === a).map((x) => x.p);
  expect(p('rooms.create')[0]).toMatchObject({ visibility: 'private', script_id: 'stones-duel-room', project_id: 2152 });
  expect(p('rooms.join_by_code').map((x) => x.invite_code)).toEqual(['f0c91d3db25e', 'zz', 'bad000', 'aa11bb22cc33']);
  expect(Object.keys(p('rooms.join_by_code')[0]!).sort()).toEqual(['invite_code', 'project_id']);
  expect(r.support()).toMatchObject({ create: true, listOpen: true, joinByCode: true });
});

it('parseInvite: link, ?code=, bare code', () => {
  expect(parseInvite('https://x/s/1/?match=m%201&invite=ab')).toMatchObject({ match: 'm 1', invite: 'ab' });
  expect(parseInvite('?code=F0C91D3DB25E')).toEqual({ code: 'f0c91d3db25e' });
  expect(parseInvite(' f0c9 1d3d b25e ')).toEqual({ code: 'f0c91d3db25e' });
  expect(parseInvite('/play?match=m&invite=ab12')).toMatchObject({ match: 'm', code: 'ab12' });
});

it('parseMatch keeps the old flat quick_match shape', () => {
  const m = parseMatch({ match_id: 'qm_1', room_id: 'qm:s:1v1:qm_1', seat: 0, status: 'waiting', seats_taken: 1, seats_needed: 2 });
  expect(m).toMatchObject({ matchId: 'qm_1', seat: 0, status: 'waiting', seatsNeeded: 2, clockSkewMs: 0 });
  expect(countdownLeftMs(m)).toBeNull();
});

it('mints a guest hosted session on auth_required (never before), re-mints on auth_required, retries server_busy', async () => {
  const log: string[] = [];
  let mcpN = 0;
  const f = (async (u: string, init: RequestInit) => {
    if (u.endsWith('/api/hosted-apps/2141/session')) { log.push('session:' + String(init.body)); return new Response('{}', { status: 200 }); }
    const a = JSON.parse(String(init.body)).params.arguments; log.push(a.action);
    mcpN++;
    if (mcpN === 1) return new Response(JSON.stringify({ code: 'auth_required', message: 'x' }), { status: 200 });
    if (mcpN === 2) return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code: -32603, message: 'server_busy', data: { code: 'server_busy', retryable: true } } }), { status: 200 });
    return reply({ data: { ok: true, data: { match_id: 'qm_9', room_id: 'r9', seat: 1, status: 'started' } } });
  }) as unknown as typeof fetch;
  const r = hostedRooms({ projectId: 2141, scriptId: 's', fetch: f });
  const m = await r.quickMatch();
  expect(m.matchId).toBe('qm_9');
  expect(log).toEqual(['rooms.quick_match', 'session:{"guest":true}', 'rooms.quick_match', 'rooms.quick_match']);
});

it('sends X-CSRF-Token from the csrf_token cookie on the session mint and MCP calls (403 csrf_validation_failed otherwise)', async () => {
  const g = globalThis as unknown as { document?: { cookie: string } };
  const had = g.document; g.document = { cookie: 'a=1; csrf_token=tok%2B1' };
  const seen: string[] = [];
  const f = (async (url: string, init: RequestInit) => {
    const h = init.headers as Record<string, string>;
    seen.push(`${String(url).includes('/session') ? 'session' : 'mcp'}:${h['x-csrf-token'] ?? '-'}`);
    if (String(url).includes('/session')) return new Response('{"ok":true}', { status: 200 });
    if (seen.filter((x) => x.startsWith('mcp')).length === 1) return new Response(JSON.stringify({ error: { code: -32001, message: 'auth_required', data: { code: 'auth_required' } } }), { status: 401 });
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: JSON.stringify({ ok: true, data: { matches: [], count: 0 } }) }] } }), { status: 200 });
  }) as unknown as typeof fetch;
  try {
    const rooms = hostedRooms({ projectId: 7, scriptId: 's', fetch: f });
    await rooms.listOpen?.().catch(() => []);
    expect(seen[0]).toBe('mcp:tok+1');
    expect(seen).toContain('session:tok+1');
  } finally { g.document = had; }
});
