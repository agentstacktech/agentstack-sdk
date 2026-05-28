/**
 * AgentAPI - Основные API операции
 * Модуль для работы с основными API операциями
 */

import { HTTPClient } from '../client/http-client';
import { logger } from '../utils/logger';
import { executeOrNotFoundFallback } from '../utils/httpDeleteIdempotent';

// ✅ Import shared types (AI-First!)
import type {
  Project,
  ProjectUser,
  CreateProjectData,
  UpdateProjectData,
  ProjectListOptions,
  ProjectDataSnapshot,
  ProjectDataPathValue,
  PatchProjectDataBody,
  Session,
  GetSessionsOptions,
  SessionsResponse,
  RequestConfig
} from '../types';

// ✅ Module-specific types only
export interface AddUserToProjectData {
  user_email: string;
  role: string;
  permissions?: string[];
}

export class AgentAPI {
  private client: HTTPClient;
  private readonly apiBase = '';

  constructor(client: HTTPClient) {
    this.client = client;
  }

  async getProjects(
    params?: {
      is_active?: boolean;
      limit?: number;
      offset?: number;
      /** Backend: only projects where the user is owner or member (e.g. builder list). */
      accessible_only?: boolean;
      /** Backend: force recomputing accessible_project_ids (e.g. after invite in another tab). */
      refresh?: boolean;
    },
    requestOptions?: Partial<RequestConfig>
  ): Promise<{
    projects: Project[];
    pagination: {
      page: number;
      limit: number;
      total: number;
    };
  }> {
    // ✅ FIX: Pass params directly, not wrapped in { params }
    // Only pass params if they exist and have values
    const queryParams = params && Object.keys(params).length > 0 ? params : undefined;
    const response = await this.client.get('/projects', queryParams, requestOptions);
    // Extract projects from the response structure (flat or nested `data`)
    const data = response.data as Record<string, unknown> | null | undefined;
    const rawList =
      (data?.projects as unknown) ??
      ((data?.data as Record<string, unknown> | undefined)?.projects as unknown) ??
      (Array.isArray((data?.data as unknown[] | undefined)) ? (data?.data as unknown[]) : undefined) ??
      (Array.isArray(data) ? data : undefined);
    const projects = Array.isArray(rawList) ? (rawList as Project[]) : [];
    return {
      projects,
      pagination: {
        page: 1,
        limit: projects.length,
        total:
          (typeof data?.total_projects === 'number' ? data.total_projects : undefined) ??
          projects.length
      }
    };
  }

  async getProject(projectId: number, options?: Partial<RequestConfig>): Promise<Project> {
    const response = await this.client.get(`/projects/${projectId}`, undefined, options);
    
    logger.debug('AgentAPI.getProject: Raw response', {
      hasData: !!response.data,
      dataKeys: response.data ? Object.keys(response.data) : [],
      hasDataData: !!response.data?.data,
      dataDataKeys: response.data?.data ? Object.keys(response.data.data) : [],
      hasConfig: !!response.data?.data?.config,
      configType: typeof response.data?.data?.config,
      configKeys: response.data?.data?.config && typeof response.data.data.config === 'object' ? Object.keys(response.data.data.config) : [],
      apiKeysCount: response.data?.data?.config?.api_keys && typeof response.data.data.config.api_keys === 'object' ? Object.keys(response.data.data.config.api_keys).length : 0
    });
    
    // Backend returns { success: true, data: project_dict, ... }
    // ✅ CRITICAL: Always use response.data.data if it exists (it contains config)
    let projectData = response.data?.data || response.data;
    
    // ✅ CRITICAL: Ensure config field is preserved - copy it explicitly
    if (projectData && response.data?.data?.config) {
      // Explicitly copy config from response.data.data
      projectData.config = typeof response.data.data.config === 'string' 
        ? JSON.parse(response.data.data.config) 
        : response.data.data.config;
    } else if (projectData && !projectData.config) {
      // Config doesn't exist - initialize empty
      projectData.config = {};
    }
    
    logger.debug('AgentAPI.getProject: Final project data', {
      hasProjectData: !!projectData,
      projectDataKeys: projectData ? Object.keys(projectData) : [],
      hasConfig: !!projectData?.config,
      configType: typeof projectData?.config,
      configIsObject: projectData?.config && typeof projectData.config === 'object' && !Array.isArray(projectData.config),
      configKeys: projectData?.config && typeof projectData.config === 'object' && !Array.isArray(projectData.config) ? Object.keys(projectData.config) : [],
      hasApiKeys: !!projectData?.config?.api_keys,
      apiKeysType: typeof projectData?.config?.api_keys,
      apiKeysIsObject: projectData?.config?.api_keys && typeof projectData.config.api_keys === 'object' && !Array.isArray(projectData.config.api_keys),
      apiKeysCount: projectData?.config?.api_keys && typeof projectData.config.api_keys === 'object' && !Array.isArray(projectData.config.api_keys) ? Object.keys(projectData.config.api_keys).length : 0,
      apiKeys: projectData?.config?.api_keys && typeof projectData.config.api_keys === 'object' && !Array.isArray(projectData.config.api_keys) ? Object.keys(projectData.config.api_keys) : []
    });
    
    return projectData as Project;
  }

