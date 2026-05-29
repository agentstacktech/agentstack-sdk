# AI Application Factory — рецепты

**Genetic tag:** `repo.platform.sdk.ai_app_factory.gen1`  
**EN:** [AI_APPLICATION_FACTORY.md](./AI_APPLICATION_FACTORY.md)  
**Вход:** [AGENTS_ru.md](../AGENTS_ru.md)

Каждый рецепт: **Задача → Предусловия → Шаги → Код → Ошибки**

---

## R1 — Статический сайт (hosting)

**Задача:** Опубликовать HTML на hosting AgentStack.

```typescript
import { AgentStackSDK, resolveAgentStackApiBase, validateAppManifest } from '@agentstack/sdk';

const sdk = new AgentStackSDK({ apiBase: resolveAgentStackApiBase() });
await sdk.platform.auth.login({ email: process.env.AGENTSTACK_EMAIL!, password: process.env.AGENTSTACK_PASSWORD! });

const manifest = validateAppManifest({
  manifest_version: '1',
  app_id: 'demo-site',
  name: 'Demo',
  version: '1.0.0',
  routes: [{ path: '/', module_id: 'page', props: {} }],
  modules: ['page'],
  capabilities: [],
});

if (!manifest.success) throw manifest.error;

const result = await sdk.hosting.quickStart({
  project_id: Number(process.env.PROJECT_ID),
  html: '<!doctype html><html><body><h1>Hello</h1></body></html>',
  bucket_name: 'demo',
  publish: true,
});
console.log(result.url);
```

**Ошибки:** `hosting_gate_failed` → tier проекта; 401 → login.

---

## R2 — CRUD mini-app (REST + DNA)

```typescript
const projects = await sdk.platform.api.getProjects();
const created = await sdk.platform.api.createProject({ name: 'AI Demo', description: 'via SDK' });
```

DNA (продвинуто): `sdk.platform.dna.list('data_projects_8dna', { project_id: 0, limit: 20 })`.

---

## R3 — Магазин (commerce)

```typescript
const offers = await sdk.commerce.discovery.listOffers({ projectId: 1 });
```

См. monorepo [COMMERCE_SHOP_SDK.md](https://github.com/agentstacktech/AgentStack/blob/master/docs/sdk/COMMERCE_SHOP_SDK.md).

---

## R4 — Support channel

```typescript
const inbox = await sdk.support.listInbox({ projectId: 1 });
```

Gene: `sdk.support.gen2`.

---

## R5 — Logic blueprint

```typescript
await sdk.logic.installBlueprint(projectId, 'blueprint-id', { dry_run: false });
```

Клиентский helper: `@agentstack/sdk/logic/blueprints` · `materialize()`.

---

## R6 — Comfort task (headless)

```typescript
import { parseTaskManifest, runTaskCapability, registerTaskCapabilityPort } from '@agentstack/sdk/capability-tasks';

registerTaskCapabilityPort({
  taskId: 'storage.upload',
  async run(ctx) {
    return { ok: true, data: {} };
  },
});

await runTaskCapability('storage.upload', { sdk, projectId: 1, audience: 'developer' });
```

ID задач: `sdk.getModuleCatalog().tasks`.
