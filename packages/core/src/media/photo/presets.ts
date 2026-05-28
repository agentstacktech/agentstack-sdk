/**
 * Photo ladder presets — Telegram-like edges + format order.
 * Gene: `sdk.media.photo.compress.gen1`
 */

export type PhotoFormat = 'avif' | 'webp' | 'jpeg';

export type PhotoPresetId = 'messenger_photo' | 'storage_card' | 'avatar';

export type PhotoSizeKey = 'thumb' | 'preview' | 'display' | 'full';

export interface PhotoSizeSpec {
  maxEdge: number;
  formats: readonly PhotoFormat[];
  quality: number;
  progressiveJpeg?: boolean;
}

export const MESSENGER_PHOTO_SIZES: Record<PhotoSizeKey, PhotoSizeSpec> = {
  thumb: { maxEdge: 90, formats: ['webp'], quality: 0.7 },
  preview: { maxEdge: 320, formats: ['avif', 'webp'], quality: 0.72 },
  display: { maxEdge: 1280, formats: ['avif', 'webp'], quality: 0.78 },
  full: { maxEdge: 2560, formats: ['jpeg'], quality: 0.85, progressiveJpeg: true },
} as const;

export const STORAGE_CARD_SIZES: Record<PhotoSizeKey, PhotoSizeSpec> = {
  thumb: { maxEdge: 120, formats: ['webp'], quality: 0.72 },
  preview: { maxEdge: 400, formats: ['avif', 'webp'], quality: 0.75 },
  display: { maxEdge: 1600, formats: ['avif', 'webp'], quality: 0.8 },
  full: { maxEdge: 3200, formats: ['jpeg'], quality: 0.88, progressiveJpeg: true },
} as const;

export const AVATAR_SIZES: Record<PhotoSizeKey, PhotoSizeSpec> = {
  thumb: { maxEdge: 64, formats: ['webp'], quality: 0.75 },
  preview: { maxEdge: 128, formats: ['webp'], quality: 0.78 },
  display: { maxEdge: 256, formats: ['webp', 'jpeg'], quality: 0.82 },
  full: { maxEdge: 512, formats: ['webp', 'jpeg'], quality: 0.85 },
} as const;

export function sizesForPreset(preset: PhotoPresetId): Record<PhotoSizeKey, PhotoSizeSpec> {
  if (preset === 'storage_card') return STORAGE_CARD_SIZES;
  if (preset === 'avatar') return AVATAR_SIZES;
  return MESSENGER_PHOTO_SIZES;
}
