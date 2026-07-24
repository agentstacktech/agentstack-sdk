# Portable Update Plane policy (`sdk.pwa.update_plane.gen2`)

Consumers (hosted shells, cardgame PWA, secondary SPAs) should reuse the SDK ladder — not invent a second banner.

## Minimal wiring

```ts
import {
  createAppUpdateCoordinator,
  resolveSelectedTier,
  tierToApplyMode,
  APP_UPDATE_MESSAGE_KEYS,
} from '@agentstack/sdk/pwa';

const coordinator = createAppUpdateCoordinator({
  localBuildId: YOUR_BUILD_ID,
  getApplyEnvironment: () => ({
    hasWaitingWorker: Boolean(/* registration.waiting or latch */),
    hasServiceWorkerController: Boolean(navigator.serviceWorker?.controller),
    isStandaloneDisplay: matchMedia('(display-mode: standalone)').matches,
    chunkRecoveryAttempted: false,
  }),
  onApply: async ({ strategy, ...opts }) => {
    await strategy({ /* platform adapters */ ...opts, runSwUpdate, hardReload, clearCaches, unregisterSw, hardReloadCacheBust });
  },
});

// UI: one CTA
await coordinator.applyEffective();
```

## Rules

1. One product update surface.
2. Never soft→deep as two user-visible acts — trust `selectedTier`.
3. Safe Deep: clear only Workbox/precache/agentstack caches.
4. ADR: `docs/adr/PWA_UPDATE_ORCHESTRATION_V2.3.md`.
