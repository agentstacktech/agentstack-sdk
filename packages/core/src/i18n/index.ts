/**
 * AgentStack i18n System
 * 
 * AI-First translation module for AgentStack SDK
 * 
 * @example Quick Start (SDK)
 * ```typescript
 * import { AgentStackSDK } from '@agentstack/sdk';
 * const sdk = new AgentStackSDK({ projectId: 'my-app' });
 * 
 * sdk.i18n.t('user_management');  // → "User Management"
 * ```
 * 
 * @example Quick Start (React)
 * ```typescript
 * import { useI18n } from '@agentstack/sdk/i18n';
 * import { useSDK } from '@/lib/react-sdk-provider';
 * 
 * function MyComponent() {
 *   const sdk = useSDK();
 *   const { t } = useI18n(sdk);
 *   return <h1>{t('user_management')}</h1>;
 * }
 * ```
 * 
 * @see SDK_I18N_MODULE_DESIGN.md for full documentation
 */

// Core module
export { AgentI18n } from '../modules/AgentI18n';

// React hook
export { useI18n, t } from './useI18n';

// Types
export type {
  I18nOptions,
  TranslationBundle,
  TranslationVariables,
  TranslationSearchResult
} from '../modules/AgentI18n';

export type {
  CommonTranslationKey,
  ModulesTranslationKey,
  CommonNamespacedKey,
  ModulesNamespacedKey,
  AnyTranslationKey,
  LanguageCode,
  Namespace,
  TranslationWithVars,
  TranslationMeta,
  LanguageMeta
} from './types';

export type { UseI18nResult } from './useI18n';

// Constants
export { SUPPORTED_LANGUAGES, DEFAULT_NAMESPACE, FALLBACK_LANGUAGE } from './types';

// Locale data
export { translations } from './locales';
export { default as locales } from './locales';




