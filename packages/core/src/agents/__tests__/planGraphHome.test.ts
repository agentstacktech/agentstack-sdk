import {
  defaultWorkGraphHome,
  isPersonalGraphHome,
  isSandboxEnvAllowedForGraphHome,
  mergeWorkGraphScopeParams,
  mcpGraphHomeFields,
  parseGraphHomeParam,
  parseMembershipConfig,
} from '../planGraph';

describe('planGraph home helpers', () => {
  it('parseGraphHomeParam canonicalizes self → project_self', () => {
    expect(parseGraphHomeParam('self')).toBe('project_self');
    expect(parseGraphHomeParam('project_self')).toBe('project_self');
    expect(parseGraphHomeParam(undefined)).toBe('project');
    expect(parseGraphHomeParam('bogus')).toBe('project');
  });

  it('mcpGraphHomeFields omits home on project leaf', () => {
    expect(mcpGraphHomeFields('project')).toEqual({});
    expect(mcpGraphHomeFields('self')).toEqual({ home: 'project_self' });
  });

  it('isSandboxEnvAllowedForGraphHome', () => {
    expect(isSandboxEnvAllowedForGraphHome('project')).toBe(true);
    expect(isSandboxEnvAllowedForGraphHome('self')).toBe(false);
    expect(isPersonalGraphHome('project_self')).toBe(true);
  });

  it('mergeWorkGraphScopeParams personal strips env', () => {
    expect(
      mergeWorkGraphScopeParams(
        { env_uuid: 'x', node_id: 'n1' },
        { home: 'self', envUuid: 'x' },
      ),
    ).toEqual({ node_id: 'n1', home: 'project_self' });
  });

  it('defaultWorkGraphHome reads config.work_graph.default_home', () => {
    expect(defaultWorkGraphHome(null)).toBe('project');
    expect(
      defaultWorkGraphHome({ config: { work_graph: { default_home: 'project_self' } } }),
    ).toBe('project_self');
    expect(defaultWorkGraphHome({ work_graph: { default_home: 'self' } })).toBe('project_self');
  });

  it('parseMembershipConfig reads membership + work_graph summary', () => {
    expect(parseMembershipConfig(null)).toEqual({});
    expect(
      parseMembershipConfig({
        membership: { join_policy: 'open', open_join: true },
        work_graph: { default_home: 'project_self' },
      }),
    ).toEqual({
      joinPolicy: 'open',
      openJoin: true,
      defaultHome: 'project_self',
    });
  });
});
