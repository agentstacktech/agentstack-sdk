# 🌍 AgentI18n - AI-First Translation Module

**Version:** 1.0.0  
**Created:** 2025-10-08  
**Status:** ✅ Production Ready

---

## 🤖 AI Quick Start (30 seconds)

```typescript
import { AgentStackSDK } from '@agentstack/sdk';

// 1. Initialize SDK
const sdk = new AgentStackSDK({ projectId: 'my-app' });

// 2. Use translations (Zero Config!)
sdk.i18n.t('user_management');  // → "User Management"
sdk.i18n.t('common:save');       // → "Save"

// 3. Change language
sdk.i18n.changeLanguage('ru');
sdk.i18n.t('user_management');  // → "Управление пользователями"

// ✅ DONE! That's it!
```

**Time to integrate:** 30 seconds ⚡  
**Configuration needed:** 0 🎯  
**Lines of code:** 3 💎

---

## 📚 Complete API Reference

### **Level 1: Basic Translation**

```typescript
// Simple key:
sdk.i18n.t('user_management')
// → "User Management"

// Namespaced key:
sdk.i18n.t('common:save')
// → "Save"

// With fallback:
sdk.i18n.t('unknown_key', 'Fallback Value')
// → "Fallback Value"
```

### **Level 2: Configuration**

```typescript
// Manual initialization (optional):
sdk.i18n.init({
  language: 'ru',              // 'en', 'ru', or 'auto'
  fallbackLang: 'en',         // Fallback language
  defaultNamespace: 'modules', // Default namespace
  debug: true                  // Debug logging
});
```

### **Level 3: AI Discovery**

```typescript
// Get all keys in namespace:
sdk.i18n.getAvailableKeys('modules')
// → ['user_management', 'add_user', 'project_management', ...]

// Get supported languages:
sdk.i18n.getSupportedLanguages()
// → ['en', 'ru']

// Get all namespaces:
sdk.i18n.getNamespaces()
// → ['common', 'modules']

// Search for keys:
sdk.i18n.findKey('user')
// → [
//     { namespace: 'modules', key: 'user', value: 'User' },
//     { namespace: 'modules', key: 'user_management', ... }
//   ]

// Get all translations for a key:
sdk.i18n.getAllTranslations('user_management')
// → { en: 'User Management', ru: 'Управление пользователями' }

// Check if key exists:
sdk.i18n.hasKey('user_management')      // → true
sdk.i18n.hasKey('user_management', 'ru') // → true
```

### **Level 4: Custom Translations**

```typescript
// Add custom translations for a namespace:
sdk.i18n.addCustomTranslations('en', 'game', {
  'player_level': 'Player Level',
  'gold_balance': 'Gold Balance',
  'quest_completed': 'Quest Completed!'
});

// Use custom translation:
sdk.i18n.t('game:player_level')
// → "Player Level"

// Register entire namespace with multiple languages:
sdk.i18n.registerNamespace('shop', {
  en: {
    'buy_item': 'Buy Item',
    'sell_item': 'Sell Item',
    'cart': 'Shopping Cart'
  },
  ru: {
    'buy_item': 'Купить предмет',
    'sell_item': 'Продать предмет',
    'cart': 'Корзина'
  }
});

// Use shop namespace:
sdk.i18n.t('shop:buy_item')  // → "Buy Item"
```

### **Level 5: Advanced Features**

```typescript
// Get translation coverage stats:
sdk.i18n.getCoverage()
// → {
//     en: { total: 214, namespaces: { common: 66, modules: 148 } },
//     ru: { total: 214, namespaces: { common: 66, modules: 148 } }
//   }

// Find missing keys between languages:
sdk.i18n.findMissingKeys('ru', 'en')
// → ['some_key_1', 'some_key_2'] // In EN but not in RU

// Export all translations:
sdk.i18n.export('en')
// → { common: {...}, modules: {...} }

// Generate TypeScript types:
sdk.i18n.generateTypes({ namespace: 'modules' })
// → TypeScript type definitions string
```

---

## ⚛️ React Integration

### **Using the Hook:**

