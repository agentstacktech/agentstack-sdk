/**
 * mcpExecute / URL helpers — Jest SoT for @agentstack/sdk.
 */
import { resolveMcpUrl, resolvePublicOrigin } from '../urls';
import { mcpExecute } from '../execute';

describe('mcp urls', () => {
  it('strips /api to /mcp', () => {
    expect(resolveMcpUrl('https://agentstack.tech/api')).toBe('https://agentstack.tech/mcp');
    expect(resolveMcpUrl('https://agentstack.tech/api/')).toBe('https://agentstack.tech/mcp');
  });

  it('resolvePublicOrigin', () => {
    expect(resolvePublicOrigin('https://agentstack.tech/api')).toBe('https://agentstack.tech');
  });
});

describe('mcpExecute', () => {
  it('posts JSON-RPC tools/call and parses results', async () => {
    const calls: unknown[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      calls.push(JSON.parse(String(init?.body)));
      return new Response(
        JSON.stringify({
          result: { results: [{ id: 'step_0', ok: true, result: { actions: [] } }] },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch;

    try {
      const out = await mcpExecute([{ action: 'discovery.list', params: {} }], {
        mcpUrl: 'https://agentstack.tech/mcp',
        token: 'tok',
        projectId: 1,
      });
      expect(out.results?.[0]?.ok).toBe(true);
      const body = calls[0] as { method?: string; params?: { name?: string } };
      expect(body.method).toBe('tools/call');
      expect(body.params?.name).toBe('agentstack.execute');
    } finally {
      globalThis.fetch = original;
    }
  });
});
