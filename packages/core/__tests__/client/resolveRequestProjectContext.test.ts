import { describe, expect, it } from '@jest/globals';

import {
  classifyRouteScope,
  isAdminScopedApiPath,
  isEcosystemScopedApiPath,
  isIdentityScopedApiPath,
  isNonSession401Path,
  isUserMePath,
  isUserScopedSessionPath,
} from '../../src/client/routeScopeClassifier';
import { resolveRequestProjectContext } from '../../src/client/resolveRequestProjectContext';

describe('routeScopeClassifier', () => {
  it('marks admin BFF paths as admin-scoped', () => {
    expect(isAdminScopedApiPath('/api/admin/data/snapshot')).toBe(true);
    expect(isAdminScopedApiPath('/api/admin/hub-snapshot')).toBe(true);
    expect(isEcosystemScopedApiPath('/api/admin/data/snapshot')).toBe(false);
  });

  it('marks profile wallets as ecosystem', () => {
    expect(isEcosystemScopedApiPath('/api/profile/wallets')).toBe(true);
    expect(classifyRouteScope('/api/profile/wallets', '/user/finance')).toBe('ecosystem');
  });

  it('marks user API keys as identity-scoped (not vault[1] treasury)', () => {
    expect(isIdentityScopedApiPath('/api/user/api-keys')).toBe(true);
    expect(isIdentityScopedApiPath('/api/user/api-keys/abc/rotate')).toBe(true);
    expect(isIdentityScopedApiPath('/user/api-keys')).toBe(true);
    expect(isIdentityScopedApiPath('https://agentstack.tech/api/user/api-keys')).toBe(true);
    expect(isEcosystemScopedApiPath('/api/user/api-keys')).toBe(false);
    expect(classifyRouteScope('/api/user/api-keys', '/user/profile')).toBe('workspace');
  });

  it('treats /users/me and PAT as non-session 401 paths', () => {
    expect(isUserMePath('/api/users/me/ai-runtime')).toBe(true);
    expect(isUserMePath('https://agentstack.tech/api/users/me')).toBe(true);
    expect(isUserMePath('/api/users/members')).toBe(false);
    expect(isNonSession401Path('/api/users/me/ai-runtime')).toBe(true);
    expect(isNonSession401Path('/api/user/api-keys')).toBe(true);
    expect(isNonSession401Path('/api/user/api-keys/limits/check')).toBe(true);
    expect(isNonSession401Path('/api/projects')).toBe(false);
  });

  it('marks GET /projects list as user-scoped session (not /projects/:id)', () => {
    expect(isUserScopedSessionPath('/api/projects')).toBe(true);
    expect(isUserScopedSessionPath('/projects')).toBe(true);
    expect(isUserScopedSessionPath('/api/projects/1444/bots')).toBe(false);
    expect(isUserScopedSessionPath('/user/api-keys')).toBe(true);
  });

  it('marks storage APIs as ecosystem (dashboard vault[1] contour)', () => {
    expect(isEcosystemScopedApiPath('/api/storage/quota')).toBe(true);
    expect(isEcosystemScopedApiPath('/api/storage/files?project_id=1')).toBe(true);
    expect(isEcosystemScopedApiPath('/api/storage/temp')).toBe(true);
    expect(classifyRouteScope('/api/storage/files', '/dev/projects/1444/storage')).toBe(
      'ecosystem',
    );
  });

  it('marks hosted pathname as hosted', () => {
    expect(classifyRouteScope('/api/storage/list', '/s/1438/demo')).toBe('hosted');
  });
});

