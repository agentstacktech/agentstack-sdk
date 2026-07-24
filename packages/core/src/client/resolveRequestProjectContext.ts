/**
 * Resolve request project binding — Hosted Contour SoT (Session OS V3.2 H1).
 *
 * Genetic: core.auth.session_cache_contour.gen1
 *
 * Invariant: on hosted `/s/{pid}`, never rewrite X-Project-ID to JWT project_id.
 * Prefer vault Bearer for route pid, else guest (omit Bearer).
 */

export type ProjectBindingMode = 'hosted' | 'shell' | 'guest';

export type ResolveRequestProjectContextInput = {
  /** Pathname project from `/s/:pid` or workspace active id */
  routeProjectId?: number | null;
  jwtProjectId?: number | null;
  headerProjectId?: number | null;
  /** Vault (or memory) token for route/active project when known */
  vaultToken?: string | null;
};

export type ResolveRequestProjectContextResult = {
  mode: ProjectBindingMode;
  projectId: number;
  /** When undefined/empty, Authorization must be omitted */
  bearer?: string;
};

function parsePid(v: number | null | undefined): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Decode JWT payload project_id without verification (header alignment only).
 */
export function jwtProjectIdFromToken(token: string | null | undefined): number | null {
  if (!token || !token.trim()) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return parsePid(payload?.project_id);
  } catch {
    return null;
  }
}

/**
 * Parse `/s/{pid}/...` hosted storefront path.
 */
export function hostedRouteProjectIdFromPath(pathname: string | null | undefined): number | null {
  if (!pathname) return null;
  const m = String(pathname).match(/^\/s\/(\d+)(?:\/|$)/i);
  return m ? parsePid(Number(m[1])) : null;
}

export function resolveRequestProjectContext(
  input: ResolveRequestProjectContextInput,
): ResolveRequestProjectContextResult {
  const routePid = parsePid(input.routeProjectId);
  const jwtPid = parsePid(input.jwtProjectId);
  const headerPid = parsePid(input.headerProjectId);
  const vault = input.vaultToken?.trim() || '';

  if (routePid != null) {
    if (vault) {
      const vaultPid = jwtProjectIdFromToken(vault);
      if (vaultPid === routePid) {
        return { mode: 'hosted', projectId: routePid, bearer: vault };
      }
    }
    // Guest / wrong vault — honor route pid, no Bearer
    return { mode: 'guest', projectId: routePid };
  }

  const shellPid = headerPid ?? jwtPid ?? 1;
  if (vault && jwtProjectIdFromToken(vault) === shellPid) {
    return { mode: 'shell', projectId: shellPid, bearer: vault };
  }
  if (jwtPid != null && headerPid != null && jwtPid !== headerPid) {
    // Honor header project as guest rather than rewriting header to JWT
    return { mode: 'guest', projectId: headerPid };
  }
  if (vault) {
    return { mode: 'shell', projectId: shellPid, bearer: vault };
  }
  return { mode: 'shell', projectId: shellPid };
}
