/** Jest stub — avoids `import.meta` in real lightbox when ts-jest emits CJS. */

export function createLightbox(): { open: () => void; close: () => void } {
  return { open: () => undefined, close: () => undefined };
}

export function isLightboxAvailable(): boolean {
  return false;
}

export type HtmlSlide = unknown;
export type ImageSlide = unknown;
export type VideoSlide = unknown;
export type LightboxSlide = unknown;
export type LightboxController = unknown;
export type LightboxFactoryOptions = unknown;
export type LightboxOpenOptions = unknown;
