import { getRelayWsUrl } from '../getRelayWsUrl';

describe('getRelayWsUrl', () => {
  it('mints ticket and builds wss room URL', async () => {
    const http = {
      getApiOrigin: () => 'https://api.example.com',
      post: jest.fn().mockResolvedValue({
        ok: true,
        token: 'tok',
        room_id: 'room-a',
        project_id: 2041,
        expires_in_seconds: 60,
      }),
    };
    const out = await getRelayWsUrl(http as never, {
      roomId: 'room-a',
      projectId: 2041,
    });
    expect(out.ticket.token).toBe('tok');
    expect(out.url).toBe(
      'wss://api.example.com/api/stream-relay/ws/rooms/room-a?token=tok',
    );
  });
});
