# `@agentstack/sdk` → `media/` — AI Index

**Genetic code:** `sdk.media.gen1`
**Parent principle:** `repo.engineering.client_side_computation.gen1` (Tier 0)
**Attached as:** `sdk.media.*` on the `AgentStackSDK` instance (see `sdk.ts`).

---

## What this folder is

Client-side media primitives that make every surface (messenger, storage
explorer, dashboard, widgets, third-party integrators) fast, offline-tolerant,
and cheap on server CPU. The **server already has enough to do**; whatever the
client can compute locally from bytes it already downloaded, we compute
locally.

## Module map

| File                        | Genetic sub-tag                     | Responsibility                                                                                                   |
|-----------------------------|-------------------------------------|------------------------------------------------------------------------------------------------------------------|
| [`opfsStore.ts`](opfsStore.ts)          | `sdk.media.opfs.gen1`               | Namespaced OPFS KV with LRU eviction. Feature-detected; browser-only; tests can inject a root.                   |
| [`thumbnailer.ts`](thumbnailer.ts)      | `sdk.media.thumbnail.gen1`          | Image + video thumbnails via `createImageBitmap` / `OffscreenCanvas`. Cache keyed by SHA-256 of source bytes.    |
| [`resumableUpload.ts`](resumableUpload.ts) | `sdk.media.resumable.gen1`       | Generic tus-lite HEAD/PATCH loop. Adapters for in-memory `Blob` and OPFS-staged sources. Supports storage-target routing via `X-Upload-Target: storage`. |
| [`lightbox.ts`](lightbox.ts)            | `sdk.media.lightbox.gen1`           | Headless PhotoSwipe adapter — dynamic `import('photoswipe')`; host imports `photoswipe/style.css` once (`import.meta.url` CSS `<link>` breaks under `/assets/*.js`). |
| [`lightboxViewport.ts`](lightboxViewport.ts) | `sdk.media.lightbox.gen1`      | `getLightboxViewportSize`, `shouldOfferOrientationMatch` — pure math + `visualViewport` for app lightbox rotate UX. |
| [`probeImageNaturalSize.ts`](probeImageNaturalSize.ts) | `sdk.media.lightbox.gen1` | Off-DOM `Image` probe for natural width/height (timeout, no fake dims). |
| [`browserDownload.ts`](browserDownload.ts) | `sdk.media.lightbox.gen1`     | `sanitizeDownloadFilename`, `downloadUrlAsFile` — fetch+blob anchor, CORS fallback `window.open`. |
| [`lightboxSlideDownload.ts`](lightboxSlideDownload.ts) | `sdk.media.lightbox.gen1` | URL + basename from `LightboxSlide` for download menus. |
| [`audio/`](audio/)                        | `sdk.media.audio.gen1`              | `createAudioCapture` — RNNoise worklet (`denoise.ts`) + HPF / gate / compressor / limiter (`enhance.ts`) + profiles. Lazy worklet bundle URL via `worklet-url.ts`. |
| [`photo/`](photo/)                        | `sdk.media.photo.gen1`              | `compressPhoto` — multi-size ladder (`presets.ts`), `@jsquash/*` encoders (dynamic import), BlurHash, OPFS cache `sdk-media-photos-v1`. |
| [`index.ts`](index.ts)                  | `sdk.media.gen1`                    | `createAgentStackMedia()` aggregates all primitives into the `sdk.media` surface.                                |

## Wire protocol

The resumable loop matches [`agentstack-core/endpoints/files_endpoints.py`](../../../../../../agentstack-core/endpoints/files_endpoints.py) (HEAD / PATCH tus-lite). Storage-target headers:

| Header              | Values                          | Effect                                                                |
|---------------------|---------------------------------|-----------------------------------------------------------------------|
| `X-Upload-Target`   | `storage`                       | Finalize into 8DNA `data.ecosystem.storage` via `storage_organelle`.  |
| `X-Upload-Folder`   | `docs__reports`, `_` (root)     | Storage folder key.                                                   |
| `X-Upload-Scope`    | `user` (default) · `project`    | 8DNA row selection.                                                   |
| `X-Upload-Category` | `user`, `system`, …             | Category tag on the stored card.                                      |
| `X-Upload-Project-Id` | `123`                         | Override for `X-Project-ID`.                                          |
| (missing)           |                                 | Legacy behaviour — generic `uploads/` category (messenger, banners).  |

## Consumer integration

