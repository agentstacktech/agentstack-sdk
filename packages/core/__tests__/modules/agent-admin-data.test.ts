import { describe, expect, it, vi } from 'vitest';

import { AgentAdminData } from '../../src/modules/AgentAdminData';

describe('AgentAdminData.dnaList', () => {
  it('propagates X-Admission-Stale header onto admission_stale', async () => {
    const http = {
      get: vi.fn().mockResolvedValue({
        data: {
          table: 'data_projects_8dna',
          entities: [],
          total: 0,
          limit: 50,
          offset: 0,
        },
        headers: { 'x-admission-stale': '1' },
      }),
    };
    const client = new AgentAdminData(http as never);
    const out = await client.dnaList({ contour: 'card' });
    expect(out.admission_stale).toBe(true);
  });

  it('keeps body admission_stale when already set', async () => {
    const http = {
      get: vi.fn().mockResolvedValue({
        data: {
          table: 't',
          entities: [],
          total: 1,
          limit: 50,
          offset: 0,
          admission_stale: true,
        },
        headers: {},
      }),
    };
    const client = new AgentAdminData(http as never);
    const out = await client.dnaList();
    expect(out.admission_stale).toBe(true);
  });
});
