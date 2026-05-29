import {
  assertIntegratorMayCallAdminApi,
  assertPlatformOperatorSurface,
  filterCapabilityEntriesForAudience,
  isIntegratorAudience,
} from '../../src/config/integratorScope';
import { AgentStackError } from '../../src/types/shared/HTTPTypes';

describe('integratorScope (unit)', () => {
  it('defaults to integrator audience', () => {
    expect(isIntegratorAudience({})).toBe(true);
    expect(isIntegratorAudience({ sdkAudience: 'platform_operator' })).toBe(false);
  });

  it('blocks admin HTTP paths for integrators', () => {
    expect(() =>
      assertIntegratorMayCallAdminApi({}, '/admin/agentnet/health'),
    ).toThrow(AgentStackError);
    expect(() =>
      assertIntegratorMayCallAdminApi(
        { sdkAudience: 'platform_operator' },
        '/admin/agentnet/health',
      ),
    ).not.toThrow();
    expect(() =>
      assertIntegratorMayCallAdminApi(
        {},
        'https://agentstack.tech/api/admin/data/people',
      ),
    ).toThrow(AgentStackError);
  });

  it('filterCapabilityEntriesForAudience removes admin modules', () => {
    const entries = [
      { id: 'api' },
      { id: 'admin' },
    ];
    expect(filterCapabilityEntriesForAudience(entries, 'integrator')).toHaveLength(1);
  });
});
