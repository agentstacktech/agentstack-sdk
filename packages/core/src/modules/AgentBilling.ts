import { HTTPClient } from '../client/http-client'
import { SimpleEventEmitter } from '../utils/event-emitter'

export interface BillingOverview {
  success: boolean
  user_subscription: {
    user_id: number
    subscription_tier: string
    subscription_price: number
    billing_cycle: string
    next_billing_date: string
    status: string
    total_projects: number
    total_storage_mb: number
    total_users: number
  }
  projects_summary: Array<{
    project_id: number
    project_name: string
    project_status: string
    subscription_tier: string
    subscription_price: number
    subscription_limits: any
    subscription_features: any[]
    usage: {
      json_storage: {
        used_mb: number
        limit_mb: number
        percentage: number
        status: string
      }
      rules_engine: {
        calls_this_month: number
        limit_per_month: number
        percentage: number
        status: string
      }
      users: {
        count: number
        limit: number
      }
    }
    last_updated: string
  }>
  projects: Array<{
    project_id: number
    project_name: string
    users_count: number
    json_storage_mb: number
    rules_engine_calls: number
    usage_percentage: {
      json_storage: number
      rules_engine: number
    }
    status: 'healthy' | 'warning' | 'critical'
  }>
  recommendations: {
    global: string[]
    per_project: Record<number, string[]>
  }
}

export interface ProjectBilling {
  project_id: number
  project_name: string
  subscription_tier: string
  subscription_price: number
  limits: Record<string, any>
  features: string[]
  usage: {
    json_storage_mb: number
    rules_engine_calls: number
    api_calls: number
    users_count: number
  }
  usage_percentage: {
    json_storage: number
    rules_engine: number
    api_calls: number
  }
  status: 'healthy' | 'warning' | 'critical'
  recommendations: string[]
}

export class AgentBilling {
  private httpClient: HTTPClient
  private eventEmitter: SimpleEventEmitter

  constructor(httpClient: HTTPClient, eventEmitter: SimpleEventEmitter) {
    this.httpClient = httpClient
    this.eventEmitter = eventEmitter
  }

  /**
   * Get billing overview for user
   * @param userId - User ID
   * @returns Promise<BillingOverview>
   */
  async getOverview(userId: number): Promise<BillingOverview> {
    try {
      this.eventEmitter.emit('billing:overview:request', { userId })
      
      // ✅ CRITICAL: Pass user_id as params, not in URL string
      // This ensures proper URL encoding and prevents caching issues
      // Do not batch with lightweight social GETs — overview can be slow and widens batch tail latency.
      const response = await this.httpClient.get(
        '/billing/overview',
        { user_id: userId },
        { headers: { 'X-No-Batch': 'true' }, skipBatching: true }
      )
      
      this.eventEmitter.emit('billing:overview:success', { userId, data: response })
      
      // Backend возвращает данные напрямую в response, не в response.data
      return response as unknown as BillingOverview
    } catch (error) {
      this.eventEmitter.emit('billing:overview:error', { userId, error })
      throw error
    }
  }

  /**
   * Get detailed billing information for specific project
   * @param projectId - Project ID
   * @param userId - User ID (deprecated, server uses authenticated user from token)
   * @returns Promise<ProjectBilling>
   */
  async getProjectBilling(projectId: number, userId?: number): Promise<ProjectBilling> {
    try {
      this.eventEmitter.emit('billing:project:request', { projectId, userId })
      
      // ✅ CRITICAL: Server uses authenticated user from token, not query parameter
      // Query parameter user_id is ignored for security - always use authenticated user's ID
      // We don't pass user_id in query params to avoid confusion
      const response = await this.httpClient.get(`/billing/project/${projectId}`)
      
      this.eventEmitter.emit('billing:project:success', { projectId, userId, data: response })
      
      // Backend возвращает данные напрямую в response, не в response.data
      return response as unknown as ProjectBilling
    } catch (error) {
      this.eventEmitter.emit('billing:project:error', { projectId, userId, error })
      throw error
    }
  }

  /**
   * Get usage statistics for user
   * @param userId - User ID
   * @returns Promise<any>
   */
  async getUsageStats(userId: number): Promise<any> {
    try {
      this.eventEmitter.emit('billing:usage:request', { userId })
      
      const response = await this.httpClient.get(`/billing/usage?user_id=${userId}`)
      
      this.eventEmitter.emit('billing:usage:success', { userId, data: response })
      
      // Backend возвращает данные напрямую в response, не в response.data
      return response
    } catch (error) {
      this.eventEmitter.emit('billing:usage:error', { userId, error })
      throw error
    }
  }