- **Messenger**: [`MessengerImageLightboxProvider`](../../../../../../agentstack-frontend/src/components/messenger/MessengerImageLightbox.tsx) uses `sdk.media.lightbox` under the hood — pinch-zoom, swipe-close, spring animation; public API (`open(src, alt)`) unchanged.
- **Messenger (media v2)**: [`messengerComposerMediaCapture.ts`](../../../../../../agentstack-frontend/src/lib/messenger/messengerComposerMediaCapture.ts) wires `sdk.media.audio.createCapture` behind rollout flags; [`MessengerPage.tsx`](../../../../../../agentstack-frontend/src/pages/MessengerPage.tsx) `sendFiles` may call `sdk.media.photo.compress` for large images; beacons via [`messengerBeacons.ts`](../../../../../../agentstack-frontend/src/lib/messenger/diagnostics/messengerBeacons.ts).
- **Storage explorer** (planned / in-flight): [`StorageFileInlineMediaPreview`](../../../../../../agentstack-frontend/src/components/storage/StorageFileInlineMediaPreview.tsx) becomes `StorageFileThumbnail` backed by `sdk.media.thumbnail`. Clicking the thumbnail opens `sdk.media.lightbox` instead of relying on a `<video>`/`<img>` tag per row.
- **Future**: widget previews, marketplace asset screenshots, profile avatars — same `sdk.media` surface.

## Dependency policy

- Owned: OPFS KV, thumbnail pipeline, tus-lite loop. No library earns a spot here unless writing it ourselves would be a >1-month engineering effort.
- Adopted: `photoswipe` (one stylesheet at app root, e.g. `import 'photoswipe/style.css'` in `AppImageLightboxProvider.tsx`; dynamic JS import; zero core-bundle cost).

## Observability

Each primitive is expected to emit an OpTrace beacon from the consumer
(frontend wiring in `messengerBeacons.ts` or storage telemetry):

- `media.thumbnail.gen_ms_p95`
- `media.thumbnail.cache_hit_rate`
- `media.opfs.usage_bytes` (per namespace)
- `media.resumable.recovered_bytes` (bytes recovered across reloads)
- `media.lightbox.opens`
- **Audio v2** (histogram unless noted): `media.audio.denoise.init_ms`, `media.audio.denoise.frame_ms` (EMA reported by the worklet every ~2s via `port.postMessage({ type: 'frame_ms', ema, samples })`, forwarded through `capture.telemetry.onDenoiseFrameMs`); counters `media.audio.denoise.fallback_used`, `messenger.voice.denoise.bypass_hit`; histogram `media.video_note.av_sync_ms`.
- **Photo v2**: histogram `media.photo.compress.total_ms`; gauge `media.photo.compress.bytes_saved_ratio.used` (payload `bytes` = ratio 0–100); counters `media.photo.compress.cache_hit`, `media.photo.compress.skipped_larger`, `media.photo.encoder.fallback_used` (tagged).
  - Internals: encoder modules are dynamic imports cached on first invocation; a single warmup then serves **parallel** encode jobs (`Promise.all` over all `size×format` pairs). OPFS cache key is prefix-hashed for files ≥ 4 MiB so re-sending a large picture never reads the whole blob into memory twice. Variants whose encode grows the original are returned as-is but **never** written to OPFS (keeps the per-variant slot clean for the next better-compressing run).

## Anti-patterns

- Importing `photoswipe` statically anywhere in the SDK — it must remain a dynamic import to stay tree-shaken.
- Importing `@jsquash/*` or the RNNoise worklet bundle from the SDK **main** entry — keep encoders behind dynamic `import()` and the worklet behind `addModule` + copied `dist/media/audio/*.bundle.js` only.
- Reading entire large files into memory for thumbnail cache keys. Use the `url_*` key path when the source is a URL, or SHA-256 a streamed subset.
- Creating a per-app OPFS store when `sdk.media.opfs.create({ namespace })` already exists.
- Extending the resumable protocol with new headers in one consumer — add the field to `ResumableUploadTarget` in `resumableUpload.ts` so every consumer benefits.
- Spinning a **second** `AudioContext` for metering when `createAudioCapture({ monitor: { rafMeter: true } })` already exposes `meter` — reuse one graph end-to-end.

## Cross-links

- Principle: [philosophy/genes/repo.engineering.client_side_computation.gen1.md](../../../../../../philosophy/genes/repo.engineering.client_side_computation.gen1.md)
- Backend: [endpoints/files_endpoints.py](../../../../../../agentstack-core/endpoints/files_endpoints.py), [services/resumable_upload_service.py](../../../../../../agentstack-core/services/resumable_upload_service.py), [endpoints/storage_endpoints.py](../../../../../../agentstack-core/endpoints/storage_endpoints.py) (`finalize_resumable_into_storage`).
- Messenger precedent: [frontend.social.messenger.opfs.gen1](../../../../../../philosophy/genes/frontend.social.messenger.opfs.gen1.md), `agentstack-frontend/src/lib/messenger/opfs/`.
- Navigation row: `sdk.media.gen1` in [docs/AI_NAVIGATION_MAP.md](../../../../../../docs/AI_NAVIGATION_MAP.md).
