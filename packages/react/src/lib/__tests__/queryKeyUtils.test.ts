import {
  assertSerializableQueryKey,
  coerceProjectIdKeyPart,
  isLikelyAgentStackSdk,
  stableKeyPart,
} from '../queryKeyUtils';

describe('queryKeyUtils', () => {
  const fakeSdk = {
    emit: () => {},
    httpClient: {},
    billing: { eventEmitter: null as unknown, getOverview: async () => ({}) },
  };
  fakeSdk.billing.eventEmitter = fakeSdk;

  it('detects SDK-shaped objects', () => {
    expect(isLikelyAgentStackSdk(fakeSdk)).toBe(true);
    expect(isLikelyAgentStackSdk({ billing: {}, httpClient: {} })).toBe(false);
  });

  it('rejects SDK in query keys', () => {
    expect(() => assertSerializableQueryKey(['billing', fakeSdk])).toThrow(/SDK/);
    expect(() => assertSerializableQueryKey(['billing', fakeSdk.billing])).toThrow(/SDK/);
    expect(() => coerceProjectIdKeyPart(fakeSdk)).toThrow(/SDK/);
  });

  it('stableKeyPart serializes plain params', () => {
    const a = stableKeyPart({ b: 1, a: 2 });
    const b = stableKeyPart({ a: 2, b: 1 });
    expect(a).toBe(b);
    expect(() => stableKeyPart(fakeSdk)).toThrow(/SDK/);
  });

  it('accepts primitive query keys', () => {
    expect(() => assertSerializableQueryKey(['finance', 'dashboard-bundle', 1])).not.toThrow();
  });
});
