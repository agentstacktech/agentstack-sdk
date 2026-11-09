import { describe, expect, it } from 'vitest';

import {
  mapHostedListingRow,
  normalizeBearerToken,
  probeHostedSession,
  resolveHostedFlagshipProjectId,
  resolveHostedProjectIdFromLocation,
  resolveHostedWorkspaceProjectIdFromLogin,
  resolveSessionBearerToken,
} from '../index';

describe('sdk.commerce.hosted', () => {
  it('resolveSessionBearerToken prefers access_token (mint SoT mirrors user_token)', () => {
    expect(
      resolveSessionBearerToken({
        session: { user_token: 'a.b.c' },
        access_token: 'x.y.z',
      }),
    ).toBe('x.y.z');
  });

  it('normalizeBearerToken extracts jwt from hybrid', () => {
    expect(normalizeBearerToken('1:2::jwt.part.here')).toBe('jwt.part.here');
  });

  it('resolveHostedProjectIdFromLocation reads /s/{pid}/', () => {
    const win = {
      location: { pathname: '/s/1444/editflow/' },
      __AGENTSTACK_VERTICAL__: undefined,
    } as Window & { __AGENTSTACK_VERTICAL__?: { product_project_id?: number } };
    expect(resolveHostedProjectIdFromLocation(win)).toBe(1444);
    expect(resolveHostedFlagshipProjectId(win)).toBe(1444);
  });

  it('resolveHostedWorkspaceProjectIdFromLogin prefers vertical_workspace', () => {
    expect(
      resolveHostedWorkspaceProjectIdFromLogin(
        { vertical_workspace: { project_id: 2130 }, project_id: 2041 },
        2041,
      ),
    ).toBe(2130);
  });

  it('probeHostedSession returns false without token', async () => {
    expect(await probeHostedSession({ projectId: 2 })).toBe(false);
  });

  it('mapHostedListingRow uses offer row SoT', () => {
    const row = mapHostedListingRow({
      listing_uuid: 'abc',
      price_usdt: '9.99',
      asset_card: { name: 'Widget', description: 'Test' },
    });
    expect(row.uuid).toBe('abc');
    expect(row.title).toBe('Widget');
    expect(row.priceUsdt).toBe('9.99');
  });
});
