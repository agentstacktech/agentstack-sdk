/**
 * Project hop 401s must not mark the identity session expired.
 * @jest-environment jsdom
 */

import { TextDecoder as NodeTextDecoder } from 'util';

import { HTTPClient } from '../../src/client/http-client';
import { AuthStateStore } from '../../src/utils/auth-state';
import { UnauthorizedError } from '../../src/types/shared/HTTPTypes';
import { cleanupMocks } from '../setup';

if (typeof globalThis.TextDecoder === 'undefined') {
  (globalThis as unknown as { TextDecoder: typeof NodeTextDecoder }).TextDecoder = NodeTextDecoder;
}

function makeJwt(jti: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({ jti, project_id: 1, iat: 1_700_000_000 }),
  ).toString('base64url');
  return `${header}.${payload}.sig`;
}

function makeJsonResponse(init: {
  ok: boolean;
  status: number;
  body: unknown;
}): Response {
  const text = JSON.stringify(init.body);
  const bytes = Buffer.from(text);
  const response = {
    ok: init.ok,
    status: init.status,
    statusText: init.ok ? 'OK' : 'Error',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: async () => init.body,
    text: async () => text,
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    clone() {
      return makeJsonResponse(init);
    },
  };
  return response as Response;
}

describe('HTTPClient project-switch 401', () => {
  let client: HTTPClient;
  let auth: AuthStateStore;

  beforeEach(() => {
    cleanupMocks();
    auth = new AuthStateStore();
    auth.setState({ state: 'authenticated', reason: 'login_success' });
    client = new HTTPClient(
      {
        apiBase: 'http://localhost:8000',
        enableCaching: false,
        enableMetrics: false,
        projectId: 1472,
      },
      auth,
    );
    client.setAuthToken(makeJwt('live-jti'));
    client.setProjectId(1472);
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { pathname: '/dev/projects/1472', href: 'http://localhost/dev/projects/1472' },
    });
    window.localStorage.clear();
  });

  it('does not mark session_expired when the 401 is for the previous project', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeJsonResponse({
        ok: false,
        status: 401,
        body: { detail: { code: 'unauthorized', message: 'no' } },
      }),
    );

    await expect(
      client.get('/projects/1444/users', undefined, {
        skipCache: true,
        skipBatching: true,
        retry: { maxAttempts: 0 },
      }),
    ).rejects.toMatchObject({ code: 'stale_project_scope' });

    expect(auth.getState()).toBe('authenticated');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('retries cache_epoch_stale once without logging out', async () => {
    (client as unknown as { cacheEpoch: string | null }).cacheEpoch = '42';
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        makeJsonResponse({
          ok: false,
          status: 401,
          body: {
            detail: {
              code: 'cache_epoch_stale',
              message: 'Cache epoch stale or missing — please login again',
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        makeJsonResponse({
          ok: true,
          status: 200,
          body: { users: [] },
        }),
      );

    const res = await client.get('/projects/1472/users', undefined, {
      skipCache: true,
      skipBatching: true,
      retry: { maxAttempts: 0 },
    });

    expect(res.status).toBe(200);
    expect(auth.getState()).toBe('authenticated');
    expect(global.fetch).toHaveBeenCalledTimes(2);
    const secondHeaders = (global.fetch as jest.Mock).mock.calls[1][1].headers as Record<
      string,
      string
    >;
    expect(secondHeaders['X-AgentStack-Cache-Epoch']).toBeUndefined();
  });

  it('does not mark session_expired on 401 with project_session_required detail', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeJsonResponse({
        ok: false,
        status: 401,
        body: { detail: { code: 'project_session_required', message: 'bind project' } },
      }),
    );

    await expect(
      client.get('/projects/1472/wallets', undefined, {
        skipCache: true,
        skipBatching: true,
        retry: { maxAttempts: 0 },
      }),
    ).rejects.toMatchObject({ code: 'project_session_required' });

    expect(auth.getState()).toBe('authenticated');
  });

  it('drops an in-flight response stamped with an older switch generation', async () => {
    let resolveFetch: (value: Response) => void = () => undefined;
    let markFetched: () => void = () => undefined;
    const fetched = new Promise<void>((resolve) => {
      markFetched = resolve;
    });
    (global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
          markFetched();
        }),
    );
    client.setActiveSwitchGeneration(1);
    const pending = client.get('/projects/1472/users', undefined, {
      skipCache: true,
      skipBatching: true,
      retry: { maxAttempts: 0 },
    });
    await fetched;
    client.setActiveSwitchGeneration(2);
    resolveFetch(
      makeJsonResponse({
        ok: false,
        status: 401,
        body: { detail: 'no' },
      }),
    );

    await expect(pending).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(pending).rejects.toMatchObject({ code: 'stale_project_scope' });
    expect(auth.getState()).toBe('authenticated');
  });
});
