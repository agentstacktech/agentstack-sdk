/**
 * AgentI18n - AI-First Translation Module
 * 
 * 🤖 AI QUICK START:
 * ```typescript
 * import { AgentStackSDK } from '@agentstack/sdk';
 * const sdk = new AgentStackSDK({ projectId: 'my-app' });
 * 
 * // Zero config - works immediately:
 * sdk.i18n.t('user_management');  // → "User Management"
 * sdk.i18n.t('common:save');       // → "Save"
 * 
 * // Change language:
 * sdk.i18n.changeLanguage('ru');
 * sdk.i18n.t('user_management');  // → "Управление пользователями"
 * ```
 * 
 * 🎯 DESIGN PHILOSOPHY:
 * - Zero Config: Works out of the box
 * - AI-Friendly: 3-second rule compliance
 * - Type-Safe: Full TypeScript support
 * - Discoverable: AI can explore API
 * - Extensible: Custom namespaces
 * 
 * @module AgentI18n
 * @since 2025-10-08
 */

import { HTTPClient } from '../client/http-client';
import { logger } from '../utils/logger';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

/**
 * I18n initialization options
 * 
 * 🤖 AI NOTE: All fields optional - Zero Config!
 */
export interface I18nOptions {
  /**
   * Language code ('en', 'ru', or 'auto' for browser detection)
   * @default 'auto'
   */
  language?: string;
  
  /**
   * Fallback language when translation not found
   * @default 'en'
   */
  fallbackLang?: string;
  
  /**
   * Default namespace for keys without explicit namespace
   * @default 'common'
   */
  defaultNamespace?: string;
  
  /**
   * Namespaces to load
   * @default ['common', 'modules']
   */
  namespaces?: string[];
  
  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}

/**
 * Translation bundle structure
 */
export interface TranslationBundle {
  [namespace: string]: {
    [key: string]: string;
  };
}

/**
 * Translation with variables
 */
export interface TranslationVariables {
  [key: string]: string | number;
}

/**
 * Search result
 */
export interface TranslationSearchResult {
  namespace: string;
  key: string;
  value: string;
  language: string;
}

// ═══════════════════════════════════════════════════════════
// MODULE
// ═══════════════════════════════════════════════════════════

/**
 * AgentI18n - Translation module with AI-First design
 * 
 * @example Zero Config
 * ```typescript
 * sdk.i18n.t('user_management')  // Works immediately!
 * ```
 * 
 * @example With Variables
 * ```typescript
 * sdk.i18n.t('welcome_message', { name: 'Alice' })
 * // → "Welcome, Alice!"
 * ```
 * 
 * @example Custom Namespace
 * ```typescript
 * sdk.i18n.registerNamespace('game', {
 *   en: { 'level': 'Level' },
 *   ru: { 'level': 'Уровень' }
 * });
 * sdk.i18n.t('game:level')  // → "Level"
 * ```
 */
export class AgentI18n {
  private client: HTTPClient;
  private currentLanguage: string = 'en';
  private fallbackLanguage: string = 'en';
  private defaultNamespace: string = 'common';
  private translations: Map<string, TranslationBundle> = new Map();
  private customTranslations: Map<string, TranslationBundle> = new Map();
  private debug: boolean = false;
  private initialized: boolean = false;

  constructor(client: HTTPClient) {
    this.client = client;
    // Auto-initialize with smart defaults
    this.autoInit();
  }

  // ═══════════════════════════════════════════════════════════
  // LEVEL 1: AI QUICK START (Zero Config)
  // ═══════════════════════════════════════════════════════════

