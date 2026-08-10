import { describe, expect, it } from '@jest/globals';

import {
  classifyRouteScope,
  isEcosystemScopedApiPath,
} from '../../src/client/routeScopeClassifier';
import { resolveRequestProjectContext } from '../../src/client/resolveRequestProjectContext';

describe('routeScopeClassifier', () => {
  it('marks profile wallets as ecosystem', () => {
    expect(isEcosystemScopedApiPath('/api/profile/wallets')).toBe(true);
    expect(classifyRouteScope('/api/profile/wallets', '/user/finance')).toBe('ecosystem');
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

  it('shell workspace mismatch stays guest off ecosystem path', () => {
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
