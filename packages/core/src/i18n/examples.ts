/**
 * AgentI18n Examples
 * 
 * Real-world usage examples for AI agents and developers
 * 
 * 🤖 AI: Copy these examples directly into your code!
 */

import { AgentStackSDK } from '../sdk';

// ═══════════════════════════════════════════════════════════
// EXAMPLE 1: Basic Usage (30 seconds)
// ═══════════════════════════════════════════════════════════

export function example1_BasicUsage() {
  const sdk = new AgentStackSDK({ projectId: 'my-app' });
  
  // Zero Config - works immediately:
  console.log(sdk.i18n.t('user_management'));  // → "User Management"
  console.log(sdk.i18n.t('common:save'));       // → "Save"
  
  // Change language:
  sdk.i18n.changeLanguage('ru');
  console.log(sdk.i18n.t('user_management'));  // → "Управление пользователями"
}

// ═══════════════════════════════════════════════════════════
// EXAMPLE 2: Gaming Project (5 minutes)
// ═══════════════════════════════════════════════════════════

export function example2_GamingProject() {
  const sdk = new AgentStackSDK({ projectId: 'rpg-game' });
  
  // Register game namespace:
  sdk.i18n.registerNamespace('game', {
    en: {
      'player_level': 'Level {{level}}',
      'gold_balance': '{{amount}} Gold',
      'exp_gained': '+{{exp}} EXP',
      'quest_completed': 'Quest Completed!',
      'item_obtained': 'You obtained {{item}}!',
      'skill_unlocked': '🎉 Skill Unlocked: {{skill}}',
      'battle_won': 'Victory! Defeated {{enemy}}',
      'health': 'HP: {{current}}/{{max}}'
    },
    ru: {
      'player_level': 'Уровень {{level}}',
      'gold_balance': '{{amount}} золота',
      'exp_gained': '+{{exp}} опыта',
      'quest_completed': 'Квест выполнен!',
      'item_obtained': 'Вы получили {{item}}!',
      'skill_unlocked': '🎉 Навык открыт: {{skill}}',
      'battle_won': 'Победа! Побеждён {{enemy}}',
      'health': 'ХП: {{current}}/{{max}}'
    }
  });
  
  // Use in game UI:
  const levelText = sdk.i18n.t('game:player_level', { level: 10 });
  console.log(levelText); // → "Level 10"
  
  const goldText = sdk.i18n.t('game:gold_balance', { amount: 1000 });
  console.log(goldText); // → "1000 Gold"
  
  const expText = sdk.i18n.t('game:exp_gained', { exp: 250 });
  console.log(expText); // → "+250 EXP"
  
  // Quest notification:
  const questDone = sdk.i18n.t('game:quest_completed');
  console.log(questDone); // → "Quest Completed!"
  
  // Battle result:
  const victory = sdk.i18n.t('game:battle_won', { enemy: 'Dragon' });
  console.log(victory); // → "Victory! Defeated Dragon"
}

// ═══════════════════════════════════════════════════════════
// EXAMPLE 3: E-commerce Shop (10 minutes)
// ═══════════════════════════════════════════════════════════

export function example3_EcommerceShop() {
  const sdk = new AgentStackSDK({ projectId: 'online-shop' });
  
  // Register shop namespace:
  sdk.i18n.registerNamespace('shop', {
    en: {
      'add_to_cart': 'Add to Cart',
      'remove_from_cart': 'Remove',
      'checkout': 'Proceed to Checkout',
      'continue_shopping': 'Continue Shopping',
      'cart': 'Shopping Cart',
      'total': 'Total: ${{amount}}',
      'items_in_cart': '{{count}} items',
      'free_shipping': 'Free shipping on orders over ${{min}}',
      'discount_applied': 'Discount applied: -${{amount}}',
      'order_confirmed': 'Order #{{orderNumber}} confirmed!',
      'track_order': 'Track your order',
      'estimated_delivery': 'Estimated delivery: {{date}}'
    },
    ru: {
      'add_to_cart': 'В корзину',
      'remove_from_cart': 'Удалить',
      'checkout': 'Оформить заказ',
      'continue_shopping': 'Продолжить покупки',
      'cart': 'Корзина',
      'total': 'Итого: ${{amount}}',
      'items_in_cart': '{{count}} товаров',
      'free_shipping': 'Бесплатная доставка от ${{min}}',
      'discount_applied': 'Скидка: -${{amount}}',
      'order_confirmed': 'Заказ #{{orderNumber}} подтверждён!',
      'track_order': 'Отследить заказ',
      'estimated_delivery': 'Ожидаемая доставка: {{date}}'
    }
  });
  
  // Use in shop UI:
  console.log(sdk.i18n.t('shop:add_to_cart'));          // → "Add to Cart"
  console.log(sdk.i18n.t('shop:total', { amount: 99.99 })); // → "Total: $99.99"
  console.log(sdk.i18n.t('shop:items_in_cart', { count: 3 })); // → "3 items"
  
  // Order confirmation:
  const orderMsg = sdk.i18n.t('shop:order_confirmed', { orderNumber: '12345' });
  console.log(orderMsg); // → "Order #12345 confirmed!"
}