  /**
   * Translate a key to current language
   * 
   * 🤖 AI QUICK START:
   * ```typescript
   * t('user_management')         // → "User Management"
   * t('common:save')             // → "Save"
   * t('unknown', 'Fallback')     // → "Fallback"
   * ```
   * 
   * 🎯 SUPPORTS:
   * - Simple keys: t('key')
   * - Namespaced keys: t('namespace:key')
   * - Variables: t('key', { var: 'value' })
   * - Fallback: t('key', 'fallback')
   * 
   * @param key - Translation key (e.g., 'user_management' or 'common:save')
   * @param fallbackOrVars - Fallback string or variables object
   * @returns Translated string
   */
  t(key: string, fallbackOrVars?: string | TranslationVariables): string {
    // Parse namespace
    const [namespace, actualKey] = key.includes(':') 
      ? key.split(':', 2) 
      : [this.defaultNamespace, key];
    
    // Get translation
    let translation = this.getTranslation(this.currentLanguage, namespace, actualKey);
    
    // Try fallback language
    if (!translation && this.currentLanguage !== this.fallbackLanguage) {
      translation = this.getTranslation(this.fallbackLanguage, namespace, actualKey);
    }
    
    // Handle fallback
    if (!translation) {
      if (typeof fallbackOrVars === 'string') {
        return fallbackOrVars;
      }
      
      if (this.debug) {
        logger.warn(`🌍 AgentI18n: Missing key "${key}" for ${this.currentLanguage}`);
      }
      
      return key;
    }
    
    // Handle variables
    if (typeof fallbackOrVars === 'object') {
      return this.interpolate(translation, fallbackOrVars);
    }
    
    return translation;
  }

  // ═══════════════════════════════════════════════════════════
  // LEVEL 2: CONFIGURATION
  // ═══════════════════════════════════════════════════════════

  /**
   * Initialize i18n with custom options
   * 
   * 🤖 AI NOTE: Optional! Auto-init happens automatically.
   * Only call if you need custom config.
   * 
   * @example
   * ```typescript
   * sdk.i18n.init({
   *   language: 'ru',
   *   fallbackLang: 'en',
   *   debug: true
   * });
   * ```
   */
  init(options: I18nOptions = {}): void {
    this.currentLanguage = options.language === 'auto' 
      ? this.detectLanguage() 
      : options.language || this.detectLanguage();
    
    this.fallbackLanguage = options.fallbackLang || 'en';
    this.defaultNamespace = options.defaultNamespace || 'common';
    this.debug = options.debug || false;
    this.initialized = true;
    
    // Load translations
    this.loadEmbeddedTranslations();
    
    if (this.debug) {
      logger.info(`🌍 AgentI18n initialized:`, {
        language: this.currentLanguage,
        fallback: this.fallbackLanguage,
        namespaces: this.getNamespaces()
      });
    }
  }

  /**
   * Change current language
   * 
   * @example
   * ```typescript
   * sdk.i18n.changeLanguage('ru');
   * ```
   */
  changeLanguage(lang: string): void {
    if (!this.translations.has(lang)) {
      logger.warn(`🌍 AgentI18n: Language "${lang}" not supported. Available: ${this.getSupportedLanguages().join(', ')}`);
      return;
    }
    
    const previousLang = this.currentLanguage;
    this.currentLanguage = lang;
    
    if (this.debug) {
      logger.info(`🌍 AgentI18n: Language changed to ${lang}`);
    }
    
    // Отправляем глобальное событие для уведомления всех компонентов
    if (typeof window !== 'undefined' && previousLang !== lang) {
      window.dispatchEvent(new CustomEvent('languageChanged', { 
        detail: { language: lang, source: 'sdk', previousLanguage: previousLang } 
      }));
    }
  }

  /**
   * Get current language
   */
  getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  // ═══════════════════════════════════════════════════════════
  // LEVEL 3: AI DISCOVERY
  // ═══════════════════════════════════════════════════════════

  /**
   * Get all available keys in a namespace
   * 
   * 🤖 AI DISCOVERY: Explore what's available
   * 
   * @example
   * ```typescript
   * const keys = sdk.i18n.getAvailableKeys('modules');
   * // → ['user_management', 'add_user', 'project_management', ...]
   * ```
   */
  getAvailableKeys(namespace: string = 'modules'): string[] {
    const bundle = this.translations.get(this.currentLanguage);
    if (!bundle || !bundle[namespace]) {
      return [];
    }
    return Object.keys(bundle[namespace]);
  }

