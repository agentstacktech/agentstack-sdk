# 🤖 AI Index - AgentStack Unified SDK

**Service:** AgentStack Unified SDK  
**Type:** Multi-language SDK (TypeScript + Python + React)  
**Stack:** TypeScript / Python / React / Rollup  
**Status:** Production Ready  
**Last Updated:** 2026-04-09

> **Maintainer note:** этот индекс для навигации по репозиторию. **API-truth для интеграторов:** [AGENTS.md](AGENTS.md), [README.en.md](README.en.md), [docs/DOC_HUB.md](docs/DOC_HUB.md). Псевдокод ниже может отставать от `packages/core/src` — сверяйтесь с исходниками.

---

## 🎯 PURPOSE

Универсальный SDK для экосистемы AgentStack с модульной архитектурой: TypeScript core, Python SDK, React hooks/components - единый API для всех платформ с Neural Architecture integration, i18n support, admin modules, и полной типизацией.

**Docs i18n (EN canonical + `*_ru.md`):** [docs/DOCS_I18N.md](docs/DOCS_I18N.md) · [docs/DOC_HUB.md](docs/DOC_HUB.md) (`repo.platform.sdk.docs_i18n.gen1`)  
**Integration flows (npm / submodule / monorepo / …):** [docs/SDK_INTEGRATION_FLOWS.md](docs/SDK_INTEGRATION_FLOWS.md) · RU: [docs/SDK_INTEGRATION_FLOWS_ru.md](docs/SDK_INTEGRATION_FLOWS_ru.md) (`repo.platform.sdk.integration_flows.gen1`)  
**Submodule consumer (git vendoring):** [docs/SUBMODULE_CONSUMER.md](docs/SUBMODULE_CONSUMER.md) · monorepo [docs/sdk/SDK_SUBMODULE_INTEGRATION.md](../docs/sdk/SDK_SUBMODULE_INTEGRATION.md) · scripts `submodule-add-sdk.mjs`, `bootstrap-submodule-consumer.mjs`

**Versioning (v0.4.6 platform):** `SDK_VERSION.semantic` and `AGENTSTACK_CORE_VERSION` are generated from **`AGENTSTACK_CORE_VERSION`** in [`shared/constants.py`](../shared/constants.py) via `npm run sync:agentstack-version` in `packages/core` (see `src/generated/agentstack-core-version.ts`). Align `package.json` `"version"` with that string for in-repo releases. See [`docs/VERSIONING.md`](../docs/VERSIONING.md). **AI navigation:** [`docs/AI_NAVIGATION_MAP.md`](../docs/AI_NAVIGATION_MAP.md). **AgentProtocol:** [`packages/core/src/protocol/AI_INDEX.md`](packages/core/src/protocol/AI_INDEX.md). **Relay / social ADRs:** [`docs/adr/AI_INDEX.md`](../docs/adr/AI_INDEX.md). **OpTrace:** [`docs/OPTRACE_FOR_AGENTS.md`](../docs/OPTRACE_FOR_AGENTS.md) — `getOrCreateCorrelationIds` / `optraceLog` in `packages/core/src/utils/optrace.ts` + HTTP client headers.

---

## 🏗️ ARCHITECTURE

### **Pattern:**
- Architecture: **Monorepo** (packages/core, packages/react, packages/python, packages/hooks)
- Communication: **REST API** (HTTP client) + **Neural Cache** (client-side)
- State Management: **EventEmitter** (client-side events)
- Build System: **Rollup** (TypeScript), **setuptools** (Python)
- Type Safety: **Full TypeScript** типизация + **Pydantic** (Python)

