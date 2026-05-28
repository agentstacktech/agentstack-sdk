/**
 * verifyReceipt forwards optional anchor_claim in POST body (REST parity).
 */

import { HTTPClient } from '../../src/client/http-client';
import { AuthStateStore } from '../../src/utils/auth-state';
import { LedgerClient as AgentCoin } from '../../src/economy/clients/LedgerClient';
import { cleanupMocks } from '../setup';

describe('AgentCoin.verifyReceipt', () => {
  let http: HTTPClient;
  let agentcoin: AgentCoin;
  let postedBody: unknown;

  beforeEach(() => {
    cleanupMocks();
    postedBody = undefined;
    const auth = new AuthStateStore();
    auth.setState({ state: 'authenticated' });
    http = new HTTPClient(
      {
        apiBase: 'http://localhost:8000',
        apiKey: 'test-key',
        enableCaching: false,
        enableMetrics: false,
      },
      auth,
    );
    http.setAuthToken('test-jwt');
    jest.spyOn(http, 'post').mockImplementation(async (_url: string, body?: unknown) => {
      postedBody = body;
      return { data: { project_id: 1, ok: true }, headers: {} };
    });
    agentcoin = new AgentCoin(http);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('includes anchor_claim in JSON body when provided', async () => {
    await agentcoin.verifyReceipt(1, {
      receipt: { kind: 'compute_credit_purchase_receipt' },
      declared_hash: 'ab'.repeat(32),
      anchor_claim: { checkpoint_hash: 'cd'.repeat(32), merkle_root: 'ef'.repeat(32) },
    });
    expect(postedBody).toEqual(
      expect.objectContaining({
        receipt: { kind: 'compute_credit_purchase_receipt' },
        declared_hash: 'ab'.repeat(32),
        anchor_claim: { checkpoint_hash: 'cd'.repeat(32), merkle_root: 'ef'.repeat(32) },
      }),
    );
  });
});
