import { DESCRIBE_MANY_MAX_ACTIONS, discoveryDescribeMany } from '../discoveryDescribeMany';

jest.mock('../execute', () => {
  const actual = jest.requireActual('../execute');
  return {
    ...actual,
    mcpExecute: jest.fn(),
  };
});

jest.mock('../urls', () => ({
  resolveMcpUrl: (base: string) => `${base.replace(/\/$/, '')}/mcp`,
}));

import { mcpExecute } from '../execute';

describe('discoveryDescribeMany', () => {
  it('dedupes actions and parses rows', async () => {
    (mcpExecute as jest.Mock).mockResolvedValue({
      ok: true,
      results: [
        {
          status: 'ok',
          result: {
            descriptor: 'slim',
            count: 2,
            rows: [
              { action: 'agents.plan_get', ok: true, data: { action: 'agents.plan_get' } },
              { action: 'agents.work_next', ok: true, data: { action: 'agents.work_next' } },
            ],
          },
        },
      ],
    });
    const client = {
      getAuthToken: () => 'test-token',
      getConfig: () => ({ apiBase: 'https://agentstack.test' }),
    } as unknown as import('../../client/http-client').HTTPClient;
    const out = await discoveryDescribeMany(client, {
      projectId: 3,
      actions: ['agents.plan_get', 'agents.plan_get', 'agents.work_next'],
      descriptor: 'slim',
      locale: 'en-US',
    });
    expect(out.count).toBe(2);
    expect(out.rows.map((r) => r.action)).toEqual(['agents.plan_get', 'agents.work_next']);
    expect(mcpExecute).toHaveBeenCalledTimes(1);
    const steps = (mcpExecute as jest.Mock).mock.calls[0]?.[0] as Array<{
      params?: { actions?: string[] };
    }>;
    expect(steps[0]?.params?.actions?.length).toBeLessThanOrEqual(DESCRIBE_MANY_MAX_ACTIONS);
    const opts = (mcpExecute as jest.Mock).mock.calls[0]?.[1] as { timeoutMs?: number };
    expect(opts.timeoutMs).toBeGreaterThanOrEqual(120_000);
  });
});