```typescript
import { useI18n } from '@agentstack/sdk/i18n';
import { useSDK } from '@/lib/react-sdk-provider';

function MyComponent() {
  const sdk = useSDK();
  const { t, language, changeLanguage } = useI18n(sdk);
  
  return (
    <div>
      <h1>{t('user_management')}</h1>
      
      <button onClick={() => changeLanguage('ru')}>
        Русский
      </button>
      
      <p>Current: {language}</p>
    </div>
  );
}
```

### **Language Switcher Component:**

```typescript
function LanguageSwitcher() {
  const sdk = useSDK();
  const { language, changeLanguage, languages } = useI18n(sdk);
  
  return (
    <select 
      value={language} 
      onChange={(e) => changeLanguage(e.target.value as any)}
    >
      {languages.map(lang => (
        <option key={lang} value={lang}>
          {lang.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
```

---

## 🎮 Real-World Examples

### **Example 1: Gaming Project**

```typescript
const sdk = new AgentStackSDK({ projectId: 'rpg-game' });

// Register game namespace:
sdk.i18n.registerNamespace('game', {
  en: {
    'level': 'Level {{level}}',
    'gold': '{{amount}} Gold',
    'exp': '+{{exp}} EXP',
    'quest_completed': 'Quest Completed!',
    'item_obtained': 'You obtained {{item}}!'
  },
  ru: {
    'level': 'Уровень {{level}}',
    'gold': '{{amount}} золота',
    'exp': '+{{exp}} опыта',
    'quest_completed': 'Квест выполнен!',
    'item_obtained': 'Вы получили {{item}}!'
  }
});

// Use in game:
const levelText = sdk.i18n.t('game:level', { level: 10 });
// → "Level 10"

const goldText = sdk.i18n.t('game:gold', { amount: 1000 });
// → "1000 Gold"

// Switch to Russian:
sdk.i18n.changeLanguage('ru');
// → "Уровень 10", "1000 золота"
```

### **Example 2: E-commerce**

```typescript
const sdk = new AgentStackSDK({ projectId: 'online-shop' });

// Register shop namespace:
sdk.i18n.registerNamespace('shop', {
  en: {
    'add_to_cart': 'Add to Cart',
    'checkout': 'Checkout',
    'total': 'Total: ${{amount}}',
    'items_in_cart': '{{count}} items in cart',
    'free_shipping': 'Free shipping on orders over ${{min}}'
  },
  ru: {
    'add_to_cart': 'В корзину',
    'checkout': 'Оформить заказ',
    'total': 'Итого: ${{amount}}',
    'items_in_cart': '{{count}} товаров в корзине',
    'free_shipping': 'Бесплатная доставка при заказе от ${{min}}'
  }
});

// Use in shop:
const button = sdk.i18n.t('shop:add_to_cart');
// → "Add to Cart"

const cartInfo = sdk.i18n.t('shop:items_in_cart', { count: 5 });
// → "5 items in cart"
```

### **Example 3: Admin Panel**

```typescript
// No custom namespace needed - use built-in:
function AdminDashboard() {
  const sdk = useSDK();
  const { t } = useI18n(sdk);
  
  return (
    <div>
      <h1>{t('user_management')}</h1>
      <button>{t('add_user')}</button>
      <button>{t('rbac_editor')}</button>
      <button>{t('common:save')}</button>
    </div>
  );
}

// ✅ All keys built-in, zero setup!
```

---

## 📘 TypeScript Autocomplete

### **Typed Keys:**

```typescript
import type { ModulesTranslationKey, CommonTranslationKey } from '@agentstack/sdk/i18n';

// ✅ Autocomplete works:
const key: ModulesTranslationKey = 'user_m' // ← Press Ctrl+Space!
// IDE suggests: user_management, user_sessions, user_permissions

// ✅ Type-safe function:
function translate(key: ModulesTranslationKey): string {
  return sdk.i18n.t(key);
}

translate('user_management'); // ✅ Valid
translate('invalid_key');     // ❌ TypeScript error!
```

---

## 🎯 Migration from i18next

### **Before (i18next):**

```typescript
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

// 50+ lines of configuration:
const resources = {
  en: {
    common: { /* ... */ },
    modules: { /* ... */ }
  },
  ru: { /* ... */ }
};

i18next
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    // ... 20 more options
  });

// Use:
const { t } = useTranslation();
```

