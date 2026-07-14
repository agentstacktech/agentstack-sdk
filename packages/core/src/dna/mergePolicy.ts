/**
 * SDK — ecosystem merge policy settings (core.8dna.ecosystem_merge_policy.gen1)
 */
import type { HTTPClient } from '../client/http-client';

export type ConflictStrategy = 'ecosystem_wins' | 'tenant_wins' | 'deep_merge';

export interface EcosystemMergePolicy {
  enabled: boolean;
  components: string[];
  on_conflict: ConflictStrategy;
}

export interface EcosystemMergeSettingsResponse {
  project_id: number;
  ecosystem_merge: EcosystemMergePolicy;
}

export class DnaMergePolicyClient {
  constructor(private readonly http: HTTPClient) {}

  async get(projectId: number): Promise<EcosystemMergeSettingsResponse> {
    const response = await this.http.get<EcosystemMergeSettingsResponse>(
      `/projects/${projectId}/settings/ecosystem-merge`,
    );
    return (
      (response as { data?: EcosystemMergeSettingsResponse }).data ??
      (response as EcosystemMergeSettingsResponse)
    );
  }

  async set(
    projectId: number,
    patch: Partial<EcosystemMergePolicy>,
  ): Promise<EcosystemMergeSettingsResponse> {
    const response = await this.http.patch<EcosystemMergeSettingsResponse>(
      `/projects/${projectId}/settings/ecosystem-merge`,
      patch,
    );
    return (
      (response as { data?: EcosystemMergeSettingsResponse }).data ??
      (response as EcosystemMergeSettingsResponse)
    );
  }
}
