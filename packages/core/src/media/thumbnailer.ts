/**
 * Client-side thumbnail pipeline — SDK primitive.
 *
 * Gene: `repo.engineering.client_side_computation.gen1` (offload compute to
 *       the client when the client has the bytes)
 *       `sdk.media.gen1` (reusable SDK media primitives)
 *
 * What & why:
 *   A page showing 100 file cards used to either (a) render 100 full-resolution
 *   `<video>`/`<img>` tags (killing memory + bandwidth) or (b) ask the server
 *   to generate thumbnails (CPU cost, queue complexity). Neither is correct
 *   when the client already has the bytes. This module generates thumbnails in
 *   the browser using `createImageBitmap` → `OffscreenCanvas` (off-main-thread
 *   when supported, synchronous fallback otherwise) and pairs with OPFS cache
 *   keyed by content hash — same source file never does the same work twice.
 *
 * Supported inputs today:
 *   - Images: any browser-decodable format (jpg/png/webp/gif/avif/svg).
 *   - Videos: first decoded keyframe via `<video>` + `captureStream()`-style
 *     canvas draw (no WebCodecs dependency — works everywhere `<video>` works).
 *
 * Roadmap (not shipped yet, documented for discoverability):
 *   - PDF page 1 via `pdf.js` dynamic import.
 *   - Audio waveform via `OfflineAudioContext` → PNG strip.
 *
 * Output is always a `Blob` (`image/webp`) — cheap to cache and fast to decode
 * for preview. Fallback to `image/png` if WebP encoding is unavailable.
 */

import { createOpfsStore, isOpfsAvailable, type OpfsStore } from './opfsStore';

export interface ThumbnailOptions {
  /** Max edge in CSS pixels. Default 320. */
  maxEdge?: number;
  /** Target devicePixelRatio; we cap at 2 to avoid 4× memory on retina. */
  pixelRatio?: number;
  /** Output mime. Default `image/webp` with `image/png` fallback. */
  mime?: 'image/webp' | 'image/jpeg' | 'image/png';
  /** Encoder quality (0..1). Default 0.82. */
  quality?: number;
  /**
   * Bypass OPFS cache. Useful for tests or when the caller already reads from
   * its own cache layer.
   */
  noCache?: boolean;
  /**
   * Seek time for video thumbnails in seconds. Default 1.0 — far enough to
   * skip a leading black frame, short enough to avoid long seeks.
   */
  videoSeekSec?: number;
  /** AbortSignal to cancel the job (cleanup HTMLVideoElement, etc.). */
  signal?: AbortSignal;
}

export interface ThumbnailResult {
  blob: Blob;
  width: number;
  height: number;
  fromCache: boolean;
  elapsedMs: number;
}

export interface ThumbnailerContract {
  /** Generate (or return cached) thumbnail for an image source. */
  forImage(source: Blob | File | string, opts?: ThumbnailOptions): Promise<ThumbnailResult>;
  /** Generate (or return cached) thumbnail for a video source. */
  forVideo(source: Blob | File | string, opts?: ThumbnailOptions): Promise<ThumbnailResult>;
  /** SHA-256 helper used to form cache keys; exposed for reuse. */
  hash(input: Blob | File | string): Promise<string>;
  /** Drop everything from cache (dev/diagnostics). */
  clearCache(): Promise<void>;
  /** Bytes used by thumbnail OPFS cache. */
  usageBytes(): Promise<number>;
}

const DEFAULT_NAMESPACE = 'sdk-media-thumbs';

export interface ThumbnailerOptions {
  /** OPFS namespace. Default `'sdk-media-thumbs'`. */
  namespace?: string;
  /** OPFS cap (bytes). Default 256 MB. */
  capBytes?: number;
  /** Override for tests. */
  fetchImpl?: typeof fetch;
}

function hasOffscreen(): boolean {
  return typeof (globalThis as unknown as { OffscreenCanvas?: unknown }).OffscreenCanvas !==
    'undefined';
}

function computeSize(
  srcW: number,
  srcH: number,
  maxEdge: number,
  dpr: number
): { w: number; h: number } {
  const edge = Math.min(Math.max(srcW, srcH), Math.round(maxEdge * Math.min(dpr || 1, 2)));
  const ratio = Math.min(edge / Math.max(srcW, srcH), 1);
  return { w: Math.max(1, Math.round(srcW * ratio)), h: Math.max(1, Math.round(srcH * ratio)) };
}

