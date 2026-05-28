/**
 * Headless PhotoSwipe adapter — SDK primitive.
 *
 * Gene: `sdk.media.gen1` · companion to `repo.engineering.client_side_computation.gen1`.
 *
 * Design decision:
 *   PhotoSwipe is the one UI dependency we adopt (pinch-zoom, swipe-close,
 *   spring animations, keyboard nav) because writing it ourselves would be a
 *   >2-month engineering effort in browser quirks — and PhotoSwipe is
 *   tree-shakable via dynamic `import()`, so SDK core stays thin.
 *
 *   This module does NOT import PhotoSwipe at module scope. It is loaded on
 *   first call to `open()`, after which the class is cached. A SDK bundle
 *   consumer that never opens a lightbox pays ~0 bytes.
 *
 *   The module is strictly browser-only — gated by DOM checks — and returns
 *   a null-like result in non-browser environments.
 *
 * Public surface (intentionally small):
 *   - `createLightbox(options)` → `{ open, close, isOpen }`
 *   - `LightboxSlide` — union of image / video / iframe / html slides
 *
 * Consumer integration (messenger, storage explorer, widget previews):
 *   Import PhotoSwipe styles once at app root (`photoswipe/style.css`).
 *   const lb = createLightbox();
 *   lb.open([{ kind: 'image', src: url, width: w, height: h, alt }], { startIndex: 0 });
 *
 * To keep third-party callers decoupled from the PhotoSwipe option surface,
 * we shape slides in SDK terms and translate internally. When PhotoSwipe is
 * upgraded we only touch this file.
 */

export interface ImageSlide {
  kind: 'image';
  src: string;
  /**
   * Natural pixel dimensions. **Strongly recommended** — PhotoSwipe uses
   * them to reserve the correct aspect ratio and to compute zoom math.
   *
   * When omitted, the SDK forwards ``width: 0, height: 0`` to PhotoSwipe,
   * which delays display until the `<img>`'s natural size is known. The
   * image then renders with perfect aspect fidelity, at the cost of a
   * ~100–300 ms UX lag on cold cache. **Never pass wrong dimensions**:
   * PhotoSwipe will stretch the `<img>` to match, producing visible
   * aspect deformation.
   */
  width?: number;
  height?: number;
  msrc?: string;
  alt?: string;
  /** Anchor element that slide zooms from; accepts a CSS selector or element. */
  from?: HTMLElement | string | null;
}

export interface VideoSlide {
  kind: 'video';
  src: string;
  poster?: string;
  width: number;
  height: number;
  alt?: string;
  mime?: string;
  from?: HTMLElement | string | null;
}

export interface HtmlSlide {
  kind: 'html';
  html: string;
  width: number;
  height: number;
  alt?: string;
  from?: HTMLElement | string | null;
}

export type LightboxSlide = ImageSlide | VideoSlide | HtmlSlide;

export interface LightboxOpenOptions {
  startIndex?: number;
  /** Called when the user closes the lightbox (click / ESC / swipe). */
  onClose?: () => void;
  /** Called when the active slide changes; useful for URL sync. */
  onSlideChange?: (slide: LightboxSlide, index: number) => void;
}

export interface LightboxController {
  isOpen: () => boolean;
  open: (slides: LightboxSlide[], opts?: LightboxOpenOptions) => Promise<void>;
  close: () => void;
  /**
   * Jump to a specific slide while the lightbox is open. Out-of-range
   * indices are clamped to [0, slides.length - 1]. No-op when closed.
   *
   * Powers chat-wide gallery UIs that need random-access navigation (e.g. a
   * hideable thumbnail strip) without round-tripping through `close()` +
   * `open()` (which would reset zoom, lose the swipe-from element, and be
   * visually jarring).
   */
  goTo: (index: number) => void;
}

export interface LightboxFactoryOptions {
  /** z-index for the overlay; default 250000 to stay above messenger UI. */
  zIndex?: number;
  /** Override PhotoSwipe dynamic import (tests). */
  loader?: () => Promise<unknown>;
}

interface PhotoSwipeClass {
  new (options: Record<string, unknown>): {
    init: () => void;
    close: () => void;
    destroy?: () => void;
    on: (event: string, fn: (...args: unknown[]) => void) => void;
    /** PhotoSwipe v5 public navigation API; present at runtime. */
    goTo?: (index: number) => void;
    options?: Record<string, unknown>;
    currIndex?: number;
  };
}

let cachedPS: PhotoSwipeClass | null = null;

async function loadPhotoSwipe(loader?: LightboxFactoryOptions['loader']): Promise<PhotoSwipeClass> {
  if (cachedPS) return cachedPS;
  if (typeof window === 'undefined') {
    throw new Error('lightbox_requires_browser');
  }
  // PhotoSwipe is an optional peer dep — declared with `peerDependenciesMeta.optional`.
  // We import dynamically so SDK bundles + Node tests don't need the package
  // unless the consumer actually calls `open()`. The `@ts-ignore` is intentional:
  // `photoswipe` types aren't declared in this tsconfig; consumer installs resolve.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore — optional peer dep; resolved by consumer's bundler at call time.
  const mod = loader ? await loader() : await import('photoswipe');
  const PS = ((mod as { default?: PhotoSwipeClass }).default ??
    (mod as PhotoSwipeClass)) as PhotoSwipeClass;
  if (!PS) throw new Error('photoswipe_module_shape_unexpected');
  cachedPS = PS;
  // PhotoSwipe requires its stylesheet. Do **not** inject `<link href>` here:
  // in production, `import.meta.url` is the SDK chunk under `/assets/`, so
  // `new URL('photoswipe/dist/photoswipe.css', import.meta.url)` becomes a
  // non-existent path; the SPA serves `index.html` as `text/html` and the
  // browser blocks it (`X-Content-Type-Options: nosniff`). Host apps should
  // import `photoswipe/style.css` once (see `AppImageLightboxProvider.tsx`).
  return cachedPS;
}

