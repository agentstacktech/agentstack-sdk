/**
 * useI18n - React Hook for AgentStack i18n
 * 
 * 🤖 AI QUICK START:
 * ```typescript
 * import { useI18n } from '@agentstack/sdk/i18n';
 * 
 * function MyComponent() {
 *   const { t, language, changeLanguage } = useI18n();
 *   
 *   return (
 *     <div>
 *       <h1>{t('user_management')}</h1>
 *       <button onClick={() => changeLanguage('ru')}>RU</button>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @module useI18n
 * @since 2025-10-08
 */

// React hooks are optional - only available in React environment
import { useState, useEffect, useCallback } from 'react';
import type { AnyTranslationKey, LanguageCode } from './types';
import type { AgentStackSDK } from '../sdk';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

/**
 * useI18n hook return type
 */
export interface UseI18nResult {
  /**
   * Translate a key
   * 
   * @example
   * ```typescript
   * t('user_management')      // → "User Management"
   * t('common:save')           // → "Save"
   * t('unknown', 'Fallback')   // → "Fallback"
   * ```
   */
  t: (key: AnyTranslationKey, fallback?: string) => string;
  
  /**
   * Current language code
   */
  language: string;
  
  /**
   * Change language
   * 
   * @example
   * ```typescript
   * changeLanguage('ru');  // → Switches to Russian
   * ```
   */
  changeLanguage: (lang: LanguageCode) => void;
  
  /**
   * Get available languages
   */
  languages: string[];
  
  /**
   * Get available keys in namespace
   */
  getKeys: (namespace?: string) => string[];
  
  /**
   * Check if key exists
   */
  hasKey: (key: string) => boolean;
}

// ═══════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════

/**
 * useI18n - React hook for translations
 * 
 * 🤖 AI NOTE: Requires SDK instance from context or props
 * Use with useSDK() from react-sdk-provider
 * 
 * 🎯 FEATURES:
 * - Auto-rerender on language change
 * - Type-safe keys
 * - Zero config
 * - AI-friendly
 * 
 * @example Basic Usage
 * ```typescript
 * import { useSDK } from '@/lib/react-sdk-provider';
 * 
 * function UserList() {
 *   const sdk = useSDK();
 *   const { t } = useI18n(sdk);
 *   return <h1>{t('user_management')}</h1>;
 * }
 * ```
 * 
 * @example Language Switcher
 * ```typescript
 * function LanguageSwitcher() {
 *   const sdk = useSDK();
 *   const { language, changeLanguage, languages } = useI18n(sdk);
 *   
 *   return (
 *     <select value={language} onChange={(e) => changeLanguage(e.target.value)}>
 *       {languages.map(lang => (
 *         <option key={lang} value={lang}>{lang.toUpperCase()}</option>
 *       ))}
 *     </select>
 *   );
 * }
 * ```
 */
export function useI18n(sdk: AgentStackSDK): UseI18nResult {
  
  // State для принудительного обновления компонента при изменении языка
  const [, forceUpdate] = useState({});
  
  // Get current language with state tracking
  const [currentLanguage, setCurrentLanguage] = useState<string>(
    (sdk.i18n.getCurrentLanguage && sdk.i18n.getCurrentLanguage()) || 'en'
  );
  
  // Подписываемся на изменения языка
  useEffect(() => {
    // Функция для обновления языка
    const updateLanguage = () => {
      const newLang = sdk.i18n.getCurrentLanguage() || 'en';
      setCurrentLanguage((prevLang: string) => {
        if (newLang !== prevLang) {
          return newLang;
        }
        return prevLang;
      });
      forceUpdate({}); // Принудительно обновляем компонент
    };
    
    // Слушаем глобальные события изменения языка
    const handleLanguageChange = (event: CustomEvent) => {
      const langCode = event.detail?.language || sdk.i18n.getCurrentLanguage() || 'en';
      setCurrentLanguage((prevLang: string) => {
        if (langCode !== prevLang) {
          forceUpdate({});
          return langCode;
        }
        return prevLang;
      });
    };
    
    // Подписываемся на события
    if (typeof window !== 'undefined') {
      window.addEventListener('languageChanged', handleLanguageChange as EventListener);
    }
    
    // Также проверяем язык периодически (fallback для случаев, когда события не срабатывают)
    const interval = setInterval(() => {
      updateLanguage();
    }, 200); // Уменьшаем интервал для более быстрой реакции
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('languageChanged', handleLanguageChange as EventListener);
      }
      clearInterval(interval);
    };
  }, [sdk]); // Убираем currentLanguage из зависимостей, чтобы избежать бесконечных циклов
  
  // Get current language
  const language = currentLanguage;
  
  // Get supported languages
  const languages = sdk.i18n.getSupportedLanguages();
  
  // Translate function - используем useCallback с зависимостью от языка
  // Это гарантирует, что функция пересоздается при изменении языка
  // и компоненты, использующие эту функцию, перерисовываются
  const t = useCallback((key: AnyTranslationKey, fallback?: string): string => {
    // Принудительно читаем язык из SDK при каждом вызове
    const currentLang = sdk.i18n.getCurrentLanguage() || 'en';
    return sdk.i18n.t(key, fallback);
  }, [sdk, currentLanguage]); // Зависимость от currentLanguage гарантирует пересоздание функции
  
  // Change language
  const changeLanguage = useCallback((lang: LanguageCode) => {
    sdk.i18n.changeLanguage(lang);
    setCurrentLanguage(lang);
    forceUpdate({});
  }, [sdk]);
  
  // Get keys in namespace
  const getKeys = useCallback((namespace?: string) => {
    return sdk.i18n.getAvailableKeys(namespace);
  }, [sdk]);
  
  // Check if key exists
  const hasKey = useCallback((key: string) => {
    return sdk.i18n.hasKey(key);
  }, [sdk]);
  
  return {
    t,
    language,
    changeLanguage,
    languages,
    getKeys,
    hasKey
  };
}

/**
 * Standalone translation function (no hook)
 * 
 * 🤖 AI NOTE: Use for simple cases where hook is not needed
 * 
 * @example
 * ```typescript
 * import { t } from '@agentstack/sdk/i18n';
 * 
 * const label = t(sdk, 'user_management');
 * ```
 */
export function t(sdk: any, key: AnyTranslationKey, fallback?: string): string {
  return sdk.i18n.t(key, fallback);
}

export default useI18n;