// ═══════════════════════════════════════════════════════════
// EXAMPLE 4: Admin Panel (2 minutes)
// ═══════════════════════════════════════════════════════════

export function example4_AdminPanel() {
  const sdk = new AgentStackSDK({ projectId: 'admin-app' });
  
  // Use built-in translations (no setup needed!):
  
  // User management:
  console.log(sdk.i18n.t('user_management'));    // → "User Management"
  console.log(sdk.i18n.t('add_user'));            // → "Add User"
  console.log(sdk.i18n.t('edit_user'));           // → "Edit User"
  
  // Project management:
  console.log(sdk.i18n.t('project_management'));  // → "Project Management"
  console.log(sdk.i18n.t('create_project'));      // → "Create Project"
  console.log(sdk.i18n.t('activate'));            // → "Activate"
  
  // RBAC:
  console.log(sdk.i18n.t('rbac_editor'));         // → "RBAC Editor"
  console.log(sdk.i18n.t('permissions'));         // → "Permissions"
  
  // Common actions:
  console.log(sdk.i18n.t('common:save'));         // → "Save"
  console.log(sdk.i18n.t('common:delete'));       // → "Delete"
  console.log(sdk.i18n.t('common:cancel'));       // → "Cancel"
}

// ═══════════════════════════════════════════════════════════
// EXAMPLE 5: AI Discovery (for AI agents)
// ═══════════════════════════════════════════════════════════

export function example5_AIDiscovery() {
  const sdk = new AgentStackSDK({ projectId: 'ai-app' });
  
  // AI explores available keys:
  const allKeys = sdk.i18n.getAvailableKeys('modules');
  console.log(`Found ${allKeys.length} keys in modules namespace`);
  console.log('Sample keys:', allKeys.slice(0, 10));
  
  // AI searches for specific term:
  const userKeys = sdk.i18n.findKey('user');
  console.log(`Found ${userKeys.length} keys containing "user":`, userKeys);
  
  // AI gets all languages:
  const langs = sdk.i18n.getSupportedLanguages();
  console.log('Supported languages:', langs);
  
  // AI checks translation coverage:
  const coverage = sdk.i18n.getCoverage();
  console.log('Translation coverage:', coverage);
  
  // AI finds missing translations:
  const missing = sdk.i18n.findMissingKeys('ru', 'en');
  console.log(`Missing RU translations: ${missing.length}`);
}

// ═══════════════════════════════════════════════════════════
// EXAMPLE 6: Multi-Language SaaS (15 minutes)
// ═══════════════════════════════════════════════════════════

export function example6_MultiLanguageSaaS() {
  const sdk = new AgentStackSDK({ projectId: 'saas-platform' });
  
  // Register app-specific namespace:
  sdk.i18n.registerNamespace('saas', {
    en: {
      'dashboard': 'Dashboard',
      'api_usage': 'API Usage: {{count}}/{{limit}} requests',
      'storage_used': 'Storage: {{used}}GB / {{total}}GB',
      'bandwidth': 'Bandwidth: {{amount}}GB this month',
      'plan': 'Plan: {{planName}}',
      'upgrade': 'Upgrade Plan',
      'billing': 'Billing',
      'usage_limit': 'Usage limit reached',
      'quota_warning': 'You\'ve used {{percent}}% of your quota',
      'trial_ends': 'Trial ends in {{days}} days'
    },
    ru: {
      'dashboard': 'Панель управления',
      'api_usage': 'Использование API: {{count}}/{{limit}} запросов',
      'storage_used': 'Хранилище: {{used}}ГБ / {{total}}ГБ',
      'bandwidth': 'Трафик: {{amount}}ГБ в этом месяце',
      'plan': 'Тариф: {{planName}}',
      'upgrade': 'Повысить тариф',
      'billing': 'Оплата',
      'usage_limit': 'Достигнут лимит использования',
      'quota_warning': 'Вы использовали {{percent}}% квоты',
      'trial_ends': 'Пробный период закончится через {{days}} дней'
    }
  });
  
  // Use in dashboard:
  console.log(sdk.i18n.t('saas:api_usage', { count: 1250, limit: 5000 }));
  // → "API Usage: 1250/5000 requests"
  
  console.log(sdk.i18n.t('saas:storage_used', { used: 15.5, total: 100 }));
  // → "Storage: 15.5GB / 100GB"
  
  console.log(sdk.i18n.t('saas:quota_warning', { percent: 85 }));
  // → "You've used 85% of your quota"
}

