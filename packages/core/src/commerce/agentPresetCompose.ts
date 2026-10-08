/**
 * Compose commerce asset drafts with Agents Fleet extensions.
 *
 * Genetic tag: ``sdk.agents.gen1`` · ``sdk.commerce.assets.gen1``.
 */

import { composeAssetFromPreset } from './assets/compose/composeAssetFromPreset';
import type { AssetDraft, AssetPresetAnswers } from './assets/schemas';
import type { PresetSource } from './assets/compose/presetSource';

export interface AgentPresetComposeAnswers extends AssetPresetAnswers {
  templateId?: string;
  template_id?: string;
  specPatch?: Record<string, unknown>;
  orchestrationPack?: Record<string, unknown>;
}

/** Map wizard answers into ``components.extensions.agent_fleet`` for bundled presets. */
export function composeAgentPresetFromAsset(
  projectId: number,
  presetId: string,
  answers: AgentPresetComposeAnswers,
  source?: PresetSource,
): Omit<AssetDraft, 'id'> {
  const draft = composeAssetFromPreset(projectId, presetId, answers, source);
  const ext: Record<string, unknown> = {
    template_id: answers.templateId ?? answers.template_id,
  };
  if (answers.specPatch && typeof answers.specPatch === 'object') {
    ext.spec_patch = answers.specPatch;
  }
  if (answers.orchestrationPack && typeof answers.orchestrationPack === 'object') {
    ext.orchestration_pack = answers.orchestrationPack;
  }
  const components = { ...(draft.components ?? {}) } as Record<string, unknown>;
  const extensions = {
    ...((components.extensions as Record<string, unknown> | undefined) ?? {}),
    agent_fleet: ext,
  };
  components.extensions = extensions;
  return { ...draft, components };
}

export async function importAgentPresetFromAsset(
  agentsFleet: {
    importFromAsset?: (projectId: number, body: Record<string, unknown>) => Promise<unknown>;
    importPack?: (
      projectId: number,
      body: Record<string, unknown>,
    ) => Promise<{ success: boolean; agent: Record<string, unknown> }>;
  },
  projectId: number,
  asset: Record<string, unknown>,
  options: { name?: string; env_uuid?: string } = {},
): Promise<unknown> {
  if (typeof agentsFleet.importFromAsset === 'function') {
    return agentsFleet.importFromAsset(projectId, {
      asset,
      name: options.name,
      ...(options.env_uuid ? { env_uuid: options.env_uuid } : {}),
    });
  }
  const ext = (asset.components as Record<string, unknown> | undefined)?.extensions as
    | Record<string, unknown>
    | undefined;
  const fleet = ext?.agent_fleet as Record<string, unknown> | undefined;
  const templateId = fleet?.template_id;
  if (!templateId) {
    throw new Error('asset_missing_agent_fleet_extension');
  }
  if (typeof agentsFleet.importPack !== 'function') {
    throw new Error('agents_fleet_import_pack_unavailable');
  }
  return agentsFleet.importPack(projectId, {
    agent_spec: { template_id: String(templateId) },
    template_id: String(templateId),
    name: options.name,
    fork_on_collision: true,
    ...(options.env_uuid ? { env_uuid: options.env_uuid } : {}),
  });
}
