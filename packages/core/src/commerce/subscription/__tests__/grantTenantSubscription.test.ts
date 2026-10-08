import type { HTTPClient } from '../../../client/http-client';
import { grantTenantSubscription } from '../grantTenantSubscription';

describe('grantTenantSubscription', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('calls buffs.grant_tenant_subscription via MCP', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                ok: true,
                results: [
                  {
                    ok: true,
                    result: {
                      data: {
                        buff_id: 'buff-1',
                        plan_id: 'pro_monthly',
                        recipient_project_id: 1444,
                        expires_at: '2026-11-04T00:00:00Z',
                      },
                    },
                  },
                ],
              }),
            },
          ],
        },
      }),
    } as Response);

    const client = {
      getAuthToken: () => 'token-abc',
      getConfig: () => ({ apiBase: 'https://agentstack.tech/api' }),
    } as unknown as HTTPClient;

    const result = await grantTenantSubscription(client, 1444, {
      user_id: 100,
      plan_id: 'pro_monthly',
    });

    expect(result.buff_id).toBe('buff-1');
    expect(result.plan_id).toBe('pro_monthly');
    expect(globalThis.fetch).toHaveBeenCalled();
    const body = JSON.parse(
      String((globalThis.fetch as jest.Mock).mock.calls[0][1]?.body ?? '{}'),
    );
    const step = body.params?.arguments?.steps?.[0];
    expect(step?.action).toBe('buffs.grant_tenant_subscription');
    expect(step?.params?.user_id).toBe(100);
    expect(step?.params?.plan_id).toBe('pro_monthly');
  });
});