// ═══════════════════════════════════════════════════════════
// EXAMPLE 7: Real-time Language Switching
// ═══════════════════════════════════════════════════════════

export function example7_LanguageSwitching() {
  const sdk = new AgentStackSDK({ projectId: 'multilang-app' });
  
  // Get text in different languages:
  sdk.i18n.changeLanguage('en');
  const enText = sdk.i18n.t('user_management');
  console.log('EN:', enText); // → "User Management"
  
  sdk.i18n.changeLanguage('ru');
  const ruText = sdk.i18n.t('user_management');
  console.log('RU:', ruText); // → "Управление пользователями"
  
  // Get all translations for a key:
  const allTranslations = sdk.i18n.getAllTranslations('user_management');
  console.log('All translations:', allTranslations);
  // → { en: "User Management", ru: "Управление пользователями" }
}

// ═══════════════════════════════════════════════════════════
// EXAMPLE 8: TypeScript Type Safety
// ═══════════════════════════════════════════════════════════

import type { ModulesTranslationKey, CommonTranslationKey } from './types';

export function example8_TypeSafety() {
  const sdk = new AgentStackSDK({ projectId: 'typed-app' });
  
  // Type-safe translation function:
  function translateModule(key: ModulesTranslationKey): string {
    return sdk.i18n.t(key);
  }
  
  // ✅ Valid:
  translateModule('user_management');
  translateModule('add_user');
  translateModule('project_management');
  
  // ❌ TypeScript error:
  // translateModule('invalid_key');  // Type error!
  
  // Type-safe common keys:
  function translateCommon(key: CommonTranslationKey): string {
    return sdk.i18n.t(`common:${key}`);
  }
  
  // ✅ Valid:
  translateCommon('save');
  translateCommon('cancel');
  translateCommon('delete');
}

// ═══════════════════════════════════════════════════════════
// EXAMPLE 9: Custom Namespace for Game
// ═══════════════════════════════════════════════════════════

export function example9_CustomGameNamespace() {
  const sdk = new AgentStackSDK({ projectId: 'mmorpg' });
  
  // Register multiple game namespaces:
  
  // Character namespace:
  sdk.i18n.registerNamespace('character', {
    en: {
      'stats': 'Stats',
      'inventory': 'Inventory',
      'equipment': 'Equipment',
      'skills': 'Skills',
      'level_up': 'Level Up!',
      'stat_increased': '{{stat}} +{{amount}}'
    },
    ru: {
      'stats': 'Характеристики',
      'inventory': 'Инвентарь',
      'equipment': 'Экипировка',
      'skills': 'Навыки',
      'level_up': 'Повышение уровня!',
      'stat_increased': '{{stat}} +{{amount}}'
    }
  });
  
  // Battle namespace:
  sdk.i18n.registerNamespace('battle', {
    en: {
      'attack': 'Attack',
      'defend': 'Defend',
      'use_skill': 'Use Skill',
      'flee': 'Flee',
      'critical_hit': 'Critical Hit!',
      'damage_dealt': '{{amount}} damage!',
      'enemy_defeated': 'Enemy defeated!'
    },
    ru: {
      'attack': 'Атака',
      'defend': 'Защита',
      'use_skill': 'Использовать навык',
      'flee': 'Бежать',
      'critical_hit': 'Критический удар!',
      'damage_dealt': 'Урон: {{amount}}!',
      'enemy_defeated': 'Враг повержен!'
    }
  });
  
  // Use in game:
  console.log(sdk.i18n.t('character:level_up'));           // → "Level Up!"
  console.log(sdk.i18n.t('character:stat_increased', { 
    stat: 'Strength', 
    amount: 5 
  })); // → "Strength +5"
  
  console.log(sdk.i18n.t('battle:critical_hit'));          // → "Critical Hit!"
  console.log(sdk.i18n.t('battle:damage_dealt', { amount: 150 })); // → "150 damage!"
}

