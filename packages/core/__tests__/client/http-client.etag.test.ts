/**
 * Conditional GET (If-None-Match) for ETag-cached GET responses.
 * Genetic tag: repo.platform.perf.server_cost.gen1
 */

import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { HTTPClient } from '../../src/client/http-client';
import { AuthStateStore } from '../../src/utils/auth-state';

describe('HTTPClient ETag conditional GET', () => {
  let client: HTTPClient;

  beforeEach(() => {
    const auth = new AuthStateStore();
    auth.setState({ state: 'authenticated' });
    client = new HTTPClient(
      {
        apiBase: 'http://test.local/api',
        apiKey: 'test-key',
        enableCaching: true,
        enableBatching: false,
        enableMetrics: false,
      },
      auth,
    );
    client.setAuthToken('test-jwt');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends If-None-Match when a stale ETag entry exists after TTL', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const inm = (init?.headers as Record<string, string>)?.['If-None-Match'];
      if (inm === 'W/"abc"') {
        return new Response(null, { status: 304, headers: { ETag: 'W/"abc"' } });
      }
      return new Response(JSON.stringify({ projects: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ETag: 'W/"abc"' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const first = await client.get('/projects');
    expect(first.status).toBe(200);

    const cache = (client as unknown as {
      cache: Map<string, { timestamp: number; ttl: number; etag?: string }>;
      getCacheKey: (c: { method: string; url: string; params?: unknown }) => string;
    }).cache;
    const getCacheKey = (client as unknown as {
      getCacheKey: (c: { method: string; url: string; params?: unknown }) => string;
    }).getCacheKey.bind(client);
    const cacheKey = getCacheKey({ method: 'GET', url: '/projects' });
    const entry = cache.get(cacheKey);
    expect(entry?.etag).toBe('W/"abc"');
    if (entry) {
      entry.timestamp = Date.now() - entry.ttl - 1000;
    }

    const second = await client.get('/projects');
    expect(second.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondInit = fetchMock.mock.calls[1]?.[1] as RequestInit | undefined;
    expect((secondInit?.headers as Record<string, string>)?.['If-None-Match']).toBe('W/"abc"');
  });
});
