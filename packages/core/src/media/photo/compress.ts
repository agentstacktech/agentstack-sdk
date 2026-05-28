/**
 * Multi-size photo compression + OPFS cache + BlurHash.
 * Gene: `sdk.media.photo.compress.gen1`
 *
 * Pipeline: `createImageBitmap` → per-size resize (`OffscreenCanvas`) →
 * **parallel** encode (N sizes × M formats) → OPFS cache lookup/store → BlurHash.
 *
 * Performance notes:
 *  - All encodes for all sizes run concurrently via `Promise.all` so browser
 *    can schedule WASM workers and main-thread canvas in parallel.
 *  - `skippedLarger` returns the **original** blob but does **not** write it into
 *    the per-variant OPFS slot (that would poison future lookups for this size).
 *  - Content hash reads only a **prefix** of files > 4 MiB (fast enough to dedup
 *    re-sends without `arrayBuffer()` on multi-MB inputs).
 *  - `opts.signal` is honored between every async step.
 */

import { createOpfsStore, isOpfsAvailable, type OpfsStore } from '../opfsStore';
import { computeBlurHashFromBitmap } from './blurhash';
import { encodeAvif } from './encoders/avif';
import { encodeWebpJsquash } from './encoders/webp';
import { encodeJpegSquash } from './encoders/jpeg';
import type { PhotoFormat, PhotoPresetId, PhotoSizeKey, PhotoSizeSpec } from './presets';
import { sizesForPreset } from './presets';

export type { PhotoFormat, PhotoPresetId, PhotoSizeKey } from './presets';

const PHOTO_CACHE_NS = 'sdk-media-photos-v1';
/** File size above which we switch to prefix-hash for the OPFS cache key. */
const HASH_FULL_BYTES_LIMIT = 4 * 1024 * 1024;
/** Bytes sampled from head/tail for the prefix-hash variant. */
const HASH_PREFIX_BYTES = 256 * 1024;

export interface PhotoCompressOptions {
  preset: PhotoPresetId;
  sizes?: PhotoSizeKey[];
  /** Override formats per size (advanced); default from preset ladder. */
  formats?: PhotoFormat[];
  blurhash?: boolean;
  signal?: AbortSignal;
  /** Skip OPFS cache read/write. */
  noCache?: boolean;
}

export interface PhotoCompressResult {
  variants: Partial<Record<PhotoSizeKey, Partial<Record<PhotoFormat, Blob>>>>;
  blurhash?: string;
  original: { width: number; height: number; bytes: number; mime: string };
  timings: { decode_ms: number; total_ms: number; perVariant: Record<string, number> };
  contentHash: string;
  cacheHits: number;
  cacheMisses: number;
  skippedLarger: number;
}

async function sha256HexOfBytes(bytes: Uint8Array): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle?.digest) {
    let h = 5381;
    for (let i = 0; i < bytes.length; i += 1) h = ((h << 5) + h) ^ bytes[i];
    return `fallback_${(h >>> 0).toString(16)}`;
  }
  // Copy into a fresh, non-shared ArrayBuffer so `crypto.subtle.digest` is happy
  // with TS's stricter BufferSource typing (SharedArrayBuffer would be rejected).
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await crypto.subtle.digest('SHA-256', copy.buffer);
  const out = new Uint8Array(digest);
  let hex = '';
  for (let i = 0; i < out.length; i += 1) hex += out[i].toString(16).padStart(2, '0');
  return hex;
}

