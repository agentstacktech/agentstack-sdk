import { validateAppManifest, assertIntegratorModule } from '../../src/ai-preflight';
import type { AgentStackSDK } from '../../src/sdk';

describe('validateAppManifest', () => {
  it('accepts minimal UAM v1', () => {
    const result = validateAppManifest({
      manifest_version: '1',
      app_id: 'demo',
      name: 'Demo',
      version: '1.0.0',
      routes: [{ path: '/', module_id: 'home', props: {} }],
      modules: ['home'],
      capabilities: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid manifest_version', () => {
    const result = validateAppManifest({ app_id: 'x' });
    expect(result.success).toBe(false);
  });
});

describe('assertIntegratorModule', () => {
  const mockSdk = (audience?: 'integrator' | 'platform_operator') =>
    ({
      getConfig: () => ({ sdkAudience: audience }),
      getCapabilityMatrix: () => ({ domain: [], platform: [] }),
    }) as unknown as AgentStackSDK;

  it('allows non-admin modules', () => {
    expect(() => assertIntegratorModule(mockSdk(), 'payments')).not.toThrow();
  });

  it('throws for admin on integrator audience', () => {
    expect(() => assertIntegratorModule(mockSdk(), 'admin')).toThrow(/ecosystem operators/i);
  });

  it('allows admin for platform_operator', () => {
    expect(() =>
      assertIntegratorModule(mockSdk('platform_operator'), 'admin'),
    ).not.toThrow();
  });
});
