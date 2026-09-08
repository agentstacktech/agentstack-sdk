/**
 * parseResponse single-read (arrayBuffer) — switch-project body consume regression.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HTTPClient } from '../../src/client/http-client';
import { AuthStateStore } from '../../src/utils/auth-state';

function makeConsumableJsonResponse(body: unknown): Response {
  const text = JSON.stringify(body);
  let consumed = false;
  const headers = new Headers({ 'Content-Type': 'application/json' });
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers,
    json: async () => {
      if (consumed) {
        throw new TypeError('Response.text: Body has already been consumed.');
      }
      consumed = true;
      throw new TypeError('Decoding failed.');
    },
    text: async () => {
      if (consumed) {
        throw new TypeError('Response.text: Body has already been consumed.');
      }
      consumed = true;
      return text;
    },
    arrayBuffer: async () => new TextEncoder().encode(text).buffer,
    clone() {
      return makeConsumableJsonResponse(body);
    },
  } as unknown as Response;
}

describe('HTTPClient parseResponse (arrayBuffer)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('parses JSON when json() fails but arrayBuffer succeeds', async () => {
    const auth = new AuthStateStore();
    auth.setState({ state: 'authenticated' });
    const client = new HTTPClient(
      {
        apiBase: 'http://localhost:8000',
        projectId: 1,
        retry: { maxAttempts: 0 },
      },
      auth,
    );

    const payload = { access_token: 'tok', project_id: 1444 };
    const fetchMock = vi.fn().mockResolvedValue(makeConsumableJsonResponse(payload));
    vi.stubGlobal('fetch', fetchMock);

    const res = await client.post<{ access_token: string; project_id: number }>(
      '/auth/switch-project',
      { project_id: 1444 },
    );

    expect(res.data.access_token).toBe('tok');
    expect(res.data.project_id).toBe(1444);
  });
});