async function cheapContentHash(blob: Blob): Promise<string> {
  const size = blob.size;
  if (size <= HASH_FULL_BYTES_LIMIT) {
    const buf = new Uint8Array(await blob.arrayBuffer());
    return sha256HexOfBytes(buf);
  }
  // Prefix + tail + size — virtually no collisions in real-user photo flows.
  const head = new Uint8Array(await blob.slice(0, HASH_PREFIX_BYTES).arrayBuffer());
  const tail = new Uint8Array(
    await blob.slice(Math.max(0, size - HASH_PREFIX_BYTES), size).arrayBuffer()
  );
  const combined = new Uint8Array(head.length + tail.length + 8);
  combined.set(head, 0);
  combined.set(tail, head.length);
  // Encode 64-bit size little-endian for hash sensitivity.
  const dv = new DataView(combined.buffer, combined.byteOffset + head.length + tail.length, 8);
  dv.setUint32(0, size >>> 0, true);
  dv.setUint32(4, Math.floor(size / 0x100000000), true);
  const hex = await sha256HexOfBytes(combined);
  return `p_${hex}`;
}

function computeSize(srcW: number, srcH: number, maxEdge: number, dpr = 1): { w: number; h: number } {
  const edge = Math.min(Math.max(srcW, srcH), Math.round(maxEdge * Math.min(dpr || 1, 2)));
  const ratio = Math.min(edge / Math.max(srcW, srcH), 1);
  return { w: Math.max(1, Math.round(srcW * ratio)), h: Math.max(1, Math.round(srcH * ratio)) };
}

function hasOffscreen(): boolean {
  return typeof (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas !== 'undefined';
}

async function resizeToImageData(bmp: ImageBitmap, w: number, h: number): Promise<ImageData> {
  if (hasOffscreen()) {
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('offscreen_ctx_unavailable');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h);
  }
  if (typeof document === 'undefined') throw new Error('canvas_unavailable');
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_ctx_unavailable');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

async function encodeWithCanvasWebp(imageData: ImageData, quality: number): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.putImageData(imageData, 0, 0);
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/webp', quality);
  });
}

async function encodeWithCanvasJpeg(imageData: ImageData, quality: number): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.putImageData(imageData, 0, 0);
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/jpeg', quality);
  });
}

async function encodeOneFormat(
  fmt: PhotoFormat,
  imageData: ImageData,
  quality: number,
  progressive: boolean | undefined
): Promise<Blob | null> {
  if (fmt === 'avif') {
    return encodeAvif(imageData, quality);
  }
  if (fmt === 'webp') {
    const b = await encodeWebpJsquash(imageData, quality);
    if (b) return b;
    return encodeWithCanvasWebp(imageData, quality);
  }
  const b = await encodeJpegSquash(imageData, quality, { progressive: progressive === true });
  if (b) return b;
  return encodeWithCanvasJpeg(imageData, quality);
}

let photoStore: OpfsStore | null = null;
function getPhotoStore(): OpfsStore | null {
  if (!isOpfsAvailable()) return null;
  if (!photoStore) {
    photoStore = createOpfsStore({ namespace: PHOTO_CACHE_NS, capBytes: 256 * 1024 * 1024 });
  }
  return photoStore;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw signal.reason instanceof Error ? signal.reason : new DOMException('Aborted', 'AbortError');
  }
}

interface PlannedVariant {
  sizeKey: PhotoSizeKey;
  fmt: PhotoFormat;
  spec: PhotoSizeSpec;
  w: number;
  h: number;
}

