/**
 * AgentSocial — smoke tests for REST paths (regression guard after refactors).
 */

import { AgentSocial } from '../../src/modules/AgentSocial';
import type { HTTPClient } from '../../src/client/http-client';

describe('AgentSocial', () => {
  let http: jest.Mocked<Pick<HTTPClient, 'get' | 'post' | 'put'>>;
  let social: AgentSocial;

  beforeEach(() => {
    http = {
      get: jest.fn().mockResolvedValue({ data: {} }),
      post: jest.fn().mockResolvedValue({ data: {} }),
      put: jest.fn().mockResolvedValue({ data: {} }),
    };
    social = new AgentSocial(http as unknown as HTTPClient);
  });

  it('chatHistory GETs /api/social/chat/history with params', async () => {
    await social.chatHistory(
      { home_project_id: 1, channel_id: 'c1', since_seq: 5 },
      { skipCache: true }
    );
    expect(http.get).toHaveBeenCalledWith(
      '/api/social/chat/history',
      { home_project_id: 1, channel_id: 'c1', since_seq: 5 },
      { skipCache: true }
    );
  });

  it('channelGet encodes channel id in path', async () => {
    await social.channelGet(2, 'a/b', undefined);
    expect(http.get).toHaveBeenCalledWith(
      '/api/social/channels/2/a%2Fb',
      undefined,
      undefined
    );
  });

  it('friendRequest POSTs /api/social/friends/request', async () => {
    const body = { to_user_id: 9, source: { kind: 'search', home_project_id: 1 } };
    await social.friendRequest(body);
    expect(http.post).toHaveBeenCalledWith('/api/social/friends/request', body, undefined);
  });

  it('publicIndex GETs /api/social/public/index', async () => {
    const params = { home_project_id: 1, scope: 'all', limit: 25 };
    await social.publicIndex(params, { skipCache: true });
    expect(http.get).toHaveBeenCalledWith('/api/social/public/index', params, {
      skipCache: true,
    });
  });

  it('publicMine GETs /api/social/public/me with home_project_id', async () => {
    await social.publicMine(9, { skipCache: true });
    expect(http.get).toHaveBeenCalledWith(
      '/api/social/public/me',
      { home_project_id: 9 },
      { skipCache: true }
    );
  });

  it('settingsPrivacyPut PUTs /api/social/settings/privacy', async () => {
    const body = { incoming_friend_requests: { mode: 'accept_all' } };
    await social.settingsPrivacyPut(body);
    expect(http.put).toHaveBeenCalledWith('/api/social/settings/privacy', body, undefined);
  });

  it('channelInvitesRedeem POSTs redeem endpoint', async () => {
    await social.channelInvitesRedeem({ token: 't' }, { skipCache: true });
    expect(http.post).toHaveBeenCalledWith(
      '/api/social/channel-invites/redeem',
      { token: 't' },
      { skipCache: true }
    );
  });
});
