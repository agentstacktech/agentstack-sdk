import { BaseEntity, ActivatableEntity } from '../base';
import { UserProfileData } from '../settings';

/**
 * User - пользователь системы
 * 
 * AI AGENT QUICK START:
 * 
 * Register:
 *   const user = await sdk.auth.register({
 *     email: "user@example.com",
 *     password: "secure_password_123"
 *   })
 * 
 * Get profile:
 *   const user = await sdk.auth.getProfile()
 * 
 * Update:
 *   await sdk.auth.updateProfile({ username: "newusername" })
 * 
 * FIELDS:
 * @property email - string, unique, required
 * @property username - string, optional
 * @property role - string, user role
 * @property is_active - boolean
 * @property profile_data - UserProfileData, JSONB
 */
export interface User extends 
  BaseEntity,           // updated_at, metadata (id, created_at removed for security)
  ActivatableEntity {   // is_active
  
  /** Email (unique, required) */
  email: string;
  
  /** Username (optional, unique if provided) */
  username?: string;
  
  /** User role (default: 'user') */
  role?: string;
  
  /** Email verified status */
  is_verified?: boolean;
  
  /** 
   * Profile data (JSONB storage)
   * 
   * Contains:
   * - display_name
   * - avatar_url
   * - bio
   * - wallets (for project users)
   * - preferences
   * - [custom data]
   */
  profile_data?: UserProfileData;
  
  /** Last login timestamp */
  last_login_at?: string;
}

/**
 * ProjectUser - пользователь в контексте проекта
 * 
 * AI GUIDE:
 * Связь User ↔ Project с дополнительными данными
 * 
 * Contains:
 * - Project-specific role
 * - Permissions bitmap
 * - Profile data (wallets, preferences)
 */
export interface ProjectUser extends User {
  /** Project ID (multi-tenancy) */
  project_id: number;
  
  /** Role in this project */
  role_name: string;
  
  /** Permissions bitmap for this project */
  permissions_bitmap: number;
  
  /** Display name in project */
  display_name?: string;
  
  /** Avatar URL */
  avatar_url?: string;
}

/**
 * CreateUserData - регистрация пользователя
 */
export interface CreateUserData {
  /** Email (required, unique) */
  email: string;
  
  /** Password (required, min 8 chars) */
  password: string;
  
  /** Optional username (unique if provided) */
  username?: string;
}

/**
 * UpdateUserData - обновление профиля
 */
export interface UpdateUserData {
  /** Update username */
  username?: string;
  
  /** Update email */
  email?: string;
  
  /** Update profile data */
  profile_data?: Partial<UserProfileData>;
  
  /** Update metadata */
  metadata?: Record<string, any>;
}




