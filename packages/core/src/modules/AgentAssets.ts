/**
 * AgentAssets - Управление ассетами
 * Модуль для работы с ассетами проектов
 */

import { HTTPClient } from '../client/http-client';
import type { BaseAsset, AssetType } from '../types';
import type { AssetPresetsFixture } from '../commerce/assets/schemas';
import { validateAssetPresetsResponse } from '../commerce/assets/schemas';

export interface CreateAssetData {
  name: string;
  type: AssetType;
  price_usdt: string;
  components: any;
}

export interface UpdateAssetData {
  name?: string;
  price_usdt?: string;
  components?: any;
}

export interface ListAssetsParams {
  type?: AssetType;
  category?: string;
  rarity?: string;
  tradeable?: boolean;
  lifecycle?: string;
  q?: string;
}

export interface ImportAssetsPayload {
  assets: unknown[];
  overwrite?: boolean;
}

export interface BulkDeleteAssetsPayload {
  asset_ids: string[];
}

export interface BulkUpdateAssetsPayload {
  updates: Array<{ id: string; [key: string]: unknown }>;
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
    count: number;
  }> {
    const response = await this.client.get(`/projects/${projectId}/assets`, params);
    return response.data;
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

  async exportAssets(projectId: number): Promise<{ assets: BaseAsset[] }> {
    const response = await this.client.get(`/projects/${projectId}/assets/export`);
    const data = response.data ?? response;
    return { assets: data.assets ?? data ?? [] };
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
  ): Promise<{ deleted: number }> {
    const response = await this.client.post(`/projects/${projectId}/assets/bulk-delete`, payload);
    return response.data ?? response;
  }

  async bulkUpdateAssets(
    projectId: number,
    payload: BulkUpdateAssetsPayload,
  ): Promise<{ updated: number }> {
    const response = await this.client.post(`/projects/${projectId}/assets/bulk-update`, payload);
    return response.data ?? response;
  }
}