  async getProjectStats(projectId: number): Promise<{
    project_id: number;
    total_users?: number;
    active_users?: number;
    total_api_keys?: number;
    total_webhooks?: number;
    total_jobs?: number;
    total_notifications?: number;
    last_activity?: string;
    [key: string]: any;
  }> {
    // Philosophy v0.1.40: Use proven pattern!
    // Try analytics endpoint first, fallback to project data
    try {
      const response = await this.client.get(`/analytics/projects/${projectId}/stats`);
      return response.data;
    } catch (error) {
      // Philosophy v0.1.16: Graceful degradation!
      // Return basic stats from project data
      const project = await this.getProject(projectId);
      return {
        project_id: projectId,
        project_name: project.name,
        total_users: 0,
        active_users: 0,
        last_activity: project.updated_at || (project as any).created_at
      };
    }
  }

  async createProject(projectData: CreateProjectData): Promise<Project> {
    const response = await this.client.post('/projects', projectData);
    return response.data;
  }

  /** POST /projects/import-by-key — import projects from another user's API key. */
  async importProjectsByUserApiKey(
    userApiKey: string,
    requestOptions?: Partial<RequestConfig>,
  ): Promise<{ imported_projects?: unknown[]; [key: string]: unknown }> {
    const response = await this.client.post(
      '/projects/import-by-key',
      { user_api_key: userApiKey },
      requestOptions,
    );
    return response.data;
  }

  async updateProject(projectId: number, projectData: UpdateProjectData, options?: Partial<RequestConfig>): Promise<Project> {
    const response = await this.client.put(`/projects/${projectId}`, projectData, options);
    // Backend returns { success: true, data: project_dict, project: project_dict, ... }
    // Extract project data from response
    const updatedProject = response.data?.data || response.data?.project || response.data;
    return updatedProject as Project;
  }

  /**
   * GET /projects/{id}/data — canonical JSON snapshot for UI (project.data + limited config).
   * Optional dot path returns { value, path, project_id }.
   */
  async getProjectData(
    projectId: number,
    options?: { path?: string } & Partial<RequestConfig>
  ): Promise<ProjectDataSnapshot | ProjectDataPathValue> {
    const { path, ...req } = options || {};
    const query = path != null && String(path).length > 0 ? { path: String(path) } : undefined;
    const response = await this.client.get(
      `/projects/${projectId}/data`,
      query,
      req as Partial<RequestConfig>
    );
    const d = response.data;
    if (path != null && String(path).length > 0) {
      return d as ProjectDataPathValue;
    }
    return d as ProjectDataSnapshot;
  }

  /** PATCH /projects/{id}/data — set project.data at dot path. */
  async patchProjectData(
    projectId: number,
    body: PatchProjectDataBody,
    options?: Partial<RequestConfig>
  ): Promise<{ success: boolean; project_id: number; path: string }> {
    const response = await this.client.patch(
      `/projects/${projectId}/data`,
      body,
      options
    );
    return response.data as { success: boolean; project_id: number; path: string };
  }

  async deleteProject(projectId: number): Promise<{
    success: boolean;
    message: string;
  }> {
    return executeOrNotFoundFallback(
      async () => (await this.client.delete(`/projects/${projectId}`)).data,
      { success: true, message: 'Project already removed' }
    );
  }

  async getDeletionInventory(
    projectId: number,
    options?: { refresh?: boolean }
  ): Promise<{
    inventory: Record<string, unknown>;
    execution_token: string;
    token_expires_at: string;
  }> {
    const response = await this.client.get(`/projects/${projectId}/deletion-inventory`, {
      params: options?.refresh ? { refresh: true } : undefined,
    });
    return response.data;
  }

  async scheduleProjectDeletion(
    projectId: number,
    body: {
      confirm_name: string;
      execution_token: string;
      grace_days?: number;
      export_pack_id?: string;
    }
  ): Promise<Record<string, unknown>> {
    const response = await this.client.post(`/projects/${projectId}/deletion-schedule`, body);
    return response.data;
  }

  async cancelProjectDeletion(projectId: number): Promise<Record<string, unknown>> {
    const response = await this.client.post(`/projects/${projectId}/deletion-cancel`, {});
    return response.data;
  }

