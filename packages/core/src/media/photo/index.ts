/**
 * SDK media photo facade — `sdk.media.photo`.
 * Gene: `sdk.media.photo.gen1`
 */

import { compressPhoto, type PhotoCompressOptions, type PhotoCompressResult } from './compress';
import { compressPhotoPreferWorker } from './compressOffMainThread';

export interface AgentStackMediaPhotoSurface {
  compress: typeof compressPhoto;
  /** When ``preferWorker: true``, uses ``dist/photoCompress.worker.js`` with main-thread fallback. */
  compressPreferWorker: typeof compressPhotoPreferWorker;
}

export function createAgentStackMediaPhoto(): AgentStackMediaPhotoSurface {
  return { compress: compressPhoto, compressPreferWorker: compressPhotoPreferWorker };
}

export type { PhotoCompressOptions, PhotoCompressResult } from './compress';
export { compressPhotoPreferWorker } from './compressOffMainThread';
export type { PhotoFormat, PhotoPresetId, PhotoSizeKey } from './presets';