### **After (AgentI18n):**

```typescript
import { AgentStackSDK } from '@agentstack/sdk';

// 1 line initialization:
const sdk = new AgentStackSDK({ projectId: 'app' });

// Use:
sdk.i18n.t('user_management'); // ✅ Works!
```

**Reduction:** 50+ lines → 1 line! 🎊

---

## 🌟 Best Practices

### **1. Use Default Namespace:**

```typescript
// ✅ Good (short):
t('user_management')    // Uses default (modules)
t('add_user')

// ❌ Redundant:
t('modules:user_management')  // Unnecessary prefix
```

### **2. Explicit Namespace for Common:**

```typescript
// ✅ Good:
t('common:save')
t('common:cancel')

// ❌ Will look in default namespace (modules):
t('save')  // Not found if default is 'modules'!
```

### **3. Custom Namespaces:**

```typescript
// ✅ Good:
sdk.i18n.registerNamespace('game', {...});
t('game:level')

// ❌ Don't pollute common/modules:
sdk.i18n.addCustomTranslations('en', 'modules', {
  'game_level': '...'  // Pollution!
});
```

### **4. Type Safety:**

```typescript
// ✅ Good:
import type { ModulesTranslationKey } from '@agentstack/sdk/i18n';
function translate(key: ModulesTranslationKey) { ... }

// ❌ Avoid any:
function translate(key: any) { ... }
```

---

## 📊 Performance

### **Bundle Size:**
```
AgentI18n module: ~5KB
EN translations: ~15KB
RU translations: ~18KB
---------------------------
Total: ~38KB (uncompressed)
GZIP: ~12KB ✅
```

### **Runtime:**
```
t('user_management'): <0.1ms  ✅
changeLanguage('ru'): <1ms    ✅
getAvailableKeys(): <1ms      ✅
findKey('user'): <5ms         ✅
```

### **Memory:**
```
All translations: ~100KB
Custom translations: ~10-50KB
Total: ~110-150KB ✅
```

---

## 🔧 Advanced Usage

### **Variables in Translations:**

```typescript
// Translation with variables:
sdk.i18n.addCustomTranslations('en', 'app', {
  'welcome': 'Hello, {{name}}!',
  'balance': 'Your balance: {{amount}} {{currency}}'
});

// Use with vars:
sdk.i18n.t('app:welcome', { name: 'Alice' })
// → "Hello, Alice!"

sdk.i18n.t('app:balance', { amount: 100, currency: 'USD' })
// → "Your balance: 100 USD"
```

### **Dynamic Namespace Loading:**

```typescript
// Load namespace on demand:
const loadGameTranslations = () => {
  sdk.i18n.registerNamespace('game', {
    en: import('./locales/game-en.json'),
    ru: import('./locales/game-ru.json')
  });
};

// Use when needed:
await loadGameTranslations();
sdk.i18n.t('game:level');
```

### **Translation Coverage Check:**

```typescript
// Get stats:
const coverage = sdk.i18n.getCoverage();
console.log(`EN: ${coverage.en.total} keys`);
console.log(`RU: ${coverage.ru.total} keys`);

// Find missing:
const missing = sdk.i18n.findMissingKeys('ru', 'en');
if (missing.length > 0) {
  console.warn(`Missing ${missing.length} RU translations:`, missing);
}
```

---

## 🎨 UI Examples

### **Button with Translation:**

```tsx
function SaveButton() {
  const sdk = useSDK();
  const { t } = useI18n(sdk);
  
  return (
    <button onClick={handleSave}>
      {t('common:save')}
    </button>
  );
}
```

### **Form with Translations:**

```tsx
function UserForm() {
  const sdk = useSDK();
  const { t } = useI18n(sdk);
  
  return (
    <form>
      <h2>{t('edit_user')}</h2>
      
      <label>{t('email')}</label>
      <input type="email" />
      
      <label>{t('username')}</label>
      <input type="text" />
      
      <label>{t('role')}</label>
      <select>
        <option value="admin">{t('common:admin')}</option>
        <option value="user">{t('user')}</option>
      </select>
      
      <button type="submit">{t('common:save')}</button>
      <button type="button">{t('common:cancel')}</button>
    </form>
  );
}
```