function resolveAnchor(ref: HTMLElement | string | null | undefined): HTMLElement | null {
  if (!ref) return null;
  if (typeof ref === 'string') {
    try {
      return typeof document !== 'undefined' ? (document.querySelector(ref) as HTMLElement) : null;
    } catch {
      return null;
    }
  }
  return ref;
}

function slideToDataSource(slide: LightboxSlide): Record<string, unknown> {
  if (slide.kind === 'image') {
    // PhotoSwipe accepts ``width: 0, height: 0`` as an explicit "unknown
    // dimensions — wait for the image to load before showing it" signal.
    // Always prefer real dims (zero-lag, accurate zoom math) but never
    // invent fake ones — wrong dims cause visible aspect deformation.
    const w = typeof slide.width === 'number' && slide.width > 0 ? slide.width : 0;
    const h = typeof slide.height === 'number' && slide.height > 0 ? slide.height : 0;
    return {
      src: slide.src,
      width: w,
      height: h,
      msrc: slide.msrc,
      alt: slide.alt,
      element: resolveAnchor(slide.from) ?? undefined,
    };
  }
  if (slide.kind === 'video') {
    // Inline styles give consumers a usable default even when they haven't
    // imported the SDK's overlay stylesheet. Overlay CSS (if present) then
    // refines via higher-specificity selectors on ``.sdk-media-lightbox``.
    //
    // Design choice: fill the full viewport with a <video> that uses
    // ``object-fit: contain`` so aspect is preserved while consuming every
    // available pixel on mobile (no 5vw margin, no rounded corners — the
    // lightbox chrome itself is the frame).
    const html = `
      <div class="sdk-lightbox-video-wrap" style="width:100%;height:100%;max-width:100%;max-height:100%;display:flex;align-items:center;justify-content:center;background:transparent;">
        <video
          src="${slide.src}"
          ${slide.poster ? `poster="${slide.poster}"` : ''}
          controls
          playsinline
          preload="metadata"
          style="width:100%;height:100%;max-width:100%;max-height:100%;object-fit:contain;background:#000;border-radius:0;"
          ${slide.mime ? `data-mime="${slide.mime}"` : ''}
        ></video>
      </div>
    `;
    return {
      html,
      width: slide.width,
      height: slide.height,
      alt: slide.alt,
      element: resolveAnchor(slide.from) ?? undefined,
    };
  }
  return {
    html: slide.html,
    width: slide.width,
    height: slide.height,
    alt: slide.alt,
    element: resolveAnchor(slide.from) ?? undefined,
  };
}

export function createLightbox(opts: LightboxFactoryOptions = {}): LightboxController {
  let instance: ReturnType<PhotoSwipeClass['prototype']['init']> extends infer _
    ? InstanceType<PhotoSwipeClass> | null
    : InstanceType<PhotoSwipeClass> | null = null;
  // Cached per-open slide count — used by ``goTo`` to clamp without needing
  // to reach into PhotoSwipe's private ``options``.
  let currentLen = 0;

  return {
    isOpen: () => !!instance,

    async open(slides, openOpts) {
      if (typeof window === 'undefined' || typeof document === 'undefined') return;
      if (!Array.isArray(slides) || slides.length === 0) return;

      const PS = await loadPhotoSwipe(opts.loader);
      if (instance) {
        instance.close();
        instance = null;
      }

      const dataSource = slides.map(slideToDataSource);
      const startIdx = Math.max(0, Math.min(openOpts?.startIndex ?? 0, slides.length - 1));

      const psInstance = new PS({
        dataSource,
        index: startIdx,
        zIndex: opts.zIndex ?? 250000,
        // Smooth motion — spring-like open/close, swipe-to-close on mobile.
        showHideAnimationType: 'zoom',
        bgOpacity: 0.92,
        mainClass: 'sdk-media-lightbox',
        loop: slides.length > 1,
        close: true,
        counter: slides.length > 1,
        arrowKeys: true,
        clickToCloseNonZoomable: true,
      });

      currentLen = slides.length;
      psInstance.on('close', () => {
        openOpts?.onClose?.();
        instance = null;
        currentLen = 0;
      });
      if (openOpts?.onSlideChange) {
        psInstance.on('change', () => {
          const idx = psInstance.currIndex ?? 0;
          const slide = slides[idx];
          if (slide) openOpts.onSlideChange?.(slide, idx);
        });
      }

      psInstance.init();
      instance = psInstance;
    },

    close() {
      if (instance) {
        try {
          instance.close();
        } catch {
          /* best-effort */
        }
        instance = null;
        currentLen = 0;
      }
    },

    goTo(index) {
      if (!instance) return;
      if (currentLen <= 0) return;
      const target = Math.max(0, Math.min(Math.trunc(index), currentLen - 1));
      try {
        instance.goTo?.(target);
      } catch {
        /* defensive — PhotoSwipe may tear down mid-navigation */
      }
    },
  };
}

/**
 * Feature-detect helper — useful for call sites that want to skip SDK lightbox
 * setup entirely on SSR / CI.
 */
export function isLightboxAvailable(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}
