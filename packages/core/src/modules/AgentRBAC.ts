/**
 * AgentRBAC - Role-Based Access Control
 * Модуль для работы с ролями и правами пользователей
 * Хранение в JSONB согласно RBAC_DESIGN_PHILOSOPHY.md
 * 
 * Кеширование:
 * - Роли: TTL 5 мин
 * - Permissions: TTL 10 мин
 */

import { HTTPClient } from '../client/http-client';
import { executeOrNotFoundFallback } from '../utils/httpDeleteIdempotent';
import { DataCache } from '../utils/DataCache';

// ============================================================================
// Types
// ============================================================================

export interface Permission {
  resource: string;
  actions: string[];
  description: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions_bitmap: number;
  is_system: boolean;
  color?: string;
  permissions?: Record<string, string[]>;
  created_at?: string;
  created_by?: number;
}

export interface UserRoles {
  user_id: number;
  username: string;
  email: string;
  role_name: string;
  role_details: Role | null;
  permissions_bitmap: number;
  custom_permissions: Record<string, any>;
}

export interface RoleAssignment {
  user_id: number;
  role_id: string;
  assigned_at: string;
  assigned_by: number;
}

export interface PermissionCheck {
  has_permission: boolean;
  user_id: number;
  project_id: number;
  permission: string | number;
}

// ============================================================================
// AgentRBAC Class
// ============================================================================

export class AgentRBAC {
  private client: HTTPClient;
  private rolesCache: DataCache;
  private permissionsCache: DataCache;

  constructor(client: HTTPClient) {
    this.client = client;
    // Cache TTL: роли - 5 мин, permissions - 10 мин
    this.rolesCache = new DataCache({ ttl: 300000, maxSize: 50 });
    this.permissionsCache = new DataCache({ ttl: 600000, maxSize: 20 });
  }

  // ==========================================================================
  // Roles Management
  // ==========================================================================

  /**
   * Получить роли проекта из projects.settings JSONB
   */
  async getRoles(projectId: number): Promise<{
    roles: Role[];
    custom_permissions: Record<string, string>;
    total: number;
  }> {
    // ✅ CRITICAL FIX: HTTPClient adds /api/ to baseUrl, so path should be relative
    const response = await this.client.get(`/rbac/roles?project_id=${projectId}`);
    return {
      roles: response.data.roles || [],
      custom_permissions: response.data.custom_permissions || {},
      total: response.data.total || 0
    };
  }

  /**
   * Получить роли проекта с кешированием
   * @param projectId - ID проекта
   * @param force - Принудительное обновление кеша
   */
  async getRolesCached(projectId: number, force: boolean = false): Promise<{
    roles: Role[];
    custom_permissions: Record<string, string>;
    total: number;
    fromCache: boolean;
    cachedAt?: number;
  }> {
    const cacheKey = `roles:${projectId}`;
    
    // Проверяем кеш, если не force
    if (!force) {
      const cached = this.rolesCache.get(cacheKey);
      if (cached) {
        return {
          ...cached,
          fromCache: true,
          cachedAt: Date.now()
        };
      }
    }
    
    // Загружаем из API
    const data = await this.getRoles(projectId);
    
    // Сохраняем в кеш
    this.rolesCache.set(cacheKey, data);
    
    return {
      ...data,
      fromCache: false
    };
  }

  /**
   * Создать кастомную роль в projects.settings JSONB
   * Только owner/admin могут создавать роли
   */
  async createRole(projectId: number, roleData: {
    id: string;
    name: string;
    description?: string;
    permissions_bitmap?: number;
    permissions?: Record<string, string[]>;
    color?: string;
  }): Promise<Role> {
    const response = await this.client.post(`/rbac/roles?project_id=${projectId}`, roleData);
    
    // Инвалидируем кеш ролей
    this.rolesCache.invalidate(`roles:${projectId}`);
    
    return response.data.role;
  }

  /**
   * Обновить кастомную роль
   * Системные роли (is_system=true) нельзя изменить
   */
  async updateRole(projectId: number, roleId: string, updates: {
    name?: string;
    description?: string;
    permissions_bitmap?: number;
    permissions?: Record<string, string[]>;
    color?: string;
  }): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await this.client.put(`/rbac/roles/${roleId}?project_id=${projectId}`, updates);
    
    // Инвалидируем кеш ролей
    this.rolesCache.invalidate(`roles:${projectId}`);
    