  /**
   * Get subscription tiers information
   * @returns Promise<any>
   */
  async getSubscriptionTiers(): Promise<any> {
    try {
      this.eventEmitter.emit('billing:tiers:request')
      
      const response = await this.httpClient.get('/billing/tiers')
      
      this.eventEmitter.emit('billing:tiers:success', { data: response })
      
      // Backend возвращает данные напрямую в response, не в response.data
      return response
    } catch (error) {
      this.eventEmitter.emit('billing:tiers:error', { error })
      throw error
    }
  }

  /**
   * Get billing history for user
   * @param userId - User ID
   * @param limit - Number of records to return
   * @param offset - Offset for pagination
   * @returns Promise<any>
   */
  async getBillingHistory(userId: number, limit: number = 50, offset: number = 0): Promise<any> {
    try {
      this.eventEmitter.emit('billing:history:request', { userId, limit, offset })
      
      const response = await this.httpClient.get(`/billing/history?user_id=${userId}&limit=${limit}&offset=${offset}`)
      
      this.eventEmitter.emit('billing:history:success', { userId, limit, offset, data: response })
      
      // Backend возвращает данные напрямую в response, не в response.data
      return response
    } catch (error) {
      this.eventEmitter.emit('billing:history:error', { userId, limit, offset, error })
      throw error
    }
  }

  /**
   * Get project usage statistics
   * @param projectId - Project ID
   * @param userId - User ID (deprecated, server uses authenticated user from token)
   * @returns Promise<any>
   */
  async getProjectUsage(projectId: number, userId?: number): Promise<any> {
    try {
      this.eventEmitter.emit('billing:project_usage:request', { projectId, userId })
      
      // ✅ CRITICAL: Server uses authenticated user from token, not query parameter
      // Query parameter user_id is ignored for security - always use authenticated user's ID
      // We don't pass user_id in query params to avoid confusion
      const response = await this.httpClient.get(`/billing/project/${projectId}`)
      
      this.eventEmitter.emit('billing:project_usage:success', { projectId, userId, data: response })
      
      // Backend возвращает данные напрямую в response, не в response.data
      return response
    } catch (error) {
      this.eventEmitter.emit('billing:project_usage:error', { projectId, userId, error })
      throw error
    }
  }

  /**
   * Get billing usage and overage information
   * @param projectId - Project ID (optional)
   * @returns Promise with usage, overage charges, and storage packages
   */
  async getUsage(projectId?: number): Promise<any> {
    try {
      this.eventEmitter.emit('billing:usage:request', { projectId })
      
      const params: any = {}
      if (projectId) {
        params.project_id = projectId
      }
      
      const response = await this.httpClient.get('/billing/usage', params)
      
      this.eventEmitter.emit('billing:usage:success', { projectId, data: response })
      
      return response
    } catch (error) {
      this.eventEmitter.emit('billing:usage:error', { projectId, error })
      throw error
    }
  }

  /**
   * Purchase storage package for project
   * @param packageSize - Package size in GB (5, 10, 25)
   * @param projectId - Project ID (optional)
   * @returns Promise with purchase result
   */
  async purchaseStoragePackage(packageSize: number, projectId?: number): Promise<any> {
    try {
      this.eventEmitter.emit('billing:storage_package:request', { packageSize, projectId })
      
      const params: any = { package_size: packageSize }
      if (projectId) {
        params.project_id = projectId
      }
      
      const response = await this.httpClient.post('/billing/storage-package', {}, params)
      
      this.eventEmitter.emit('billing:storage_package:success', { packageSize, projectId, data: response })
      
      return response
    } catch (error) {
      this.eventEmitter.emit('billing:storage_package:error', { packageSize, projectId, error })
      throw error
    }
  }

  /**
   * Update overage configuration for project
   * @param config - Overage configuration
   * @param projectId - Project ID (optional)
   * @returns Promise with updated configuration
   */
  async updateOverageConfig(
    config: { enabled?: boolean; logic_engine_enabled?: boolean; storage_enabled?: boolean },
    projectId?: number
  ): Promise<any> {
    try {
      this.eventEmitter.emit('billing:overage_config:request', { config, projectId })
      
      const params: any = {}
      if (config.enabled !== undefined) params.enabled = config.enabled
      if (config.logic_engine_enabled !== undefined) params.logic_engine_enabled = config.logic_engine_enabled
      if (config.storage_enabled !== undefined) params.storage_enabled = config.storage_enabled
      if (projectId) params.project_id = projectId
      
      const response = await this.httpClient.patch('/billing/overage', {}, params)
      
      this.eventEmitter.emit('billing:overage_config:success', { config, projectId, data: response })
      
      return response
    } catch (error) {
      this.eventEmitter.emit('billing:overage_config:error', { config, projectId, error })
      throw error
    }
  }
}