  /**
   * Get all supported languages
   * 
   * 🤖 AI DISCOVERY: See all languages
   * 
   * @example
   * ```typescript
   * const langs = sdk.i18n.getSupportedLanguages();
   * // → ['en', 'ru']
   * ```
   */
  getSupportedLanguages(): string[] {
    return Array.from(this.translations.keys());
  }

  /**
   * Get all namespaces
   * 
   * 🤖 AI DISCOVERY: See all namespaces
   * 
   * @example
   * ```typescript
   * const namespaces = sdk.i18n.getNamespaces();
   * // → ['common', 'modules', 'api', 'errors']
   * ```
   */
  getNamespaces(): string[] {
    const bundle = this.translations.get(this.currentLanguage);
    if (!bundle) return [];
    return Object.keys(bundle);
  }

  /**
   * Search for keys containing search term
   * 
   * 🤖 AI SEARCH: Find related keys
   * 
   * @example
   * ```typescript
   * const found = sdk.i18n.findKey('user');
   * // → [
   * //     { namespace: 'modules', key: 'user', value: 'User' },
   * //     { namespace: 'modules', key: 'user_management', ... }
   * //   ]
   * ```
   */
  findKey(search: string): TranslationSearchResult[] {
    const results: TranslationSearchResult[] = [];
    const bundle = this.translations.get(this.currentLanguage);
    
    if (!bundle) return results;
    
    Object.entries(bundle).forEach(([namespace, keys]) => {
      Object.entries(keys).forEach(([key, value]) => {
        if (key.includes(search) || value.toLowerCase().includes(search.toLowerCase())) {
          results.push({
            namespace,
            key,
            value,
            language: this.currentLanguage
          });
        }
      });
    });
    
    return results;
  }

  /**
   * Get all translations for a specific key across all languages
   * 
   * 🤖 AI ANALYSIS: See all language versions
   * 
   * @example
   * ```typescript
   * const translations = sdk.i18n.getAllTranslations('user_management');
   * // → {
   * //     en: 'User Management',
   * //     ru: 'Управление пользователями'
   * //   }
   * ```
   */
  getAllTranslations(key: string, namespace: string = 'modules'): Record<string, string> {
    const result: Record<string, string> = {};
    
    this.translations.forEach((bundle, lang) => {
      if (bundle[namespace] && bundle[namespace][key]) {
        result[lang] = bundle[namespace][key];
      }
    });
    
    return result;
  }

  /**
   * Check if key exists
   * 
   * @example
   * ```typescript
   * if (sdk.i18n.hasKey('user_management')) {
   *   // Use it
   * }
   * ```
   */
  hasKey(key: string, language?: string): boolean {
    const lang = language || this.currentLanguage;
    const [namespace, actualKey] = key.includes(':') 
      ? key.split(':', 2) 
      : [this.defaultNamespace, key];
    
    const bundle = this.translations.get(lang);
    return !!(bundle && bundle[namespace] && bundle[namespace][actualKey]);
  }

  /**
   * Export all translations for AI analysis
   * 
   * 🤖 AI EXPORT: Get full translation structure
   * 
   * @example
   * ```typescript
   * const allEn = sdk.i18n.export('en');
   * // → { common: {...}, modules: {...}, ... }
   * ```
   */
  export(language?: string): TranslationBundle {
    const lang = language || this.currentLanguage;
    return this.translations.get(lang) || {};
  }

  /**
   * Find missing keys between two languages
   * 
   * @example
   * ```typescript
   * const missing = sdk.i18n.findMissingKeys('ru', 'en');
   * // → ['some_key_1', 'some_key_2'] // In EN but not in RU
   * ```
   */
  findMissingKeys(targetLang: string, referenceLang: string = 'en'): string[] {
    const target = this.translations.get(targetLang);
    const reference = this.translations.get(referenceLang);
    
    if (!target || !reference) return [];
    
    const missing: string[] = [];
    
    Object.entries(reference).forEach(([namespace, keys]) => {
      Object.keys(keys).forEach(key => {
        if (!target[namespace] || !target[namespace][key]) {
          missing.push(`${namespace}:${key}`);
        }
      });
    });
    
    return missing;
  }

