import { listIapEntitlements } from './index';

describe('listIapEntitlements', () => {
  it('calls BFF entitlements path with project_id', async () => {
    const fetchFn = jest.fn(async () => ({
      ok: true,
      json: async () => ({ entitlements: [{ sku_id: 'pack_1' }] }),
    }));
    const rows = await listIapEntitlements(2041, fetchFn as typeof fetch);
    expect(rows).toHaveLength(1);
    const url = String(fetchFn.mock.calls[0][0]);
    expect(url).toContain('/api/commerce/iap/entitlements');
    expect(url).toContain('project_id=2041');
  });

  it('appends include_sandbox when opts.includeSandbox is true', async () => {
    const fetchFn = jest.fn(async () => ({
      ok: true,
      json: async () => ({ entitlements: [] }),
    }));
    await listIapEntitlements(1, fetchFn as typeof fetch, undefined, {
      includeSandbox: true,
    });
    const url = String(fetchFn.mock.calls[0][0]);
    expect(url).toContain('include_sandbox=true');
  });
});