### **Key Components:**
1. **Core SDK (@agentstack/sdk)** - TypeScript HTTP client, модули, типы
2. **React SDK (@agentstack/react)** - Hooks, components, SSR support
3. **Python SDK (agentstack-sdk)** - Python async client, модули; **ecosystem parity stubs:** [`docs/ecosystem/PYTHON_SDK_PARITY.md`](../docs/ecosystem/PYTHON_SDK_PARITY.md) + `packages/python/src/modules/agent_{integrations,agents_fleet,support,protocol_surface}.py`
4. **Hooks Package (@agentstack/hooks)** - Shared React hooks
5. **Neural Integration** - Cache, events, pattern analysis (client-side)
6. **i18n Module** - Zero-config translations (AgentI18n)
7. **Admin Module** - Ecosystem operator only (`sdk.admin`, `sdkAudience: platform_operator`); integrators: [docs/INTEGRATOR_SCOPE.md](docs/INTEGRATOR_SCOPE.md)
8. **Entity snapshot repository** — `packages/core/src/cache/` (`AgentStackSDK.entitySnapshotRepository`, path helpers, optional persistence helpers)
9. **Protein command channel** — `modules/ProteinCommandChannel.ts` → `sdk.proteinCommandChannel` (`/commands/execute`, DNA CRUD bus; same `HTTPClient` as REST)
10. **AgentProtocol** + **AI surface** — `packages/core/src/protocol/` → **`sdk.protocol`** (REST + 8DNA `dna*` + command bus + snapshots + …); стабильный срез для ИИ: **`sdk.platform`** — [docs/SDK_AI_SURFACE.md](../docs/SDK_AI_SURFACE.md) (`repo.platform.sdk.ai_surface.gen1`). Spec: [`docs/AGENT_PROTOCOL.md`](../docs/AGENT_PROTOCOL.md); **единый контур + офлайн-first:** [`docs/sdk/SDK_UNIFIED_CONNECTION_OFFLINE_FIRST_DECOMPOSITION.md`](../docs/sdk/SDK_UNIFIED_CONNECTION_OFFLINE_FIRST_DECOMPOSITION.md); capabilities: [`docs/AGENT_PROTOCOL_CAPABILITIES.md`](../docs/AGENT_PROTOCOL_CAPABILITIES.md); backlog: [`docs/AGENT_PROTOCOL_ENGINEERING_BACKLOG.md`](../docs/AGENT_PROTOCOL_ENGINEERING_BACKLOG.md); quickstart: [`docs/AGENT_PROTOCOL_QUICKSTART.md`](../docs/AGENT_PROTOCOL_QUICKSTART.md); map tag `repo.platform.sdk.agent_protocol.gen1`.
11. **Project support** — `packages/core/src/supportRest.ts` + **`modules/AgentSupport.ts`** (`sdk.support`) · **`packages/react/src/hooks/useSupport.ts`** (`useSupport`, `useSupportInbox`, …) — genes `sdk.support.gen1` / `sdk.support.gen2`; ADR [`docs/adr/PROJECT_SUPPORT_MESSENGER.md`](../docs/adr/PROJECT_SUPPORT_MESSENGER.md).
12. **Integration Hub** — **`packages/core/src/modules/AgentIntegrations.ts`** + **`packages/core/src/modules/integrationQueries.ts`** (`sdk.integrations`) — REST `/api/integrations/*` parity, flat GET query transport (`skipBatching` on integration reads), Zod-validated responses, typed recipe quick setup metadata, and webhook curl helpers; **`normalizeGetQueryArg`** in `packages/core/src/client/http-client.ts` normalizes Axios-style `{ params }` for `HTTPClient.get`; gene `core.integrations.hub.gen1`. MCP tools `integrations.*` restored in core [`tools_integrations.py`](../agentstack-core/mcp/tools_integrations.py) (registry test: `tests/mcp/test_tools_integrations_registry.py`).
13. **Commerce assets** — **`@agentstack/sdk/commerce/assets`** (`sdk.commerce.assets.gen1`) — `buildAssetsWizardHref`, Zod `AssetDraft`, `duplicateAsset`, `sdk.assets.listAssetPresets`; doc [`docs/sdk/ASSETS_WIZARD_SDK.md`](../docs/sdk/ASSETS_WIZARD_SDK.md); CI `check:commerce-assets-parity`.

### **Dependencies:**
- Internal: None (this IS the SDK!)
- External: axios (HTTP), react (React SDK), httpx (Python SDK)

---

## 📁 FILE STRUCTURE