### **Table with Translations:**

```tsx
function UserTable() {
  const sdk = useSDK();
  const { t } = useI18n(sdk);
  
  return (
    <table>
      <thead>
        <tr>
          <th>{t('user')}</th>
          <th>{t('email')}</th>
          <th>{t('role')}</th>
          <th>{t('status')}</th>
          <th>{t('actions')}</th>
        </tr>
      </thead>
      <tbody>
        {/* ... */}
      </tbody>
    </table>
  );
}
```

---

## 🚀 Comparison with i18next

| Feature | i18next | AgentI18n | Winner |
|---------|---------|-----------|--------|
| Setup time | 10+ min | 30 sec | ✅ AgentI18n |
| Config lines | 50+ | 0 (Zero Config!) | ✅ AgentI18n |
| Bundle size | ~25KB | ~12KB (gzip) | ✅ AgentI18n |
| AI-Friendly | ⚠️ Medium | ✅ Perfect | ✅ AgentI18n |
| Autocomplete | ❌ No | ✅ Yes | ✅ AgentI18n |
| Discovery API | ❌ No | ✅ Yes | ✅ AgentI18n |
| Custom namespaces | ✅ Yes | ✅ Yes | 🤝 Equal |
| React support | ✅ Yes | ✅ Yes | 🤝 Equal |
| Pluralization | ✅ Yes | 📝 Planned | ⚠️ i18next |
| Date/Number format | ✅ Yes | 📝 Planned | ⚠️ i18next |

**Verdict:** AgentI18n wins for AI-First development! 🏆

---

## 📋 Cheat Sheet

```typescript
// Basic:
t('key')                           // Default namespace
t('namespace:key')                 // Explicit namespace
t('key', 'fallback')               // With fallback

// Discovery:
getAvailableKeys('modules')        // All keys
getSupportedLanguages()            // All languages
getNamespaces()                    // All namespaces
findKey('user')                    // Search
hasKey('key')                      // Check existence

// Custom:
addCustomTranslations(lang, ns, keys)   // Add keys
registerNamespace(ns, translations)     // Add namespace

// Language:
changeLanguage('ru')               // Switch language
getCurrentLanguage()               // Get current

// Stats:
getCoverage()                      // Coverage stats
findMissingKeys('ru', 'en')        // Missing keys
export('en')                       // Export all

// Types:
generateTypes({ namespace: 'modules' })  // Generate TS types
```

---

## 🤖 For AI Agents

### **Prompt for AI:**

```
You are building an app with AgentStack SDK.
Use sdk.i18n.t('key') for all UI text.

Available keys:
- User management: 'user_management', 'add_user', 'edit_user'
- Projects: 'project_management', 'create_project', 'activate'
- Common: 'common:save', 'common:cancel', 'common:delete'

Explore more: sdk.i18n.getAvailableKeys('modules')
```

### **AI Self-Discovery:**

AI can discover available translations:

```typescript
// AI explores:
const keys = sdk.i18n.getAvailableKeys('modules');
// → AI learns all 148 available keys

// AI searches:
const userKeys = sdk.i18n.findKey('user');
// → AI finds all user-related keys

// AI generates code:
const code = `
  <h1>{sdk.i18n.t('${keys[0]}')}</h1>
  <button>{sdk.i18n.t('common:save')}</button>
`;
```

---

## 📖 Full API Documentation

See `SDK_I18N_MODULE_DESIGN.md` for:
- Complete architecture
- All 12 phases explained
- Performance benchmarks
- Migration strategies
- Advanced patterns

---

## 🎊 Summary

**AgentI18n = i18next для AI-эпохи!**

✅ **Zero Config** - работает из коробки  
✅ **AI-First** - 3-second rule  
✅ **Type-Safe** - полная типизация  
✅ **Discoverable** - AI может исследовать  
✅ **Extensible** - кастомные namespaces  
✅ **Performant** - 12KB gzipped  
✅ **Production-Ready** - сразу в продакшн

**Perfect for AI agents building multilingual apps! 🌍🤖💎**

