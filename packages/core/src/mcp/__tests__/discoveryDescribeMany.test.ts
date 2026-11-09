import { DESCRIBE_MANY_MAX_ACTIONS, discoveryDescribeMany } from '../discoveryDescribeMany';

describe('discoveryDescribeMany', () => {
  it('dedupes actions and parses rows', async () => {
    const post = jest.fn().mockResolvedValue({
      data: {
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
      },
    });
    const client = { post } as unknown as import('../../client/http-client').HTTPClient;
    const out = await discoveryDescribeMany(client, {
      projectId: 3,
      actions: ['agents.plan_get', 'agents.plan_get', 'agents.work_next'],
      descriptor: 'slim',
      locale: 'en-US',
    });
    expect(out.count).toBe(2);
    expect(out.rows.map((r) => r.action)).toEqual(['agents.plan_get', 'agents.work_next']);
    expect(post).toHaveBeenCalledTimes(1);
    const body = post.mock.calls[0]?.[1] as { steps?: Array<{ params?: { actions?: string[] } }> };
    expect(body.steps?.[0]?.params?.actions?.length).toBeLessThanOrEqual(DESCRIBE_MANY_MAX_ACTIONS);
  });
});