// ═══════════════════════════════════════════════════════════
// EXAMPLE 10: AI Agent Building App
// ═══════════════════════════════════════════════════════════

export async function example10_AIAgentBuilding() {
  const sdk = new AgentStackSDK({ projectId: 'ai-generated-app' });
  
  // AI discovers available keys:
  console.log('🤖 AI: Discovering translation keys...');
  
  const moduleKeys = sdk.i18n.getAvailableKeys('modules');
  console.log(`Found ${moduleKeys.length} module keys`);
  
  const commonKeys = sdk.i18n.getAvailableKeys('common');
  console.log(`Found ${commonKeys.length} common keys`);
  
  // AI searches for user-related keys:
  const userKeys = sdk.i18n.findKey('user');
  console.log(`Found ${userKeys.length} user-related keys:`, 
    userKeys.slice(0, 5).map(r => r.key)
  );
  
  // AI generates UI code:
  const generatedCode = `
    function UserManagement() {
      return (
        <div>
          <h1>{sdk.i18n.t('user_management')}</h1>
          <button>{sdk.i18n.t('add_user')}</button>
          <button>{sdk.i18n.t('common:save')}</button>
        </div>
      );
    }
  `;
  
  console.log('🤖 AI generated code:', generatedCode);
  
  // AI checks translation coverage:
  const coverage = sdk.i18n.getCoverage();
  console.log('🤖 AI: Translation coverage:', coverage);
  
  // AI finds missing translations:
  const missing = sdk.i18n.findMissingKeys('ru', 'en');
  if (missing.length > 0) {
    console.log(`🤖 AI: Warning - ${missing.length} missing RU translations`);
  } else {
    console.log('🤖 AI: Perfect! 100% translation coverage');
  }
}

// ═══════════════════════════════════════════════════════════
// EXAMPLE 11: React Component with Hook
// ═══════════════════════════════════════════════════════════

/**
 * React Component Example (see i18n/README.md for TSX version)
 * 
 * ```typescript
 * import { useI18n } from '@agentstack/sdk/i18n';
 * import { useSDK } from '@/lib/react-sdk-provider';
 * 
 * export function UserManagementPanel() {
 *   const sdk = useSDK();
 *   const { t, language, changeLanguage } = useI18n(sdk);
 *   
 *   // Use t() for all UI text
 *   // See i18n/README.md for full TSX example
 * }
 * ```
 */
export const example11_ReactComponentWithHook = {
  description: 'React component using useI18n hook - see i18n/README.md for full TSX code'
};

// ═══════════════════════════════════════════════════════════
// EXAMPLE 12: Type Generation
// ═══════════════════════════════════════════════════════════

export function example12_TypeGeneration() {
  const sdk = new AgentStackSDK({ projectId: 'typed-app' });
  
  // Generate TypeScript types for autocomplete:
  const modulesTypes = sdk.i18n.generateTypes({ namespace: 'modules' });
  console.log('Generated types:', modulesTypes);
  
  // Output:
  // export type ModulesTranslationKey = 
  //   | 'user_management'
  //   | 'add_user'
  //   | 'edit_user'
  //   ...
  
  // Get coverage for reporting:
  const coverage = sdk.i18n.getCoverage();
  console.log('Coverage report:');
  Object.entries(coverage).forEach(([lang, stats]: [string, any]) => {
    console.log(`  ${lang}: ${stats.total} keys total`);
    Object.entries(stats.namespaces).forEach(([ns, count]) => {
      console.log(`    - ${ns}: ${count} keys`);
    });
  });
}

// ═══════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════

export default {
  example1_BasicUsage,
  example2_GamingProject,
  example3_EcommerceShop,
  example4_AdminPanel,
  example5_AIDiscovery,
  example6_MultiLanguageSaaS,
  example7_LanguageSwitching,
  example8_TypeSafety,
  example9_CustomGameNamespace,
  example10_AIAgentBuilding,
  example11_ReactComponentWithHook,
  example12_TypeGeneration
};




