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
  const r = hostedRooms({ projectId: 2141, scriptId: 'serpent-coop-room', fetch: f });
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
  const room = (x: Record<string, unknown>) => ({ room_id: 'r:K7QM2X', match_id: 'm_1', visibility: 'private', code: 'K7QM2X', invite_link: '/play?match=m_1&invite=zz', status: 'open', min_players: 2, max_players: 2, seats_taken: 1, host_user_id: 'u1', players: [{ seat: 0, user_id: 'u1', display_name: 'Алекс', is_host: true }], countdown_ends_at_ms: null, version: 3, server_now_ms: 1_000_000, ...x });
  const f = (async (_u: string, init: RequestInit) => {
    const a = JSON.parse(String(init.body)).params.arguments;
    seen.push({ action: a.action, p: a.params });
    if (a.action === 'rooms.create') return a.params.visibility === 'public' ? reply({ ok: false, error: { code: 'auth_required_to_host' } }) : reply({ data: { ok: true, data: { room: room({}), seat: 0 } } });
    if (a.action === 'rooms.list_open') return reply({ data: { ok: true, data: { rooms: [{ room_id: 'r:PUB', max_players: 2, seats_taken: 1, status: 'open', host_display_name: 'Боб' }] } } });
    if (a.action === 'rooms.join_by_code') return a.params.code === 'BAD000' ? reply({ ok: false, error: { code: 'bad_code' } }) : reply({ data: { ok: true, data: { room: room({ status: 'countdown', seats_taken: 2, countdown_ends_at_ms: 1_003_000 }), seat: 1 } } });
    if (a.action === 'rooms.join') return reply({ ok: false, error: { code: 'action_not_found' } });
    return reply({ ok: false, error: { code: 'action_not_found' } });
  }) as unknown as typeof fetch;
  const r = hostedRooms({ projectId: 2152, scriptId: 'stones-duel-room', fetch: f });
  const m = await r.create({ visibility: 'private' });
  expect(m).toMatchObject({ code: 'K7QM2X', visibility: 'private', seat: 0, hostUserId: 'u1', seatsNeeded: 2, countdownEndsAtMs: null, version: 3 });
  expect(m.players?.[0]).toMatchObject({ name: 'Алекс', isHost: true });
  await expect(r.create({ visibility: 'public' })).rejects.toMatchObject({ kind: 'auth', code: 'auth_required_to_host' });
  const list = await r.listOpen();
  expect(list[0]).toMatchObject({ roomId: 'r:PUB', seatsNeeded: 2, hostName: 'Боб', status: 'open' });
  const j = await r.joinByCode(' k7qm2x ');
  expect(j).toMatchObject({ seat: 1, status: 'countdown', seatsTaken: 2 });
  const left = countdownLeftMs(j, 1_000_500 + (j.clockSkewMs ?? 0));
  expect(left).toBe(2500);
  await r.joinByCode('https://agentstack.tech/s/2152/kamni/?mp=qm&match=m_1&invite=zz');
  await expect(r.joinByCode('BAD000')).rejects.toMatchObject({ kind: 'server', code: 'bad_code' });
  await expect(r.joinRoom({ roomId: 'r:PUB', seatsTaken: 1, seatsNeeded: 2 })).rejects.toMatchObject({ code: 'action_not_found' });
  await r.joinRoom({ roomId: 'r:PUB', code: 'K7QM2X', seatsTaken: 1, seatsNeeded: 2 });
  const p = (a: string) => seen.filter((x) => x.action === a).map((x) => x.p);
  expect(p('rooms.create')[0]).toMatchObject({ visibility: 'private', script_id: 'stones-duel-room', project_id: 2152 });
  expect(p('rooms.join_by_code').map((x) => x.code ?? x.invite_link)).toEqual(['K7QM2X', 'https://agentstack.tech/s/2152/kamni/?mp=qm&match=m_1&invite=zz', 'BAD000', 'K7QM2X']);
  expect(r.support()).toMatchObject({ create: true, listOpen: true, joinByCode: true });
});

it('parseInvite: link, ?code=, bare code', () => {
  expect(parseInvite('https://x/s/1/?match=m%201&invite=ab')).toMatchObject({ match: 'm 1', invite: 'ab' });
  expect(parseInvite('?code=k7qm2x')).toEqual({ code: 'K7QM2X' });
  expect(parseInvite(' k7 qm2x ')).toEqual({ code: 'K7QM2X' });
});

it('parseMatch keeps the old flat quick_match shape', () => {
  const m = parseMatch({ match_id: 'qm_1', room_id: 'qm:s:1v1:qm_1', seat: 0, status: 'waiting', seats_taken: 1, seats_needed: 2 });
  expect(m).toMatchObject({ matchId: 'qm_1', seat: 0, status: 'waiting', seatsNeeded: 2, clockSkewMs: 0 });
  expect(countdownLeftMs(m)).toBeNull();
});
