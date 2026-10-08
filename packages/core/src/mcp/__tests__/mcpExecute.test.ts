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
      const args = (body as { params?: { arguments?: { options?: { goal?: string } } } }).params
        ?.arguments;
      expect(args?.options?.goal).toBeUndefined();
    } finally {
      globalThis.fetch = original;
    }
  });

  it('sends goal and reads the inverse envelope', async () => {
    const calls: unknown[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      calls.push(JSON.parse(String(init?.body)));
      return new Response(
        JSON.stringify({
          result: {
            instruction_packet: {
              step_id: 'session',
              allowed_actions: ['auth.get_profile'],
              text: 'Use auth.get_profile.',
              writes_allowed: true,
            },
            observed: { completed_steps: [] },
            workflow_run_id: 'run-1',
            completion: { workflow_status: 'pending' },
            results: [{ id: 'step_0', ok: true }],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch;
    try {
      const { mcpExecute, readInverseEnvelope } = await import('../execute');
      const out = await mcpExecute([{ action: 'auth.get_profile', params: {} }], {
        mcpUrl: 'https://agentstack.tech/mcp',
        token: 'tok',
        projectId: 1,
        goal: 'build a saas',
        density: 'guided',
      });
      const body = calls[0] as {
        params?: { arguments?: { options?: { goal?: string; density?: string } } };
      };
      expect(body.params?.arguments?.options?.goal).toBe('build a saas');
      expect(body.params?.arguments?.options?.density).toBe('guided');
      const view = readInverseEnvelope(out.raw);
      expect(view?.packet?.allowed_actions[0]).toBe('auth.get_profile');
      expect(view?.workflowStatus).toBe('pending');
      const finished = readInverseEnvelope({
        result: { completion: { workflow_status: 'completed' } },
      });
      expect(finished?.packet).toBeNull();
    } finally {
      globalThis.fetch = original;
    }
  });
});
