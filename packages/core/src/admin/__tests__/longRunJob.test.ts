import { normalizeAdminApiPath } from '../longRunJob';

describe('normalizeAdminApiPath', () => {
  it('strips duplicate /api prefix from backend poll_url', () => {
    expect(normalizeAdminApiPath('/api/admin/agentnet/testnet/scenarios/abc')).toBe(
      '/admin/agentnet/testnet/scenarios/abc',
    );
  });

  it('keeps admin-relative paths without /api', () => {
    expect(normalizeAdminApiPath('/admin/agentnet/testnet/scenarios/abc')).toBe(
      '/admin/agentnet/testnet/scenarios/abc',
    );
  });

  it('passes through absolute URLs', () => {
    expect(normalizeAdminApiPath('https://agentstack.tech/api/admin/foo')).toBe(
      'https://agentstack.tech/api/admin/foo',
    );
  });
});
