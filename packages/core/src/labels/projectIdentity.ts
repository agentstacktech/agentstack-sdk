/**
 * Project display label helper for SDK consumers (`frontend.shell.project_identity.gen1`).
 * Mirrors agentstack-frontend `projectLabel` field order.
 */

export type ProjectLabelInput = {
  id?: number | string;
  name?: string;
  project_name?: string;
  display_name?: string;
  title?: string;
  slug?: string;
};

export type AccountCtx = {
  username?: string;
  email?: string;
};

const GENERIC = new Set([
  'agent',
  'user',
  'project',
  'projects',
  'unnamed project',
  'unnamed',
]);

function useful(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  if (!t || GENERIC.has(t.toLowerCase())) return undefined;
  return t;
}

function collides(field: string, ctx?: AccountCtx): boolean {
  const norm = field.trim().toLowerCase();
  const u = ctx?.username?.trim().toLowerCase();
  const e = ctx?.email?.trim().toLowerCase();
  if (u && norm === u) return true;
  if (e && norm === e) return true;
  if (e && norm === e.split('@')[0]) return true;
  return false;
}

const ECOSYSTEM_PROJECT_ID = 1;
const ECOSYSTEM_DISPLAY_FALLBACK = 'AgentStack Platform';

export function getProjectDisplayLabel(
  project: ProjectLabelInput,
  ctx?: AccountCtx,
): string {
  const id = Number(project.id);
  if (id === ECOSYSTEM_PROJECT_ID) {
    const eco = (project as { ecosystem?: { name?: string; platform_name?: string } })
      .ecosystem;
    const ecoCandidates = [
      eco?.platform_name,
      eco?.name,
      project.project_name,
      project.name,
      project.title,
    ];
    for (const raw of ecoCandidates) {
      const label = useful(raw);
      if (!label) continue;
      if (ctx && collides(label, ctx)) continue;
      return label;
    }
    return ECOSYSTEM_DISPLAY_FALLBACK;
  }

  const candidates = [
    project.name,
    project.project_name,
    project.display_name,
    project.title,
    project.slug,
  ];
  for (const raw of candidates) {
    const label = useful(raw);
    if (!label) continue;
    if (ctx && collides(label, ctx)) continue;
    return label;
  }
  if (Number.isFinite(id) && id >= 1) return `Project ${id}`;
  return 'Unnamed Project';
}
