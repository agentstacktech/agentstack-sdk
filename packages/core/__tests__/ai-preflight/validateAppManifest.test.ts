import { validateAppManifest } from '../../src/ai-preflight';

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
