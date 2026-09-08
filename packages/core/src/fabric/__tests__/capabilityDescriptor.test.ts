import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseCapabilityDescriptorFixture, parseMcpCapabilityDescriptorSlim, parseMcpCatalogActionRow } from '../capabilityDescriptor';

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

  it('parses MCP catalog slim enrichment (core.mcp.self_description.gen1)', () => {
    const slim = parseMcpCapabilityDescriptorSlim({
      id: 'crm.list_contacts',
      domain: 'crm',
      complexity: 'simple',
      source: 'overlay',
      genetic_tags: ['core.crm.hub.gen1'],
      when_to_use: 'List contacts before upsert.',
      related_tools: ['crm.upsert_contact'],
    });
    expect(slim.source).toBe('overlay');
    expect(slim.related_tools).toContain('crm.upsert_contact');
  });

  it('parses MCP catalog action row', () => {
    const row = parseMcpCatalogActionRow({
      action: 'crm.list_contacts',
      safe_action: 'crm_list_contacts',
      capability_descriptor: {
        id: 'crm.list_contacts',
        domain: 'crm',
        complexity: 'simple',
        source: 'overlay',
      },
    });
    expect(row.action).toBe('crm.list_contacts');
    expect(row.capability_descriptor?.source).toBe('overlay');
  });
});