async function drawToBlob(
  bmp: ImageBitmap,
  w: number,
  h: number,
  mime: NonNullable<ThumbnailOptions['mime']>,
  quality: number
): Promise<Blob> {
  if (hasOffscreen()) {
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('offscreen_ctx_unavailable');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, 0, 0, w, h);
    try {
      return await canvas.convertToBlob({ type: mime, quality });
    } catch {
      return canvas.convertToBlob({ type: 'image/png' });
    }
  }
  if (typeof document === 'undefined') {
    throw new Error('canvas_unavailable');
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_ctx_unavailable');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, w, h);
  const out: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toblob_null'))),
      mime,
      quality
    );
  });
  return out;
}

async function resolveToBlob(source: Blob | File | string, fetchImpl: typeof fetch): Promise<Blob> {
  if (typeof source === 'string') {
    const res = await fetchImpl(source);
    if (!res.ok) throw new Error(`fetch_${res.status}`);
    return res.blob();
  }
  return source;
}

async function sha256HexOfBlob(blob: Blob): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle?.digest) {
    // degrade to size+name+lastModified hash; good enough for cache keys in
    // runtimes without SubtleCrypto
    const tag =
      ((blob as File).name ?? '') +
      '|' +
      String(blob.size) +
      '|' +
      String((blob as File).lastModified ?? 0) +
      '|' +
      (blob.type || '');
    let h = 5381;
    for (let i = 0; i < tag.length; i += 1) {
      h = ((h << 5) + h) ^ tag.charCodeAt(i);
    }
    return `fallback_${(h >>> 0).toString(16)}`;
  }
  const buf = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  const bytes = new Uint8Array(digest);
  let hex = '';
  for (let i = 0; i < bytes.length; i += 1) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

async function captureVideoFrame(
  blob: Blob,
  seekSec: number,
  signal?: AbortSignal
): Promise<ImageBitmap> {
  if (typeof document === 'undefined') {
    throw new Error('video_thumb_requires_dom');
  }
  const url = URL.createObjectURL(blob);
  const video = document.createElement('video');
  try {
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    video.src = url;

    await new Promise<void>((resolve, reject) => {
      const onLoaded = () => {
        cleanup();
        resolve();
      };
      const onErr = () => {
        cleanup();
        reject(new Error('video_load_failed'));
      };
      const onAbort = () => {
        cleanup();
        reject(new Error('aborted'));
      };
      const cleanup = () => {
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('error', onErr);
        signal?.removeEventListener('abort', onAbort);
      };
      video.addEventListener('loadedmetadata', onLoaded, { once: true });
      video.addEventListener('error', onErr, { once: true });
      signal?.addEventListener('abort', onAbort, { once: true });
    });

    const target = Math.max(0, Math.min(seekSec, (video.duration || seekSec) - 0.1));
    await new Promise<void>((resolve, reject) => {
      const onSeeked = () => {
        cleanup();
        resolve();
      };
      const onErr = () => {
        cleanup();
        reject(new Error('video_seek_failed'));
      };
      const onAbort = () => {
        cleanup();
        reject(new Error('aborted'));
      };
      const cleanup = () => {
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('error', onErr);
        signal?.removeEventListener('abort', onAbort);
      };
      video.addEventListener('seeked', onSeeked, { once: true });
      video.addEventListener('error', onErr, { once: true });
      signal?.addEventListener('abort', onAbort, { once: true });
      video.currentTime = target;
    });

    const bmp = await createImageBitmap(video);
    return bmp;
  } finally {
    URL.revokeObjectURL(url);
    video.src = '';
    video.load();
  }
}

