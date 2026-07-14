/**
 * Public-page 401 handling: GET session probes stay silent; POST /auth/login must throw.
 * @jest-environment jsdom
 */

import { HTTPClient } from '../../src/client/http-client';
import { AuthStateStore } from '../../src/utils/auth-state';
import { UnauthorizedError } from '../../src/types/shared/HTTPTypes';
import { cleanupMocks } from '../setup';

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

  it('GET /auth/me 401 on public /login returns null data (session probe)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeJsonResponse({
        ok: false,
        status: 401,
        body: { detail: 'Unauthorized' },
      }),
    );

    const response = await client.get('/auth/me', undefined, {
      skipCache: true,
      skipBatching: true,
      skipAuthStateCheck: true,
    });

    expect(response.status).toBe(401);
    expect(response.data).toBeNull();
  });
});
