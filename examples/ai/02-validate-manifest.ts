import { validateAppManifest } from '@agentstack/sdk';

const sample = {
  manifest_version: '1' as const,
  app_id: 'demo',
  name: 'Demo App',
  version: '1.0.0',
  routes: [{ path: '/', module_id: 'home', props: {} }],
  modules: ['home'],
  capabilities: [],
};

const result = validateAppManifest(sample);
console.log(result.success ? 'valid' : result.error);
