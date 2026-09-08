/**
 * Device Code must POST application/x-www-form-urlencoded (not JSON).
 * Jest (package SoT for @agentstack/sdk) — not vitest.
 */
import { loginWithDeviceCodeForm, deviceCodeActivateUrl } from '../deviceCode';

describe('loginWithDeviceCodeForm', () => {
  it('posts urlencoded authorize then returns token', async () => {
    const bodies: string[] = [];
    const original = globalThis.fetch;
    let n = 0;
    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      bodies.push(String(init?.body));
      expect(init?.headers).toMatchObject({
        'Content-Type': 'application/x-www-form-urlencoded',
      });
      n += 1;
      if (n === 1) {
        return new Response(
          JSON.stringify({
            device_code: 'dc',
            user_code: 'ABCD',
            verification_uri: 'https://agentstack.tech/activate',
            verification_uri_complete: 'https://agentstack.tech/activate?user_code=ABCD',
            interval: 1,
            expires_in: 120,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify({ access_token: 'pat-token', token_type: 'Bearer' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch;

    try {
      jest.useFakeTimers();
      const pending = loginWithDeviceCodeForm({
        apiBase: 'https://agentstack.tech/api',
        clientId: 'agentstack-cli',
        scope: 'mcp:execute',
      });
      await jest.advanceTimersByTimeAsync(13_000);
      const token = await pending;
      expect(token.access_token).toBe('pat-token');
      expect(bodies[0]).toContain('client_id=agentstack-cli');
      expect(bodies[0]).toContain('scope=mcp%3Aexecute');
      expect(bodies[1]).toContain('grant_type=urn');
      expect(bodies[1]).toContain('device_code=dc');
    } finally {
      jest.useRealTimers();
      globalThis.fetch = original;
    }
  });

  it('polls through authorization_pending then returns token', async () => {
    const original = globalThis.fetch;
    let n = 0;
    globalThis.fetch = (async () => {
      n += 1;
      if (n === 1) {
        return new Response(
          JSON.stringify({
            device_code: 'dc',
            user_code: 'PEND',
            verification_uri: 'https://agentstack.tech/activate',
            verification_uri_complete: 'https://agentstack.tech/activate?user_code=PEND',
            interval: 1,
            expires_in: 120,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (n === 2) {
        return new Response(JSON.stringify({ error: 'authorization_pending' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(
        JSON.stringify({ access_token: 'after-pending', token_type: 'Bearer' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch;

    try {
      jest.useFakeTimers();
      const pending = loginWithDeviceCodeForm({
        apiBase: 'https://agentstack.tech/api',
        clientId: 'agentstack-cli',
      });
      await jest.advanceTimersByTimeAsync(13_000);
      await jest.advanceTimersByTimeAsync(13_000);
      const token = await pending;
      expect(token.access_token).toBe('after-pending');
      expect(n).toBeGreaterThanOrEqual(3);
    } finally {
      jest.useRealTimers();
      globalThis.fetch = original;
    }
  });

  it('throws on access_denied', async () => {
    const original = globalThis.fetch;
    let n = 0;
    globalThis.fetch = (async () => {
      n += 1;
      if (n === 1) {
        return new Response(
          JSON.stringify({
            device_code: 'dc',
            user_code: 'DENY',
            verification_uri: 'https://agentstack.tech/activate',
            verification_uri_complete: 'https://agentstack.tech/activate?user_code=DENY',
            interval: 1,
            expires_in: 120,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify({
          error: 'access_denied',
          error_description: 'user denied',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch;

    try {
      jest.useFakeTimers();
      const pending = loginWithDeviceCodeForm({
        apiBase: 'https://agentstack.tech/api',
        clientId: 'agentstack-cli',
      });
      const assertion = expect(pending).rejects.toThrow(/user denied|access_denied/);
      await jest.advanceTimersByTimeAsync(13_000);
      await assertion;
    } finally {
      jest.useRealTimers();
      globalThis.fetch = original;
    }
  });

  it('deviceCodeActivateUrl', () => {
    expect(deviceCodeActivateUrl('https://agentstack.tech/api', 'XY')).toBe(
      'https://agentstack.tech/activate?user_code=XY',
    );
  });
});
