/**
 * Public-page 401 handling: purge dead JTI on login probes; POST /auth/login throws.
 * @jest-environment jsdom
 */

import { HTTPClient } from '../../src/client/http-client';
import { AuthStateStore } from '../../src/utils/auth-state';
import { UnauthorizedError } from '../../src/types/shared/HTTPTypes';
import { cleanupMocks } from '../setup';

function makeJwt(jti: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({ jti, project_id: 1438, iat: 1_700_000_000 }),
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

describe('HTTPClient public /login 401 handling', () => {
  let client: HTTPClient;
  let locationMock: { pathname: string; href: string };

  beforeEach(() => {
    cleanupMocks();
    const auth = new AuthStateStore();
    auth.setState({ state: 'unauthenticated' });
    client = new HTTPClient(
      {
        apiBase: 'http://localhost:8000',
        enableCaching: false,
        enableMetrics: false,
      },
      auth,
    );

    locationMock = { pathname: '/login', href: 'http://localhost/login' };
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: locationMock,
    });
    window.localStorage.clear();
  });

  it('POST /auth/login 401 throws UnauthorizedError (not swallowed on public page)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeJsonResponse({
        ok: false,
        status: 401,
        body: { detail: 'Invalid credentials' },
      }),
    );

    await expect(
      client.post(
        '/auth/login',
        { email: 'user@example.com', password: 'wrong' },
        { skipAuthStateCheck: true },
      ),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('GET /auth/me session_not_found on /login purges dead JTI and dispatches event', async () => {
    const dead = makeJwt('cf4c064c9c3e-dead');
    client.setAuthToken(dead);
    window.localStorage.setItem('access_token', dead);

    const events: unknown[] = [];
    const onSnf = (ev: Event) => {
      events.push((ev as CustomEvent).detail);
    };
    window.addEventListener('agentstack.auth.session_not_found', onSnf);

    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeJsonResponse({
        ok: false,
        status: 401,
        body: {
          detail: {
            code: 'session_not_found',
            message: 'Session expired or invalid - please login again',
            project_id: 1438,
            jti_prefix: 'cf4c064c9c3e',
            reason: 'terminated',
          },
        },
      }),
    );

    try {
      await client.get('/auth/me/bootstrap', undefined, {
        skipCache: true,
        skipBatching: true,
        skipAuthStateCheck: true,
        retry: { maxAttempts: 0 },
      });
      expect('unreachable').toBe(true);
    } catch (err) {
      expect(err).toBeInstanceOf(UnauthorizedError);
      expect((err as UnauthorizedError).code).toBe('session_not_found');
    } finally {
      window.removeEventListener('agentstack.auth.session_not_found', onSnf);
    }

    expect(client.getAuthToken()).toBeFalsy();
    expect(window.localStorage.getItem('access_token')).toBeNull();
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect((events[0] as { jti_prefix?: string }).jti_prefix).toBe('cf4c064c9c3e');
  });

  it('GET /auth/me cache_epoch_stale clears client epoch', async () => {
    client.setAuthToken(makeJwt('abc123'));
    // Seed epoch via private field through a successful capture path: set directly.
    (client as unknown as { cacheEpoch: string | null }).cacheEpoch = '42';

    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeJsonResponse({
        ok: false,
        status: 401,
        body: {
          detail: {
            code: 'cache_epoch_stale',
            message: 'Cache epoch stale or missing — please login again',
            reason: 'fail_closed:auth:session:stale_epoch',
          },
        },
      }),
    );

    await expect(
      client.get('/auth/me/bootstrap', undefined, {
        skipCache: true,
        skipBatching: true,
        skipAuthStateCheck: true,
        retry: { maxAttempts: 0 },
      }),
    ).rejects.toMatchObject({ code: 'cache_epoch_stale' });

    expect((client as unknown as { cacheEpoch: string | null }).cacheEpoch).toBeNull();
  });
});