```
agentstack-unified-sdk/
├── packages/
│   ├── core/                          # ⭐ @agentstack/sdk (TypeScript)
│   │   ├── src/
│   │   │   ├── sdk.ts                 # ⭐ Main SDK class (AgentStackSDK)
│   │   │   ├── client/
│   │   │   │   └── http-client.ts     # HTTP client (retry, cache, metrics)
│   │   │   ├── modules/               # ⭐ SDK modules (13 modules!)
│   │   │   │   ├── TabActivitySurface.ts  # ITabActivitySurface (tab visibility / relay poke)
│   │   │   │   ├── AgentAuth.ts       # Authentication
│   │   │   │   ├── AgentAPI.ts        # Main API operations
│   │   │   │   ├── AgentNeural.ts     # Neural Architecture
│   │   │   │   ├── AgentI18n.ts       # ⭐ NEW! i18n module
│   │   │   │   ├── AgentPayments.ts   # Payments
│   │   │   │   ├── economy/           # sdk.economy.gen1 — tenant facade (economy/AI_INDEX.md)
│   │   │   │   ├── AgentAdmin.ts      # platform `/api/admin/agentnet/*` — sdk.admin only (not platform)
│   │   │   │   ├── AgentAnalytics.ts  # Analytics
│   │   │   │   ├── AgentWebhooks.ts   # Webhooks
│   │   │   │   ├── AgentScheduler.ts  # Scheduler
│   │   │   │   ├── AgentNotifications.ts  # Notifications
│   │   │   │   ├── AgentWallets.ts    # Wallets
│   │   │   │   ├── AgentBilling.ts    # Billing
│   │   │   │   ├── AgentRBAC.ts       # RBAC
│   │   │   │   └── AgentDocs.ts       # Documentation
│   │   │   ├── types/                 # ⭐ TypeScript types
│   │   │   │   ├── base/              # Base types
│   │   │   │   ├── entities/          # Entity types
│   │   │   │   ├── settings/          # Settings types
│   │   │   │   └── shared/            # Shared types
│   │   │   ├── cache/                 # Entity snapshot repo + protein-data snapshot keys + data-path helpers
│   │   │   ├── utils/                 # Utilities
│   │   │   │   ├── clientNotification.ts  # dispatchClientNotification (DOM event for toasts)
│   │   │   │   ├── DataCache.ts       # Client-side cache
│   │   │   │   ├── event-emitter.ts   # Event system
│   │   │   │   └── ParallelLoader.ts  # Parallel requests
│   │   │   ├── errors/                # Error handling
│   │   │   └── i18n/                  # ⭐ i18n system
│   │   │       ├── index.ts           # i18n interface
│   │   │       ├── useI18n.ts         # React hook
│   │   │       └── locales/           # Translations (en, ru, es, de)
│   │   ├── dist/                      # Built files
│   │   ├── package.json
│   │   ├── rollup.config.js           # Build config
│   │   └── README.md
│   ├── react/                         # ⭐ @agentstack/react
│   │   ├── src/
│   │   │   ├── hooks/                 # React hooks (11 files!)
│   │   │   │   ├── useAuth.ts
│   │   │   │   ├── useSDKQuery.ts       # TanStack Query + SDK emit + 401 guard
│   │   │   │   ├── useSDKMutation.ts
│   │   │   │   ├── useSDKInfiniteQuery.ts
│   │   │   │   ├── useIsTabActive.ts
│   │   │   │   ├── useOptimisticMutation.ts
│   │   │   │   ├── useProjects.ts
│   │   │   │   ├── usePayments.ts
│   │   │   │   └── ...
│   │   │   ├── lib/
│   │   │   │   └── crudHelpers.ts       # append/update/remove optimistically (pure)
│   │   │   ├── components/            # React components
│   │   │   ├── context/               # React contexts
│   │   │   ├── provider.tsx           # SDK Provider
│   │   │   └── ssr/                   # SSR support
│   │   ├── package.json
│   │   └── README.md
│   ├── python/                        # ⭐ agentstack-sdk (Python)
│   │   ├── src/
│   │   │   ├── __init__.py
│   │   │   ├── agentstack_sdk.py      # Main SDK class
│   │   │   ├── client/                # HTTP client
│   │   │   └── modules/               # Python modules (10 files!)
│   │   ├── setup.py
│   │   ├── requirements.txt
│   │   └── README.md
│   └── hooks/                         # @agentstack/hooks
│       ├── src/
│       │   ├── index.ts
│       │   ├── useAnalyticsData.ts
│       │   ├── useUsersData.ts
│       │   └── ... (8 hooks total)
│       └── package.json
├── examples/                          # Usage examples
│   ├── typescript/
│   ├── react/
│   └── python/
├── docs/                              # Documentation
│   ├── README.md
│   ├── quick-start.md
│   ├── MODULAR_ARCHITECTURE.md · MODULAR_ARCHITECTURE_ru.md
│   └── PROTEIN_SYSTEM_GUIDE.md · PROTEIN_SYSTEM_GUIDE_ru.md
├── README.md                          # ⭐ Main documentation
└── ROADMAP.md                         # Roadmap
```

**Key Directories:**
- `packages/core/` - TypeScript SDK (13 modules)
- `packages/react/` - React hooks & components; **hot:** `useCapability` / `RequireCapability`, `useEntityData` / `useEntityForm`, `createInvalidationRegistry` + `InvalidationRegistryProvider`, `useSDKMutationWithInvalidation`, `createEntityQueryOptions`, `createFeatureModule` (see [docs/SDK_FEATURE_QUICKSTART.md](../docs/SDK_FEATURE_QUICKSTART.md))
- `packages/python/` - Python SDK (10 modules)
- `packages/hooks/` - Shared React hooks (**dependency of `agentstack-frontend`**: `@agentstack/hooks`; includes `useNotificationsData`, `useProjectVersionsData`, `useSchedulerData`, …)
- `examples/` - Usage examples

---

## 🔧 KEY CLASSES & METHODS

### **packages/core/src/sdk.ts:**
```typescript
export class AgentStackSDK extends SimpleEventEmitter {
  // ⭐ Main SDK class (singleton pattern recommended!)
  
  public auth: AgentAuth;            // Authentication
  public api: AgentAPI;              // Main API
  public neural: AgentNeural;        // Neural Architecture
  public i18n: AgentI18n;            // ⭐ NEW! i18n module
  public payments: AgentPayments;    // Payments
  public agentcoin: AgentCoin;       // AgentCoin L0 ledger
  public analytics: AgentAnalytics;  // Analytics
  public webhooks: AgentWebhooks;    // Webhooks
  public scheduler: AgentScheduler;  // Scheduler
  public notifications: AgentNotifications;  // Notifications
  public wallets: AgentWallets;      // Wallets
  public billing: AgentBilling;      // Billing
  public rbac: AgentRBAC;            // RBAC
  public docs: AgentDocs;            // Documentation
  
  constructor(config: SDKConfig) {
    // Initializes all modules
    // Creates HTTP client with retry, cache, metrics
  }
  
  async healthCheck(): Promise<boolean> {
    // Checks API health
    // Returns: true если API доступен
  }
  
  updateConfig(newConfig: Partial<SDKConfig>): void {
    // Updates SDK configuration
    // Emits: 'config:updated' event
  }
}

// Usage:
const sdk = new AgentStackSDK({
  apiBase: resolveAgentStackApiBase(),
  timeout: 30000,
  enableCaching: true
});

const projects = await sdk.api.getProjects();
const payment = await sdk.payments.createPayment({...});
```

### **packages/core/src/modules/AgentAuth.ts:**
```typescript
export class AgentAuth {
  constructor(private http: HTTPClient) {}
  
  async login(credentials: LoginCredentials): Promise<AuthTokens> {
    // Login user
    // Returns: {access_token, refresh_token, user}
  }
  
  async refresh(refreshToken: string): Promise<AuthTokens> {
    // Refresh access token
    // Returns: New tokens
  }
  
  async getProfile(): Promise<User> {
    // Get current user profile
    // Returns: User object
  }
}
```

### **packages/core/src/modules/AgentAPI.ts:**
```typescript
export class AgentAPI {
  constructor(private http: HTTPClient) {}
  
  // Projects
  async getProjects(): Promise<Project[]> {
    // Get all projects
    // Returns: Array of projects
  }
  
  async createProject(data: CreateProjectData): Promise<Project> {
    // Create new project
    // Returns: Created project
  }
  
  async updateProject(id: number, data: UpdateProjectData): Promise<Project> {
    // Update project
    // Returns: Updated project
  }
  
  // Users (admin methods)
  async getUsers(params?: GetUsersParams): Promise<UsersResponse> {
    // Get users list (admin!)
    // Returns: {users: [...], pagination: {...}}
  }
  
  async createUser(data: CreateUserData): Promise<User> {
    // Create user (admin!)
    // Returns: Created user
  }
  
  // ... 50+ more methods
}
```

### **packages/core/src/modules/AgentI18n.ts (NEW!):**
```typescript
export class AgentI18n {
  constructor(private http: HTTPClient) {}
  
  async getTranslation(key: string, locale?: string): Promise<string> {
    // Get translation by key
    // Returns: Translated string
  }
  
  async getTranslations(locale?: string): Promise<Record<string, string>> {
    // Get all translations for locale
    // Returns: {key: value} map
  }
  
  async getSupportedLocales(): Promise<string[]> {
    // Get supported locales
    // Returns: ['en', 'ru', 'es', 'de']
  }
}

// React hook (useI18n):
const { t, locale, changeLocale } = useI18n();
const text = t('welcome');  // "Welcome" (auto-fetched from API!)
```

### **packages/core/src/client/http-client.ts:**
```typescript
export class HTTPClient {
  constructor(config: HTTPClientConfig) {
    // Initializes HTTP client
    // Features: retry, cache, metrics, interceptors
  }
  
  async request<T>(options: RequestOptions): Promise<T> {
    // Makes HTTP request with retry & caching
    // Returns: Typed response
  }
  
  async get<T>(url: string, params?: any): Promise<T> {
    // GET request
  }
  
  async post<T>(url: string, data?: any): Promise<T> {
    // POST request
  }
  
  async put<T>(url: string, data?: any): Promise<T> {
    // PUT request
  }
  
  async delete<T>(url: string): Promise<T> {
    // DELETE request
  }
}
```

### **packages/react/src/hooks/useAuth.ts:**
```typescript
export function useAuth() {
  const sdk = useSDK();
  
  const login = async (email: string, password: string) => {
    // Login user
    const tokens = await sdk.auth.login({ email, password });
    // Store tokens in localStorage
    // Update state
  };
  
  const logout = () => {
    // Clear tokens
    // Redirect to login
  };
  
  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    register
  };
}
```

### **packages/python/src/agentstack_sdk.py:**
```python
class AgentStackSDK:
    """Python SDK для AgentStack"""
    
    def __init__(self, config: dict):
        # Инициализирует SDK
        # Создает HTTP client
        # Инициализирует модули
        self.auth = AgentAuth(self.http)
        self.api = AgentAPI(self.http)
        # ... 10 модулей
    
    async def get_projects(self):
        # Получить проекты
        return await self.api.get_projects()
    
    async def create_payment(self, data: dict):
        # Создать платеж
        return await self.payments.create_payment(data)
```

---

## 📊 DATA STRUCTURES

### **SDKConfig (TypeScript):**
```typescript
interface SDKConfig {
  apiBase: string;               // API base URL (default https://agentstack.tech/api)
  apiKey?: string;               // API key (optional)
  projectId?: string | number;   // Active scope → X-Project-ID (see docs/PROJECT_CONTEXT.md)
  timeout?: number;              // Request timeout (ms)
  retryAttempts?: number;        // Retry attempts (default: 3)
  retryDelay?: number;           // Retry delay (ms)
  enableCaching?: boolean;       // Enable client-side cache
  enableMetrics?: boolean;       // Enable metrics collection
}
```

### **User Model (TypeScript):**
```typescript
interface User {
  id: number;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  locale: string;               // "en" | "ru"
  permissions: number;          // Bitmap!
  is_active: boolean;
  created_at: string;           // ISO 8601
  updated_at: string;
}
```

### **Project Model (TypeScript):**
```typescript
interface Project {
  id: number;
  name: string;
  description?: string;
  owner_id: number;
  settings: ProjectSettings;    // ⭐ Type-safe settings!
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ProjectSettings {
  api_service?: APIServiceSettings;
  wallet_service?: WalletServiceSettings;
  rbac_service?: RBACServiceSettings;
  // ... fully typed!
}
```

---

## 🎯 PHILOSOPHY & PATTERNS

**This SDK follows:**
- ✅ **Modular Architecture:** 13 modules, каждый со своей ответственностью
- ✅ **Type Safety:** Полная TypeScript типизация, Pydantic для Python
- ✅ **SDK-First:** Единый API для всех платформ
- ✅ **Error Handling:** Retry, fallback, graceful degradation
- ✅ **Client-Side Caching:** DataCache для производительности
- ✅ **Event-Driven:** EventEmitter для client-side events
- ✅ **i18n Support:** Zero-config translations (AgentI18n)

**Key Patterns:**

**1. SDK Initialization (Singleton pattern!):**
```typescript
// ✅ GOOD: Singleton (frontend)
let sdkInstance: AgentStackSDK | null = null;

export const getSDK = () => {
  if (!sdkInstance) {
    sdkInstance = new AgentStackSDK({
      apiBase: resolveAgentStackApiBase(),
    });
  }
  return sdkInstance;
};

// ❌ BAD: Multiple instances
const sdk1 = new AgentStackSDK({...});
const sdk2 = new AgentStackSDK({...});  // Don't do this!
```

**2. Using SDK Methods:**
```typescript
// ✅ GOOD: Use SDK methods
const sdk = getSDK();
const projects = await sdk.api.getProjects();

// ❌ BAD: Direct fetch
fetch('/api/projects');  // Don't do this!
```

**3. Error Handling:**
```typescript
// ✅ GOOD: Handle errors
try {
  const project = await sdk.api.createProject(data);
} catch (error) {
  if (error instanceof AgentStackError) {
    // Handle SDK error
    console.error(error.message);
  }
}
```

**4. React Hooks:**
```typescript
// ✅ Use hooks for React
import { useAuth, useProjects } from '@agentstack/react';

function MyComponent() {
  const { user, login } = useAuth();
  const { projects, createProject } = useProjects();
  
  // ... component logic
}
```

**5. i18n Module (NEW!):**
```typescript
// ✅ Zero-config translations
const { t, locale, changeLocale } = useI18n();

// Translations auto-fetched from API!
<h1>{t('welcome')}</h1>  // "Welcome" or "Добро пожаловать"

// Change locale
await changeLocale('ru');  // Now t('welcome') returns "Добро пожаловать"
```

---

## 🔗 INTEGRATION POINTS

### **This SDK CALLS:**
- `agentstack-core` → REST API (all endpoints)
- `Neural Architecture` → Cache, events (via backend)

### **This SDK is USED BY:**
- `agentstack-frontend` → React app
- `widget-frontend` → Payment widget
- Third-party apps → External integrations
- Mobile apps → React Native (future)

---

## 📋 QUICK TODO

### **Current Sprint:**
- [x] Modular architecture (13 modules) ✅
- [x] i18n module (AgentI18n) ✅
- [x] React hooks (@agentstack/react) ✅
- [x] Python SDK (agentstack-sdk) ✅
- [ ] Add WebSocket support
- [ ] Add GraphQL support (optional)

### **Technical Debt:**
- [ ] Add more unit tests (coverage: 80%+)
- [ ] Improve error messages
- [ ] Add request/response interceptors examples
- [ ] Improve documentation

### **Future:**
- [ ] React Native support
- [ ] Vue.js support (@agentstack/vue)
- [ ] Angular support (@agentstack/angular)
- [ ] Rust SDK (agentstack-rs)
- [ ] Go SDK (agentstack-go)

---

## 🚀 QUICK START FOR AI

**To understand this SDK (5 minutes):**
1. Read **PURPOSE** (10 sec) → Universal SDK for all platforms
2. Review **ARCHITECTURE** (1 min) → Modular, type-safe, multi-language
3. Check **FILE STRUCTURE** (1 min) → packages/core, packages/react, packages/python
4. Scan **KEY CLASSES** (2 min) → AgentStackSDK, modules, hooks
5. Read **PHILOSOPHY** (1 min) → Modular, type-safe, event-driven

**To use this SDK:**
```typescript
// 1. Install
npm install @agentstack/sdk

// 2. Initialize
import { AgentStackSDK } from '@agentstack/sdk';
const sdk = new AgentStackSDK({
  apiBase: resolveAgentStackApiBase(),
});

// 3. Use modules
const projects = await sdk.api.getProjects();
const payment = await sdk.payments.createPayment({...});

// 4. React hooks (optional)
import { useAuth } from '@agentstack/react';
const { user, login } = useAuth();
```

**To add new SDK module:**
```typescript
// 1. Create in packages/core/src/modules/AgentNewModule.ts
export class AgentNewModule {
  constructor(private http: HTTPClient) {}
  
  async getNewData(): Promise<NewData> {
    return this.http.get('/new-endpoint');
  }
}

// 2. Add to sdk.ts:
export class AgentStackSDK {
  public newModule: AgentNewModule;
  
  constructor(config) {
    // ...
    this.newModule = new AgentNewModule(this.httpClient);
  }
}

// 3. Export types in types/
// 4. Update README.md
// 5. Update this AI_INDEX.md
```

**To debug:**
1. Check **Network** → API calls, responses
2. Check **Console** → SDK errors, logs
3. Check **SDK config** → apiBase, timeout, etc.
4. Enable metrics: `enableMetrics: true` in config
5. Check backend logs (if SDK works but API fails)

---

## 🔍 HELPER INFO

### **Common Tasks:**

**Add new method to existing module:**
```typescript
// 1. Add to module class (e.g. AgentAPI.ts)
async getNewData(): Promise<NewData> {
  return this.http.get('/new-endpoint');
}

// 2. Add types in types/
interface NewData {
  field1: string;
  field2: number;
}

// 3. Update module tests
// 4. Update README.md
```

**Add new React hook:**
```typescript
// 1. Create in packages/react/src/hooks/useNewData.ts
export function useNewData() {
  const sdk = useSDK();
  const [data, setData] = useState(null);
  
  useEffect(() => {
    sdk.api.getNewData().then(setData);
  }, []);
  
  return { data };
}

// 2. Export from index.ts
// 3. Add example to docs/
```

**Debug common issues:**
- **"Module not found"** → Check imports, build output
- **"Network error"** → Check apiBase URL, CORS settings
- **"401 Unauthorized"** → Check auth token, login first
- **"Type error"** → Check TypeScript types, update @types

**Build & Publish:**
```bash
# Build all packages
cd packages/core && npm run build
cd packages/react && npm run build
cd packages/python && python setup.py sdist

# Publish to npm
npm publish --access public

# Publish to PyPI
twine upload dist/*
```

---

## 📚 RELATED DOCUMENTATION

- Backend: `../agentstack-core/AI_INDEX.md`
- Frontend: `../agentstack-frontend/AI_INDEX.md`
- Shared: `../shared/AI_INDEX.md`
- Philosophy: `../DEVELOPMENT_PHILOSOPHY_CORE.md`
- API Docs: `../API_DOCUMENTATION.md`
- Examples: `examples/` (TypeScript, React, Python)
- Quick Start: `docs/quick-start.md`
- Modular Architecture: `docs/MODULAR_ARCHITECTURE.md` · RU: `docs/MODULAR_ARCHITECTURE_ru.md`
- Protein guide: `docs/PROTEIN_SYSTEM_GUIDE.md` · RU: `docs/PROTEIN_SYSTEM_GUIDE_ru.md`
- Docs i18n: `docs/DOCS_I18N.md` · hub: `docs/DOC_HUB.md`

---

**Last Updated:** 2026-05-28  
**Maintainer:** AgentStack Team  
**Status:** ✅ Synchronized with code  
**Review:** Update when adding new modules or major features!

---

**💡 TIP for AI:** This file is your starting point! Read it FIRST before exploring SDK code!

**🎯 CRITICAL:**
- Read **PURPOSE** → Universal SDK for all platforms
- Check **PHILOSOPHY** → Modular, type-safe, event-driven!
- Use **Singleton pattern** for SDK instance (frontend!)
- Use **SDK methods** (NOT direct fetch()!)
- Follow **TypeScript types** (type safety!)
- Update this AI_INDEX.md when making changes!