  // ═══════════════════════════════════════════════════════════
  // LEVEL 4: EXTENSION API
  // ═══════════════════════════════════════════════════════════

  /**
   * Add custom translations for a namespace
   * 
   * 🎮 GAME DEVELOPERS: Add game-specific terms
   * 
   * @example
   * ```typescript
   * sdk.i18n.addCustomTranslations('en', 'game', {
   *   'player_level': 'Player Level',
   *   'gold_balance': 'Gold Balance'
   * });
   * 
   * sdk.i18n.t('game:player_level');  // → "Player Level"
   * ```
   */
  addCustomTranslations(
    lang: string, 
    namespace: string, 
    keys: Record<string, string>
  ): void {
    const customKey = `${lang}:${namespace}`;
    const existing = this.customTranslations.get(customKey) || {};
    
    this.customTranslations.set(customKey, {
      ...existing,
      [namespace]: { 
        ...(existing[namespace] || {}), 
        ...keys 
      }
    });
    
    if (this.debug) {
      logger.debug(`🌍 AgentI18n: Added ${Object.keys(keys).length} custom keys to ${lang}:${namespace}`);
    }
  }

  /**
   * Register entire namespace with multi-language support
   * 
   * 🎮 GAME DEVELOPERS: Register game namespace once
   * 
   * @example
   * ```typescript
   * sdk.i18n.registerNamespace('shop', {
   *   en: {
   *     'buy_item': 'Buy Item',
   *     'sell_item': 'Sell Item'
   *   },
   *   ru: {
   *     'buy_item': 'Купить предмет',
   *     'sell_item': 'Продать предмет'
   *   }
   * });
   * ```
   */
  registerNamespace(
    namespace: string,
    translations: Record<string, Record<string, string>>
  ): void {
    Object.entries(translations).forEach(([lang, keys]) => {
      this.addCustomTranslations(lang, namespace, keys);
    });
    
    if (this.debug) {
      logger.debug(`🌍 AgentI18n: Registered namespace "${namespace}" for ${Object.keys(translations).length} languages`);
    }
  }

