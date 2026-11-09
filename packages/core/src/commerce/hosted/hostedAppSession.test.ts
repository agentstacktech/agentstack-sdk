import { describe, expect, it, vi } from 'vitest';

import { ensureHostedPlayerMcpReady, mintHostedAppSession } from './hostedAppSession';

describe('mintHostedAppSession', () => {
  it('POSTs session with Bearer and credentials include', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchFn);
    await mintHostedAppSession(2041, 'Bearer tok');
    expect(fetchFn).toHaveBeenCalledWith(
      '/api/hosted-apps/2041/session',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
      }),
    );
    vi.unstubAllGlobals();
  });

  it('rejects invalid project id', async () => {
    await expect(mintHostedAppSession(0, 'tok')).rejects.toThrow('hosted_session_invalid_project');
  });
});

describe('ensureHostedPlayerMcpReady', () => {
  it('fails closed without bearer or bootstrap deps', async () => {
    const http = {
      getAuthToken: () => undefined,
      setProjectId: vi.fn(),
      updateConfig: vi.fn(),
    };
    await expect(ensureHostedPlayerMcpReady(2052, http)).rejects.toThrow(
      'hosted_cookie_missing',
    );
  });
});
