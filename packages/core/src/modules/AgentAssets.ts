/**
 * AgentAssets - Управление ассетами
 * Модуль для работы с ассетами проектов
 */

import { HTTPClient } from '../client/http-client';
import type { BaseAsset, AssetType } from '../types';
import type { AssetPresetsFixture } from '../commerce/assets/schemas';
import { validateAssetPresetsResponse } from '../commerce/assets/schemas';

export interface CreateAssetData {
  name?: string;
  type?: AssetType;
  price_usdt?: string;
  components?: any;
  preset_id?: string;
  preset?: string;
  preset_inputs?: Record<string, unknown>;
  data?: Record<string, unknown>;
  description?: string;
}

export interface UpdateAssetData {
  name?: string;
  price_usdt?: string;
  components?: any;
  data?: Record<string, unknown>;
}

export interface ListAssetsParams {
  type?: AssetType;
  category?: string;
  rarity?: string;
  tradeable?: boolean;
  lifecycle?: string;
  /** ECS index card status (index-light filter; distinct from lifecycle). */
  status?: string;
  q?: string;
  cross_project?: boolean;
  include_catalog_scope?: boolean;
  projection?: 'summary' | 'full';
  limit?: number;
  offset?: number;
}

export interface AssetsListScope {
  project_id?: number;
  source?: string;
  visible_total?: number;
  canonical_total?: number;
  drift?: boolean;
  drift_reason?: string;
}

export interface ImportAssetsPayload {
  assets: unknown[];
  overwrite?: boolean;
}

export interface BulkDeleteAssetsPayload {
  asset_ids: string[];
}

export interface BulkUpdateAssetsPayload {
  updates: Array<{ asset_id: string; id?: string; [key: string]: unknown }>;
}

export interface TransferAssetData {
  to_user_id: number;
  to_project_id: number;
  quantity?: number;
}

export type ListAssetPresetsResponse = AssetPresetsFixture & {
  success?: boolean;
  project_id?: number;
};

export interface AssetActivityEvent {
  ts: string;
  action: string;
  detail?: string;
}

export interface ExportAssetsParams {
  /** Comma-separated on wire; subset export without full catalog scan when indexed. */
  asset_ids?: string[];
}

export class AgentAssets {
  constructor(private client: HTTPClient) {}

  /**
   * List deterministic wizard presets (`shared/fixtures/asset_presets_v1.json`).
   */
  async listAssetPresets(projectId: number): Promise<ListAssetPresetsResponse> {
    const response = await this.client.get(`/projects/${projectId}/asset-presets`);
    const data = response.data ?? response;
    return validateAssetPresetsResponse(data);
  }

  /**
   * Create new asset
   */
  async createAsset(projectId: number, data: CreateAssetData): Promise<BaseAsset> {
    const response = await this.client.post(`/projects/${projectId}/assets`, data);
    return response.data?.asset || response.data;
  }

  /**
   * Get asset by ID
   */
  async getAsset(projectId: number, assetId: string): Promise<BaseAsset> {
    const response = await this.client.get(`/projects/${projectId}/assets/${assetId}`);
    return response.data?.asset || response.data;
  }

  /**
   * List assets
   */
  async listAssets(projectId: number, params?: ListAssetsParams): Promise<{
    assets: BaseAsset[];
    items?: BaseAsset[];
    count?: number;
    total?: number;
    has_more?: boolean;
    limit?: number;
    offset?: number;
    projection?: string;
    scope?: AssetsListScope;
    env_uuid?: string;
  }> {
    const response = await this.client.get(`/projects/${projectId}/assets`, params);
    const data = response.data ?? {};
    const rows = data.assets ?? data.items ?? [];
    const count =
      typeof data.count === 'number'
        ? data.count
        : data.has_more === true
          ? undefined
          : rows.length;
    return { ...data, assets: rows, count };
  }

  /**
   * Update asset
   */
  async updateAsset(projectId: number, assetId: string, data: UpdateAssetData): Promise<BaseAsset> {
    const response = await this.client.put(`/projects/${projectId}/assets/${assetId}`, data);
    return response.data?.asset || response.data;
  }

  /**
   * Delete asset
   */
  async deleteAsset(projectId: number, assetId: string): Promise<{ message: string }> {
    const response = await this.client.delete(`/projects/${projectId}/assets/${assetId}`);
    return response.data;
  }

  /**
   * Transfer asset
   */
  async transferAsset(projectId: number, assetId: string, data: TransferAssetData): Promise<{ message: string }> {
    const response = await this.client.post(`/projects/${projectId}/assets/${assetId}/transfer`, data);
    return response.data;
  }

  async exportAssets(
    projectId: number,
    params?: ExportAssetsParams,
  ): Promise<{ assets: BaseAsset[] }> {
    const query =
      params?.asset_ids?.length
        ? { asset_ids: params.asset_ids.join(',') }
        : undefined;
    const response = await this.client.get(`/projects/${projectId}/assets/export`, query);
    const data = response.data ?? response;
    return { assets: data.assets ?? data ?? [] };
  }

  async getAssetActivity(
    projectId: number,
    assetId: string,
    opts?: { limit?: number },
  ): Promise<{ events: AssetActivityEvent[] }> {
    const response = await this.client.get(
      `/projects/${projectId}/assets/${assetId}/activity`,
      opts?.limit != null ? { limit: opts.limit } : undefined,
    );
    const data = response.data ?? response;
    return { events: data.events ?? [] };
  }

  async reindexAssetsCatalog(
    projectId: number,
  ): Promise<{ success: boolean; reindexed?: number }> {
    const response = await this.client.post(`/projects/${projectId}/assets/reindex`, {});
    return response.data ?? response;
  }

  async importAssets(
    projectId: number,
    payload: ImportAssetsPayload,
  ): Promise<{ imported: number; failed?: unknown[] }> {
    const response = await this.client.post(`/projects/${projectId}/assets/import`, payload);
    return response.data ?? response;
  }

  async bulkDeleteAssets(
    projectId: number,
    payload: BulkDeleteAssetsPayload,
  ): Promise<{ deleted: number; failed?: string[] }> {
    const response = await this.client.post(`/projects/${projectId}/assets/bulk-delete`, payload);
    return response.data ?? response;
  }

  async bulkUpdateAssets(
    projectId: number,
    payload: BulkUpdateAssetsPayload,
  ): Promise<{ updated: number; failed?: unknown[] }> {
    const response = await this.client.post(`/projects/${projectId}/assets/bulk-update`, payload);
    return response.data ?? response;
  }
}