    return response.data;
  }

  /**
   * Удалить кастомную роль
   * Системные роли (is_system=true) нельзя удалить
   */
  async deleteRole(projectId: number, roleId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const data = await executeOrNotFoundFallback(
      async () => (await this.client.delete(`/rbac/roles/${roleId}?project_id=${projectId}`)).data,
      { success: true, message: 'Role already removed' }
    );

    // Инвалидируем кеш ролей
    this.rolesCache.invalidate(`roles:${projectId}`);

    return data;
  }

  // ==========================================================================
  // User Roles Management
  // ==========================================================================

  /**
   * Получить роли и права пользователя
   * Возвращает: role_name, permissions_bitmap, permissions из project_users
   */
  async getUserRoles(projectId: number, userId: number): Promise<UserRoles> {
    const response = await this.client.get(`/rbac/users/${userId}/roles?project_id=${projectId}`);
    return response.data;
  }

  /**
   * Назначить роль пользователю
   * Обновляет role_name и permissions_bitmap в project_users
   */
  async assignRole(projectId: number, userId: number, roleId: string): Promise<{
    success: boolean;
    message: string;
    role: Role;
  }> {
    const response = await this.client.put(
      `/rbac/users/${userId}/role?project_id=${projectId}`,
      { role_id: roleId }
    );
    return response.data;
  }

  /**
   * Установить кастомные права пользователю
   * Обновляет permissions JSONB в project_users
   */
  async setCustomPermissions(
    projectId: number,
    userId: number,
    permissions: Record<string, any>
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await this.client.put(
      `/rbac/users/${userId}/permissions?project_id=${projectId}`,
      permissions
    );
    return response.data;
  }

  // ==========================================================================
  // Permissions Management
  // ==========================================================================

  /**
   * Получить список всех доступных permissions
   */
  async getAvailablePermissions(): Promise<{
    permissions: Record<string, Permission>;
    total_resources: number;
  }> {
    const response = await this.client.get('/rbac/permissions');
    return response.data;
  }

  /**
   * Получить список всех доступных permissions с кешированием
   * @param force - Принудительное обновление кеша
   */
  async getAvailablePermissionsCached(force: boolean = false): Promise<{
    permissions: Record<string, Permission>;
    total_resources: number;
    fromCache: boolean;
    cachedAt?: number;
  }> {
    const cacheKey = 'permissions:all';
    
    // Проверяем кеш, если не force
    if (!force) {
      const cached = this.permissionsCache.get(cacheKey);
      if (cached) {
        return {
          ...cached,
          fromCache: true,
          cachedAt: Date.now()
        };
      }
    }
    
    // Загружаем из API
    const data = await this.getAvailablePermissions();
    
    // Сохраняем в кеш
    this.permissionsCache.set(cacheKey, data);
    
    return {
      ...data,
      fromCache: false
    };
  }

  /**
   * Проверить имеет ли пользователь определённое право.
   * Использует POST /rbac/check (project_id, permission, optional user_id).
   * Ответ: { granted, permission, user_id, project_id }.
   */
  async checkPermission(
    projectId: number,
    permission: string | number,
    userId?: number
  ): Promise<PermissionCheck> {
    const response = await this.client.post('/rbac/check', {
      project_id: projectId,
      permission: typeof permission === 'number' ? permission : permission,
      ...(userId != null ? { user_id: userId } : {}),
    });
    const data = response.data as { granted: boolean; permission: string; user_id: number; project_id: number };
    return {
      has_permission: data.granted,
      user_id: data.user_id,
      project_id: data.project_id,
      permission: data.permission,
    };
  }

  /**
   * High-level capability check (same wire as `checkPermission`).
   * Pass stable capability ids from the client; server should map them to permissions.
   */
  async checkCapability(projectId: number, capability: string): Promise<boolean> {
    try {
      const res = await this.checkPermission(projectId, capability);
      return res.has_permission;
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Проверить право через bitmap (локально, без API вызова)
   */
  hasPermissionBitmap(userBitmap: number, permission: number): boolean {
    return (userBitmap & permission) === permission;
  }

  /**
   * Получить роль по ID из списка ролей
   */
  getRoleById(roles: Role[], roleId: string): Role | null {
    return roles.find(r => r.id === roleId) || null;
  }

  /**
   * Проверить является ли роль системной
   */
  isSystemRole(role: Role): boolean {
    return role.is_system === true;
  }

  /**
   * Получить иерархию ролей (для проверки прав на назначение)
   */
  getRoleHierarchy(): string[] {
    return ['owner', 'admin', 'developer', 'member', 'viewer'];
  }

  /**
   * Проверить может ли пользователь назначить роль
   * owner > admin > developer > member > viewer
   */
  canAssignRole(assignerRole: string, targetRole: string): boolean {
    const hierarchy = this.getRoleHierarchy();
    const assignerIndex = hierarchy.indexOf(assignerRole);
    const targetIndex = hierarchy.indexOf(targetRole);
    
    // Если роль не в иерархии, можно назначить (кастомная роль)
    if (assignerIndex === -1 || targetIndex === -1) {
      return assignerRole === 'owner' || assignerRole === 'admin';
    }
    
    // Можно назначить роль ниже или равную своей
    return assignerIndex <= targetIndex;
  }

  // ==========================================================================
  // Cache Management
  // ==========================================================================

  /**
   * Инвалидировать кеш ролей проекта
   */
  invalidateRolesCache(projectId: number): void {
    this.rolesCache.invalidate(`roles:${projectId}`);
  }

  /**
   * Инвалидировать кеш permissions
   */
  invalidatePermissionsCache(): void {
    this.permissionsCache.invalidate('permissions:all');
  }

  /**
   * Очистить весь кеш RBAC
   */
  clearCache(): void {
    this.rolesCache.clear();
    this.permissionsCache.clear();
  }

  /**
   * Получить статистику кеша
   */
  getCacheStats(): {
    roles: ReturnType<DataCache['stats']>;
    permissions: ReturnType<DataCache['stats']>;
  } {
    return {
      roles: this.rolesCache.stats(),
      permissions: this.permissionsCache.stats()
    };
  }
}




