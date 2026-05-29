import { AgentStackSDK } from '../src/sdk';
import { AGENTSTACK_CORE_VERSION, SDK_VERSION } from '../src/version';

describe('sdk.platform', () => {
  it('SDK_VERSION.semantic matches AGENTSTACK_CORE_VERSION (synced from shared/constants.py)', () => {
    expect(SDK_VERSION.semantic).toBe(AGENTSTACK_CORE_VERSION);
    expect(AGENTSTACK_CORE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  const baseConfig = {
    apiBase: 'https://example.com/api',
    projectId: 1,
  };

  it('exposes same instances as root properties', () => {
    const sdk = new AgentStackSDK(baseConfig);
    expect(sdk.platform.http).toBe(sdk.httpClient);
    expect(sdk.platform.auth).toBe(sdk.auth);
    expect(sdk.platform.protocol).toBe(sdk.protocol);
    expect(sdk.platform.snapshots).toBe(sdk.entitySnapshotRepository);
    expect(sdk.platform.projects).toBe(sdk.projects);
    expect(sdk.platform.social).toBe(sdk.social);
    expect(sdk.platform.webPush).toBe(sdk.webPush);
  });

  it('getCapabilityMatrix lists platform and domain entries', () => {
    const sdk = new AgentStackSDK(baseConfig);
    const m = sdk.getCapabilityMatrix();
    expect(m.semantic).toBeDefined();
    expect(m.generation).toBeDefined();
    expect(m.platform.some((e) => e.id === 'protocol')).toBe(true);
    expect(m.domain.some((e) => e.id === 'payments')).toBe(true);
    expect(m.platform.every((e) => e.enabled)).toBe(true);
  });

  it('getCapabilityMatrix reflects SDKConfig.modules', () => {
    const sdk = new AgentStackSDK({
      ...baseConfig,
      modules: { gameData: false, payments: false },
    });
    const m = sdk.getCapabilityMatrix();
    expect(m.domain.find((e) => e.id === 'gameData')?.enabled).toBe(false);
    expect(m.domain.find((e) => e.id === 'payments')?.enabled).toBe(false);
    expect(m.domain.find((e) => e.id === 'docs')?.enabled).toBe(true);
  });

  it('getModuleCatalog merges matrix with docRefs and accessPaths', () => {
    const sdk = new AgentStackSDK(baseConfig);
    const c = sdk.getModuleCatalog();
    expect(c.productVersion).toBeDefined();
    expect(c.modules.length).toBeGreaterThan(10);
    const protocol = c.modules.find((m) => m.id === 'protocol');
    expect(protocol?.accessPaths).toContain('sdk.platform.protocol');
    expect(protocol?.docRefs.some((d) => d.includes('AGENT_PROTOCOL'))).toBe(true);
    expect(protocol?.examples.length).toBeGreaterThan(0);
    const http = c.modules.find((m) => m.id === 'http');
    expect(http?.accessPaths).toContain('sdk.httpClient');
    const socialMod = c.modules.find((m) => m.id === 'social');
    expect(socialMod?.accessPaths).toContain('sdk.social');
    expect(socialMod?.accessPaths).toContain('sdk.platform.protocol.socialPublicIndex');
  });

  it('integrator catalog excludes platform-operator admin modules', () => {
    const sdk = new AgentStackSDK(baseConfig);
    const ids = sdk.getModuleCatalog().modules.map((m) => m.id);
    expect(ids).not.toContain('admin');
    expect(ids).not.toContain('adminData');
  });

  it('getModuleCatalog respects module gates like getCapabilityMatrix', () => {
    const sdk = new AgentStackSDK({
      ...baseConfig,
      modules: { payments: false },
    });
    const pay = sdk.getModuleCatalog().modules.find((m) => m.id === 'payments');
    expect(pay?.enabled).toBe(false);
  });
});
