/**
 * 503 AgentCoinSchemaMissing: structured ServerError, no false "Network error" wrap.
 */

import { HTTPClient } from '../../src/client/http-client';
import { AuthStateStore } from '../../src/utils/auth-state';
import { ServerError } from '../../src/types';
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

describe('HTTPClient 503 AgentCoinSchemaMissing', () => {
  let client: HTTPClient;

  beforeEach(() => {
    cleanupMocks();
    const auth = new AuthStateStore();
    auth.setState({ state: 'authenticated' });
    client = new HTTPClient(
      {
        apiBase: 'http://localhost:8000',
        apiKey: 'test-key',
        enableCaching: false,
        enableMetrics: false,
      },
      auth,
    );
    client.setAuthToken('test-jwt');
  });

  it('throws ServerError with apiCode AgentCoinSchemaMissing', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      makeJsonResponse({
        ok: false,
        status: 503,
        body: {
          error: 'AgentCoinSchemaMissing',
          message: 'Run migrations',
          request_id: 'tr_test',
        },
      }),
    );

    try {
      await client.get('/agentcoin/1/balance', { account_key: 'k' } as any);
      expect('unreachable').toBe(true);
    } catch (err) {
      expect(err).toBeInstanceOf(ServerError);
      const se = err as ServerError;
      expect(se.status).toBe(503);
      expect(se.apiCode).toBe('AgentCoinSchemaMissing');
      expect(se.requestId).toBe('tr_test');
    }
  });
});
