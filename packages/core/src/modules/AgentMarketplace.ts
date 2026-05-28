/**
 * AgentMarketplace - Управление маркетплейсом
 * Модуль для работы с объявлениями и сделками
 *
 * @deprecated Prefer `sdk.commerce` (CommerceFacade) for new code.
 */

import { HTTPClient } from '../client/http-client';
import { CommerceFacade } from '../commerce/CommerceFacade';
import type {
  Listing,
  ListingType,
  ListingStatus,
  CreateListingRequest,
  UpdateListingRequest,
  AcceptListingRequest,
  ExchangeHistoryEntry,
  FullExchangeHistoryEntry
} from '../types';

export interface ListListingsParams {
  type?: ListingType;
  status?: ListingStatus;
  project_id?: number;
  seller_id?: number;
  asset_id?: string;
  page?: number;
  limit?: number;
  /** global = all projects; session_project = caller project (default server-side) */
  scope?: 'global' | 'session_project' | 'project';
  search?: string;
}

export interface ListHistoryParams {
  project_id?: number;
  user_id?: number;
  type?: 'outgoing' | 'incoming';
  partner_id?: number;
  page?: number;
  limit?: number;
}

export class AgentMarketplace {
  private readonly commerce: CommerceFacade;

  constructor(private client: HTTPClient) {
    this.commerce = new CommerceFacade(client);
  }

  /**
   * Create new marketplace listing
   * @deprecated Use `sdk.commerce.merchant.createListing`
   */
  async createListing(data: CreateListingRequest): Promise<Listing> {
    const row = await this.commerce.merchant.createListing(
      data as unknown as Record<string, unknown>,
    );
    return row as Listing;
  }

  /**
   * @deprecated Use `sdk.commerce.discovery.listOffers`
   */
  async listStorefront(params?: ListListingsParams) {
    return this.commerce.discovery.listOffers({
      scope: params?.scope === 'project' || params?.project_id ? 'project' : 'global',
      project_id: params?.project_id,
      type: params?.type,
      search: params?.search,
      page: params?.page,
      limit: params?.limit,
    });
  }

  /**
   * Get listing by UUID
   */
  async getListing(listingId: string): Promise<Listing> {
    const response = await this.client.get(`/marketplace/listings/${listingId}`);
    return response.data?.listing || response.data;
  }

  /**
   * List marketplace listings
   */
  async listListings(params?: ListListingsParams): Promise<{
    listings: Listing[];
    count: number;
    total: number;
  }> {
    const response = await this.client.get('/marketplace/listings', params);
    return response.data;
  }

  /**
   * Update listing
   */
  async updateListing(listingId: string, data: UpdateListingRequest): Promise<Listing> {
    const response = await this.client.put(`/marketplace/listings/${listingId}`, data);
    return response.data?.listing || response.data;
  }

  /**
   * Delete listing
   */
  async deleteListing(listingId: string): Promise<{ message: string }> {
    const response = await this.client.delete(`/marketplace/listings/${listingId}`);
    return response.data;
  }

  /**
   * Accept listing (create deal)
   */
  async acceptListing(listingId: string, data: AcceptListingRequest): Promise<Listing> {
    const response = await this.client.post(`/marketplace/listings/${listingId}/accept`, data);
    return response.data?.listing || response.data;
  }

  /**
   * Lock deal assets
   */
  async lockDeal(listingId: string, side: 'seller' | 'buyer'): Promise<{ message: string }> {
    const response = await this.client.post(`/marketplace/listings/${listingId}/lock`, { side });
    return response.data;
  }

  /**
   * Confirm deal
   */
  async confirmDeal(listingId: string, side: 'seller' | 'buyer'): Promise<{ message: string }> {
    const response = await this.client.post(`/marketplace/listings/${listingId}/confirm`, { side });
    return response.data;
  }

  /**
   * Cancel deal
   */
  async cancelDeal(listingId: string): Promise<{ message: string }> {
    const response = await this.client.post(`/marketplace/listings/${listingId}/cancel`);
    return response.data;
  }

  /**
   * Get full exchange history
   */
  async getHistory(params?: ListHistoryParams): Promise<{
    history: FullExchangeHistoryEntry[];
    count: number;
    total: number;
  }> {
    const response = await this.client.get('/marketplace/history', params);
    return response.data;
  }

  /**
   * Get project exchange history
   */
  async getProjectHistory(projectId: number, params?: Omit<ListHistoryParams, 'project_id'>): Promise<{
    history: ExchangeHistoryEntry[];
    count: number;
    total: number;
  }> {
    const response = await this.client.get(`/marketplace/projects/${projectId}/exchange/history`, params);
    return response.data;
  }

  /**
   * Get user exchange history
   */
  async getUserHistory(userId: number, projectId?: number, params?: Omit<ListHistoryParams, 'user_id' | 'project_id'>): Promise<{
    history: ExchangeHistoryEntry[];
    count: number;
    total: number;
  }> {
    const queryParams: any = { ...params };
    if (projectId) {
      queryParams.project_id = projectId;
    }
    const response = await this.client.get(`/marketplace/users/${userId}/exchange/history`, queryParams);
    return response.data;
  }
}

