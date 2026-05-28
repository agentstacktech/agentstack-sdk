import * as fs from 'fs';
import * as path from 'path';
import { appManifestSchema } from '../../src/manifest/schema';

const fixturePath = path.resolve(
  __dirname,
  '../../../../../agentstack-core/tests/ai_builder_it/uam/fixtures/minimal_app_manifest_v1.json',
);

describe('appManifestSchema (UAM v1)', () => {
  it('parses the shared Python fixture JSON (Pydantic ↔ zod parity anchor)', () => {
    const raw = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    const parsed = appManifestSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.app_id).toBe('fixture.min');
      expect(parsed.data.routes[0]?.path).toBe('/');
    }
  });
});
