import { expect, it } from 'vitest';
import { hostedRooms, NetplayError } from '../src/index.js';

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
