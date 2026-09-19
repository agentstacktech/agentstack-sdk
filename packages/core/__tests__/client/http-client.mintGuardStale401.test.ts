/**
 * Post-mint guard: stale in-flight 401s must not mark session_expired.
 * @jest-environment jsdom
 */

import { HTTPClient } from '../../src/client/http-client';
import { AuthStateStore } from '../../src/utils/auth-state';
import { UnauthorizedError } from '../../src/types/shared/HTTPTypes';
import { cleanupMocks } from '../setup';

function makeJwt(jti: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({ jti, project_id: 1444, iat: 1_700_000_000 }),
  ).toString('base64url');
  return `${header}.${payload}.sig`;
}

function makeJsonResponse(init: {
  ok: boolean;
  status: number;
  body: unknown;
}): Partial<Response> {
  const text = JSON.stringify(init.body);
  return {
    ok: init.ok,
    status: init.status,
    statusText: init.ok ? 'OK' : 'Error',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: async () => init.body,
    text: async () => text,
    clone: function (this: Response) {
      return this;
    },
  } as Response;
}

describe('HTTPClient mint guard stale 401', () => {
  let client: HTTPClient;
  let auth: AuthStateStore;

  beforeEach(() => {
    cleanupMocks();
    auth = new AuthStateStore();
    auth.setState({ state: 'authenticated' });
    client = new HTTPClient(
      {
        apiBase: 'http://localhost:8000',
        enableCaching: false,
        enableMetrics: false,
      },
      auth,
    );
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { pathname: '/dev/home', href: 'http://localhost/dev/home' },
    });
    window.localStorage.clear();
  });

  it('discards stale session_not_found 401 during post-login grace on shell endpoints', async () => {
    const live = makeJwt('962f81e8420d-live-mint');
    client.setAuthToken(live);
    client.markRecentLoginSuccess();

    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeJsonResponse({
        ok: false,
        status: 401,
        body: {
          detail: {
            code: 'session_not_found',
            jti_prefix: 'oldmintjti',
            project_id: 1,
            reason: 'terminated',
          },
        },
      }),
    );

    await expect(
      client.get('/api/shell/user-home-snapshot', undefined, {
        skipCache: true,
        skipBatching: true,
        retry: { maxAttempts: 0 },
      }),
    ).rejects.toMatchObject({ code: 'stale_jti_discarded' });

    expect(client.getAuthToken()).toBe(live);
    expect(auth.getState()).toBe('authenticated');
  });

  it('does not mark session_expired on admin 401 when bearer is present (scope miss)', async () => {
    const live = makeJwt('admin-scope-miss-jti');
    client.setAuthToken(live);

    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeJsonResponse({
        ok: false,
        status: 401,
        body: { detail: 'Ecosystem admin access required' },
      }),
    );

    await expect(
      client.get('/api/admin/data/snapshot', { project_id: 1 }, {
        skipCache: true,
        skipBatching: true,
        retry: { maxAttempts: 0 },
      }),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    expect(client.getAuthToken()).toBe(live);
    expect(auth.getState()).toBe('authenticated');
  });

  it('does not mark session_expired when response is 401 and client has no bearer', async () => {
    auth.setState({ state: 'unauthenticated' });
    client.setAuthToken(null);

    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeJsonResponse({
        ok: false,
        status: 401,
        body: { detail: 'Authentication required' },
      }),
    );

    await expect(
      client.get('/api/projects', undefined, {
        skipCache: true,
        skipBatching: true,
        retry: { maxAttempts: 0 },
      }),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    expect(auth.getState()).toBe('unauthenticated');
  });
});
