import {
  isCatalogDeltaPayload,
  isMcpCatalogDeltaFallbackFull,
  mergeMcpCatalogDelta,
  resolveMcpCatalogActionsAfterFetch,
} from '../catalogDelta';

describe('catalogDelta fallback full replace', () => {
  it('isCatalogDeltaPayload is false when delta_fallback is set', () => {
    expect(
      isCatalogDeltaPayload({
        delta: false,
        delta_fallback: 'revision_unknown',
        domains: { core: [{ action: 'a.b' }] },
      }),
    ).toBe(false);
    expect(isMcpCatalogDeltaFallbackFull({ delta_fallback: 'revision_unknown' })).toBe(true);
  });

  it('resolveMcpCatalogActionsAfterFetch replaces on fallback', () => {
    const existing = [{ action: 'stale.old' }, { action: 'keep.me' }];
    const body = {
      delta: false,
      delta_fallback: 'revision_unknown',
      domains: {
        core: [{ action: 'fresh.a' }, { action: 'fresh.b' }],
      },
    };
    const actions = resolveMcpCatalogActionsAfterFetch(existing, body, (p) => {
      const domains = (p as { domains?: Record<string, { action: string }[]> }).domains ?? {};
      return Object.values(domains).flat();
    });
    expect(actions.map((r) => r.action)).toEqual(['fresh.a', 'fresh.b']);
  });

  it('resolveMcpCatalogActionsAfterFetch merges partial delta', () => {
    const existing = [{ action: 'a.old' }];
    const delta = {
      delta: true,
      domains: { d: [{ action: 'a.new' }] },
    };
    const actions = resolveMcpCatalogActionsAfterFetch(existing, delta, () => []);
    expect(actions).toEqual(mergeMcpCatalogDelta(existing, delta));
  });
});