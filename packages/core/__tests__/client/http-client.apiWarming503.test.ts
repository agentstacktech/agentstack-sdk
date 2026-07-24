/**
 * Nginx warm-up 503: tag api_warming_up, honor Retry-After, do not trip circuit breaker.
 */

import { HTTPClient } from '../../src/client/http-client';
import { AuthStateStore } from '../../src/utils/auth-state';
import { ServerError } from '../../src/types';
import {
  API_WARMING_UP_CODE,
  isApiWarmingUpError,
} from '../../src/client/apiWarming';
import { CircuitBreaker } from '../../src/utils/CircuitBreaker';
import { cleanupMocks } from '../setup';

function makeWarmingResponse(retryAfter = '5'): Partial<Response> {
  const body = {
    status: 'starting',
    message: 'AgentStack API warming up — retry shortly',
    retry_after_seconds: 5,
  };
  const text = JSON.stringify(body);
  return {
    ok: false,
    status: 503,
    statusText: 'Service Unavailable',
    headers: new Headers({
      'Content-Type': 'application/json',
      'Retry-After': retryAfter,
    }),
    json: async () => body,
    text: async () => text,
    clone: function (this: Response) {
      return this;
    },
  } as Response;
}

describe('HTTPClient API warming 503', () => {
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
        retryAttempts: 2,
        retryDelay: 10,
      },
      auth,
    );
    client.setAuthToken('test-jwt');
  });

  it('tags ServerError as api_warming_up with retryAfterSec', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(makeWarmingResponse('5'));

    try {
      await client.get('/auth/me/bootstrap', undefined, { retry: { maxAttempts: 0 } });
      expect('unreachable').toBe(true);
    } catch (err) {
      expect(err).toBeInstanceOf(ServerError);
      const se = err as ServerError;
      expect(se.status).toBe(503);
      expect(se.apiCode).toBe(API_WARMING_UP_CODE);
      expect(se.retryAfterSec).toBe(5);
      expect(isApiWarmingUpError(se)).toBe(true);
    }
  });

  it('retries GET through warming then succeeds', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(makeWarmingResponse('1'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({ success: true, data: { user_id: 1 } }),
        text: async () => '{"success":true}',
        clone: function (this: Response) {
          return this;
        },
      } as Response);

    const res = await client.get('/auth/me/bootstrap', undefined, {
      retry: { maxAttempts: 2, baseDelay: 5, jitter: false },
    });
    expect(res.status).toBe(200);
    expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('does not open circuit breaker on warming 503', async () => {
    const cb = new CircuitBreaker({ name: 'test', maxFailures: 2, resetTimeout: 60_000 });
    const warmingErr = new ServerError('AgentStack API warming up — retry shortly', 503, {
      apiCode: API_WARMING_UP_CODE,
      retryAfterSec: 5,
    });

    await expect(cb.execute(async () => { throw warmingErr; })).rejects.toBe(warmingErr);
    await expect(cb.execute(async () => { throw warmingErr; })).rejects.toBe(warmingErr);
    await expect(cb.execute(async () => { throw warmingErr; })).rejects.toBe(warmingErr);

    expect(cb.isOpen()).toBe(false);
    expect(cb.getStats().failures).toBe(0);
  });

  it('does not open circuit breaker on auth mint busy or timeout', async () => {
    const cb = new CircuitBreaker({ name: 'login', maxFailures: 2, resetTimeout: 60_000 });
    const mintErr = new ServerError('mint in progress', 503, {
      apiCode: 'auth_mint_in_progress',
      retryAfterSec: 2,
    });
    const timeoutErr = new Error('HTTP Timeout');
    timeoutErr.name = 'TimeoutError';

    for (let i = 0; i < 5; i++) {
      await expect(cb.execute(async () => { throw mintErr; })).rejects.toBe(mintErr);
    }
    for (let i = 0; i < 5; i++) {
      await expect(cb.execute(async () => { throw timeoutErr; })).rejects.toBe(timeoutErr);
    }
    expect(cb.isOpen()).toBe(false);
    expect(cb.getStats().failures).toBe(0);
  });
});
