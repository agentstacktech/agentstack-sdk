/**
 * Mixins - переиспользуемые интерфейсы для composition
 * 
 * AI AGENT GUIDE:
 * Mixins позволяют комбинировать behaviour через extends:
 * 
 * interface Project extends BaseEntity, NamedEntity, ActivatableEntity
 * → Project имеет: id, created_at, name, description, is_active
 */

/**
 * NamedEntity - для сущностей с именем
 * 
 * AI GUIDE: 
 * Используй когда сущность имеет отображаемое название
 * 
 * Examples: Project, Wallet, Role, ApiKey
 * 
 * FIELDS:
 * @field name - Display name, 1-100 characters (required)
 * @field description - Optional description, up to 1000 characters
 */
export interface NamedEntity {
  /** 
   * Display name, 1-100 characters
   * Required field, must be unique within scope
   */
  name: string;
  
  /** 
   * Optional description, up to 1000 characters
   * Human-readable text explaining the entity
   */
  description?: string;
}

/**
 * ActivatableEntity - для сущностей с активацией/деактивацией
 * 
 * AI GUIDE:
 * Используй для сущностей которые можно включать/выключать
 * 
 * Examples: Project, User, Wallet, ApiKey
 * 
 * FIELDS:
 * @field is_active - true = active/enabled, false = inactive/disabled
 * 
 * USAGE:
 *   if (project.is_active) {
 *     // Project is active, allow operations
 *   }
 */
export interface ActivatableEntity {
  /** 
   * Active status
   * - true = active, enabled, working
   * - false = inactive, disabled, archived
   * 
   * Default: true (при создании)
   */
  is_active: boolean;
}

/**
 * ScopedEntity - для multi-tenancy (данные внутри проекта)
 * 
 * AI GUIDE:
 * Используй для данных которые принадлежат проекту
 * 
 * Examples: ProjectUser, Wallet, Session, ApiKey
 * 
 * FIELDS:
 * @field project_id - Project context (обязательно)
 * @field user_id - User context (optional, если привязано к пользователю)
 * 
 * WHY:
 * Multi-tenancy изоляция - данные одного проекта не видны другим
 */
export interface ScopedEntity {
  /** 
   * Project context (required для multi-tenancy)
   * Все данные изолированы по project_id
   */
  project_id: number;
  
  /** 
   * User context (optional)
   * Используется если данные привязаны к пользователю
   */
  user_id?: number;
}

/**
 * OwnedEntity - для сущностей с владельцем
 * 
 * AI GUIDE:
 * Используй для сущностей которые создаются пользователем
 * 
 * Examples: Project, ApiKey, CustomCurrency
 * 
 * FIELDS:
 * @field owner_id - ID пользователя-создателя
 */
export interface OwnedEntity {
  /** 
   * ID пользователя который создал эту сущность
   * Auto-populated from JWT token
   */
  owner_id: number;
}

/**
 * TimestampedEntity - extended timestamps
 * 
 * AI GUIDE:
 * Для сущностей с дополнительными timestamps
 * 
 * Examples: Session (expires_at), User (last_login_at)
 */
export interface TimestampedEntity {
  /** Optional: когда была удалена (soft delete) */
  deleted_at?: string;
  
  /** Optional: когда истекает */
  expires_at?: string;
  
  /** Optional: последняя активность */
  last_used_at?: string;
}