describe('resolveRequestProjectContext ecosystem cases', () => {
  it('hosted guest when vault missing', () => {
    const r = resolveRequestProjectContext({
      routeProjectId: 1438,
      jwtProjectId: 1,
      headerProjectId: 1438,
    });
    expect(r.mode).toBe('guest');
  });

  it('shell ecosystem route keeps shell mode for header 1', () => {
    const r = resolveRequestProjectContext({
      headerProjectId: 1,
      jwtProjectId: 1444,
      requestPath: '/api/profile/wallets',
    });
    expect(r.mode).toBe('shell');
    expect(r.projectId).toBe(1);
  });

  it('storage path with eco header remints rather than guest-strip', () => {
    const r = resolveRequestProjectContext({
      headerProjectId: 1,
      jwtProjectId: 1444,
      requestPath: '/api/storage/quota?project_id=1',
    });
    expect(r.mode).toBe('shell');
    expect(r.projectId).toBe(1);
    expect(r.bearer).toBeUndefined();
  });

  it('PAT path keeps workspace vault bearer when header is eco', () => {
    const payload = Buffer.from(JSON.stringify({ project_id: 1444 })).toString('base64');
    const token = `h.${payload}.s`;
    const r = resolveRequestProjectContext({
      headerProjectId: 1,
      jwtProjectId: 1444,
      vaultToken: token,
      requestPath: '/api/user/api-keys',
    });
    expect(r.mode).toBe('shell');
    expect(r.bearer).toBe(token);
    expect(r.projectId).toBe(1444);
  });

  it('GET /projects list keeps vault bearer on header/jwt mismatch', () => {
    const payload = Buffer.from(JSON.stringify({ project_id: 1444 })).toString('base64');
    const token = `h.${payload}.s`;
    const r = resolveRequestProjectContext({
      headerProjectId: 1,
      jwtProjectId: 1444,
      vaultToken: token,
      requestPath: '/api/projects',
    });
    expect(r.mode).toBe('shell');
    expect(r.bearer).toBe(token);
  });

  it('PAT path stays guest without vault token', () => {
    const r = resolveRequestProjectContext({
      headerProjectId: 1,
      jwtProjectId: 1444,
      requestPath: '/api/user/api-keys',
    });
    expect(r.mode).toBe('guest');
    expect(r.bearer).toBeUndefined();
  });

  it('platform admin keeps ecosystem bearer when workspace header is a tenant', () => {
    const payload = Buffer.from(JSON.stringify({ project_id: 1 })).toString('base64');
    const token = `h.${payload}.s`;
    const r = resolveRequestProjectContext({
      headerProjectId: 1444,
      jwtProjectId: 1,
      vaultToken: token,
      requestPath: '/api/admin/hub-snapshot',
    });
    expect(r.mode).toBe('shell');
    expect(r.projectId).toBe(1);
    expect(r.bearer).toBe(token);
  });

  it('neural graph keeps ecosystem bearer on tenant header', () => {
    const payload = Buffer.from(JSON.stringify({ project_id: 1 })).toString('base64');
    const token = `h.${payload}.s`;
    const r = resolveRequestProjectContext({
      headerProjectId: 1444,
      jwtProjectId: 1,
      vaultToken: token,
      requestPath: '/api/diagnostics/neural-graph',
    });
    expect(r.mode).toBe('shell');
    expect(r.projectId).toBe(1);
    expect(r.bearer).toBe(token);
  });

  it('platform admin with a tenant JWT keeps the identity bearer on ecosystem pid', () => {
    const payload = Buffer.from(JSON.stringify({ project_id: 1444 })).toString('base64');
    const token = `h.${payload}.s`;
    const r = resolveRequestProjectContext({
      headerProjectId: 1444,
      jwtProjectId: 1444,
      vaultToken: token,
      requestPath: '/api/admin/data/people',
    });
    expect(r.mode).toBe('shell');
    expect(r.projectId).toBe(1);
    expect(r.bearer).toBe(token);
  });

  it('shell workspace mismatch keeps the identity bearer', () => {
    const payload = Buffer.from(JSON.stringify({ project_id: 1 })).toString('base64');
    const token = `h.${payload}.s`;
    const r = resolveRequestProjectContext({
      headerProjectId: 2,
      jwtProjectId: 1,
      vaultToken: token,
      requestPath: '/api/rbac/permissions',
    });
    expect(r.mode).toBe('shell');
    expect(r.projectId).toBe(2);
    expect(r.bearer).toBe(token);
  });

  it('workspace neural events follow the header project', () => {
    const payload = Buffer.from(JSON.stringify({ project_id: 1 })).toString('base64');
    const token = `h.${payload}.s`;
    const r = resolveRequestProjectContext({
      headerProjectId: 2,
      jwtProjectId: 1,
      vaultToken: token,
      requestPath: '/api/neural/events',
    });
    expect(r.mode).toBe('shell');
    expect(r.projectId).toBe(2);
    expect(r.bearer).toBe(token);
  });

  it('shell workspace mismatch stays guest when no bearer exists', () => {
    const r = resolveRequestProjectContext({
      headerProjectId: 1438,
      jwtProjectId: 1,
      requestPath: '/api/projects/1438/crm/contacts',
    });
    expect(r.mode).toBe('guest');
  });

  it('vault match wins on header/jwt mismatch', () => {
    const payload = Buffer.from(JSON.stringify({ project_id: 1 })).toString('base64');
    const token = `h.${payload}.s`;
    const r = resolveRequestProjectContext({
      headerProjectId: 1,
      jwtProjectId: 1444,
      vaultToken: token,
    });
    expect(r.mode).toBe('shell');
    expect(r.bearer).toBe(token);
  });
});
