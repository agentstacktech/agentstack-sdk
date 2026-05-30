# AI Application Factory — recipes

**Genetic tag:** `repo.platform.sdk.ai_app_factory.gen1`  
**RU:** [AI_APPLICATION_FACTORY_ru.md](./AI_APPLICATION_FACTORY_ru.md)  
**Entry:** [AGENTS.md](../AGENTS.md)

Each recipe: **Task → Prerequisites → Steps → Code → Failures**

---

## R1 — Static site (hosting)

**Task:** Publish HTML to AgentStack hosting.

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

**Failures:** `hosting_gate_failed` → check project tier; 401 → login.

---

## R2 — CRUD mini-app (REST + DNA)

```typescript
const projects = await sdk.platform.api.getProjects();
const created = await sdk.platform.api.createProject({ name: 'AI Demo', description: 'via SDK' });
```

DNA row (advanced): `sdk.platform.dna.list('data_projects_8dna', { project_id: 0, limit: 20 })`.

---

## R3 — Shop (commerce)

```typescript
import { CommerceFacade } from '@agentstack/sdk';
// Prefer sdk.commerce on AgentStackSDK instance:
const offers = await sdk.commerce.discovery.listOffers({ projectId: 1 });
```

See monorepo [../../docs/sdk/COMMERCE_SHOP_SDK.md](../../docs/sdk/COMMERCE_SHOP_SDK.md).

---

## R4 — Support channel

```typescript
const inbox = await sdk.support.getInbox({ project_id: 1 });
```

Gene: `sdk.support.gen2`.

---

## R5 — Logic blueprint

```typescript
await sdk.logic.installBlueprint(projectId, 'blueprint-id', { dry_run: false });
```

Client pure helper: `@agentstack/sdk/logic/blueprints` · `materialize()`.

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

Discover task ids: `sdk.getModuleCatalog().tasks`.
