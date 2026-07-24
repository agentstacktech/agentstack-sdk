# PWA / Update Plane (`sdk.pwa.update_plane.gen2`)

**Genetic code:** `sdk.pwa.update_plane.gen2`

| Module | Role |
|--------|------|
| `appUpdateCoordinator.ts` | FSM: ingest, apply, dismiss, BC sync, PromptBudget |
| `appUpdateStrategyLadder.ts` | L0–L2 `resolveSelectedTier` / `tierToApplyMode` |
| `appUpdatePlane.ts` | `probeStaticBuildMismatch`, reason types |
| `appUpdateBroadcast.ts` | `agentstack:app_update` channel |
| `deployBroadcast.ts` | `agentstack:deploy` channel |
| `deploySignalPort.ts` | Deploy transport interface |
| `appUpdateProbeScheduler.ts` | Coalesced probes |
| `appUpdateReloadStrategies.ts` | Reload mode strategies |
| `appUpdateRecovery.ts` | Recovery v2 + identity + circuit breaker |
| `appUpdateMessageKeys.ts` | i18n key SoT |
| `appUpdateBeaconTypes.ts` | Portable beacon shapes |
| `serviceWorker*.ts` | SW ready/controller/contour/best reg |
| `messengerSwPostMessage.ts` | Messenger SW protocol |

**Tests:** `packages/core/__tests__/pwa/`

**ADR:** `docs/adr/PWA_UPDATE_ORCHESTRATION_V2.3.md`

**Portable recipe:** [UPDATE_PLANE_PORTABLE.md](./UPDATE_PLANE_PORTABLE.md)

**Consumer:** `agentstack-frontend/src/lib/pwa/PwaUpdateOrchestrator.ts`
