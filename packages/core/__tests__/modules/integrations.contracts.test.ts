import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  IntegrationRecipeManifestSchema,
  InstallRecipeResultSchema,
  ListInboxEventsResponseSchema,
} from '../../src/types/integrations';
import { buildIntegrationHookCurl } from '../../src/modules/AgentIntegrations';

describe('integration hub zod contracts', () => {
  it('parses install recipe result fixture', () => {
    const raw = JSON.parse(
      readFileSync(
        resolve(__dirname, '../fixtures/integration_install_recipe_result.json'),
        'utf8',
      ),
    );
    expect(InstallRecipeResultSchema.parse(raw)).toEqual(raw);
  });

  it('parses inbox list envelope', () => {
    const raw = {
      events: [
        {
          id: '1',
          connection_id: 'c',
          provider: 'stripe',
          slug: 's',
          status: 'queued',
          idempotency_key: null,
          job_id: 'j',
          correlation_id: 'x',
          created_at: '2020-01-01T00:00:00',
        },
      ],
      total: 1,
    };
    expect(ListInboxEventsResponseSchema.parse(raw)).toEqual(raw);
  });

  it('parses recipe quick setup metadata', () => {
    const raw = {
      id: 'recipe_generic_inbound',
      provider: 'generic_webhook',
      name: 'Custom inbound webhook',
      category: 'general',
      tags: ['quick', 'webhook'],
      triggers: [{ type: 'webhook' }],
      blocks: [],
      connection_scopes: ['custom.event'],
      setup_steps: [{ kind: 'copy', target: 'webhook_url' }],
      quick_setup: {
        icon_key: 'generic_webhook',
        setup_time_seconds: 30,
        secret_source: 'agentstack_generated',
        primary_cta: 'quick_install',
        event_presets: ['custom.event'],
      },
    };
    expect(IntegrationRecipeManifestSchema.parse(raw).quick_setup.secret_source).toBe(
      'agentstack_generated',
    );
  });

  it('builds displayed webhook curl examples', () => {
    expect(buildIntegrationHookCurl('/api/hooks/2/generic_webhook/custom', { ok: true })).toContain(
      "-d '{\"ok\":true}'",
    );
  });
});
