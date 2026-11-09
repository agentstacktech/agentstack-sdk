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

/** String-leaf editor envelope (REST + MCP coalesce). */
export type ProjectDataStringLeafEdit = {
  replacements?: Array<{ find: string; replace: string; count?: number }>;
  unified_diff?: string;
  text_write_mode?: 'search_replace' | 'unified_diff' | 'append' | 'prepend';
  strict_diff?: boolean;
};

/** Opcode vocabulary (SoT: shared/atoms/edit_intent.py DIRECTED_EDIT_OPS). */
export type DirectedEditOpKind =
  | 'set'
  | 'replace'
  | 'delete'
  | 'merge'
  | 'upsert'
  | 'append'
  | 'prepend'
  | 'insert_at'
  | 'insert_before'
  | 'insert_after'
  | 'move'
  | 'search_replace'
  | 'fuzzy_replace'
  | 'unified_diff';

/** Directed edit op batch (MCP projects.patch_data ``ops``). */
export type DirectedEditOp = {
  op: DirectedEditOpKind | string;
  path?: string;
  value?: unknown;
  find?: string;
  replace?: string;
  where?: Record<string, unknown>;
  index?: number;
  /** Wire alias for insert_at (MCP ops). */
  at?: number;
  from_index?: number;
  to_index?: number;
  uid?: string;
  before_uid?: string;
  insert?: string;
  content?: string;
  replacements?: ProjectDataStringLeafEdit['replacements'];
  unified_diff?: string;
  strict_diff?: boolean;
  count?: number;
};

/** PATCH /projects/{id}/data success envelope (ops or leaf write). */
export interface PatchProjectDataLeaf {
  path: string;
  value?: unknown;
}

export interface PatchProjectDataResponse {
  success: boolean;
  project_id: number;
  path?: string;
  dry_run?: boolean;
  /** Digest of leaf before apply — pass as expected_sha256 on commit. */
  previous_sha256?: string;
  leaf_sha256?: string;
  /** Per-leaf outcomes for patches[] batch (REST/MCP parity). */
  writes?: Array<Record<string, unknown>>;
  /** Suggested commit after dry_run (single-leaf CAS v1). */
  next_actions?: Array<{ action: string; params: Record<string, unknown> }>;
  preview_only?: boolean;
  state?: string;
  write?: {
    mode?: string;
    applied?: number;
    skipped?: number;
    methods?: string[];
  };
}

/**
 * PATCH /projects/{id}/data body — set value at dot path in project.data.
 */
export interface PatchProjectDataBody {
  /** Wins over patches[] when set. */
  path?: string;
  /** Up to 16 leaves when path is omitted (plain replace SET may be atomic). */
  patches?: PatchProjectDataLeaf[];
  value?: unknown | ProjectDataStringLeafEdit;
  write_mode?:
    | 'replace'
    | 'write'
    | 'set'
    | 'put'
    | 'merge'
    | 'patch'
    | 'delete'
    | 'search_replace'
    | 'fuzzy_replace'
    | 'unified_diff'
    | 'append'
    | 'prepend';
  ops?: DirectedEditOp[];
  dry_run?: boolean;
  expected_sha256?: string;
  missing?: 'error' | 'skip';
  allow_shrink?: boolean;
  replacements?: ProjectDataStringLeafEdit['replacements'];
  unified_diff?: string;
  strict_diff?: boolean;
}

