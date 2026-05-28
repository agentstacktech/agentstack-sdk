import { BaseEntity, NamedEntity, ActivatableEntity, OwnedEntity } from '../base';
import { ProjectSettings } from '../settings';

/**
 * Project - основная сущность AgentStack
 * 
 * AI AGENT QUICK START:
 * 
 * 1. MINIMAL (только name):
 *    const project = await sdk.projects.create({ name: "My Startup" })
 * 
 * 2. GAMING (с wallet rules):
 *    const project = await sdk.projects.create({
 *      name: "Epic RPG",
 *      settings: {
 *        wallet_rules: {
 *          limits: { max_wallets_per_user: 100 },
 *          features: { allow_negative_balance: true }
 *        }
 *      }
 *    })
 * 
 * 3. E-COMMERCE (strict validation):
 *    const project = await sdk.projects.create({
 *      name: "Online Store",
 *      settings: {
 *        wallet_rules: { features: { allow_negative_balance: false } }
 *      }
 *    })
 * 
 * COMPOSITION:
 * Project extends: BaseEntity, NamedEntity, ActivatableEntity, OwnedEntity
 * 
 * FIELDS:
 * @property id - number, auto-generated
 * @property name - string, required
 * @property owner_id - number, auto from JWT
 * @property is_active - boolean, default true
 * @property settings - ProjectSettings, JSONB config
 * @property project_data - Record<string,any>, JSONB для project data
 */
export interface Project extends 
  BaseEntity,           // id, created_at, updated_at, metadata
  NamedEntity,          // name, description
  ActivatableEntity,    // is_active
  OwnedEntity {         // owner_id
  
  /** 
   * Optional project type categorization
   * Examples: 'gaming', 'ecommerce', 'fintech', 'analytics'
   */
  project_type?: string;
  
  /** 
   * Typed JSONB configuration
   * См. ProjectSettings для полной структуры
   * 
   * Содержит:
   * - wallet_rules (см. WalletRules)
   * - rbac (roles и permissions)
   * - features (feature flags)
   * - integrations (third-party services)
   * - [custom] (любые custom settings)
   */
  settings: ProjectSettings;
  
  /**
   * JSONB storage для данных проекта (аналог profile_data для users)
   * 
   * AI GUIDE:
   * Используй для хранения ЛЮБЫХ project-specific данных:
   * 
   * Examples:
   * - Counters: { page_views: 1000, api_calls: 5000 }
   * - Events: { last_deploy: "2025-10-08", last_backup: "2025-10-07" }
   * - Stats: { users_count: 100, active_sessions: 25 }
   * - Game data: { levels: 50, max_players: 1000 }
   * - E-commerce: { products_count: 500, orders_today: 15 }
   * - Custom: { your_data: "anything" }
   * 
   * Преимущества:
   * - ✅ Супер гибкость (любые данные)
   * - ✅ Нет миграций (JSONB)
   * - ✅ GIN индексы (производительность)
   * - ✅ Универсальность (gaming ≠ ecommerce)
   */
  project_data?: Record<string, any>;
}

/**
 * CreateProjectData - данные для создания проекта
 * 
 * AI GUIDE:
 * Minimum required: только name!
 * 
 * Example:
 *   await sdk.projects.create({ 
 *     name: "App",
 *     project_data: { counters: { api_calls: 0 } }
 *   })
 */
export interface CreateProjectData {
  /** Project name (required, 1-100 chars) */
  name: string;
  
  /** Optional description */
  description?: string;
  
  /** Optional project type */
  project_type?: string;
  
  /** Optional settings (defaults applied if not provided) */
  settings?: Partial<ProjectSettings>;
  
  /** Optional project data (JSONB для любых данных) */
  project_data?: Record<string, any>;
}

/**
 * UpdateProjectData - данные для обновления проекта
 * 
 * AI GUIDE:
 * Все поля optional - обновляйте только что нужно
 * 
 * Example:
 *   await sdk.projects.update(1, { 
 *     name: "New Name",
 *     project_data: { counters: { api_calls: 1000 } }
 *   })
 */
export interface UpdateProjectData {
  /** Update name */
  name?: string;
  
  /** Update description */
  description?: string;
  
  /** Update project type */
  project_type?: string;
  
  /** Update is_active status */
  is_active?: boolean;
  
  /** Update or merge settings */
  settings?: Partial<ProjectSettings>;
  
  /** Update or merge project_data */
  project_data?: Record<string, any>;

  /** Merge into project.data.config (8DNA v0.2.1) */
  config?: Record<string, any>;
  
  /** Update metadata */
  metadata?: Record<string, any>;
}

/**
 * ProjectListOptions - опции для получения списка проектов
 */
export interface ProjectListOptions {
  /** Limit number of results */
  limit?: number;
  
  /** Include inactive projects */
  include_inactive?: boolean;
  
  /** Filter by project type */
  project_type?: string;
  
  /** Search query */
  search?: string;
}

/**
 * GET /projects/{id}/data — full snapshot (size-limited) for dashboard data browser.
 */
export interface ProjectDataSnapshot {
  project_data: Record<string, unknown>;
  project_config: Record<string, unknown>;
  project_id: number;
  timestamp: string;
}

/**
 * GET /projects/{id}/data?path= — value at dot path in project.data (FAP-masked).
 */
export interface ProjectDataPathValue {
  value: unknown;
  project_id: number;
  path: string;
}

/**
 * PATCH /projects/{id}/data body — set value at dot path in project.data.
 */
export interface PatchProjectDataBody {
  path: string;
  value: unknown;
}

