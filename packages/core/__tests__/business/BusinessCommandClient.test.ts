/**
 * BusinessCommandClient M2 methods — link/adopt/preflight REST paths.
 */

import { BusinessCommandClient } from '../../src/business/BusinessCommandClient';
import type { HTTPClient } from '../../src/client/http-client';

describe('BusinessCommandClient (M2)', () => {
  let client: BusinessCommandClient;
  let mockHttp: jest.Mocked<Pick<HTTPClient, 'get' | 'post' | 'delete'>>;

  beforeEach(() => {
    mockHttp = {
      get: jest.fn(),
      post: jest.fn(),
      delete: jest.fn(),
    };
    client = new BusinessCommandClient(mockHttp as HTTPClient);
  });

  it('linkChild posts to /org/children/link with idempotency key', async () => {
    mockHttp.post.mockResolvedValueOnce({ data: { success: true, project_id: 42 } });
    const body = { existing_project_id: 42, organ: 'crm', display_name: 'CRM' };

    const result = await client.linkChild(10, body, 'idem-link-1');

    expect(mockHttp.post).toHaveBeenCalledWith(
      '/api/projects/10/org/children/link',
      body,
      { headers: { 'Idempotency-Key': 'idem-link-1' } },
    );
    expect(result).toEqual({ success: true, project_id: 42 });
  });

  it('listAdoptCandidates GETs scoped adopt-candidates', async () => {
    mockHttp.get.mockResolvedValueOnce({
      data: { items: [{ project_id: 7, display_name: 'Shop' }] },
    });

    const result = await client.listAdoptCandidates(10, { limit: 50 });

    expect(mockHttp.get).toHaveBeenCalledWith(
      '/api/projects/10/business/adopt-candidates',
      { params: { limit: 50 } },
    );
    expect(result.items).toHaveLength(1);
  });

  it('listCompositeAdoptCandidates GETs global composite-adopt-candidates', async () => {
    mockHttp.get.mockResolvedValueOnce({
      data: { items: [{ project_id: 8, display_name: 'Legacy' }] },
    });

    const result = await client.listCompositeAdoptCandidates({ limit: 25 });

    expect(mockHttp.get).toHaveBeenCalledWith('/api/business/composite-adopt-candidates', {
      params: { limit: 25 },
    });
    expect(result.items[0].project_id).toBe(8);
  });

  it('transferPreflight GETs transfer-preflight for project', async () => {
    mockHttp.get.mockResolvedValueOnce({
      data: { project_id: 10, can_transfer: true, blockers: [], warnings: [] },
    });

    const result = await client.transferPreflight(10);

    expect(mockHttp.get).toHaveBeenCalledWith(
      '/api/projects/10/business/transfer-preflight',
    );
    expect(result.can_transfer).toBe(true);
  });
});
