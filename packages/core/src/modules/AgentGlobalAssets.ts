/**
 * AgentGlobalAssets - Глобальный реестр ассетов
 * Модуль для работы с глобальным реестром ассетов и валют
 */

import { HTTPClient } from '../client/http-client';
import type {
  GlobalAssetCard,
  GlobalAssetsListResponse,
  GlobalAssetsFilters
} from '../types';
import { PaginationResponse } from '../types/shared';

export class AgentGlobalAssets {
  constructor(private client: HTTPClient) {}

  /**
   * Get global asset by namespace
   */
  async getGlobalAsset(namespace: string): Promise<GlobalAssetCard> {
    const response = await this.client.get(`/global-assets/${namespace}`);
    return response.data?.asset || response.data;
  }

  /**
   * List global assets with filtering and pagination
   */
  async listGlobalAssets(
    filters: GlobalAssetsFilters = {},
    pagination: { page?: number; page_size?: number } = {}
  ): Promise<GlobalAssetsListResponse> {
    const params: Record<string, any> = {
      ...filters,
      ...pagination
    };

    // Remove undefined values
    Object.keys(params).forEach(key => {
      if (params[key] === undefined) {
        delete params[key];
      }
    });

    const response = await this.client.get('/global-assets', params);
    return response.data || { assets: [], total: 0, page: 1, page_size: 20, pages: 0 };
  }

  /**
   * Get local assets for a project
   */
  async getLocalAssets(projectId: number): Promise<GlobalAssetCard[]> {
    const response = await this.client.get(`/global-assets/projects/${projectId}/local-assets`);
    return response.data?.assets || [];
  }

  /**
   * Force sync assets from a project
   */
  async syncProject(projectId: number): Promise<{ success: boolean; assets_synced: number }> {
    const response = await this.client.post(`/global-assets/sync/${projectId}`);
    return response.data || { success: false, assets_synced: 0 };
  }

  /**
   * Force sync all active projects
   */
  async syncAllProjects(): Promise<{ success: boolean; results: Record<number, number>; total_assets: number }> {
    const response = await this.client.post('/global-assets/sync-all');
    return response.data || { success: false, results: {}, total_assets: 0 };
  }
}

