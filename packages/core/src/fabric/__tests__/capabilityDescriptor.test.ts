import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseCapabilityDescriptorFixture } from '../capabilityDescriptor';

const fixturePath = join(
  __dirname,
  '../../../../../../shared/fixtures/capability_descriptor_v1.json',
);

describe('capabilityDescriptorSchema', () => {
  it('parses shared fixture (core.fabric.capability_descriptor.gen1)', () => {
    const raw = JSON.parse(readFileSync(fixturePath, 'utf8'));
    const parsed = parseCapabilityDescriptorFixture(raw);
    expect(parsed.version).toBe(1);
    expect(parsed.descriptors.length).toBeGreaterThanOrEqual(2);
    expect(parsed.descriptors.some((d) => d.id === 'data_access.set_policy')).toBe(true);
    expect(parsed.descriptors.some((d) => d.id === 'context.get')).toBe(true);
  });
});
