/**
 * MCP REST discover helpers — Jest SoT for @agentstack/sdk.
 */
import { mcpDiscoverByIntent, mcpGetDiscovery } from '../discover';

describe('mcp discover REST', () => {
  it('posts by_intent with project header', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ matches: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    try {
      await mcpDiscoverByIntent('deploy site', {
        apiBase: 'https://agentstack.tech/api',
        token: 'tok',
        projectId: 42,
      });
      expect(calls[0]?.url).toBe('https://agentstack.tech/mcp/discover/by_intent');
      const headers = calls[0]?.init?.headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer tok');
      expect(headers['X-Project-ID']).toBe('42');
      expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
        intent: 'deploy site',
        project_id: 42,
      });
    } finally {
      globalThis.fetch = original;
    }
  });

  it('gets discovery context', async () => {
    const original = globalThis.fetch;
    globalThis.fetch = (async (url: RequestInfo | URL) => {
      expect(String(url)).toBe('https://agentstack.tech/mcp/discovery');
      return new Response(JSON.stringify({ caps: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    try {
      const out = await mcpGetDiscovery({
        apiBase: 'https://agentstack.tech/api',
        token: 'tok',
      });
      expect(out).toEqual({ caps: [] });
    } finally {
      globalThis.fetch = original;
    }
  });
});
