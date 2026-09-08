/**
 * MCP guidance surface — SDK parity with instruction_plane (G-SELF-09).
 */
import {
  MCP_GUIDANCE_PROMPTS,
  MCP_GUIDANCE_URLS,
  MCP_ONBOARDING_RECIPE_IDS,
  recommendedMcpPrompts,
  recommendedMcpRecipes,
  resolveMcpGuidanceUrl,
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

  it('resolveMcpGuidanceUrl strips duplicate /mcp suffix', () => {
    expect(resolveMcpGuidanceUrl('https://agentstack.tech/api/mcp', '/mcp/actions')).toBe(
      'https://agentstack.tech/api/mcp/actions',
    );
    expect(resolveMcpGuidanceUrl('https://agentstack.tech/api', '/mcp/health')).toBe(
      'https://agentstack.tech/api/mcp/health',
    );
  });
});