  async executeProjectDeletion(
    projectId: number,
    executionToken: string,
    idempotencyKey?: string
  ): Promise<Record<string, unknown>> {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined;
    const response = await this.client.post(
      `/projects/${projectId}/deletion-execute`,
      { execution_token: executionToken },
      { headers }
    );
    return response.data;
  }

  async getDeletionStatus(projectId: number): Promise<Record<string, unknown>> {
    const response = await this.client.get(`/projects/${projectId}/deletion-status`);
    return response.data;
  }

  async archiveProject(projectId: number): Promise<Record<string, unknown>> {
    const response = await this.client.post(`/projects/${projectId}/archive`, {});
    return response.data;
  }

  async createExportPack(projectId: number): Promise<Record<string, unknown>> {
    const response = await this.client.post(`/projects/${projectId}/export-pack`, {});
    return response.data;
  }

  async getProjectUsers(projectId: number, params?: {
    is_active?: boolean;
    role?: string;
    limit?: number;
    offset?: number;
    page?: number;  // ✅ NEW: Support pagination
    per_page?: number;  // ✅ NEW: Support pagination
    user_ids?: number[];  // ✅ NEW: Support batch filtering by user IDs
  }): Promise<{
    users: ProjectUser[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages?: number;
      per_page?: number;
    };
  }> {
    // ✅ FIX: Pass params directly, not wrapped in { params }
    // Only pass params if they exist and have values
    const queryParams: Record<string, any> = {};
    if (params) {
      if (params.is_active !== undefined) queryParams.is_active = params.is_active;
      if (params.role) queryParams.role = params.role;
      if (params.limit) queryParams.limit = params.limit;
      if (params.offset) queryParams.offset = params.offset;
      if (params.page) queryParams.page = params.page;
      if (params.per_page) queryParams.per_page = params.per_page;
      if (params.user_ids && params.user_ids.length > 0) {
        // ✅ NEW: FastAPI поддерживает массивы в query параметрах
        queryParams.user_ids = params.user_ids;
      }
    }
    const response = await this.client.get(
      `/projects/${projectId}/users`, 
      Object.keys(queryParams).length > 0 ? queryParams : undefined
    );
    
    // Нормализовать ответ для совместимости
    const data = response.data;
    return {
      users: data.users || data.members || [],
      pagination: data.pagination || {
        page: data.page || params?.page || 1,
        limit: data.per_page || params?.per_page || data.limit || 50,
        total: data.total || data.total_members || 0,
        total_pages: data.pagination?.total_pages,
        per_page: data.per_page || params?.per_page
      }
    };
  }

  async addUserToProject(projectId: number, userData: AddUserToProjectData): Promise<{
    success: boolean;
    user: ProjectUser;
  }> {
    const response = await this.client.post(`/projects/${projectId}/users`, userData);
    return response.data;
  }

  async removeUserFromProject(projectId: number, userId: number): Promise<{
    success: boolean;
    message: string;
  }> {
    return executeOrNotFoundFallback(
      async () => (await this.client.delete(`/projects/${projectId}/users/${userId}`)).data,
      { success: true, message: 'Membership already removed' }
    );
  }

  async getSessions(options?: GetSessionsOptions): Promise<SessionsResponse> {
    const params: Record<string, any> = {};
    
    // ✅ snake_case (preferred)
    if (options?.user_id !== undefined) params.user_id = options.user_id;
    if (options?.project_id !== undefined) params.project_id = options.project_id;
    if (options?.status) params.status = options.status;
    if (options?.page) params.page = options.page;
    if (options?.per_page) params.per_page = options.per_page;
    
    // ❌ camelCase fallback (deprecated)
    if (options?.userId !== undefined) params.user_id = options.userId;
    if (options?.projectId !== undefined) params.project_id = options.projectId;
    if (options?.perPage) params.per_page = options.perPage;

    // ✅ Use /sessions endpoint (new structure - /api/sessions or /api/user/sessions)
    // Only pass params if they exist and have values
    const queryParams = Object.keys(params).length > 0 ? params : undefined;
    const response = await this.client.get('/sessions', queryParams);
    return response.data;
  }

  async deleteSession(sessionUuid: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return executeOrNotFoundFallback(
      async () => (await this.client.delete(`/sessions/${sessionUuid}`)).data,
      { success: true, message: 'Session already ended' }
    );
  }

  async createApiKey(projectId: number, data: {
    name: string;
    permissions_bitmap: number;
    description?: string;
    expires_at?: string;
  }): Promise<{
    key_id: number;
    key: string;
    name: string;
    permissions_bitmap: number;
    created_at: string;
  }> {
    const response = await this.client.post(`/api-keys`, {
      project_id: projectId,
      ...data
    });
    return response.data;
  }

