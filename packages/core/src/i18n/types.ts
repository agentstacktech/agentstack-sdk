/**
 * i18n TypeScript Types
 * 
 * Auto-generated types for translation keys
 * Provides autocomplete for AI agents and developers
 * 
 * 🤖 AI NOTE: Import these types for autocomplete!
 * 
 * @example
 * ```typescript
 * import { ModulesTranslationKey } from '@agentstack/sdk/i18n';
 * 
 * const key: ModulesTranslationKey = 'user_management'; // ✅ Autocomplete!
 * ```
 */

// ═══════════════════════════════════════════════════════════
// COMMON NAMESPACE KEYS
// ═══════════════════════════════════════════════════════════

/**
 * Common translation keys
 * General UI terms used across the app
 */
export type CommonTranslationKey =
  | 'search'
  | 'login'
  | 'logout'
  | 'save'
  | 'save_changes'
  | 'cancel'
  | 'delete'
  | 'edit'
  | 'create'
  | 'add'
  | 'adding'
  | 'creating'
  | 'remove'
  | 'loading'
  | 'saving'
  | 'error'
  | 'unknown'
  | 'quick_access'
  | 'modules'
  | 'select_project'
  | 'settings'
  | 'view'
  | 'enter_project_name'
  | 'short_project_description';

// ═══════════════════════════════════════════════════════════
// MODULES NAMESPACE KEYS
// ═══════════════════════════════════════════════════════════

/**
 * Modules translation keys
 * AgentStack module-specific terms
 */
export type ModulesTranslationKey =
  // User Management
  | 'user_management'
  | 'manage_project_users'
  | 'add_user'
  | 'edit_user'
  | 'no_users'
  | 'user'
  | 'username'
  | 'email'
  | 'role'
  | 'status'
  | 'last_login'
  | 'actions'
  | 'active'
  | 'never'
  | 'no_project_selected'
  | 'select_project_to_manage_users'
  // RBAC
  | 'rbac_editor'
  | 'permissions'
  | 'user_permissions'
  | 'permissions_managed_via_rbac'
  | 'open_rbac_editor'
  // Sessions
  | 'sessions'
  | 'user_sessions'
  | 'all_sessions'
  | 'active_sessions'
  | 'expired_sessions'
  | 'no_sessions'
  | 'terminate'
  | 'confirm_remove_user'
  | 'confirm_terminate_session'
  // Project Management
  | 'project_management'
  | 'manage_your_projects'
  | 'create_project'
  | 'edit_project'
  | 'no_projects'
  | 'members'
  | 'project_members'
  | 'activate'
  | 'deactivate'
  | 'inactive'
  | 'confirm_delete_project'
  | 'members_managed_via_user_management';

// ═══════════════════════════════════════════════════════════
// NAMESPACED KEYS (for explicit namespace usage)
// ═══════════════════════════════════════════════════════════

/**
 * Common namespace with explicit prefix
 * Usage: t('common:save')
 */
export type CommonNamespacedKey = `common:${CommonTranslationKey}`;

/**
 * Modules namespace with explicit prefix
 * Usage: t('modules:user_management')
 */
export type ModulesNamespacedKey = `modules:${ModulesTranslationKey}`;

/**
 * All translation keys (any namespace)
 */
export type AnyTranslationKey = 
  | CommonTranslationKey
  | ModulesTranslationKey
  | CommonNamespacedKey
  | ModulesNamespacedKey
  | string;  // Allow custom keys

// ═══════════════════════════════════════════════════════════
// LANGUAGE CODES
// ═══════════════════════════════════════════════════════════

/**
 * Supported language codes
 */
export type LanguageCode = 'en' | 'ru' | 'auto';

/**
 * Available namespaces
 */
export type Namespace = 'common' | 'modules' | string;

// ═══════════════════════════════════════════════════════════
// HELPER TYPES
// ═══════════════════════════════════════════════════════════

/**
 * Translation key with variables
 * 
 * @example
 * ```typescript
 * const key: TranslationWithVars = {
 *   key: 'welcome_message',
 *   vars: { name: 'Alice' }
 * };
 * ```
 */
export interface TranslationWithVars {
  key: AnyTranslationKey;
  vars?: Record<string, string | number>;
  fallback?: string;
}

/**
 * Translation metadata
 */
export interface TranslationMeta {
  key: string;
  namespace: string;
  language: string;
  value: string;
  hasVariables: boolean;
  variableNames?: string[];
}

/**
 * Language metadata
 */
export interface LanguageMeta {
  code: LanguageCode;
  name: string;
  nativeName: string;
  totalKeys: number;
  namespaces: string[];
}

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

/**
 * Language metadata for all supported languages
 */
export const SUPPORTED_LANGUAGES: Record<string, LanguageMeta> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    totalKeys: 214,  // 66 common + 148 modules
    namespaces: ['common', 'modules']
  },
  ru: {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    totalKeys: 214,  // 66 common + 148 modules
    namespaces: ['common', 'modules']
  }
};

/**
 * Default namespace when key doesn't specify one
 */
export const DEFAULT_NAMESPACE = 'common';

/**
 * Fallback language when translation not found
 */
export const FALLBACK_LANGUAGE = 'en';




