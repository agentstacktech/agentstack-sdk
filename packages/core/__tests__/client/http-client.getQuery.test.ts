/**
 * HTTPClient GET query normalization (Axios-style { params }) and 422 handling.
 */

import { HTTPClient, normalizeGetQueryArg } from '../../src/client/http-client';
import { AuthStateStore } from '../../src/utils/auth-state';
import { BadRequestError } from '../../src/types';
import { cleanupMocks } from '../setup';
import { AgentIntegrations } from '../../src/modules/AgentIntegrations';
import { integrationListConnections } from '../../src/modules/integrationQueries';

describe('normalizeGetQueryArg', () => {
  it('unwraps single-key Axios shape { params: flat }', () => {
    expect(
      normalizeGetQueryArg({ params: { owner_kind: 'project', project_id: 42 } } as any),
    ).toEqual({ owner_kind: 'project', project_id: 42 });
  });

  it('leaves flat query objects unchanged', () => {
    const flat = { project_id: 1, owner_kind: 'personal' };
    expect(normalizeGetQueryArg(flat as any)).toEqual(flat);
  });

  it('does not unwrap when non-config keys are mixed with params', () => {
    const arg = { params: { a: 1 }, extra: 2 } as any;
    expect(normalizeGetQueryArg(arg)).toEqual(arg);
  });

  it('unwraps params when mixed only with RequestConfig-style keys', () => {
    expect(
      normalizeGetQueryArg({
        params: { account_key: 'k', asset_code: 'AGNT' },
        skipBatching: true,
        skipCache: true,
      } as any),
    ).toEqual({ account_key: 'k', asset_code: 'AGNT' });
  });

  it('returns undefined for params-only empty object after unwrap', () => {
    expect(normalizeGetQueryArg({ params: {}, skipBatching: true } as any)).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(normalizeGetQueryArg(undefined)).toBeUndefined();
  });

  it('unwraps empty params object', () => {
    expect(normalizeGetQueryArg({ params: {} } as any)).toEqual({});
  });
});

function makeJsonResponse(init: {
  ok: boolean;
  status: number;
  body: unknown;
}): Partial<Response> {
  const text = JSON.stringify(init.body);
  return {
    ok: init.ok,
    status: init.status,
    statusText: init.ok ? 'OK' : 'Error',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: async () => init.body,
    text: async () => text,
    clone: function (this: Response) {
      return this;
    },
  } as Response;
}

describe('HTTPClient.get', () => {
  let client: HTTPClient;

  beforeEach(() => {
    cleanupMocks();
    const auth = new AuthStateStore();
    auth.setState({ state: 'authenticated' });
    client = new HTTPClient(
      {
        apiBase: 'http://localhost:8000',
        apiKey: 'test-key',
        enableCaching: false,
        enableMetrics: false,
      },
      auth,
    );
    client.setAuthToken('test-jwt');
  });

  it('puts axios-style params on the fetch URL query string', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeJsonResponse({
        ok: true,
        status: 200,
        body: { connections: [], total: 0 },
      }),
    );

    await client.get(
      '/integrations/connections',
      { params: { owner_kind: 'project', project_id: 99 } } as any,
      { skipCache: true, skipBatching: true },
    );

    expect(global.fetch).toHaveBeenCalled();
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('project_id=99');
    expect(url).toContain('owner_kind=project');
  });

  it('AgentCoin-style get puts query params on URL (params + skipBatching in 2nd arg)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeJsonResponse({
        ok: true,
        status: 200,
        body: {
          project_id: 1,
          account_key: 'acct',
          asset_code: 'AGNT',
          balance_atomic: 0,
        },
      }),
    );

    await client.get(
      '/agentcoin/1/balance',
      {
        params: { account_key: 'acct', asset_code: 'AGNT' },
        skipBatching: true,
      } as any,
    );

    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('account_key=acct');
    expect(url).toContain('asset_code=AGNT');
  });

  it('maps 422 FastAPI validation to BadRequestError', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeJsonResponse({
        ok: false,
        status: 422,
        body: { detail: [{ loc: ['query', 'project_id'], msg: 'required', type: 'missing' }] },
      }),
    );

    await expect(
      client.get('/integrations/connections', { project_id: 1 } as any, {
        skipCache: true,
        skipBatching: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestError);
  });
});

describe('integration transport (flat GET)', () => {
  let client: HTTPClient;

  beforeEach(() => {
    cleanupMocks();
    const auth = new AuthStateStore();
    auth.setState({ state: 'authenticated' });
    client = new HTTPClient(
      {
        apiBase: 'http://localhost:8000',
        apiKey: 'test-key',
        enableCaching: false,
        enableMetrics: false,
      },
      auth,
    );
    client.setAuthToken('test-jwt');
  });

  it('AgentIntegrations.listConnections hits fetch with project_id in URL', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeJsonResponse({ ok: true, status: 200, body: { connections: [], total: 0 } }),
    );

    const integrations = new AgentIntegrations(client);
    await integrations.listConnections({
      owner_kind: 'project',
      project_id: 7,
    });

    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('project_id=7');
    expect(url).toContain('owner_kind=project');
  });

  it('integrationListConnections matches same URL contract', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeJsonResponse({ ok: true, status: 200, body: { connections: [], total: 0 } }),
    );

    await integrationListConnections(client, {
      owner_kind: 'personal',
      project_id: 3,
    });

    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('project_id=3');
    expect(url).toContain('owner_kind=personal');
  });
});
