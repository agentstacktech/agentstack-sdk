/**
 * SDK media primitives — aggregated facade.
 *
 * Gene: `sdk.media.gen1` · enforces `repo.engineering.client_side_computation.gen1`.
 *
 * Attached to the SDK as `sdk.media.*` by the SDK constructor. Can also be
 * imported directly for tree-shaking:
 *   `import { createThumbnailer } from '@agentstack/sdk/media';`
 * (path subject to `exports` map in `package.json`).
 */

import {
  createOpfsStore,
  isOpfsAvailable,
  OpfsUnavailableError,
  type OpfsStore,
  type OpfsStoreOptions,
} from './opfsStore';
import {
  createThumbnailer,
  DEFAULT_THUMBNAILER_NAMESPACE,
  type ThumbnailerContract,
  type ThumbnailerOptions,
  type ThumbnailOptions,
  type ThumbnailResult,
} from './thumbnailer';
import {
  blobChunkSource,
  opfsChunkSource,
  runResumableUpload,
  ResumableUploadError,
  type ChunkSource,
  type ResumableUploadInput,
  type ResumableUploadOptions,
  type ResumableUploadResult,
  type ResumableUploadTarget,
} from './resumableUpload';
import {
  createLightbox,
  isLightboxAvailable,
  type HtmlSlide,
  type ImageSlide,
  type LightboxController,
  type LightboxFactoryOptions,
  type LightboxOpenOptions,
  type LightboxSlide,
  type VideoSlide,
} from './lightbox';
import {
  getLightboxViewportSize,
  LIGHTBOX_ORIENTATION_ASPECT_EPS,
  shouldOfferOrientationMatch,
} from './lightboxViewport';
import {
  DEFAULT_PROBE_IMAGE_NATURAL_TIMEOUT_MS,
  probeImageNaturalSize,
} from './probeImageNaturalSize';
import { downloadUrlAsFile, sanitizeDownloadFilename } from './browserDownload';
import {
  lightboxSlideDownloadBasename,
  lightboxSlideDownloadUrl,
} from './lightboxSlideDownload';
import { createAgentStackMediaAudio, type AgentStackMediaAudioSurface } from './audio';
import { createAgentStackMediaPhoto, type AgentStackMediaPhotoSurface } from './photo';

/** Singleton surface returned from `sdk.media`. */
export interface AgentStackMediaSurface {
  /** Pre-built thumbnail pipeline with default cache. */
  readonly thumbnail: ThumbnailerContract;
  /** Lazily-constructed singleton lightbox controller. */
  readonly lightbox: LightboxController;
  /** Resumable upload loop — pass an op_id + a ChunkSource. */
  uploadResumable: typeof runResumableUpload;
  /** Adapters to feed the resumable loop. */
  chunkSource: {
    blob: typeof blobChunkSource;
    opfs: typeof opfsChunkSource;
  };
  /** Create a named OPFS store (separate from the one `thumbnail` uses). */
  opfs: {
    create: (opts: OpfsStoreOptions) => OpfsStore;
    isAvailable: () => boolean;
  };
  /** Realtime capture denoise + metering (`sdk.media.audio.gen1`). */
  readonly audio: AgentStackMediaAudioSurface;
  /** Multi-size photo ladder + BlurHash (`sdk.media.photo.gen1`). */
  readonly photo: AgentStackMediaPhotoSurface;
  /** Errors (for consumer `instanceof` checks). */
  errors: {
    ResumableUploadError: typeof ResumableUploadError;
    OpfsUnavailableError: typeof OpfsUnavailableError;
  };
}

export interface AgentStackMediaFactoryOptions {
  thumbnailer?: ThumbnailerOptions;
  lightbox?: LightboxFactoryOptions;
}

export function createAgentStackMedia(
  options: AgentStackMediaFactoryOptions = {}
): AgentStackMediaSurface {
  let lightbox: LightboxController | null = null;
  const thumbnail = createThumbnailer(options.thumbnailer);
  const audio = createAgentStackMediaAudio();
  const photo = createAgentStackMediaPhoto();
  return {
    thumbnail,
    get lightbox(): LightboxController {
      if (!lightbox) {
        lightbox = createLightbox(options.lightbox);
      }
      return lightbox;
    },
    uploadResumable: runResumableUpload,
    chunkSource: { blob: blobChunkSource, opfs: opfsChunkSource },
    opfs: { create: createOpfsStore, isAvailable: isOpfsAvailable },
    audio,
    photo,
    errors: { ResumableUploadError, OpfsUnavailableError },
  };
}

export {
  createOpfsStore,
  isOpfsAvailable,
  OpfsUnavailableError,
  createThumbnailer,
  DEFAULT_THUMBNAILER_NAMESPACE,
  blobChunkSource,
  opfsChunkSource,
  runResumableUpload,
  ResumableUploadError,
  createLightbox,
  isLightboxAvailable,
  getLightboxViewportSize,
  LIGHTBOX_ORIENTATION_ASPECT_EPS,
  shouldOfferOrientationMatch,
  DEFAULT_PROBE_IMAGE_NATURAL_TIMEOUT_MS,
  probeImageNaturalSize,
  downloadUrlAsFile,
  sanitizeDownloadFilename,
  lightboxSlideDownloadUrl,
  lightboxSlideDownloadBasename,
};
export type {
  OpfsStore,
  OpfsStoreOptions,
  ThumbnailerContract,
  ThumbnailerOptions,
  ThumbnailOptions,
  ThumbnailResult,
  ChunkSource,
  ResumableUploadInput,
  ResumableUploadOptions,
  ResumableUploadResult,
  ResumableUploadTarget,
  HtmlSlide,
  ImageSlide,
  LightboxController,
  LightboxFactoryOptions,
  LightboxOpenOptions,
  LightboxSlide,
  VideoSlide,
};
export type {
  AgentStackMediaAudioSurface,
  AudioCaptureHandle,
  AudioCaptureOptions,
  AudioEnhanceProfileId,
} from './audio';
export type { AgentStackMediaPhotoSurface, PhotoCompressOptions, PhotoCompressResult } from './photo';
export {
  getWebCodecsVideoEncodeCapability,
  probeVp8EncoderConfigurable,
  type WebCodecsVideoEncodeCapability,
} from './video/webcodecsEncodeCapabilities';
