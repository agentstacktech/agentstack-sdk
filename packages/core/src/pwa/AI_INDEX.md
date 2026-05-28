# PWA / Update Plane (`sdk.pwa.update_plane.gen2`)

| Module | Role |
|--------|------|
| `appUpdateCoordinator.ts` | FSM: ingest, apply, dismiss, BC sync |
| `appUpdatePlane.ts` | `probeStaticBuildMismatch`, reason types |
| `appUpdateBroadcast.ts` | `agentstack:app_update` channel |
| `deployBroadcast.ts` | `agentstack:deploy` channel |
| `deploySignalPort.ts` | Deploy transport interface |
| `appUpdateProbeScheduler.ts` | Coalesced probes |
| `appUpdateReloadStrategies.ts` | Reload mode strategies |
| `appUpdateMessageKeys.ts` | i18n key SoT |
| `appUpdateBeaconTypes.ts` | Portable beacon shapes |
| `serviceWorker*.ts` | SW ready/controller/contour/best reg |
| `messengerSwPostMessage.ts` | Messenger SW protocol |

**Tests:** `packages/core/__tests__/pwa/`

**Consumer:** `agentstack-frontend/src/lib/pwa/PwaUpdateOrchestrator.ts`