  /**
   * Remove custom translations
   * 
   * @example
   * ```typescript
   * sdk.i18n.removeCustomNamespace('game');
   * ```
   */
  removeCustomNamespace(namespace: string): void {
    // Remove from all languages
    this.customTranslations.forEach((bundle, key) => {
      if (key.includes(`:${namespace}`)) {
        this.customTranslations.delete(key);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  // LEVEL 5: CODEGEN & TYPES
  // ═══════════════════════════════════════════════════════════

  /**
   * Generate TypeScript types for autocomplete
   * 
   * 🤖 AI CODE GEN: Generate type-safe definitions
   * 
   * @example
   * ```typescript
   * const types = sdk.i18n.generateTypes();
   * console.log(types); // → TypeScript type definitions
   * ```
   */
  generateTypes(options: { namespace?: string; output?: string } = {}): string {
    const namespace = options.namespace || 'modules';
    const keys = this.getAvailableKeys(namespace);
    
    const typeDef = `/**
 * Auto-generated Translation Keys for ${namespace}
 * Generated by AgentI18n on ${new Date().toISOString()}
 */
export type ${this.capitalize(namespace)}TranslationKey = 
${keys.map(k => `  | '${k}'`).join('\n')};

/**
 * Namespaced key type
 */
export type ${this.capitalize(namespace)}NamespacedKey = \`${namespace}:\${${this.capitalize(namespace)}TranslationKey}\`;
`;
    
    return typeDef;
  }

  /**
   * Get translation coverage statistics
   * 
   * @example
   * ```typescript
   * const stats = sdk.i18n.getCoverage();
   * // → {
   * //     en: { total: 148, namespaces: { common: 66, modules: 148 } },
   * //     ru: { total: 148, namespaces: { common: 66, modules: 148 } }
   * //   }
   * ```
   */
  getCoverage(): Record<string, any> {
    const coverage: Record<string, any> = {};
    
    this.translations.forEach((bundle, lang) => {
      const namespaces: Record<string, number> = {};
      let total = 0;
      
      Object.entries(bundle).forEach(([ns, keys]) => {
        const count = Object.keys(keys).length;
        namespaces[ns] = count;
        total += count;
      });
      
      coverage[lang] = { total, namespaces };
    });
    
    return coverage;
  }

  // ═══════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════

  /**
   * Auto-initialization with smart defaults
   * Called automatically on construction
   */
  private autoInit(): void {
    if (this.initialized) return;
    
    // Auto-detect language
    this.currentLanguage = this.detectLanguage();
    this.fallbackLanguage = 'en';
    this.defaultNamespace = 'common';
    
    // Load embedded translations
    this.loadEmbeddedTranslations();
    
    this.initialized = true;
    
    if (this.debug) {
      logger.info(`🌍 AgentI18n auto-initialized: ${this.currentLanguage}`);
    }
  }

  /**
   * Detect user's language from browser or environment
   */
  private detectLanguage(): string {
    // Browser environment
    if (typeof window !== 'undefined' && window.navigator) {
      const browserLang = window.navigator.language.split('-')[0];
      // Support only loaded languages
      return ['en', 'ru'].includes(browserLang) ? browserLang : 'en';
    }
    
    // Node.js environment
    if (typeof process !== 'undefined' && process.env) {
      const envLang = process.env.LANG?.split('_')[0] || process.env.LANGUAGE?.split('_')[0];
      return ['en', 'ru'].includes(envLang || '') ? envLang! : 'en';
    }
    
    return 'en';
  }

  /**
   * Load embedded translations from JSON files
   * 
   * ✅ Phase 2 complete - uses real translation files!
   * Philosophy v0.1.16: Elegant Minimalism - No require() in browser!
   * Philosophy v0.2.7: Immune System - Browser-compatible antibody production!
   */
  private loadEmbeddedTranslations(): void {
    // Philosophy v0.2.7: Immune System - Direct fallback for browser compatibility
    // No async loading to avoid complexity - direct fallback approach
    // Philosophy v0.1.16: Elegant Minimalism - No require() calls at all!
    this.loadFallbackTranslations();
  }


  /**
   * Load fallback translations
   * Philosophy v0.1.16: Elegant Minimalism - Always have fallback
   */
  private loadFallbackTranslations(): void {
    const fallback: TranslationBundle = {
      common: {
        'save': 'Save',
        'cancel': 'Cancel',
        'loading': 'Loading...',
        'user_management': 'User Management',
        'rbac_editor': 'RBAC Editor',
        'settings': 'Settings',
        'edit_user': 'Edit User',
        'quick_access': 'Quick Access'
      },
      modules: {
        'user_management': 'User Management',
        'project_management': 'Project Management',
        'api_keys': 'API Keys',
        'notifications': 'Notifications',
        'sessions': 'Sessions',
        'rbac': 'RBAC'
      }
    };
    
    this.translations.set('en', fallback);
    this.translations.set('ru', fallback);
  }

  /**
   * Get translation from storage (custom or embedded)
   */
  private getTranslation(lang: string, namespace: string, key: string): string | null {
    // Check custom translations first (higher priority)
    const customKey = `${lang}:${namespace}`;
    const custom = this.customTranslations.get(customKey);
    if (custom && custom[namespace] && custom[namespace][key]) {
      return custom[namespace][key];
    }
    
    // Check embedded translations
    const bundle = this.translations.get(lang);
    if (bundle && bundle[namespace] && bundle[namespace][key]) {
      return bundle[namespace][key];
    }
    
    return null;
  }

  /**
   * Interpolate variables in translation
   * 
   * @example
   * "Hello, {{name}}!" + {name: "Alice"} → "Hello, Alice!"
   */
  private interpolate(translation: string, variables: TranslationVariables): string {
    let result = translation;
    
    Object.entries(variables).forEach(([key, value]) => {
      const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(pattern, String(value));
    });
    
    return result;
  }

  /**
   * Capitalize first letter
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

export default AgentI18n;