export async function compressPhoto(
  source: Blob | File,
  opts: PhotoCompressOptions
): Promise<PhotoCompressResult> {
  const tAll = performance.now();
  const perVariant: Record<string, number> = {};
  const originalBytes = source.size;
  const originalMime = source.type || 'application/octet-stream';

  throwIfAborted(opts.signal);
  const tDec = performance.now();
  const bmp = await createImageBitmap(source);
  const decodeMs = performance.now() - tDec;
  throwIfAborted(opts.signal);

  // Capture dimensions before any `close()` path — some runtimes zero them after.
  const srcW = bmp.width;
  const srcH = bmp.height;

  let cacheHits = 0;
  let cacheMisses = 0;
  let skippedLarger = 0;
  const variants: PhotoCompressResult['variants'] = {};
  let blurhash: string | undefined;
  let contentHash = '';

  try {
    contentHash = await cheapContentHash(source);
    const store = opts.noCache ? null : getPhotoStore();

    if (opts.blurhash) {
      blurhash = await computeBlurHashFromBitmap(bmp);
      throwIfAborted(opts.signal);
    }

    const ladder = sizesForPreset(opts.preset);
    const sizeKeys = (opts.sizes?.length ? opts.sizes : (Object.keys(ladder) as PhotoSizeKey[]));

    // Phase 1 — resize each requested size sequentially (cheap, CPU-bound on main).
    const resizedBySize = new Map<PhotoSizeKey, ImageData>();
    const planned: PlannedVariant[] = [];
    for (const sizeKey of sizeKeys) {
      const spec = ladder[sizeKey];
      if (!spec) continue;
      const { w, h } = computeSize(srcW, srcH, spec.maxEdge, 1);
      const tSize = performance.now();
      const imageData = await resizeToImageData(bmp, w, h);
      perVariant[`${sizeKey}_resize_ms`] = performance.now() - tSize;
      resizedBySize.set(sizeKey, imageData);
      throwIfAborted(opts.signal);

      const formats = (opts.formats?.length ? opts.formats : spec.formats) as PhotoFormat[];
      for (const fmt of formats) {
        planned.push({ sizeKey, fmt, spec, w, h });
      }
    }

    // Phase 2 — OPFS cache reads sequentially per key (IDB-backed serialization is cheap).
    type Step = { plan: PlannedVariant; cached: Blob | null };
    const steps: Step[] = [];
    for (const plan of planned) {
      let cached: Blob | null = null;
      if (store) {
        cached = await store
          .get(`${contentHash}_${plan.sizeKey}_${plan.fmt}`)
          .catch(() => null);
        if (cached) cacheHits += 1;
      }
      steps.push({ plan, cached });
    }
    throwIfAborted(opts.signal);

    // Phase 3 — encode every cache-miss variant **in parallel**. Encoders are
    // dynamic imports so the first concurrent call warms the WASM module once;
    // subsequent parallel calls reuse the same cached `encodeFn`.
    const encodeJobs = steps.map(async (step) => {
      const { plan, cached } = step;
      const slot = (variants[plan.sizeKey] ??= {}) as Partial<Record<PhotoFormat, Blob>>;
      if (cached) {
        slot[plan.fmt] = cached;
        return;
      }
      cacheMisses += 1;
      const imageData = resizedBySize.get(plan.sizeKey)!;
      const tEnc = performance.now();
      const out = await encodeOneFormat(
        plan.fmt,
        imageData,
        plan.spec.quality,
        plan.spec.progressiveJpeg
      );
      perVariant[`${plan.sizeKey}_${plan.fmt}_encode_ms`] = performance.now() - tEnc;
      if (!out) return;
      throwIfAborted(opts.signal);
      if (out.size >= originalBytes) {
        // Return original but do NOT cache the larger-than-original blob under
        // a per-variant key (would wedge future lookups for this size/format).
        skippedLarger += 1;
        slot[plan.fmt] =
          source instanceof File
            ? source.slice(0, source.size, source.type)
            : new Blob([source], { type: originalMime });
        return;
      }
      slot[plan.fmt] = out;
      if (store) {
        // Cache write is fire-and-forget relative to the main pipeline.
        store.put(`${contentHash}_${plan.sizeKey}_${plan.fmt}`, out).catch(() => undefined);
      }
    });

    await Promise.all(encodeJobs);
  } finally {
    try {
      bmp.close();
    } catch {
      /* older runtimes */
    }
  }

  return {
    variants,
    blurhash,
    original: { width: srcW, height: srcH, bytes: originalBytes, mime: originalMime },
    timings: { decode_ms: decodeMs, total_ms: performance.now() - tAll, perVariant },
    contentHash,
    cacheHits,
    cacheMisses,
    skippedLarger,
  };
}
