/**
 * switch-project Bearer exempt + overview mismatch omit (G-A121 / V-switch-01).
 * @jest-environment jsdom
 */

jest.mock('../../src/utils/CircuitBreaker', () => ({
  CircuitBreakerManager: class {
    execute<T>(_key: string, fn: () => Promise<T>): Promise<T> {
      return fn();
    }
  },
  circuitBreakerManager: {
    execute: <T>(_key: string, fn: () => Promise<T>) => fn(),
  },
}));

import { HTTPClient } from '../../src/client/http-client';
import { AuthStateStore } from '../../src/utils/auth-state';
import { cleanupMocks } from '../setup';

function makeJwt(projectId: number, jti = 'switch-test-jti', iat = 1_700_000_000): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({ jti, project_id: projectId, iat }),
  ).toString('base64url');
  return `${header}.${payload}.sig`;
}

describe('HTTPClient switch-project bearer exempt', () => {
  let client: HTTPClient;

  beforeEach(() => {
    cleanupMocks();
    const auth = new AuthStateStore();
    auth.setState({ state: 'authenticated' });
    client = new HTTPClient(
      {
        apiBase: 'http://localhost:8000',
        projectId: 2,
        enableCaching: false,
        enableMetrics: false,
      },
      auth,
    );
    window.localStorage.clear();
  });

  it('switch-project keeps Bearer when jwt pid differs from workspace header', () => {
    const token = makeJwt(1);
    client.setAuthToken(token);

    const headers = client.buildFetchHeaders(
      { 'X-Project-ID': '2' },
      '/api/auth/switch-project',
    );

    expect(headers['Authorization']).toMatch(/^Bearer /);
    expect(headers['X-Project-ID']).toBe('1');
  });

  it('keeps interceptor Bearer when it already matches X-Project-ID', () => {
    const stale = makeJwt(1600, 'stale-jti', 200);
    const aligned = makeJwt(1, 'aligned-jti', 300);
    client.setAuthToken(stale);
    client.setProjectId(1);

    const headers = client.buildFetchHeaders(
      { Authorization: `Bearer ${aligned}`, 'X-Project-ID': '1' },
      '/api/capabilities?effective=true',
    );

    expect(headers['Authorization']).toBe(`Bearer ${aligned}`);
    expect(headers['X-Project-ID']).toBe('1');
  });

  it('ignores setAuthToken below the mint floor', () => {
    const newer = makeJwt(1, 'new-jti', 500);
    const older = makeJwt(1600, 'old-jti', 100);
    client.setAuthToken(newer);
    client.noteMintFloorFromToken(newer);
    client.setAuthToken(older);
    expect(client.getAuthToken()).toBe(newer);
    expect(client.getMintFloorIat()).toBe(500);
  });

  it('project overview omits Bearer on jwt/header mismatch', () => {
    const token = makeJwt(1);
    client.setAuthToken(token);

    const headers = client.buildFetchHeaders(
      { 'X-Project-ID': '2' },
      '/api/projects/2/overview',
    );

    expect(headers['Authorization']).toBeUndefined();
    expect(headers['X-Project-ID']).toBe('2');
  });

  it('dispatches auth.sdk.switch_bearer_preserved beacon on switch-project', () => {
    const token = makeJwt(1);
    client.setAuthToken(token);

    const beacons: unknown[] = [];
    const onBeacon = (ev: Event) => {
      beacons.push((ev as CustomEvent).detail);
    };
    window.addEventListener('agentstack.auth.beacon', onBeacon);

    client.buildFetchHeaders({}, '/api/auth/switch-project');

    window.removeEventListener('agentstack.auth.beacon', onBeacon);
    expect(beacons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'auth.sdk.switch_bearer_preserved',
          project_id: 1,
        }),
      ]),
    );
  });
});
