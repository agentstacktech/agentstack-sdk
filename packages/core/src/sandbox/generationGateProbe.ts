/**
 * Gate A probe — GET /generations/{id}/status (DRY with MCP generation.supply_status, scope=gate).
 * Genetic tags: sdk.sandbox.generation.gen1 · core.generation_flow.gen1
 */
import type { GenerationSettingsLike } from './generationReview';

export type GenerationSupplyScope = 'gate' | 'full';

export type SandboxMutationGate = {
  apply_ready: boolean;
  reason?: string;
  recovery_hint?: string;
  auto_generation_mode?: boolean;
  env_uuid?: string;
  anchor_count?: number;
  anchor_uuids?: string[];
  next_actions?: Array<Record<string, unknown>>;
};

/** REST status slice used by SPA banners and headless apply guards. */
export type GenerationSupplyGateStatus = {
  project_id: number;
  supply_scope?: GenerationSupplyScope;
  auto_generation_mode: boolean;
  canary_auto_route: boolean;
  active_env_uuid?: string | null;
  rolling_out?: Record<string, unknown> | null;
  traffic_weight: number;
  pending_count: number;
  settings: GenerationSettingsLike & Record<string, unknown>;
  sandbox_gate?: SandboxMutationGate;
};

export type GenerationGateProbeClient = {
  getStatus(
    projectId: number,
    envUuid?: string | null,
  ): Promise<GenerationSupplyGateStatus>;
};

/** Server SoT for Gate A (`sandbox_gate.apply_ready`). */
export function sandboxApplyReadyFromGate(
  gate: SandboxMutationGate | null | undefined,
): boolean {
  if (!gate || typeof gate.apply_ready !== 'boolean') return false;
  return gate.apply_ready;
}

/**
 * Lightweight supply/gate probe for agents and scripts (prefer over raw MCP when REST session is wired).
 * For env-scoped batch probes use MCP `generation.supply_status` with `env_uuid` / `required_env_uuids`.
 */
export async function probeGenerationSupplyGate(
  client: GenerationGateProbeClient,
  projectId: number,
  envUuid?: string | null,
): Promise<GenerationSupplyGateStatus> {
  const raw = await client.getStatus(projectId, envUuid);
  return raw as GenerationSupplyGateStatus;
}

export type McpExecuteFn = (
  action: string,
  params: Record<string, unknown>,
) => Promise<Record<string, unknown>>;

/** Thin MCP batch helper — maps to `generation.env_snapshot` (operator Gate A ladder). */
export async function getGenerationGateSnapshot(
  execute: McpExecuteFn,
  projectId: number,
  envUuid?: string | null,
): Promise<Record<string, unknown>> {
  const params: Record<string, unknown> = { project_id: projectId };
  const eu = String(envUuid ?? '').trim();
  if (eu) params.env_uuid = eu;
  const body = await execute('generation.env_snapshot', params);
  return body;
}