  async updateApiKey(keyId: number, data: {
    name?: string;
    permissions_bitmap?: number;
    is_active?: boolean;
  }): Promise<{
    success: boolean;
    message: string;
    updated_key: any;
  }> {
    const response = await this.client.put(`/api-keys/${keyId}`, data);
    return response.data;
  }

  async deleteApiKey(keyId: number): Promise<{
    success: boolean;
    message: string;
  }> {
    return executeOrNotFoundFallback(
      async () => (await this.client.delete(`/api-keys/${keyId}`)).data,
      { success: true, message: 'API key already removed' }
    );
  }

  async getApiKeys(projectId: number): Promise<any[]> {
    const response = await this.client.get('/api-keys', { project_id: projectId });
    return response.data.keys || [];
  }

  async getApiKey(keyId: number, projectId?: number): Promise<any> {
    const params = projectId ? { project_id: projectId, reveal_secret: true } : { reveal_secret: true };
    const response = await this.client.get(`/api-keys/${keyId}`, params);
    return response.data;
  }

  async updateProjectUser(projectId: number, userId: number, userData: {
    role?: string;
    username?: string;
    display_name?: string;
    bio?: string;
    is_active?: boolean;
  }): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await this.client.put(`/projects/${projectId}/users/${userId}`, userData);
    return response.data;
  }

  /**
   * Получить пользователей нескольких проектов (параллельные запросы)
   * Использует существующий endpoint, не создает новый
   * 
   * ⚠️ ВАЖНО: Один user_id может быть в нескольких проектах с разными данными
   * Результат: { project_id: { users: [...], pagination: {...} }, ... }
   * Каждый user_id может повторяться в разных проектах с разными ролями/настройками
   * 
   * @param projectIds - Массив project_id
   * @param params - Дополнительные параметры
   * @returns Объект с ключами project_id и значениями { users, pagination }
   */
  async getProjectsUsersBatch(
    projectIds: number[],
    params?: {
      is_active?: boolean;
      role?: string;
      user_ids?: number[];  // Фильтр по user_ids применяется ко всем проектам
      include_ecosystem?: boolean;
    }
  ): Promise<Record<number, {
    users: ProjectUser[];
    pagination: {
      page: number;
      limit: number;
      total: number;
    };
  }>> {
    // ✅ Используем Promise.all для параллельных запросов к существующему endpoint
    // Каждый запрос возвращает пользователей конкретного проекта
    const promises = projectIds.map(projectId =>
      this.getProjectUsers(projectId, params)
    );
    
    const results = await Promise.all(promises);
    
    // ✅ Склеиваем результаты: группировка по project_id
    // Один user_id может быть в нескольких проектах - это нормально
    const result: Record<number, any> = {};
    type ProjectUsersResponse = {
      users?: ProjectUser[];
      members?: ProjectUser[];
      pagination?: { page: number; limit: number; total: number };
      total?: number;
      total_members?: number;
    };
    projectIds.forEach((projectId, index) => {
      const responseData = results[index] as ProjectUsersResponse;
      const pag = responseData.pagination;
      const totalCount = (pag ? pag.total : undefined) ?? responseData.total ?? responseData.total_members ?? 0;
      result[projectId] = {
        users: responseData.users ?? responseData.members ?? [],
        pagination: responseData.pagination ?? {
          page: 1,
          limit: responseData.users?.length ?? 0,
          total: totalCount
        }
      };
    });
    
    return result;
  }

  /**
   * Получить конкретных пользователей проекта по списку user_ids
   * Использует расширенный существующий endpoint
   * 
   * @param projectId - ID проекта
   * @param userIds - Массив user_id (8DNA пользователи)
   * @param params - Дополнительные параметры
   * @returns Массив пользователей с данными этого проекта
   */
  async getProjectUsersByIds(
    projectId: number,
    userIds: number[],
    params?: {
      include_ecosystem?: boolean;
    }
  ): Promise<{
    users: ProjectUser[];
    total: number;
  }> {
    // ✅ Используем существующий endpoint с параметром user_ids
    const response = await this.getProjectUsers(projectId, {
      ...params,
      user_ids: userIds
    });
    
    return {
      users: response.users,
      total: response.pagination.total
    };
  }

  async bulkUpdateProjects(projectIds: number[], updates: {
    is_active?: boolean;
    project_type?: string;
  }): Promise<{
    updated_count: number;
    failed_count: number;
    updated_projects: number[];
    failed_projects: number[];
  }> {
    const response = await this.client.put('/projects/bulk', {
      project_ids: projectIds,
      updates
    });
    return response.data;
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, {
      status: string;
      latency_ms?: number;
      error?: string;
    }>;
    timestamp: string;
  }> {
    const response = await this.client.get('/health');
    return response.data;
  }
}




