/**
 * AgentDNA - Universal DNA API Module
 * 
 * Philosophy v0.1.0: 8-Field DNA!
 * Philosophy v0.1.16: Elegant Minimalism!
 * Philosophy v0.1.40: Use proven patterns!
 * 
 * Convenience wrapper for DNA API operations
 * Works with ALL 22 tables using 8-Field DNA structure
 */

import { HTTPClient } from '../client/http-client';
import { diagnosticLogger } from '../utils/DiagnosticLogger';
import { DnaLineageClient, DnaMergePolicyClient } from '../dna';

// ============================================================================
// TYPES
// ============================================================================

/**
 * 8-Field DNA Entity
 * Philosophy v0.1.0: Universal structure for all entities!
 */
export interface DNAEntity<TData = any, TConfig = any> {
  id: number;
  uuid: string;
  project_id: number;
  user_id: number;
  data: TData;
  config: TConfig;
  created_at: string;
  updated_at: string | null;
}

/**
 * DNA List Response
 */
export interface DNAListResponse<T = any> {
  entities: DNAEntity<T>[];
  total: number;
  pagination?: {
    page: number;
    limit: number;
    offset: number;
  };
}

/**
 * DNA Query Params
 */
export interface DNAQueryParams {
  project_id?: number;
  user_id?: number;
  limit?: number;
  offset?: number;
  [key: string]: any;
}

/**
 * DNA Filter (for advanced queries)
 * Philosophy v0.1.16: Simple but powerful!
 */
export interface DNAFilter {
  // Match exact values
  match?: Record<string, any>;
  
  // Data field filters (JSON path)
  data?: Record<string, any>;
  
  // Config field filters (JSON path)
  config?: Record<string, any>;
  
  // Pagination
  limit?: number;
  offset?: number;
}

// ============================================================================
// AGENT DNA MODULE
// ============================================================================

/**
 * AgentDNA - Universal DNA Operations
 * 
 * Philosophy v0.1.40: Proven SDK pattern!
 * Philosophy v0.1.16: Minimal, elegant wrapper!
 * 
 * For AI: "Use for ALL 22 tables with 8-Field DNA structure!"
 */
export class AgentDNA {
  private client: HTTPClient;
  /** Lineage graph (`/api/dna/lineage/*`). Genetic tag: core.8dna.lineage_graph.gen1 */
  public readonly lineage: DnaLineageClient;
  /** Ecosystem merge policy settings. Genetic tag: core.8dna.ecosystem_merge_policy.gen1 */
  public readonly mergePolicy: DnaMergePolicyClient;

  constructor(client: HTTPClient) {
    this.client = client;
    this.lineage = new DnaLineageClient(client);
    this.mergePolicy = new DnaMergePolicyClient(client);
  }

  /**
   * Get single entity by UUID
   * 
   * ✅ Philosophy: Use uuid instead of database ID!
   * Philosophy v0.1.40: Circuit Breaker protection automatic!
   * 
   * @example
   * const user = await sdk.dna.get('data_projects_user', 'uuid-here');
   */
  async get<T = any>(table: string, uuid: string): Promise<DNAEntity<T>> {
    const url = `/dna/${table}/${uuid}`;
    
    try {
      diagnosticLogger.log('AgentDNA', 'get', 'info', { table, uuid, url });
      const response = await this.client.get(url);
      
      if (response.data) {
        diagnosticLogger.log('AgentDNA', 'get', 'success', { 
          table, uuid, url, 
          hasEntity: !!response.data.entity,
          hasData: !!response.data.data,
          responseKeys: Object.keys(response.data)
        }, url, response.data);
        return response.data?.entity || response.data;
      } else {
        diagnosticLogger.log('AgentDNA', 'get', 'error', { 
          table, uuid, url, 
          error: 'No data in response',
          response
        }, url, response);
        throw new Error('No data in response');
      }
    } catch (error) {
      diagnosticLogger.log('AgentDNA', 'get', 'error', { 
        table, uuid, url, 
        error: error instanceof Error ? error.message : String(error)
      }, url, null, error);
      throw error;
    }
  }

  /**
   * List entities with filters
   * 
   * Philosophy v0.1.40: Circuit Breaker protection automatic!
   * 
   * @example
   * const { entities } = await sdk.dna.list('data_projects_user', { 
   *   project_id: 1, 
   *   limit: 20 
   * });
   */
  async list<T = any>(
    table: string, 
    params?: DNAQueryParams
  ): Promise<DNAListResponse<T>> {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }

    const url = `/dna/${table}${queryParams.toString() ? `?${queryParams}` : ''}`;
    
