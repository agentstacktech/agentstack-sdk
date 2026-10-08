/**
 * MCP guidance surface — SDK parity with instruction_plane (G-SELF-09).
 */
import {
  buildMcpUserContext,
  DEFAULT_MCP_LIST_PROJECTION,
  MCP_GUIDANCE_PROMPTS,
  MCP_GUIDANCE_URLS,
  MCP_ONBOARDING_RECIPE_IDS,
  buildMcpCatalogActionsUrl,
  fetchMcpPreflight,
  discoveryLadderSteps,
  httpBootstrapLadderSteps,
  mergeMcpCatalogDelta,
  parseListProjection,
  recommendedMcpPrompts,
  recommendedMcpRecipes,
  recommendedDiscoveryLadder,
  resolveMcpGuidanceUrl,
  parseMcpClientManifest,
} from '../guidance';

describe('mcp guidance', () => {
  it('exposes recipes and prompts list URLs', () => {
    expect(MCP_GUIDANCE_URLS.recipes).toBe('/mcp/recipes');
    expect(MCP_GUIDANCE_URLS.promptsList).toBe('/mcp/prompts/list');
    expect(MCP_GUIDANCE_URLS.organs).toBe('/mcp/organs');
  });

  it('includes knowledge, guidance, treasury prompts (G-SELF-09)', () => {
    expect(MCP_GUIDANCE_PROMPTS.knowledgeMentor).toBe('agentstack_knowledge_mentor');
    expect(MCP_GUIDANCE_PROMPTS.guidanceCompass).toBe('agentstack_guidance_compass');
    expect(MCP_GUIDANCE_PROMPTS.projectTreasury).toBe('agentstack_project_treasury');
    expect(recommendedMcpPrompts()).toContain('agentstack_knowledge_mentor');
  });

  it('lists onboarding recipes aligned with instruction_plane', () => {
    const recipes = recommendedMcpRecipes();
    expect(recipes).toContain('mcp_knowledge_ingest');
    expect(recipes).toContain('mcp_crm_contact_deal');
    expect(recipes).toContain('mcp_generation_diff');
    expect(recipes.length).toBe(MCP_ONBOARDING_RECIPE_IDS.length);
  });

  it('parseMcpClientManifest requires clients array', () => {
    const parsed = parseMcpClientManifest({
      version: 1,
      endpoint: 'https://agentstack.tech/mcp',
      clients: [{ id: 'cursor', label: 'Cursor' }],
    });
    expect(parsed.clients[0]?.id).toBe('cursor');
    expect(() => parseMcpClientManifest({ version: 1 })).toThrow(/clients/);
  });

  it('buildMcpUserContext merges nested user and current_user', () => {
    const ctx = buildMcpUserContext({
      user: { user_id: 1, role: 'admin' },
      current_user: { project_id: 9 },
      user_id: 42,
    });
    expect(ctx.user_id).toBe(42);
    expect(ctx.project_id).toBe(9);
    expect(ctx.role).toBe('admin');
  });

  it('parseListProjection defaults to summary', () => {
    expect(DEFAULT_MCP_LIST_PROJECTION).toBe('summary');
    expect(parseListProjection({})).toBe('summary');
    expect(parseListProjection({ projection: 'full' })).toBe('full');
    expect(parseListProjection({ projection: 'invalid' })).toBe('summary');
  });

  it('exposes discovery ladder and paradigm prompt', () => {
    const ladder = recommendedDiscoveryLadder();
    expect(ladder[0]).toContain('agentstack_session_setup');
    expect(ladder[1]).toBe('agents.work_next');
    expect(ladder[2]).toBe('discovery.status');
    expect(ladder).toContain('discovery.search');
    expect(ladder).toContain('preflight.check');
    expect(discoveryLadderSteps()).toHaveLength(6);
    expect(discoveryLadderSteps()[1]?.url).toBe('agents.work_next');
    expect(MCP_GUIDANCE_PROMPTS.sessionSetup).toBe('agentstack_session_setup');
    expect(MCP_GUIDANCE_PROMPTS.paradigmShift).toBe('agentstack_paradigm_shift');
    expect(MCP_ONBOARDING_RECIPE_IDS[0]).toBe('mcp_session_setup');
    expect(MCP_ONBOARDING_RECIPE_IDS[1]).toBe('mcp_work_loop_v1');
  });

  it('httpBootstrapLadderSteps defaults catalog schemas=public', () => {
    const ladder = httpBootstrapLadderSteps('https://agentstack.tech/api');
    expect(ladder).toHaveLength(4);
    expect(ladder[0]?.url).toContain('mode=contract');
    expect(ladder[3]?.url).toContain('schemas=public');
    expect(ladder[3]?.label).toBe('Public catalog schemas');
  });

  it('buildMcpCatalogActionsUrl and mergeMcpCatalogDelta parity with plugin kernel', () => {
    const url = buildMcpCatalogActionsUrl('https://agentstack.tech', {
      sinceEtag: 'abc',
      delta: true,
    });
    expect(url).toContain('schemas=public');
    const hotUrl = buildMcpCatalogActionsUrl('https://agentstack.tech', { hot: true });
    expect(hotUrl).toContain('schemas=hot');
    expect(url).toContain('since_etag=abc');
    expect(url).toContain('delta=1');
    const merged = mergeMcpCatalogDelta(
      [{ action: 'crm.list_contacts' }, { action: 'crm.old' }],
      {
        domains: {
          crm: [{ action: 'crm.upsert_contact' }, { action: 'crm.old', removed: true }],
        },
      },
    );
    const ids = merged.map((r) => r.action);
    expect(ids).toContain('crm.list_contacts');
    expect(ids).toContain('crm.upsert_contact');
    expect(ids).not.toContain('crm.old');
  });

  it('fetchMcpPreflight encodes Wave 9 query params', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { granted: true } }),
    });
    const originalFetch = global.fetch;
    global.fetch = fetchMock as typeof fetch;

    await fetchMcpPreflight({
      apiBase: 'https://agentstack.tech/api',
      token: 'test-token',
      projectId: 1444,
      requiredCaps: ['project.read'],
      action: 'logic.delete',
      actionParams: { logic_id: 'uuid', dry_run: true },
      pathUpdates: [{ path: 'project.data.foo', role: 'editor' }],
      publishAsked: true,
    });

    const calledUrl = String(fetchMock.mock.calls[0]?.[0] ?? '');
    expect(calledUrl).toContain('project_id=1444');
    expect(calledUrl).toContain('permission=project.read');
    expect(calledUrl).toContain('action=logic.delete');
    expect(calledUrl).toContain('publish_asked=true');
    expect(calledUrl).toContain('action_params=');
    expect(calledUrl).toContain('path_updates=');
    global.fetch = originalFetch;
  });

  it('resolveMcpGuidanceUrl strips duplicate /mcp suffix', () => {
    expect(resolveMcpGuidanceUrl('https://agentstack.tech/api/mcp', '/mcp/actions')).toBe(
      'https://agentstack.tech/api/mcp/actions',
    );
    expect(resolveMcpGuidanceUrl('https://agentstack.tech/api', '/mcp/health')).toBe(
      'https://agentstack.tech/api/mcp/health',
    );
  });
});
