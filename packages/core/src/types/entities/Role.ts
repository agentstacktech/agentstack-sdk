import { BaseEntity, NamedEntity } from '../base';

/**
 * Role - роль пользователя в RBAC системе
 * 
 * AI AGENT GUIDE:
 * Roles определяют permissions через bitmap
 * 
 * System roles: Owner, Admin, User (нельзя редактировать)
 * Custom roles: Любые дополнительные (можно редактировать)
 * 
 * USAGE:
 *   const role = await sdk.rbac.createRole({
 *     name: "Moderator",
 *     description: "Can moderate content",
 *     permissions_bitmap: 127  // Custom permissions
 *   })
 */
export interface Role extends 
  Omit<BaseEntity, 'id'>,  // Exclude id from BaseEntity
  NamedEntity {            // name, description
  
  /** Role ID (string) */
  id: string;
  
  /** Permissions bitmap (number для fast checks) */
  permissions_bitmap: number;
  
  /** System role (cannot be edited/deleted) */
  is_system: boolean;
  
  /** Optional color для UI */
  color?: string;
  
  /** Permissions list (для display) */
  permissions?: Record<string, string[]>;
  
  /** Created by user ID */
  created_by?: number;
  
  /** User count (how many users have this role) */
  user_count?: number;
}

/**
 * Permission - отдельное право доступа
 * 
 * AI GUIDE:
 * Permission = resource + action
 * 
 * Example: "projects:create", "wallets:read"
 */
export interface Permission {
  /** Permission name (unique) */
  name: string;
  
  /** Resource type */
  resource: string;
  
  /** Action on resource */
  action: string;
  
  /** Description */
  description?: string;
  
  /** Bit position в bitmap */
  bit_position?: number;
}

/**
 * CreateRoleData - создание роли
 */
export interface CreateRoleData {
  /** Role name (unique) */
  name: string;
  
  /** Description */
  description?: string;
  
  /** Permissions bitmap */
  permissions_bitmap: number;
  
  /** Optional color */
  color?: string;
}