export function createThumbnailer(options: ThumbnailerOptions = {}): ThumbnailerContract {
  const fetchImpl = options.fetchImpl ?? (typeof fetch !== 'undefined' ? fetch : undefined);
  if (!fetchImpl) {
    throw new Error('thumbnailer_requires_fetch');
  }
  const namespace = options.namespace ?? DEFAULT_NAMESPACE;
  const capBytes = options.capBytes ?? 256 * 1024 * 1024;

  let store: OpfsStore | null = null;
  function getStore(): OpfsStore | null {
    if (store) return store;
    if (!isOpfsAvailable()) return null;
    store = createOpfsStore({ namespace, capBytes });
    return store;
  }

  async function hashOf(input: Blob | File | string): Promise<string> {
    if (typeof input === 'string') {
      // URL cache key — hash the URL string, not the bytes (stable without fetching)
      if (typeof crypto !== 'undefined' && crypto.subtle?.digest) {
        const enc = new TextEncoder().encode(input);
        const digest = await crypto.subtle.digest('SHA-256', enc);
        const bytes = new Uint8Array(digest);
        let hex = '';
        for (let i = 0; i < bytes.length; i += 1) {
          hex += bytes[i].toString(16).padStart(2, '0');
        }
        return `url_${hex.slice(0, 32)}`;
      }
      let h = 5381;
      for (let i = 0; i < input.length; i += 1) h = ((h << 5) + h) ^ input.charCodeAt(i);
      return `url_${(h >>> 0).toString(16)}`;
    }
    return sha256HexOfBlob(input);
  }

  async function makeKey(
    input: Blob | File | string,
    kind: 'img' | 'vid',
    opts: Required<
      Pick<ThumbnailOptions, 'maxEdge' | 'pixelRatio' | 'mime' | 'quality' | 'videoSeekSec'>
    >
  ): Promise<string> {
    const h = await hashOf(input);
    return `${kind}_${h.slice(0, 32)}_${opts.maxEdge}x${opts.pixelRatio}_${opts.mime.replace('/', '-')}_q${Math.round(opts.quality * 100)}_t${Math.round(opts.videoSeekSec * 10)}.bin`;
  }

  function normalizeOpts(opts: ThumbnailOptions | undefined) {
    return {
      maxEdge: Math.max(32, Math.min(1024, opts?.maxEdge ?? 320)),
      pixelRatio: Math.max(1, Math.min(3, opts?.pixelRatio ?? (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1))),
      mime: opts?.mime ?? ('image/webp' as const),
      quality: Math.max(0.4, Math.min(1, opts?.quality ?? 0.82)),
      videoSeekSec: Math.max(0, Math.min(60, opts?.videoSeekSec ?? 1.0)),
      noCache: !!opts?.noCache,
      signal: opts?.signal,
    };
  }

  async function runImage(source: Blob | File | string, rawOpts: ThumbnailOptions | undefined) {
    const t0 = Date.now();
    const opts = normalizeOpts(rawOpts);
    const cache = opts.noCache ? null : getStore();
    const key = await makeKey(source, 'img', opts);
    if (cache) {
      const cached = await cache.get(key);
      if (cached) {
        const bmp = await createImageBitmap(cached);
        const w = bmp.width;
        const h = bmp.height;
        bmp.close?.();
        return { blob: cached, width: w, height: h, fromCache: true, elapsedMs: Date.now() - t0 };
      }
    }
    const blob = await resolveToBlob(source, fetchImpl!);
    const bmp = await createImageBitmap(blob);
    try {
      const { w, h } = computeSize(bmp.width, bmp.height, opts.maxEdge, opts.pixelRatio);
      const out = await drawToBlob(bmp, w, h, opts.mime, opts.quality);
      if (cache) {
        await cache.put(key, out).catch(() => {
          /* best-effort */
        });
      }
      return { blob: out, width: w, height: h, fromCache: false, elapsedMs: Date.now() - t0 };
    } finally {
      bmp.close?.();
    }
  }

  async function runVideo(source: Blob | File | string, rawOpts: ThumbnailOptions | undefined) {
    const t0 = Date.now();
    const opts = normalizeOpts(rawOpts);
    const cache = opts.noCache ? null : getStore();
    const key = await makeKey(source, 'vid', opts);
    if (cache) {
      const cached = await cache.get(key);
      if (cached) {
        const bmp = await createImageBitmap(cached);
        const w = bmp.width;
        const h = bmp.height;
        bmp.close?.();
        return { blob: cached, width: w, height: h, fromCache: true, elapsedMs: Date.now() - t0 };
      }
    }
    const blob = await resolveToBlob(source, fetchImpl!);
    const frame = await captureVideoFrame(blob, opts.videoSeekSec, opts.signal);
    try {
      const { w, h } = computeSize(frame.width, frame.height, opts.maxEdge, opts.pixelRatio);
      const out = await drawToBlob(frame, w, h, opts.mime, opts.quality);
      if (cache) {
        await cache.put(key, out).catch(() => {
          /* best-effort */
        });
      }
      return { blob: out, width: w, height: h, fromCache: false, elapsedMs: Date.now() - t0 };
    } finally {
      frame.close?.();
    }
  }

  return {
    forImage: runImage,
    forVideo: runVideo,
    hash: hashOf,
    async clearCache() {
      const cache = getStore();
      if (cache) await cache.clear();
    },
    async usageBytes() {
      const cache = getStore();
      return cache ? cache.usageBytes() : 0;
    },
  };
}

export const DEFAULT_THUMBNAILER_NAMESPACE = DEFAULT_NAMESPACE;