    try {
      diagnosticLogger.log('AgentDNA', 'list', 'info', { table, params: params || {}, url });
      const response = await this.client.get(url);
      
      if (response.data) {
        const entities = response.data.entities || [];
        diagnosticLogger.log('AgentDNA', 'list', 'success', { 
          table, url, 
          entityCount: entities.length,
          hasEntities: !!response.data.entities,
          hasTable: !!response.data.table,
          hasTotal: !!response.data.total,
          responseKeys: Object.keys(response.data)
        }, url, response.data);
        return response.data;
      } else {
        diagnosticLogger.log('AgentDNA', 'list', 'error', { 
          table, url, 
          error: 'No data in response',
          response
        }, url, response);
        throw new Error('No data in response');
      }
    } catch (error) {
      diagnosticLogger.log('AgentDNA', 'list', 'error', { 
        table, url, 
        error: error instanceof Error ? error.message : String(error)
      }, url, null, error);
      throw error;
    }
  }

  /**
   * Create new entity
   * 
   * Philosophy v0.1.40: Circuit Breaker protection automatic!
   * Philosophy v0.1.9: POST = create complete entity!
   * 
   * @example
   * const newUser = await sdk.dna.create('data_projects_user', {
   *   project_id: 1,
   *   user_id: 1,
   *   data: { username: 'lance' },
   *   config: { theme: 'dark' }
   * });
   */
  async create<T = any>(
    table: string,
    entity: Partial<DNAEntity<T>>
  ): Promise<DNAEntity<T>> {
    const response = await this.client.post(`/dna/${table}`, entity);
    return response.data?.entity || response.data;
  }

  /**
   * Update entity — PUT replaces the entire `data` blob.
   *
   * This is not a merge. For one nested project.data leaf use
   * {@link AgentDNA.patch} → `PATCH /projects/{id}/data`.
   *
   * @example
   * const updated = await sdk.dna.update('data_projects_8dna', 'uuid-here', {
   *   data: { bio: 'Developer' }  // entire data document
   * });
   */
  async update<T = any>(
    table: string,
    uuid: string,
    updates: Partial<Pick<DNAEntity<T>, 'data' | 'config'>>
  ): Promise<DNAEntity<T>> {
    const response = await this.client.put(`/dna/${table}/${uuid}`, updates);
    return response.data?.entity || response.data;
  }

  /**
   * Patch one path under project.data (REST PATCH /projects/{id}/data).
   *
   * There is no `PATCH /dna/{table}/{uuid}` route. Do not pass a table name.
   *
   * @example
   * await sdk.dna.patch(123, 'config.theme', 'dark');
   * await sdk.dna.patch(123, 'config.theme', undefined, { writeMode: 'delete' });
   */
  async patch(
    projectId: number,
    path: string,
    value?: unknown,
    options?: { writeMode?: 'replace' | 'merge' | 'delete' | 'set' | 'put' | 'patch' }
  ): Promise<{
    success: boolean;
    project_id: number;
    path: string;
    write?: { mode: string };
  }> {
    if (typeof projectId === 'string') {
      throw new Error(
        'AgentDNA.patch no longer calls PATCH /dna/{table}/{uuid} (that route does not exist). ' +
          'Use sdk.dna.patch(projectId, path, value) → PATCH /projects/{id}/data, ' +
          'or sdk.dna.update(table, uuid, { data }) for a full data replace (PUT).'
      );
    }
    const writeMode =
      options?.writeMode || (value === undefined ? 'delete' : 'replace');
    const response = await this.client.patch(`/projects/${projectId}/data`, {
      path,
      value: writeMode === 'delete' ? null : value,
      write_mode: writeMode,
    });
    return response.data as {
      success: boolean;
      project_id: number;
      path: string;
      write?: { mode: string };
    };
  }

  /**
   * Delete entity
   * 
   * ✅ Philosophy: Use uuid instead of database ID!
   * Philosophy v0.1.40: Circuit Breaker protection automatic!
   * 
   * @example
   * await sdk.dna.delete('data_projects_user', 'uuid-here');
   */
  async delete(table: string, uuid: string): Promise<{ success: boolean; message: string }> {
    const response = await this.client.delete(`/dna/${table}/${uuid}`);
    return response.data;
  }

  /**
   * Query entities with advanced filters
   * 
   * Philosophy v0.1.40: Circuit Breaker protection automatic!
   * Philosophy v0.1.16: Simple but powerful!
   * 
   * @example
   * const users = await sdk.dna.query('data_projects_user', {
   *   match: { project_id: 1 },
   *   data: { role: 'admin' },
   *   limit: 10
   * });
   */
  async query<T = any>(
    table: string,
    filter: DNAFilter
  ): Promise<DNAListResponse<T>> {
    // Build query params from filter
    const params: DNAQueryParams = {};
    
    if (filter.match) {
      Object.assign(params, filter.match);
    }
    
    if (filter.limit) params.limit = filter.limit;
    if (filter.offset) params.offset = filter.offset;
    
    // For now, use list with params
    // TODO: Backend support for advanced JSON filtering
    return this.list(table, params);
  }

  /**
   * Bulk operations (convenience method)
   * 
   * ✅ Philosophy: Use uuid instead of database ID!
   * Philosophy v0.1.40: Circuit Breaker protection automatic!
   * Philosophy v0.1.16: Minimal but useful!
   * 
   * @example
   * const results = await sdk.dna.bulkUpdate('data_projects_user', ['uuid1', 'uuid2', 'uuid3'], {
   *   config: { theme: 'dark' }
   * });
   */
  async bulkUpdate<T = any>(
    table: string,
    uuids: string[],
    updates: Partial<Pick<DNAEntity<T>, 'data' | 'config'>>
  ): Promise<{
    updated_count: number;
    failed_count: number;
    updated_uuids: string[];
    failed_uuids: string[];
  }> {
    // Execute in parallel with Circuit Breaker protection
    const results = await Promise.allSettled(
      uuids.map(uuid => this.update(table, uuid, updates))
    );

    const updated_uuids: string[] = [];
    const failed_uuids: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        updated_uuids.push(uuids[index]);
      } else {
        failed_uuids.push(uuids[index]);
      }
    });

    return {
      updated_count: updated_uuids.length,
      failed_count: failed_uuids.length,
      updated_uuids,
      failed_uuids
    };
  }
}




